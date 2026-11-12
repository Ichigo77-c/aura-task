#!/usr/bin/env node
/**
 * One Brain Room — CLI shared by Claude Code hooks and the OpenCode plugin.
 *
 * Both agents live in the same SQLite room (.claude/sync/sync.db) and talk
 * through the SyncBroker message queue.
 *
 * Examples:
 *   npx tsx room.ts say --from claude --text "Salam, khdemt 3la auth"
 *   npx tsx room.ts inbox --agent opencode --ack
 *   npx tsx room.ts task --from claude --description "Fix login bug"
 *   npx tsx room.ts result --from opencode --task <id> --text "Fixed"
 *   npx tsx room.ts agents
 *   npx tsx room.ts log --limit 20
 */
import { SyncBroker, type Agent, type AgentType, type Message } from "./broker";

const AGENT_NAMES: Record<AgentType, string> = {
  "claude-code": "Claude Code",
  opencode: "OpenCode",
};

export function normalizeType(value: string): AgentType {
  const key = String(value ?? "").toLowerCase();
  if (key === "claude" || key === "claude-code" || key === "claude_code") return "claude-code";
  if (key === "opencode" || key === "open-code" || key === "opencode-agent") return "opencode";
  throw new Error(`Unknown agent "${value}" (use claude or opencode)`);
}

export function peerType(type: AgentType): AgentType {
  return type === "opencode" ? "claude-code" : "opencode";
}

function ensureAgent(broker: SyncBroker, type: AgentType): Agent {
  return broker.registerAgent(AGENT_NAMES[type], type, {
    pid: process.pid,
    cwd: process.cwd(),
    source: "room-cli",
  });
}

/** Read a message queue atomically enough for a 2-agent room. */
export function readQueue(
  broker: SyncBroker,
  agentId: string,
  ack: boolean,
): Message[] {
  const pending = broker.getInbox(agentId, "pending");
  const delivered = broker.getInbox(agentId, "delivered");
  const seen = new Set<string>();
  const all = [...pending, ...delivered]
    .filter((message) => (seen.has(message.id) ? false : (seen.add(message.id), true)))
    .sort((a, b) => a.created_at - b.created_at);

  for (const message of all) {
    if (ack) broker.markProcessed(message.id);
    else broker.markDelivered(message.id);
  }
  return all;
}

export function renderMessage(message: Message): string {
  const from = message.from_agent.slice(0, 8);
  const when = new Date(message.created_at * 1000).toISOString().replace("T", " ").replace(/\.\d+Z$/, "Z");
  const content = message.content as Record<string, unknown>;
  const text =
    typeof content.text === "string"
      ? content.text
      : typeof content.description === "string"
        ? content.description
        : JSON.stringify(content);
  return `[${when} ${message.type} from ${from}]\n${text}`;
}

async function withBroker<T>(fn: (broker: SyncBroker) => T | Promise<T>): Promise<T> {
  const broker = new SyncBroker();
  await broker.init();
  try {
    return await fn(broker);
  } finally {
    broker.close();
  }
}

function parseArgs(argv: string[]) {
  const args: Record<string, string | boolean> = { _: "" } as any;
  const positionals: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    } else {
      positionals.push(token);
    }
  }
  return { args, command: positionals[0], positionals };
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

function printMessages(messages: Message[], agentType: AgentType, asJson: boolean) {
  if (asJson) {
    console.log(JSON.stringify(messages, null, 2));
    return;
  }
  if (!messages.length) {
    console.log(`🧠 No new messages for ${agentType}.`);
    return;
  }
  for (const message of messages) console.log(renderMessage(message) + "\n");
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const { args, command = "log" } = parseArgs(argv);
  const asJson = Boolean(args.json);

  if (command === "say") {
    let text = typeof args.text === "string" ? args.text : "";
    if (!text && process.stdin.isTTY === false) text = (await readStdin()).trim();
    if (!text) throw new Error("Missing --text");
    const fromType = normalizeType(String(args.from ?? "claude"));
    await withBroker((broker) => {
      const from = ensureAgent(broker, fromType);
      const to = ensureAgent(broker, peerType(fromType));
      const message = broker.sendMessage(from.id, to.id, "message", {
        text,
        from_name: from.name,
        ts: Date.now(),
      });
      console.log(asJson ? JSON.stringify(message, null, 2) : `✅ ${from.name} → ${to.name}: ${text}`);
    });
    return;
  }

  if (command === "inbox") {
    const agentType = normalizeType(String(args.agent ?? args.for ?? "opencode"));
    const ack = !args["no-ack"] && args.ack !== false;
    await withBroker((broker) => {
      const agent = ensureAgent(broker, agentType);
      const messages = readQueue(broker, agent.id, ack);
      printMessages(messages, agentType, asJson);
    });
    return;
  }

  if (command === "task") {
    const description = typeof args.description === "string" ? args.description : typeof args.text === "string" ? args.text : "";
    if (!description) throw new Error("Missing --description");
    const fromType = normalizeType(String(args.from ?? "claude"));
    let context: Record<string, unknown> = {};
    if (typeof args.context === "string") context = JSON.parse(args.context);
    await withBroker((broker) => {
      const from = ensureAgent(broker, fromType);
      const to = ensureAgent(broker, peerType(fromType));
      const task = broker.createTask(description, to.id, from.id);
      const message = broker.sendMessage(from.id, to.id, "task", {
        task_id: task.id,
        description,
        context,
        priority: args.priority ?? "medium",
      });
      console.log(
        asJson
          ? JSON.stringify({ task, message }, null, 2)
          : `✅ Task ${task.id} sent to ${to.name}\n   ${description}`,
      );
    });
    return;
  }

  if (command === "result") {
    const taskId = String(args.task ?? args["task-id"] ?? "");
    if (!taskId) throw new Error("Missing --task <id>");
    const fromType = normalizeType(String(args.from ?? "opencode"));
    let result: Record<string, unknown>;
    if (typeof args.text === "string") result = { success: true, text: args.text };
    else if (typeof args.json === "string") result = JSON.parse(args.json);
    else result = { success: true };
    await withBroker((broker) => {
      const from = ensureAgent(broker, fromType);
      const task = broker.getTask(taskId);
      if (!task) throw new Error(`Task ${taskId} not found`);
      broker.updateTaskStatus(taskId, "completed", result);
      broker.sendMessage(from.id, task.created_by, "result", { task_id: taskId, ...result });
      console.log(asJson ? JSON.stringify({ taskId, result }, null, 2) : `✅ Result sent for task ${taskId}`);
    });
    return;
  }

  if (command === "status") {
    const agentType = normalizeType(String(args.agent ?? "opencode"));
    const status = String(args.status ?? "idle") as Agent["status"];
    await withBroker((broker) => {
      const agent = ensureAgent(broker, agentType);
      broker.updateAgentStatus(agent.id, status);
      console.log(`✅ ${agent.name} is now ${status}`);
    });
    return;
  }

  if (command === "agents") {
    await withBroker((broker) => {
      const agents = broker.listAgents();
      if (asJson) {
        console.log(JSON.stringify(agents, null, 2));
        return;
      }
      console.log(`🧠 Room agents (${agents.length}):`);
      for (const agent of agents) {
        const hb = new Date(agent.last_heartbeat * 1000).toISOString();
        console.log(`   - ${agent.name} [${agent.type}] ${agent.status} · heartbeat ${hb}`);
      }
    });
    return;
  }

  if (command === "log") {
    const limit = Number(args.limit ?? 20);
    await withBroker((broker) => {
      const events = broker.getEvents(limit);
      if (asJson) {
        console.log(JSON.stringify(events, null, 2));
        return;
      }
      if (!events.length) {
        console.log("🧠 Room log is empty.");
        return;
      }
      console.log(`🧠 Room log (latest ${events.length}):`);
      for (const event of events.reverse()) {
        console.log(
          `   ${new Date(event.timestamp * 1000).toISOString()} · ${event.event_type} · ${JSON.stringify(event.payload)}`,
        );
      }
    });
    return;
  }

  if (command === "help" || args.help) {
    console.log(`Usage:
  room.ts say    --from claude|opencode --text "..."
  room.ts inbox  --agent claude|opencode [--ack|--no-ack] [--json]
  room.ts task   --from claude --description "..." [--context '{"file":"..."}']
  room.ts result --from opencode --task <id> --text "..." | --json '{"success":true}'
  room.ts status --agent opencode --status idle|busy|offline
  room.ts agents [--json]
  room.ts log    [--limit 20] [--json]`);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  /room\.(ts|js|mjs)$/.test(process.argv[1].replace(/\\/g, "/"));

if (invokedDirectly) {
  main().catch((error: unknown) => {
    console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
