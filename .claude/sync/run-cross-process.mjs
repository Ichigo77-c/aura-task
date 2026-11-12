#!/usr/bin/env node
/**
 * Cross-process test runner that works on Windows (no bash needed).
 * Starts the OpenCode side first, then the Claude side, and checks both exit 0.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const tsxCli = path.join(dir, "node_modules", "tsx", "dist", "cli.mjs");
const db = path.join(dir, "test-sync.db");

for (const file of [db, `${db}-wal`, `${db}-shm`]) {
  try {
    fs.rmSync(file, { force: true });
  } catch {}
}

function run(script, label, pipe = true) {
  const child = spawn(process.execPath, [tsxCli, script], {
    cwd: dir,
    env: { ...process.env, ONE_BRAIN_DB: db },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  if (pipe) {
    const prefix = `[${label}] `;
    const print = (chunk) => {
      for (const line of chunk.toString().split(/\r?\n/)) {
        if (line.trim()) console.log(prefix + line);
      }
    };
    child.stdout.on("data", print);
    child.stderr.on("data", print);
  }
  return child;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const p2 = run("test-cross-process-p2.ts", "P2-OpenCode");
const p2exit = new Promise((resolve) => p2.on("exit", resolve));
await wait(2000);
const p1 = run("test-cross-process-p1.ts", "P1-Claude");
const p1exit = new Promise((resolve) => p1.on("exit", resolve));

const code1 = await p1exit;
const code2 = await p2exit;

console.log("");
if (code1 === 0 && code2 === 0) {
  console.log("✅ Cross-process test PASSED (2 separate processes).");
  process.exit(0);
}
console.error(`❌ Cross-process test FAILED (P1=${code1}, P2=${code2}).`);
process.exit(1);
