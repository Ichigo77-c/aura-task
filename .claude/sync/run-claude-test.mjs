#!/usr/bin/env node
/**
 * Runs the Claude adapter test with a live OpenCode worker, then shuts the
 * worker down. Makes `npm run test:claude` self-contained on any OS.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const tsxCli = path.join(dir, "node_modules", "tsx", "dist", "cli.mjs");
const db = path.join(dir, "test-claude.db");

for (const file of [db, `${db}-wal`, `${db}-shm`]) {
  try {
    fs.rmSync(file, { force: true });
  } catch {}
}

const worker = spawn(process.execPath, [tsxCli, "opencode-worker.ts"], {
  cwd: dir,
  env: { ...process.env, ONE_BRAIN_DB: db },
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: true,
});
worker.stdout.on("data", (chunk) => process.stdout.write(`[worker] ${chunk}`));
worker.stderr.on("data", (chunk) => process.stderr.write(`[worker] ${chunk}`));

await new Promise((resolve) => setTimeout(resolve, 2500));

const test = spawn(process.execPath, [tsxCli, "test-claude-adapter.ts"], {
  cwd: dir,
  env: { ...process.env, ONE_BRAIN_DB: db },
  stdio: "inherit",
  windowsHide: true,
});
const code = await new Promise((resolve) => test.on("exit", resolve));

try {
  worker.kill();
} catch {}

process.exit(code ?? 1);
