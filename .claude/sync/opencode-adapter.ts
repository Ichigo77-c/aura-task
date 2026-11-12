/**
 * OpenCode Adapter
 * Integrates the sync broker with OpenCode CLI
 */

import { SyncBroker } from "./broker";

export class OpenCodeAdapter {
  private broker: SyncBroker;
  private agentId: string | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private pollInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.broker = new SyncBroker();
  }

  /**
   * Initialize OpenCode agent in the sync system
   */
  async init(): Promise<string> {
    await this.broker.init();

    const agent = this.broker.registerAgent("OpenCode", "opencode", {
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

    console.log(`[OpenCode Adapter] Registered as ${agent.id}`);
    return agent.id;
  }

  /**
   * Start polling for tasks from Claude Code
   */
  startPolling(handler: (task: any) => Promise<any>): void {
    if (!this.agentId) throw new Error("Adapter not initialized");

    console.log("[OpenCode Adapter] Starting task polling...");

    this.pollInterval = setInterval(async () => {
      if (!this.agentId) return;

      const messages = this.broker.getInbox(this.agentId, "pending");

      for (const msg of messages) {
        if (msg.type === "task") {
          // Mark as delivered
          this.broker.markDelivered(msg.id);
          this.broker.updateAgentStatus(this.agentId, "busy");

          const taskId = msg.content.task_id as string;
          const description = msg.content.description as string;
          const context = msg.content.context as Record<string, unknown>;

          console.log(`[OpenCode] Received task: ${description}`);

          try {
            // Update task status
            this.broker.updateTaskStatus(taskId, "in_progress");

            // Execute task
            const result = await handler({
              id: taskId,
              description,
              context,
            });

            // Mark task as completed
            this.broker.updateTaskStatus(taskId, "completed", result);

            // Send result back to Claude
            this.broker.sendMessage(this.agentId!, msg.from_agent, "result", {
              task_id: taskId,
              result,
            });

            // Mark message as processed
            this.broker.markProcessed(msg.id);

            console.log(`[OpenCode] Task completed: ${taskId}`);
          } catch (error: any) {
            console.error(`[OpenCode] Task failed: ${error.message}`);

            // Mark task as failed
            this.broker.updateTaskStatus(taskId, "failed", {
              error: error.message,
              stack: error.stack,
            });

            // Send error back
            this.broker.sendMessage(this.agentId!, msg.from_agent, "result", {
              task_id: taskId,
              error: error.message,
            });

            this.broker.markFailed(msg.id);
          } finally {
            this.broker.updateAgentStatus(this.agentId!, "idle");
          }
        }
      }
    }, 2000); // Poll every 2 seconds
  }

  /**
   * Stop polling
   */
  stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  /**
   * Send status update to Claude
   */
  sendStatus(status: string, details?: Record<string, unknown>): void {
    if (!this.agentId) throw new Error("Adapter not initialized");

    const agents = this.broker.listAgents();
    const claude = agents.find((a) => a.type === "claude-code" && a.status !== "offline");

    if (claude) {
      this.broker.sendMessage(this.agentId, claude.id, "status", {
        status,
        details: details || {},
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Shutdown
   */
  shutdown(): void {
    this.stopPolling();

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
