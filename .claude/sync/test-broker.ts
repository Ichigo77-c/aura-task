/**
 * Test script for the synchronization broker
 */

import { SyncBroker } from "./broker";

console.log("🧪 Testing Synchronization Broker\n");

const broker = new SyncBroker();

(async () => {
  await broker.init();

  // 1. Register agents
  console.log("1️⃣ Registering agents...");
  const claude = broker.registerAgent("Claude Code", "claude-code", { test: true });
  const opencode = broker.registerAgent("OpenCode", "opencode", { test: true });
  console.log(`   ✓ Claude: ${claude.id}`);
  console.log(`   ✓ OpenCode: ${opencode.id}\n`);

  // 2. Create a task
  console.log("2️⃣ Creating task...");
  const task = broker.createTask(
    "Fix authentication bug in login page",
    opencode.id,
    claude.id
  );
  console.log(`   ✓ Task ID: ${task.id}\n`);

  // 3. Send message from Claude to OpenCode
  console.log("3️⃣ Sending task message...");
  const message = broker.sendMessage(claude.id, opencode.id, "task", {
    task_id: task.id,
    description: task.description,
    context: {
      file: "app/auth/signin/page.tsx",
      priority: "high",
    },
  });
  console.log(`   ✓ Message ID: ${message.id}\n`);

  // 4. Check OpenCode's inbox
  console.log("4️⃣ Checking OpenCode inbox...");
  const inbox = broker.getInbox(opencode.id);
  console.log(`   ✓ Inbox has ${inbox.length} message(s)`);
  if (inbox.length > 0) {
    console.log(`   📬 Message: ${inbox[0].type} from ${inbox[0].from_agent}`);
    console.log(`   📝 Content:`, inbox[0].content);
  }
  console.log();

  // 5. Mark message as delivered and processed
  console.log("5️⃣ Processing message...");
  broker.markDelivered(message.id);
  broker.updateTaskStatus(task.id, "in_progress");
  console.log(`   ✓ Message delivered`);
  console.log(`   ✓ Task in progress\n`);

  // Simulate work
  console.log("6️⃣ Simulating work (2s)...");
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 7. Complete task
  console.log("7️⃣ Completing task...");
  broker.updateTaskStatus(task.id, "completed", {
    fixed: true,
    changes: ["Updated bcrypt validation", "Added error handling"],
    files_modified: ["app/auth/signin/page.tsx", "lib/auth.ts"],
  });

  broker.markProcessed(message.id);
  console.log(`   ✓ Task completed\n`);

  // 8. Send result back to Claude
  console.log("8️⃣ Sending result to Claude...");
  const resultMsg = broker.sendMessage(opencode.id, claude.id, "result", {
    task_id: task.id,
    success: true,
    summary: "Authentication bug fixed successfully",
  });
  console.log(`   ✓ Result message ID: ${resultMsg.id}\n`);

  // 9. Check Claude's inbox
  console.log("9️⃣ Checking Claude inbox...");
  const claudeInbox = broker.getInbox(claude.id);
  console.log(`   ✓ Inbox has ${claudeInbox.length} message(s)`);
  if (claudeInbox.length > 0) {
    console.log(`   📬 Message: ${claudeInbox[0].type}`);
    console.log(`   📝 Content:`, claudeInbox[0].content);
  }
  console.log();

  // 10. List recent events
  console.log("🔟 Recent events:");
  const events = broker.getEvents(10);
  events.forEach((event, i) => {
    console.log(`   ${i + 1}. ${event.event_type} - ${JSON.stringify(event.payload)}`);
  });
  console.log();

  // 11. List agents
  console.log("1️⃣1️⃣ Active agents:");
  const agents = broker.listAgents();
  agents.forEach((agent) => {
    console.log(`   - ${agent.name} (${agent.type}): ${agent.status}`);
  });
  console.log();

  console.log("✅ All tests passed!");
  console.log("\n💡 The sync database is ready at: .claude/sync/sync.db");

  broker.close();
})();
