/**
 * OpenCode Worker — SIMULATOR ONLY.
 *
 * Polls the sync database for tasks and answers them with a predefined result
 * after a short delay. It does NOT call the real OpenCode CLI.
 *
 * The real OpenCode integration runs through the plugin
 * (.opencode/plugins/one-brain/index.ts) + room-daemon.ts. Use this worker only
 * for tests or demos, on an isolated database:
 *
 *   npm run start:opencode            # hidden background (isolated DB)
 *   npm run start:opencode:fg         # foreground (Ctrl+C to stop)
 *   npm run test:claude               # task/result round-trip demo
 */

import { OpenCodeAdapter } from "./opencode-adapter";

const adapter = new OpenCodeAdapter();
const dbPath = process.env.ONE_BRAIN_DB ?? ".claude/sync/sync.db";
const background = process.env.ONE_BRAIN_WORKER_BACKGROUND === "1";

const log = (...args: unknown[]) => {
  console.log(`[${new Date().toISOString()}]`, ...args);
};

log("🔷 OpenCode Worker (SIMULATOR) starting");
log(`   DB: ${dbPath}`);
console.warn("⚠️  Predefined results only — the real OpenCode CLI is NOT called.");
console.warn("    Live integration: OpenCode plugin + room-daemon.");
if (background) console.warn("    Background mode: output goes to .claude/sync/opencode-worker.log");

(async () => {
  await adapter.init();

  log("✓ worker initialized");
  log("✓ polling for tasks from Claude Code...");

  adapter.startPolling(async (task) => {
    log(`📋 executing task: ${task.description}`);
    log("   context:", task.context);

    // Simulated work — replace with a real OpenCode CLI call if ever needed.
    await new Promise((resolve) => setTimeout(resolve, 3000));

    return {
      success: true,
      message: `Task completed: ${task.description}`,
      timestamp: new Date().toISOString(),
      worker: "OpenCode (simulator)",
    };
  });

  log("worker ready; stop with Ctrl+C (foreground) or npm run worker:stop (background)");

  const shutdown = (signal: string) => {
    log(`🛑 ${signal} — shutting down OpenCode simulator...`);
    adapter.shutdown();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
})();
