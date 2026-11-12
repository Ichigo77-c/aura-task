/**
 * Message Broker - Real Synchronization Bridge
 * Coordinates message exchange between Claude Code and OpenCode
 * Uses node:sqlite (DatabaseSync) for true cross-process sync
 */

import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";

const DB_PATH = process.env.ONE_BRAIN_DB
  ? path.resolve(process.env.ONE_BRAIN_DB)
  : path.join(__dirname, "sync.db");
const SCHEMA_PATH = path.join(__dirname, "schema.sql");

export type AgentType = "claude-code" | "opencode";
export type AgentStatus = "idle" | "busy" | "offline";
export type MessageType = "task" | "result" | "status" | "context" | "message";

const SECRET_PATTERNS: Array<[RegExp, string]> = [
  [/\b(sk-[A-Za-z0-9_-]{16,})\b/g, "[REDACTED_API_KEY]"],
  [/\b(ghp_[A-Za-z0-9]{20,})\b/g, "[REDACTED_GITHUB_TOKEN]"],
  [/\b(github_pat_[A-Za-z0-9_]{20,})\b/g, "[REDACTED_GITHUB_TOKEN]"],
  [/\b(AKIA[0-9A-Z]{16})\b/g, "[REDACTED_AWS_KEY]"],
  [/\b(xox[baprs]-[A-Za-z0-9-]{10,})\b/g, "[REDACTED_SLACK_TOKEN]"],
  [/(-----BEGIN [A-Z ]*PRIVATE KEY-----)[\s\S]*?(-----END [A-Z ]*PRIVATE KEY-----)/g, "$1...[REDACTED]...$2"],
  [/\b((?:api[_-]?key|secret|token|password|passwd|authorization)\s*[:=]\s*)(["']?)[^\s"',]{6,}\2/gi, "$1$2[REDACTED]$2"],
  [/\b((?:postgres|postgresql|mysql|mongodb(?:\+srv)?|redis):\/\/[^:\s/]+:)([^@\s/]+)(@)/gi, "$1[REDACTED]$3"],
];

/** Best-effort redaction before anything is written to the shared room. */
export function redactSecrets(text: string): string {
  let output = text;
  for (const [pattern, replacement] of SECRET_PATTERNS) output = output.replace(pattern, replacement);
  return output;
}

function redactDeep(value: unknown): unknown {
  if (typeof value === "string") return redactSecrets(value);
  if (Array.isArray(value)) return value.map(redactDeep);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, redactDeep(entry)]));
  }
  return value;
}
export type MessageStatus = "pending" | "delivered" | "processed" | "failed";
export type TaskStatus = "pending" | "in_progress" | "completed" | "failed";

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  last_heartbeat: number;
  created_at: number;
  metadata?: Record<string, unknown>;
}

export interface Message {
  id: string;
  from_agent: string;
  to_agent: string;
  type: MessageType;
  content: Record<string, unknown>;
  status: MessageStatus;
  created_at: number;
  delivered_at?: number;
  processed_at?: number;
  parent_message_id?: string;
}

export interface Task {
  id: string;
  description: string;
  assigned_to: string;
  created_by: string;
  status: TaskStatus;
  result?: Record<string, unknown>;
  created_at: number;
  started_at?: number;
  completed_at?: number;
}

export interface Event {
  id: number;
  event_type: string;
  agent_id?: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

export class SyncBroker {
  private db: DatabaseSync | null = null;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    // Create database if it doesn't exist
    const needsSchema = !fs.existsSync(DB_PATH);

    this.db = new DatabaseSync(DB_PATH);

    // Enable WAL mode for better concurrency
    this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec("PRAGMA busy_timeout = 5000"); // 5 second timeout for locks

    if (needsSchema) {
      const schema = fs.readFileSync(SCHEMA_PATH, "utf-8");
      this.db.exec(schema);
    }

    this.initialized = true;

    // Cleanup old offline agents
    this.cleanupOfflineAgents();
  }

  private ensureInit(): void {
    if (!this.initialized || !this.db) {
      throw new Error("Broker not initialized. Call await broker.init() first.");
    }
  }

  private cleanupOfflineAgents(): void {
    this.ensureInit();
    const cutoff = Math.floor(Date.now() / 1000) - 60; // 60 seconds

    // Mark agents as offline if no heartbeat for 60s
    this.db!.exec(`
      UPDATE agents
      SET status = 'offline'
      WHERE last_heartbeat < ${cutoff} AND status != 'offline'
    `);
  }

  // ==================== Agent Management ====================

  registerAgent(name: string, type: AgentType, metadata?: Record<string, unknown>): Agent {
    this.ensureInit();

    // Reuse the most recent agent of this type even if it went offline, so a
    // stable agent ID survives idle periods (messages are addressed by ID).
    const existing = this.db!.prepare(`
      SELECT * FROM agents
      WHERE type = ?
      ORDER BY last_heartbeat DESC
      LIMIT 1
    `).get(type) as any;

    if (existing) {
      // Reactivate the existing agent
      const now = Math.floor(Date.now() / 1000);
      this.db!.prepare(`
        UPDATE agents
        SET status = 'idle', last_heartbeat = ?, metadata = ?
        WHERE id = ?
      `).run(now, metadata ? JSON.stringify(metadata) : null, existing.id);

      this.logEvent("agent_online", existing.id, { name, type, reused: true });

      return {
        id: existing.id,
        name: existing.name,
        type: existing.type,
        status: "idle",
        last_heartbeat: now,
        created_at: existing.created_at,
        metadata,
      };
    }

    // Create new agent
    const id = randomUUID();
    const now = Math.floor(Date.now() / 1000);

    this.db!.prepare(`
      INSERT INTO agents (id, name, type, status, last_heartbeat, created_at, metadata)
      VALUES (?, ?, ?, 'idle', ?, ?, ?)
    `).run(id, name, type, now, now, metadata ? JSON.stringify(metadata) : null);

    this.logEvent("agent_online", id, { name, type });

    return { id, name, type, status: "idle", last_heartbeat: now, created_at: now, metadata };
  }

  updateAgentStatus(agentId: string, status: AgentStatus): void {
    this.ensureInit();
    const now = Math.floor(Date.now() / 1000);

    this.db!.prepare(`
      UPDATE agents SET status = ?, last_heartbeat = ? WHERE id = ?
    `).run(status, now, agentId);

    this.logEvent("agent_status_change", agentId, { status });
  }

  heartbeat(agentId: string): void {
    this.ensureInit();
    const now = Math.floor(Date.now() / 1000);

    this.db!.prepare(`
      UPDATE agents SET last_heartbeat = ? WHERE id = ?
    `).run(now, agentId);
  }

  getAgent(agentId: string): Agent | null {
    this.ensureInit();

    const row = this.db!.prepare(`
      SELECT * FROM agents WHERE id = ?
    `).get(agentId) as any;

    if (!row) return null;

    return {
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }

  listAgents(): Agent[] {
    this.ensureInit();

    const rows = this.db!.prepare(`
      SELECT * FROM agents ORDER BY created_at DESC
    `).all() as any[];

    return rows.map((row) => ({
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }));
  }

  // ==================== Message Queue ====================

  sendMessage(
    fromAgent: string,
    toAgent: string,
    type: MessageType,
    content: Record<string, unknown>,
    parentMessageId?: string
  ): Message {
    this.ensureInit();
    const id = randomUUID();
    const now = Math.floor(Date.now() / 1000);

    this.db!.prepare(`
      INSERT INTO messages (id, from_agent, to_agent, type, content, status, created_at, parent_message_id)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
    `).run(id, fromAgent, toAgent, type, JSON.stringify(redactDeep(content)), now, parentMessageId || null);

    this.logEvent("message_sent", fromAgent, { message_id: id, to_agent: toAgent, type });

    return {
      id,
      from_agent: fromAgent,
      to_agent: toAgent,
      type,
      content,
      status: "pending",
      created_at: now,
      parent_message_id: parentMessageId,
    };
  }

  getInbox(agentId: string, status: MessageStatus = "pending"): Message[] {
    this.ensureInit();

    const rows = this.db!.prepare(`
      SELECT * FROM messages
      WHERE to_agent = ? AND status = ?
      ORDER BY created_at ASC
    `).all(agentId, status) as any[];

    return rows.map((row) => ({
      ...row,
      content: JSON.parse(row.content),
    }));
  }

  markDelivered(messageId: string): void {
    this.ensureInit();
    const now = Math.floor(Date.now() / 1000);

    this.db!.prepare(`
      UPDATE messages SET status = 'delivered', delivered_at = ? WHERE id = ?
    `).run(now, messageId);
  }

  markProcessed(messageId: string): void {
    this.ensureInit();
    const now = Math.floor(Date.now() / 1000);

    this.db!.prepare(`
      UPDATE messages SET status = 'processed', processed_at = ? WHERE id = ?
    `).run(now, messageId);
  }

  markFailed(messageId: string): void {
    this.ensureInit();

    this.db!.prepare(`
      UPDATE messages SET status = 'failed' WHERE id = ?
    `).run(messageId);
  }

  // ==================== Task Management ====================

  createTask(description: string, assignedTo: string, createdBy: string): Task {
    this.ensureInit();
    const id = randomUUID();
    const now = Math.floor(Date.now() / 1000);

    this.db!.prepare(`
      INSERT INTO tasks (id, description, assigned_to, created_by, status, created_at)
      VALUES (?, ?, ?, ?, 'pending', ?)
    `).run(id, description, assignedTo, createdBy, now);

    this.logEvent("task_created", createdBy, { task_id: id, assigned_to: assignedTo });

    return {
      id,
      description,
      assigned_to: assignedTo,
      created_by: createdBy,
      status: "pending",
      created_at: now,
    };
  }

  updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    result?: Record<string, unknown>
  ): void {
    this.ensureInit();
    const now = Math.floor(Date.now() / 1000);

    const task = this.getTask(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    const updates: string[] = ["status = ?"];
    const params: any[] = [status];

    if (status === "in_progress" && !task.started_at) {
      updates.push("started_at = ?");
      params.push(now);
    }

    if (status === "completed" || status === "failed") {
      updates.push("completed_at = ?");
      params.push(now);
      if (result) {
        updates.push("result = ?");
        params.push(JSON.stringify(result));
      }
    }

    params.push(taskId);

    this.db!.prepare(`
      UPDATE tasks SET ${updates.join(", ")} WHERE id = ?
    `).run(...params);

    this.logEvent("task_status_change", task.assigned_to, {
      task_id: taskId,
      status,
    });
  }

  getTask(taskId: string): Task | null {
    this.ensureInit();

    const row = this.db!.prepare(`
      SELECT * FROM tasks WHERE id = ?
    `).get(taskId) as any;

    if (!row) return null;

    return {
      ...row,
      result: row.result ? JSON.parse(row.result) : undefined,
    };
  }

  listTasks(assignedTo?: string, status?: TaskStatus): Task[] {
    this.ensureInit();

    let query = "SELECT * FROM tasks WHERE 1=1";
    const params: any[] = [];

    if (assignedTo) {
      query += " AND assigned_to = ?";
      params.push(assignedTo);
    }

    if (status) {
      query += " AND status = ?";
      params.push(status);
    }

    query += " ORDER BY created_at DESC";

    const rows = this.db!.prepare(query).all(...params) as any[];

    return rows.map((row) => ({
      ...row,
      result: row.result ? JSON.parse(row.result) : undefined,
    }));
  }

  // ==================== Event Logging ====================

  private logEvent(
    eventType: string,
    agentId: string | undefined,
    payload: Record<string, unknown>
  ): void {
    this.ensureInit();

    this.db!.prepare(`
      INSERT INTO events (event_type, agent_id, payload)
      VALUES (?, ?, ?)
    `).run(eventType, agentId || null, JSON.stringify(payload));
  }

  getEvents(limit: number = 100): Event[] {
    this.ensureInit();

    const rows = this.db!.prepare(`
      SELECT * FROM events ORDER BY timestamp DESC LIMIT ?
    `).all(limit) as any[];

    return rows.map((row) => ({
      ...row,
      payload: JSON.parse(row.payload),
    }));
  }

  // ==================== Room history ====================

  /** Latest messages in the room, newest first. */
  listRecentMessages(limit: number = 20): Message[] {
    this.ensureInit();

    const rows = this.db!.prepare(`
      SELECT * FROM messages ORDER BY created_at DESC, rowid DESC LIMIT ?
    `).all(limit) as any[];

    return rows.map((row) => ({
      ...row,
      content: JSON.parse(row.content),
    })) as Message[];
  }

  // ==================== Cleanup ====================

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initialized = false;
    }
  }

  // Clear old processed messages (older than 24 hours)
  cleanup(): void {
    this.ensureInit();
    const cutoff = Math.floor(Date.now() / 1000) - 86400;

    this.db!.prepare(`
      DELETE FROM messages WHERE status = 'processed' AND processed_at < ?
    `).run(cutoff);
  }
}
