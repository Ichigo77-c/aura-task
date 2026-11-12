#!/usr/bin/env node
/**
 * Starts the OpenCode *simulator* worker as a single hidden background process.
 *
 * On Windows a detached Node child normally opens its own console window. This
 * launcher avoids that with `windowsHide: true`, redirects output to a log file
 * and writes a pid file so `--status` / `--stop` can manage it.
 *
 * Usage:
 *   node start-opencode.mjs                # hidden background, isolated DB
 *   node start-opencode.mjs --live         # hidden background, live room DB
 *   node start-opencode.mjs --foreground   # run in this terminal (Ctrl+C)
 *   node start-opencode.mjs --status
 *   node start-opencode.mjs --stop
 *   node start-opencode.mjs --db <path>
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const stateDir = path.join(dir, "state");
const pidFile = path.join(stateDir, "opencode-worker.pid");
const logFile = path.join(dir, "opencode-worker.log");
const liveDb = path.join(dir, "sync.db");
const defaultDb = path.join(dir, "opencode-worker.db");
const workerScript = "opencode-worker.ts";

function parseArgs(argv) {
  const args = { workerArgs: [] };
  const passthrough = new Set(["--timeout", "--model", "--agent"]);
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (
      token === "--status" ||
      token === "--stop" ||
      token === "--foreground" ||
      token === "--live" ||
      token === "--simulate" ||
      token === "--no-auto" ||
      token === "--help" ||
      token === "-h"
    ) {
      args[token.replace(/^--?/, "")] = true;
      if (token === "--simulate" || token === "--no-auto") args.workerArgs.push(token);
    } else if (token === "--db") {
      const value = argv[++i];
      if (!value) throw new Error("--db needs a path");
      args.db = value;
    } else if (passthrough.has(token)) {
      const value = argv[++i];
      if (!value) throw new Error(`${token} needs a value`);
      args.workerArgs.push(token, value);
    } else {
      throw new Error(`Unknown option: ${token}`);
    }
  }
  return args;
}

function readPidFile() {
  try {
    const parsed = JSON.parse(fs.readFileSync(pidFile, "utf8"));
    return typeof parsed?.pid === "number" ? parsed : null;
  } catch {
    return null;
  }
}

function isRunning(info) {
  if (!info?.pid) return false;
  try {
    process.kill(info.pid, 0);
    return true;
  } catch (error) {
    // EPERM means the process exists but we are not allowed to signal it.
    return error?.code === "EPERM";
  }
}

function tailLog(lines = 12) {
  try {
    const content = fs.readFileSync(logFile, "utf8").trimEnd();
    if (!content) return;
    const all = content.split(/\r?\n/);
    console.log(`--- last ${Math.min(lines, all.length)} log line(s) ---`);
    for (const line of all.slice(-lines)) console.log(line);
  } catch {}
}

function resolveDb(args) {
  if (args.db) return path.resolve(args.db);
  if (args.live) return liveDb;
  if (process.env.ONE_BRAIN_DB) return path.resolve(process.env.ONE_BRAIN_DB);
  return defaultDb;
}

function help() {
  console.log(`Usage:
  node start-opencode.mjs                start hidden worker (isolated DB, real CLI)
  node start-opencode.mjs --live         start hidden worker on the live room DB
  node start-opencode.mjs --simulate     predefined results, no CLI call (tests only)
  node start-opencode.mjs --foreground   run in the current terminal
  node start-opencode.mjs --status       show pid, DB and recent log
  node start-opencode.mjs --stop         stop the background worker
  node start-opencode.mjs --db <path>    use a specific database
  node start-opencode.mjs --timeout <s>  per-task timeout in seconds (default 900)
  node start-opencode.mjs --model <m>    provider/model#variant for the CLI
  node start-opencode.mjs --agent <a>    OpenCode agent to use
  node start-opencode.mjs --no-auto      do not auto-approve permissions`);
}

async function stopWorker() {
  const info = readPidFile();
  if (!info || !isRunning(info)) {
    fs.rmSync(pidFile, { force: true });
    console.log("ℹ️  OpenCode worker is not running.");
    return 0;
  }
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(info.pid), "/T", "/F"], {
      windowsHide: true,
      stdio: "ignore",
    });
  } else {
    try {
      process.kill(info.pid, "SIGTERM");
    } catch {}
  }
  fs.rmSync(pidFile, { force: true });
  console.log(`✅ Stopped OpenCode simulator (pid ${info.pid}).`);
  return 0;
}

function printStatus() {
  const info = readPidFile();
  const running = isRunning(info);
  if (running) {
    console.log(`✅ OpenCode worker running (pid ${info.pid}).`);
    console.log(`   Mode:      ${info.mode === "simulate" ? "simulate (no CLI)" : "real CLI"}`);
    console.log(`   DB:        ${info.db}`);
    console.log(`   Started:   ${info.startedAt}`);
    console.log(`   Log:       ${logFile}`);
    console.log(`   Stop with: npm run worker:stop`);
    tailLog();
  } else {
    console.log("ℹ️  OpenCode worker is not running.");
    if (info) console.log(`   (stale pid file for pid ${info.pid} — use --stop to clear it)`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || args.h) {
    help();
    return 0;
  }
  if (args.status) {
    printStatus();
    return 0;
  }
  if (args.stop) return stopWorker();

  const existing = readPidFile();
  if (isRunning(existing)) {
    console.log(`ℹ️  Already running (pid ${existing.pid}, DB ${existing.db}).`);
    tailLog(5);
    return 0;
  }

  const db = resolveDb(args);
  const mode = args.simulate ? "simulate" : "cli";
  const env = { ...process.env, ONE_BRAIN_DB: db, ONE_BRAIN_WORKER_BACKGROUND: "1" };
  const workerArgs = ["--import", "tsx", workerScript, ...args.workerArgs];

  if (args.foreground) {
    console.log(`▶️  OpenCode worker in foreground (${mode}) — DB: ${db}`);
    const child = spawn(process.execPath, workerArgs, {
      cwd: dir,
      env,
      stdio: "inherit",
      windowsHide: true,
    });
    const code = await new Promise((resolve) => child.on("exit", resolve));
    return code ?? 0;
  }

  if (db === liveDb) {
    console.warn("⚠️  --live shares the room with the real OpenCode plugin.");
    console.warn("    The worker will consume tasks that the plugin may also handle.");
  }

  fs.mkdirSync(stateDir, { recursive: true });
  const logFd = fs.openSync(logFile, "a");
  fs.writeSync(logFd, `\n=== start ${new Date().toISOString()} · db=${db} · mode=${mode} ===\n`);

  const child = spawn(process.execPath, workerArgs, {
    cwd: dir,
    env,
    detached: true,
    windowsHide: true,
    stdio: ["ignore", logFd, logFd],
  });
  fs.closeSync(logFd);
  child.unref();

  if (!child.pid) {
    console.error("❌ Failed to start the worker.");
    return 1;
  }

  fs.writeFileSync(
    pidFile,
    `${JSON.stringify({ pid: child.pid, db, mode, startedAt: new Date().toISOString() }, null, 2)}\n`,
    "utf8",
  );

  // Catch immediate crashes (bad import, locked DB, ...).
  await new Promise((resolve) => setTimeout(resolve, 900));
  if (child.exitCode !== null) {
    console.error(`❌ Worker exited immediately (code ${child.exitCode}).`);
    tailLog(15);
    fs.rmSync(pidFile, { force: true });
    return 1;
  }

  console.log(`✅ OpenCode worker running in background (pid ${child.pid}, ${mode}).`);
  console.log(`   DB:   ${db}`);
  console.log(`   Log:  ${logFile}`);
  console.log(`   Stop: npm run worker:stop`);
  return 0;
}

main()
  .then((code) => {
    process.exitCode = code ?? 0;
  })
  .catch((error) => {
    console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
