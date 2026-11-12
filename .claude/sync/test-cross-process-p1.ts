/**
 * Cross-Process Test - Process 1 (Claude)
 * Simulates Claude Code creating tasks
 */

import { SyncBroker } from "./broker";

(async () => {
  const broker = new SyncBroker();
  await broker.init();

  console.log("[P1-Claude] Starting...");

  // Register Claude agent
  const claude = broker.registerAgent("Claude Code", "claude-code", {
    test: true,
    pid: process.pid
  });
  console.log(`[P1-Claude] Registered as ${claude.id}`);

  // Wait for OpenCode to register
  console.log("[P1-Claude] Waiting 3s for OpenCode to register...");
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Find OpenCode agent
  const agents = broker.listAgents();
  const opencode = agents.find(a => a.type === "opencode" && a.status !== "offline");

  if (!opencode) {
    console.error("[P1-Claude] ❌ OpenCode not found!");
    process.exit(1);
  }

  console.log(`[P1-Claude] Found OpenCode: ${opencode.id}`);

  // Create and send task
  console.log("[P1-Claude] Creating task...");
  const task = broker.createTask(
    "Add dark mode toggle to settings page",
    opencode.id,
    claude.id
  );

  broker.sendMessage(claude.id, opencode.id, "task", {
    task_id: task.id,
    description: task.description,
    context: {
      files: ["app/settings/page.tsx"],
      priority: "medium",
    },
  });

  console.log(`[P1-Claude] ✓ Task sent: ${task.id}`);
  console.log("[P1-Claude] Waiting for result...");

  // Poll for result (max 30 seconds)
  let attempts = 0;
  const maxAttempts = 30;

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    attempts++;

    const inbox = broker.getInbox(claude.id, "pending");

    if (inbox.length > 0) {
      const resultMsg = inbox[0];
      console.log(`[P1-Claude] ✓ Result received after ${attempts}s:`);
      console.log(JSON.stringify(resultMsg.content, null, 2));

      broker.markProcessed(resultMsg.id);

      // Verify task was completed
      const finalTask = broker.getTask(task.id);
      if (finalTask?.status === "completed") {
        console.log("[P1-Claude] ✅ Task completed successfully!");
      } else {
        console.log(`[P1-Claude] ⚠️  Task status: ${finalTask?.status}`);
      }

      break;
    }

    if (attempts % 5 === 0) {
      console.log(`[P1-Claude] Still waiting... (${attempts}s)`);
    }
  }

  if (attempts >= maxAttempts) {
    console.error("[P1-Claude] ❌ Timeout waiting for result");
    process.exit(1);
  }

  // Show final state
  console.log("\n[P1-Claude] Final database state:");
  console.log("Agents:", broker.listAgents().length);
  console.log("Tasks:", broker.listTasks().length);
  console.log("Events:", broker.getEvents(20).length);

  broker.close();
  console.log("[P1-Claude] Done!");
})();
