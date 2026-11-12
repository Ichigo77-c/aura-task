/**
 * Real OpenCode CLI bridge.
 *
 * Runs a task through `opencode run --format json` and returns the assistant
 * text. The prompt is written to stdin, so no shell quoting is involved.
 *
 * Env:
 *   OPENCODE_BIN                explicit path to the CLI (optional)
 *   ONE_BRAIN_DISABLE=1         set for the child so the one-brain plugin
 *                               does not spawn a second room daemon
 */
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

export type RunOptions = {
  prompt: string;
  cwd: string;
  timeoutMs?: number;
  model?: string;
  agent?: string;
  /** Auto-approve permissions that are not explicitly denied. Default true. */
  auto?: boolean;
  title?: string;
};

export type RunResult = {
  ok: boolean;
  text: string;
  sessionID?: string;
  cost?: number;
  tokens?: Record<string, unknown>;
  durationMs: number;
  exitCode: number | null;
  error?: string;
};

const MAX_TEXT = 20_000;

function compareVersions(a: string, b: string): number {
  const pa = a.split(/[^0-9]+/).filter(Boolean).map(Number);
  const pb = b.split(/[^0-9]+/).filter(Boolean).map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** Locate the OpenCode CLI: env override, PATH, then the desktop app bundle. */
export function findOpenCodeBinary(): string {
  const fromEnv = process.env.OPENCODE_BIN?.trim();
  if (fromEnv) {
    if (fs.existsSync(fromEnv)) return fromEnv;
    throw new Error(`OPENCODE_BIN points to a missing file: ${fromEnv}`);
  }

  const which =
    process.platform === "win32"
      ? spawnSync("where.exe", ["opencode"], { encoding: "utf8", windowsHide: true })
      : spawnSync("which", ["opencode"], { encoding: "utf8" });

  if (which.status === 0 && which.stdout) {
    const first = which.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)[0];
    if (first && fs.existsSync(first)) return first;
  }

  if (process.platform === "win32" && process.env.APPDATA) {
    const cliRoot = path.join(process.env.APPDATA, "ai.opencode.desktop", "cli");
    if (fs.existsSync(cliRoot)) {
      const versions = fs
        .readdirSync(cliRoot)
        .filter((dir) => fs.existsSync(path.join(cliRoot, dir, "opencode-cli.exe")))
        .sort(compareVersions)
        .reverse();
      if (versions[0]) return path.join(cliRoot, versions[0], "opencode-cli.exe");
    }
  }

  throw new Error(
    "OpenCode CLI not found. Set OPENCODE_BIN=/path/to/opencode or install it (npm i -g opencode-ai).",
  );
}

function killTree(child: ChildProcess): void {
  if (child.pid === undefined) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
      windowsHide: true,
      stdio: "ignore",
    });
    return;
  }
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    try {
      child.kill("SIGTERM");
    } catch {}
  }
}

/** Parse one JSON line of `opencode run --format json` output. */
function consumeLine(
  line: string,
  state: { text: string; sessionID?: string; cost?: number; tokens?: Record<string, unknown>; error?: string },
): void {
  const trimmed = line.trim();
  if (!trimmed.startsWith("{")) return;

  let event: any;
  try {
    event = JSON.parse(trimmed);
  } catch {
    return;
  }

  if (event?.sessionID && !state.sessionID) state.sessionID = String(event.sessionID);

  if (event?.type === "text" && typeof event?.part?.text === "string") {
    state.text += event.part.text;
  }

  if (event?.type === "step_finish") {
    if (typeof event?.part?.cost === "number") state.cost = event.part.cost;
    if (event?.part?.tokens) state.tokens = event.part.tokens;
  }

  if (event?.type === "error") {
    const message =
      event?.error?.data?.message ?? event?.error?.message ?? event?.message ?? "unknown OpenCode error";
    state.error = String(message);
  }
}

export function runOpenCodeTask(options: RunOptions): Promise<RunResult> {
  const startedAt = Date.now();
  const timeoutMs = options.timeoutMs ?? 15 * 60 * 1000;

  return new Promise<RunResult>((resolve) => {
    let binary: string;
    try {
      binary = findOpenCodeBinary();
    } catch (error) {
      resolve({
        ok: false,
        text: "",
        durationMs: 0,
        exitCode: null,
        error: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    const args = [
      "run",
      "--format",
      "json",
      "--archived",
      "--title",
      options.title ?? "one-brain task",
    ];
    if (options.auto !== false) args.push("--auto");
    if (options.model) args.push("--model", options.model);
    if (options.agent) args.push("--agent", options.agent);

    // `.cmd` / `.bat` shims (npm global install) need cmd.exe; args are plain
    // ASCII flags here, the prompt itself travels over stdin.
    const isShim = /\.(cmd|bat)$/i.test(binary);
    const command = isShim ? process.env.ComSpec ?? "cmd.exe" : binary;
    const commandArgs = isShim ? ["/d", "/s", "/c", binary, ...args] : args;

    let child: ChildProcess;
    try {
      child = spawn(command, commandArgs, {
        cwd: options.cwd,
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, ONE_BRAIN_DISABLE: "1" },
      });
    } catch (error) {
      resolve({
        ok: false,
        text: "",
        durationMs: Date.now() - startedAt,
        exitCode: null,
        error: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    const state: {
      text: string;
      sessionID?: string;
      cost?: number;
      tokens?: Record<string, unknown>;
      error?: string;
    } = { text: "" };
    let stderr = "";
    let stdoutBuffer = "";
    let timedOut = false;
    let settled = false;

    const finish = (exitCode: number | null, spawnError?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      const text = state.text.trim().slice(0, MAX_TEXT);
      const error = spawnError ?? state.error ?? (timedOut ? `timed out after ${timeoutMs}ms` : undefined);

      resolve({
        ok: !error && exitCode === 0 && text.length > 0,
        text,
        sessionID: state.sessionID,
        cost: state.cost,
        tokens: state.tokens,
        durationMs: Date.now() - startedAt,
        exitCode,
        error:
          error ??
          (text.length === 0 ? `opencode produced no output${stderr ? `: ${stderr.slice(-500)}` : ""}` : undefined),
      });
    };

    const timer = setTimeout(() => {
      timedOut = true;
      killTree(child);
    }, timeoutMs);

    child.stdout?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => {
      stdoutBuffer += chunk;
      const lines = stdoutBuffer.split(/\r?\n/);
      stdoutBuffer = lines.pop() ?? "";
      for (const line of lines) consumeLine(line, state);
    });

    child.stderr?.setEncoding("utf8");
    child.stderr?.on("data", (chunk: string) => {
      stderr += chunk;
      if (stderr.length > 8_000) stderr = stderr.slice(-8_000);
    });

    child.on("error", (error) => finish(null, error.message));
    child.on("close", (code) => {
      if (stdoutBuffer) consumeLine(stdoutBuffer, state);
      finish(code);
    });

    child.stdin?.on("error", () => {});
    child.stdin?.end(options.prompt, "utf8");
  });
}
