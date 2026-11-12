/**
 * Send a message from Claude to OpenCode
 */

import { getClaudeAdapter } from "./claude-adapter";

(async () => {
  const adapter = getClaudeAdapter();
  await adapter.init();

  console.log("📤 Sending task to OpenCode...\n");

  try {
    const taskId = await adapter.delegateToOpenCode(
      "Review the authentication system and suggest improvements",
      {
        files: [
          "app/auth/signin/page.tsx",
          "app/auth/signup/page.tsx",
          "lib/auth.ts"
        ],
        priority: "medium",
        context: "Security review requested by user"
      }
    );

    console.log(`✓ Task sent successfully!`);
    console.log(`  Task ID: ${taskId}\n`);

    console.log("⏳ Waiting for OpenCode to complete the task...\n");

    const result = await adapter.waitForTask(taskId, 30000); // 30 second timeout

    console.log("✅ Task completed!\n");
    console.log("📋 Result:");
    console.log(JSON.stringify(result, null, 2));

  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
  } finally {
    adapter.shutdown();
  }
})();
