#!/usr/bin/env node
/**
 * One Brain Room daemon — one long-lived process that owns the OpenCode side of
 * the SQLite room and speaks JSON-lines over stdio with the OpenCode plugin.
 *
 * stdout: one JSON object per line (events + command responses only)
 * stderr: human logs
 */
import readline from "node:readline";
import { SyncBroker, type Agent, type Message } from "./broker";

const POLL_MS = 1500;
const HEARTBEAT_MS = 10_000;

const broker = new SyncBroker();
let agent: Agent | null = null;
let stopped = false;

// Messages already pushed to the plugin but not acknowledged yet.
const inFlight = new Set<string>();
// Bounded dedupe between restarts of the plugin (assistant messages).
const sentKeys = new Set<string>();

function emit(payload: Record<string, unknown>): void {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

function log(message: string): void {
  process.stderr.write(`[room-daemon] ${message}\n`);
}

function rememberKey(key: string | undefined): boolean {
  if (!key) return false;
  if (sentKeys.has(key)) return true;
  sentKeys.add(key);
  if (sentKeys.size > 1000) {
    const first = sentKeys.values().next().value;
    if (first) sentKeys.delete(first);
  }
  return false;
}

function ensureAgent(type: "claude-code" | "opencode"): Agent {
  return broker.registerAgent(type === "opencode" ? "OpenCode" : "Claude Code", type, {
    pid: process.pid,
    cwd: process.cwd(),
    source: "room-daemon",
  });
}

function contentOf(message: Message): Record<string, unknown> {
  return (message.content ?? {}) as Record<string, unknown>;
}

function messageText(content: Record<string, unknown>): string {
  if (typeof content.text === "string") return content.text;
  if (typeof content.description === "string") return content.description;
  return JSON.stringify(content);
}

function describeMessage(message: Message): Record<string, unknown> {
  return {
    messageId: message.id,
    type: message.type,
    from: message.from_agent,
    createdAt: message.created_at,
    content: contentOf(message),
    text: messageText(contentOf(message)),
  };
}

function poll(): void {
  if (!agent || stopped) return;
  try {
    const pending = broker.getInbox(agent.id, "pending");
    const delivered = broker.getInbox(agent.id, "delivered");
    const seen = new Set<string>();
    const messages = [...pending, ...delivered]
      .filter((message) => (seen.has(message.id) ? false : (seen.add(message.id), true)))
      .sort((a, b) => a.created_at - b.created_at);

    for (const message of messages) {
      if (inFlight.has(message.id)) continue;
      inFlight.add(message.id);
      broker.markDelivered(message.id);

      if (message.type === "task") {
        const content = contentOf(message);
        emit({
          event: "task",
          messageId: message.id,
          taskId: content.task_id,
          description: content.description,
          context: content.context ?? {},
          priority: content.priority ?? "medium",
          from: message.from_agent,
        });
      } else {
        emit({ event: "message", ...describeMessage(message) });
      }
    }
  } catch (error) {
    emit({ event: "error", error: error instanceof Error ? error.message : String(error) });
  }
}

function handle(command: Record<string, unknown>): void {
  if (!agent) return;
  const reqId = command.reqId;
  const reply = (payload: Record<string, unknown>) => emit({ request: command.cmd, reqId, ...payload });

  try {
    switch (command.cmd) {
      case "say": {
        const text = String(command.text ?? "").trim();
        if (!text) {
          reply({ ok: false, error: "empty text" });
          return;
        }
        const dedupeKey = command.dedupeKey ? String(command.dedupeKey) : undefined;
        if (rememberKey(dedupeKey)) {
          reply({ ok: true, deduped: true });
          return;
        }
        const peer = ensureAgent("claude-code");
        broker.sendMessage(agent.id, peer.id, "message", {
          text,
          from_name: agent.name,
          ts: Date.now(),
          ...(command.meta && typeof command.meta === "object" ? { meta: command.meta } : {}),
        });
        reply({ ok: true });
        return;
      }
      case "result": {
        const taskId = String(command.taskId ?? "");
        const result = (command.result ?? { success: true }) as Record<string, unknown>;
        if (!taskId) {
          reply({ ok: false, error: "missing taskId" });
          return;
        }
        const task = broker.getTask(taskId);
        if (!task) {
          reply({ ok: false, error: `task ${taskId} not found` });
          return;
        }
        broker.updateTaskStatus(taskId, "completed", result);
        broker.sendMessage(agent.id, task.created_by, "result", { task_id: taskId, ...result });
        reply({ ok: true });
        return;
      }
      case "status": {
        const status = String(command.status ?? "idle") as Agent["status"];
        broker.updateAgentStatus(agent.id, status);
        reply({ ok: true });
        return;
      }
      case "inbox": {
        const pending = broker.getInbox(agent.id, "pending");
        const delivered = broker.getInbox(agent.id, "delivered");
        const seen = new Set<string>();
        const messages = [...pending, ...delivered]
          .filter((message) => (seen.has(message.id) ? false : (seen.add(message.id), true)))
          .sort((a, b) => a.created_at - b.created_at);
        reply({ ok: true, messages: messages.map(describeMessage) });
        return;
      }
      case "ack": {
        const id = String(command.id ?? "");
        if (id) {
          broker.markProcessed(id);
          inFlight.delete(id);
        }
        reply({ ok: true });
        return;
      }
      case "nack": {
        const id = String(command.id ?? "");
        if (id) inFlight.delete(id);
        reply({ ok: true });
        return;
      }
      case "heartbeat": {
        broker.heartbeat(agent.id);
        reply({ ok: true });
        return;
      }
      case "shutdown": {
        stopped = true;
        reply({ ok: true });
        shutdown(0);
        return;
      }
      default:
        reply({ ok: false, error: `unknown command ${String(command.cmd)}` });
    }
  } catch (error) {
    reply({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}

function shutdown(code: number): void {
  try {
    if (agent) broker.updateAgentStatus(agent.id, "offline");
  } catch {}
  try {
    broker.close();
  } catch {}
  process.exitCode = code;
  setTimeout(() => process.exit(code), 50);
}

async function start(): Promise<void> {
  await broker.init();
  agent = ensureAgent("opencode");
  log(`ready as ${agent.name} (${agent.id})`);
  emit({ event: "ready", agentId: agent.id, agentName: agent.name });

  setInterval(poll, POLL_MS);
  setInterval(() => {
    if (!agent || stopped) return;
    try {
      broker.heartbeat(agent.id);
    } catch (error) {
      log(`heartbeat failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, HEARTBEAT_MS);

  const rl = readline.createInterface({ input: process.stdin });
  rl.on("line", (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      handle(JSON.parse(trimmed) as Record<string, unknown>);
    } catch (error) {
      emit({ event: "error", error: error instanceof Error ? error.message : String(error) });
    }
  });
  rl.on("close", () => shutdown(0));

  poll();
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

start().catch((error) => {
  log(`failed to start: ${error instanceof Error ? error.message : String(error)}`);
  emit({ event: "error", error: error instanceof Error ? error.message : String(error) });
  shutdown(1);
});
