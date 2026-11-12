/**
 * OpenCode Worker — executes delegated tasks with the real OpenCode CLI.
 *
 * Polls the sync database for tasks sent by Claude Code and runs each one with
 * `opencode run` (see opencode-cli.ts), then posts the result back to the room.
 *
 *   npm run worker:start                    # hidden background, isolated DB
 *   npm run worker:start -- --live          # hidden background, live room DB
 *   npm run worker:start -- --simulate      # old behaviour: predefined results
 *   npm run worker:start -- --timeout 600   # per-task timeout in seconds
 *   npm run worker:start -- --model provider/model#variant
 *
 * Use `--simulate` only for tests/demos: it does NOT call the CLI.
 */
import * as path from "path";

import { OpenCodeAdapter } from "./opencode-adapter";
import { findOpenCodeBinary, runOpenCodeTask } from "./opencode-cli";

type Task = { id: string; description: string; context: Record<string, unknown> };

const argv = process.argv.slice(2);
const flagValue = (name: string): string | undefined => {
  const index = argv.indexOf(name);
  if (index === -1) return undefined;
  const value = argv[index + 1];
  return value && !value.startsWith("--") ? value : undefined;
};

const simulate = argv.includes("--simulate") || process.env.OPENCODE_WORKER_MODE === "simulate";
const autoApprove = !argv.includes("--no-auto");
const timeoutSeconds = Number(
  flagValue("--timeout") ?? process.env.OPENCODE_WORKER_TIMEOUT ?? 900,
);
const timeoutMs = Number.isFinite(timeoutSeconds) && timeoutSeconds > 0 ? timeoutSeconds * 1000 : 15 * 60 * 1000;
const model = flagValue("--model") ?? process.env.OPENCODE_WORKER_MODEL;
const agent = flagValue("--agent") ?? process.env.OPENCODE_WORKER_AGENT;

const repoRoot = path.resolve(__dirname, "../..");
const dbPath = process.env.ONE_BRAIN_DB ?? path.join(__dirname, "sync.db");
const background = process.env.ONE_BRAIN_WORKER_BACKGROUND === "1";

const log = (...args: unknown[]) => {
  console.log(`[${new Date().toISOString()}]`, ...args);
};

function buildPrompt(task: Task): string {
  const context = Object.keys(task.context ?? {}).length
    ? `\nContext:\n${JSON.stringify(task.context, null, 2)}\n`
    : "";

  return [
    `<one-brain-task from="Claude Code">`,
    task.description,
    context,
    `Work directly in the repository (${repoRoot}).`,
    `Do not ask questions — make reasonable assumptions and proceed.`,
    `Finish with a short summary: what you changed, and anything still blocked.`,
    `</one-brain-task>`,
  ].join("\n");
}

const adapter = new OpenCodeAdapter();

log(`🔷 OpenCode Worker starting (${simulate ? "SIMULATE" : "real CLI"})`);
log(`   DB:   ${dbPath}`);
log(`   CWD:  ${repoRoot}`);
log(`   Mode: ${simulate ? "predefined results (no CLI call)" : "opencode run"}`);
if (!simulate) {
  try {
    log(`   CLI:  ${findOpenCodeBinary()}`);
  } catch (error) {
    log(`   ⚠️  ${error instanceof Error ? error.message : String(error)}`);
  }
  log(`   Timeout: ${Math.round(timeoutMs / 1000)}s${autoApprove ? " · auto-approve" : ""}`);
}
if (background) log("   Background mode: output goes to .claude/sync/opencode-worker.log");

(async () => {
  await adapter.init();

  log("✓ worker initialized");
  log("✓ polling for tasks from Claude Code...");

  adapter.startPolling(async (task: Task) => {
    log(`📋 executing task: ${task.description}`);
    if (Object.keys(task.context ?? {}).length) log("   context:", task.context);

    if (simulate) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      return {
        success: true,
        message: `Task completed: ${task.description}`,
        timestamp: new Date().toISOString(),
        worker: "OpenCode (simulator)",
      };
    }

    const result = await runOpenCodeTask({
      prompt: buildPrompt(task),
      cwd: repoRoot,
      timeoutMs,
      model,
      agent,
      auto: autoApprove,
      title: `one-brain: ${task.description.slice(0, 60)}`,
    });

    log(
      `   ↳ ${result.ok ? "ok" : "failed"} in ${Math.round(result.durationMs / 1000)}s` +
        `${result.sessionID ? ` · ${result.sessionID}` : ""}` +
        `${typeof result.cost === "number" ? ` · $${result.cost.toFixed(4)}` : ""}`,
    );

    if (!result.ok) {
      throw new Error(result.error ?? "opencode run failed");
    }

    return {
      success: true,
      engine: "opencode-cli",
      message: result.text,
      sessionID: result.sessionID,
      cost: result.cost,
      tokens: result.tokens,
      durationMs: result.durationMs,
      timestamp: new Date().toISOString(),
      worker: "OpenCode (cli)",
    };
  });

  log("worker ready; stop with Ctrl+C (foreground) or npm run worker:stop (background)");

  const shutdown = (signal: string) => {
    log(`🛑 ${signal} — shutting down OpenCode worker...`);
    adapter.shutdown();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
})();
