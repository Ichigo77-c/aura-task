/**
 * Claude Code Adapter
 * Integrates the sync broker with Claude Code
 */

import { SyncBroker } from "./broker";

export class ClaudeAdapter {
  private broker: SyncBroker;
  private agentId: string | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.broker = new SyncBroker();
  }

  /**
   * Initialize Claude agent in the sync system
   */
  async init(): Promise<string> {
    await this.broker.init();

    const agent = this.broker.registerAgent("Claude Code", "claude-code", {
      pid: process.pid,
      cwd: process.cwd(),
    });

    this.agentId = agent.id;

    // Start heartbeat (every 10 seconds)
    this.heartbeatInterval = setInterval(() => {
      if (this.agentId) {
        this.broker.heartbeat(this.agentId);
      }
    }, 10000);

    console.log(`[Claude Adapter] Registered as ${agent.id}`);
    return agent.id;
  }

  /**
   * Send a task to OpenCode
   */
  async delegateToOpenCode(description: string, context?: Record<string, unknown>): Promise<string> {
    if (!this.agentId) throw new Error("Adapter not initialized");

    // Find OpenCode agent
    const agents = this.broker.listAgents();
    const opencode = agents.find((a) => a.type === "opencode" && a.status !== "offline");

    if (!opencode) {
      throw new Error("OpenCode agent not available");
    }

    // Create task
    const task = this.broker.createTask(description, opencode.id, this.agentId);

    // Send message with context
    this.broker.sendMessage(this.agentId, opencode.id, "task", {
      task_id: task.id,
      description,
      context: context || {},
    });

    this.broker.updateAgentStatus(this.agentId, "busy");

    return task.id;
  }

  /**
   * Check for incoming messages from OpenCode
   */
  checkInbox(): Array<{ id: string; type: string; content: Record<string, unknown> }> {
    if (!this.agentId) return [];

    const messages = this.broker.getInbox(this.agentId, "pending");

    return messages.map((msg) => {
      // Mark as delivered
      this.broker.markDelivered(msg.id);
      return {
        id: msg.id,
        type: msg.type,
        content: msg.content,
      };
    });
  }

  /**
   * Mark a message as processed
   */
  ackMessage(messageId: string): void {
    this.broker.markProcessed(messageId);
  }

  /**
   * Send a result back to OpenCode
   */
  sendResult(taskId: string, result: Record<string, unknown>): void {
    if (!this.agentId) throw new Error("Adapter not initialized");

    const task = this.broker.getTask(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    // Update task
    this.broker.updateTaskStatus(taskId, "completed", result);

    // Send result message
    this.broker.sendMessage(this.agentId, task.created_by, "result", {
      task_id: taskId,
      result,
    });

    this.broker.updateAgentStatus(this.agentId, "idle");
  }

  /**
   * Get task status
   */
  getTaskStatus(taskId: string): string | null {
    const task = this.broker.getTask(taskId);
    return task ? task.status : null;
  }

  /**
   * Wait for task completion
   */
  async waitForTask(taskId: string, timeoutMs: number = 300000): Promise<Record<string, unknown>> {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const task = this.broker.getTask(taskId);

        if (!task) {
          clearInterval(checkInterval);
          reject(new Error("Task not found"));
          return;
        }

        if (task.status === "completed") {
          clearInterval(checkInterval);
          resolve(task.result || {});
          return;
        }

        if (task.status === "failed") {
          clearInterval(checkInterval);
          reject(new Error(`Task failed: ${JSON.stringify(task.result)}`));
          return;
        }

        if (Date.now() - startTime > timeoutMs) {
          clearInterval(checkInterval);
          reject(new Error("Task timeout"));
          return;
        }
      }, 1000);
    });
  }

  /**
   * List all tasks assigned to Claude
   */
  listMyTasks(status?: "pending" | "in_progress" | "completed" | "failed"): any[] {
    if (!this.agentId) return [];
    return this.broker.listTasks(this.agentId, status);
  }

  /**
   * Get recent events
   */
  getRecentEvents(limit: number = 50): any[] {
    return this.broker.getEvents(limit);
  }

  /**
   * Shutdown
   */
  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.agentId) {
      this.broker.updateAgentStatus(this.agentId, "offline");
    }

    this.broker.cleanup();
    this.broker.close();
  }
}

// Singleton instance
let instance: ClaudeAdapter | null = null;

export function getClaudeAdapter(): ClaudeAdapter {
  if (!instance) {
    instance = new ClaudeAdapter();
  }
  return instance;
}
