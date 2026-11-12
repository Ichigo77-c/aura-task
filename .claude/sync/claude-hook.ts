#!/usr/bin/env node
/**
 * Claude Code hooks → One Brain Room.
 *
 * Modes:
 *   session-start  register Claude + inject the latest room history
 *   prompt         post the user prompt + inject unread OpenCode messages
 *   stop           post Claude's last assistant message into the room
 *
 * A hook must never block Claude Code: all failures exit 0.
 */
import fs from "node:fs";
import path from "node:path";
import { SyncBroker, type Message } from "./broker";

const MODE = process.argv[2] ?? "prompt";
const AGENT_TYPE = "claude-code" as const;
const STATE_DIR = path.join(__dirname, "state");
const ASSISTANT_STATE = path.join(STATE_DIR, "claude-assistant.json");
const MAX_TEXT = 2000;
const MAX_TOTAL = 12000;

function clip(text: string, max = MAX_TEXT): string {
  return text.length > max ? `${text.slice(0, max)}\n…[truncated]` : text;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

function projectRoot(input: any): string {
  return path.resolve(process.env.CLAUDE_PROJECT_DIR || input?.cwd || process.cwd());
}

function contentText(message: Message): string {
  const content = (message.content ?? {}) as Record<string, unknown>;
  if (typeof content.text === "string") return content.text;
  if (typeof content.description === "string") return content.description;
  return JSON.stringify(content);
}

function renderMessage(message: Message): string {
  const when = new Date(message.created_at * 1000).toISOString().replace("T", " ").replace(/\.\d+Z$/, "Z");
  return `[${when} ${message.type} from OpenCode]\n${clip(contentText(message))}`;
}

function textFromMessage(message: any): string {
  const content = message?.content ?? message?.message?.content;
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  return content
    .filter((part: any) => part && part.type === "text" && typeof part.text === "string")
    .map((part: any) => part.text)
    .join("\n")
    .trim();
}

function lastAssistantFromTranscript(transcriptPath: string | undefined): { id: string; text: string; sessionID?: string } | null {
  if (!transcriptPath) return null;
  let raw: string;
  try {
    raw = fs.readFileSync(transcriptPath, "utf8");
  } catch {
    return null;
  }
  const lines = raw.split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line) continue;
    let entry: any;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    const role = entry?.message?.role ?? entry?.type;
    if (role !== "assistant") continue;
    const text = textFromMessage(entry.message ?? entry);
    if (!text) continue;
    return {
      id: String(entry?.message?.id ?? entry?.uuid ?? `line${i}`),
      text,
      sessionID: entry?.sessionId ?? entry?.session_id,
    };
  }
  return null;
}

function readState(): { sessionID?: string; messageID?: string } {
  try {
    return JSON.parse(fs.readFileSync(ASSISTANT_STATE, "utf8"));
  } catch {
    return {};
  }
}

function writeState(value: { sessionID?: string; messageID?: string }): void {
  try {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(ASSISTANT_STATE, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  } catch {}
}

function emitContext(eventName: string, body: string): void {
  if (!body) return;
  const context = `<one-brain-room>\n${body}\n</one-brain-room>`;
  process.stdout.write(
    JSON.stringify({ hookSpecificOutput: { hookEventName: eventName, additionalContext: context } }),
  );
}

function ensureAgent(broker: SyncBroker) {
  return broker.registerAgent("Claude Code", AGENT_TYPE, {
    pid: process.pid,
    cwd: process.cwd(),
    source: "claude-hook",
  });
}

async function main(): Promise<void> {
  let input: any = {};
  try {
    const raw = await readStdin();
    if (raw.trim()) input = JSON.parse(raw);
  } catch {
    input = {};
  }

  const root = projectRoot(input);
  const broker = new SyncBroker();
  await broker.init();
  const claude = ensureAgent(broker);
  broker.heartbeat(claude.id);

  if (MODE === "session-start") {
    const recent = broker.listRecentMessages(12).filter((message) => message.from_agent !== claude.id).reverse();
    const body = recent.map(renderMessage).join("\n\n");
    emitContext(
      "SessionStart",
      body
        ? `Shared room with OpenCode — latest messages:\n\n${body}\n\nReply with: node .claude/sync/node_modules/tsx/dist/cli.mjs .claude/sync/room.ts say --from claude --text "..."`
        : "",
    );
    broker.close();
    return;
  }

  if (MODE === "prompt") {
    const prompt = String(input.prompt ?? "").trim();
    if (prompt) {
      const peer = broker.registerAgent("OpenCode", "opencode", { source: "claude-hook" });
      broker.sendMessage(claude.id, peer.id, "message", { text: clip(prompt), from_name: claude.name, ts: Date.now() });
    }

    const pending = broker.getInbox(claude.id, "pending");
    const delivered = broker.getInbox(claude.id, "delivered");
    const seen = new Set<string>();
    const inbox = [...pending, ...delivered]
      .filter((message) => (seen.has(message.id) ? false : (seen.add(message.id), true)))
      .sort((a, b) => a.created_at - b.created_at);

    let total = 0;
    const blocks: string[] = [];
    for (const message of inbox) {
      const block = renderMessage(message);
      if (total + block.length > MAX_TOTAL) break;
      blocks.push(block);
      total += block.length;
      broker.markProcessed(message.id);
    }
    emitContext("UserPromptSubmit", blocks.length ? `New messages from OpenCode:\n\n${blocks.join("\n\n")}` : "");
    broker.close();
    return;
  }

  if (MODE === "stop") {
    const last = lastAssistantFromTranscript(input.transcript_path ?? input.transcriptPath);
    if (last?.text) {
      const state = readState();
      if (state.messageID !== last.id) {
        const peer = broker.registerAgent("OpenCode", "opencode", { source: "claude-hook" });
        broker.sendMessage(claude.id, peer.id, "message", {
          text: clip(last.text),
          from_name: claude.name,
          ts: Date.now(),
          final: true,
        });
        writeState({ sessionID: input.session_id ?? last.sessionID, messageID: last.id });
      }
    }
    broker.close();
    return;
  }

  throw new Error(`Unknown hook mode: ${MODE}`);
}

main().catch((error: unknown) => {
  // Never break Claude Code because of room sync trouble.
  console.error(`[one-brain hook] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 0;
});
