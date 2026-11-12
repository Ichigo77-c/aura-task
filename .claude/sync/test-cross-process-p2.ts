/**
 * Cross-Process Test - Process 2 (OpenCode)
 * Simulates OpenCode worker receiving and executing tasks
 */

import { SyncBroker } from "./broker";

(async () => {
  const broker = new SyncBroker();
  await broker.init();

  console.log("[P2-OpenCode] Starting...");

  // Register OpenCode agent
  const opencode = broker.registerAgent("OpenCode", "opencode", {
    test: true,
    pid: process.pid
  });
  console.log(`[P2-OpenCode] Registered as ${opencode.id}`);

  console.log("[P2-OpenCode] Polling for tasks (30s timeout)...");

  // Poll for tasks
  let attempts = 0;
  const maxAttempts = 30;
  let taskFound = false;

  while (attempts < maxAttempts && !taskFound) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    attempts++;

    const inbox = broker.getInbox(opencode.id, "pending");

    if (inbox.length > 0) {
      const msg = inbox[0];
      console.log(`[P2-OpenCode] ✓ Task received after ${attempts}s:`);
      console.log(JSON.stringify(msg.content, null, 2));

      // Mark as delivered
      broker.markDelivered(msg.id);
      broker.updateAgentStatus(opencode.id, "busy");

      const taskId = msg.content.task_id as string;
      const description = msg.content.description as string;

      // Update task status
      broker.updateTaskStatus(taskId, "in_progress");
      console.log("[P2-OpenCode] Processing task...");

      // Simulate work
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Complete task
      const result = {
        success: true,
        files_created: ["app/settings/page.tsx"],
        changes: ["Added dark mode toggle component", "Updated theme provider"],
        completed_at: new Date().toISOString(),
      };

      broker.updateTaskStatus(taskId, "completed", result);

      // Send result back
      broker.sendMessage(opencode.id, msg.from_agent, "result", {
        task_id: taskId,
        ...result,
      });

      broker.markProcessed(msg.id);
      broker.updateAgentStatus(opencode.id, "idle");

      console.log("[P2-OpenCode] ✓ Task completed and result sent!");
      taskFound = true;
    } else if (attempts % 5 === 0) {
      console.log(`[P2-OpenCode] Still waiting... (${attempts}s)`);
    }
  }

  if (!taskFound) {
    console.error("[P2-OpenCode] ❌ No task received within timeout");
    process.exit(1);
  }

  // Show final state
  console.log("\n[P2-OpenCode] Final database state:");
  console.log("Agents:", broker.listAgents().length);
  console.log("Tasks:", broker.listTasks().length);
  console.log("Events:", broker.getEvents(20).length);

  broker.close();
  console.log("[P2-OpenCode] Done!");
})();
