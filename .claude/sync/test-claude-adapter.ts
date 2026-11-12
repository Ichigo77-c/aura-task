/**
 * Test Claude Adapter
 */

import { getClaudeAdapter } from "./claude-adapter";

console.log("🧪 Testing Claude Adapter\n");

(async () => {
  const adapter = getClaudeAdapter();
  await adapter.init();

  console.log("1️⃣ Delegating task to OpenCode...");

  try {
    const taskId = await adapter.delegateToOpenCode(
      "Add user profile settings page",
      {
        files: ["app/profile/page.tsx"],
        priority: "high",
      }
    );

    console.log(`   ✓ Task ID: ${taskId}\n`);

    console.log("2️⃣ Waiting for task completion (60s timeout)...");

    const result = await adapter.waitForTask(taskId, 60000);

    console.log("   ✓ Task completed!\n");
    console.log("3️⃣ Result:");
    console.log(JSON.stringify(result, null, 2));

    console.log("\n✅ Test passed!");
  } catch (error: any) {
    console.error("\n❌ Test failed:", error.message);
    process.exit(1);
  } finally {
    adapter.shutdown();
  }
})();
