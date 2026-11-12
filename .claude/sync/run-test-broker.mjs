#!/usr/bin/env node
/** Runs the single-process broker test against an isolated database. */
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

const child = spawn(process.execPath, [tsxCli, "test-broker.ts"], {
  cwd: dir,
  env: { ...process.env, ONE_BRAIN_DB: db },
  stdio: "inherit",
  windowsHide: true,
});
child.on("exit", (code) => process.exit(code ?? 1));
