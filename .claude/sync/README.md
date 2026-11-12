# One Brain Room

Real-time shared room between **Claude Code** and **OpenCode**. Both agents run on
the same machine and talk through one SQLite database (`.claude/sync/sync.db`).

State: **live** — the OpenCode plugin and the Claude Code hooks are wired up.

## Architecture

```
┌──────────────┐   hooks (stdin/stdout)   ┌──────────────────┐
│ Claude Code  │ ───────────────────────► │ claude-hook.ts   │
└──────────────┘                          └────────┬─────────┘
                                                   │
                                          ┌────────▼─────────┐
                                          │  SyncBroker      │
                                          │  node:sqlite WAL │
                                          │  sync.db         │
                                          └────────▲─────────┘
                                                   │
┌──────────────┐   JSON lines over stdio  ┌────────┴─────────┐
│ OpenCode     │ ◄──────────────────────► │ room-daemon.ts   │
│ plugin       │                          │ (long-lived)     │
└──────────────┘                          └──────────────────┘
```

- **Claude Code side** — `.claude/settings.json` registers three hooks
  (`SessionStart`, `UserPromptSubmit`, `Stop`) that run `claude-hook.ts`.
- **OpenCode side** — `.opencode/plugins/one-brain/index.ts` is loaded
  automatically and spawns `room-daemon.ts`, a long-lived process that owns the
  OpenCode agent in the same database.
- **Shared CLI** — `room.ts` lets either agent (or a human) read and write the
  room from a terminal.
- **Source of truth** — `sync.db`. Everything is local; no server, no network.

## Components

| File | Purpose |
|------|---------|
| `broker.ts` | Core broker: agents, messages, tasks, events, secret redaction |
| `room.ts` | Shared CLI (`say`, `inbox`, `task`, `result`, `status`, `agents`, `log`) |
| `room-daemon.ts` | Long-lived OpenCode-side daemon (JSON lines over stdio) |
| `claude-hook.ts` | Claude Code hook handler (`session-start`, `prompt`, `stop`) |
| `.opencode/plugins/one-brain/index.ts` | OpenCode plugin: tools + auto sync |
| `schema.sql` | Database schema |
| `sync.db` | Live room database (created on first run) |

## Message types

| Type | Meaning |
|------|---------|
| `message` | Plain chat between the two agents (what the room mostly uses) |
| `task` | Work delegated to the peer, tracked in the `tasks` table |
| `result` | Outcome of a `task` |
| `status` | Agent status update |
| `context` | Extra shared context |

## What each side does automatically

**Claude Code**
- `SessionStart` — registers Claude Code and injects the latest room messages.
- `UserPromptSubmit` — posts the user prompt to the room and injects unread
  OpenCode messages as `additionalContext`.
- `Stop` — posts Claude's final assistant message to the room (deduplicated per
  message id).
- Hooks are wrapped so a failure **never** blocks Claude Code (always exit 0).

**OpenCode**
- User prompts are forwarded to the room.
- Incoming messages appear in the session as synthetic messages
  (`resume: false`) — you see them, but they don't trigger an extra model turn.
- When the session goes idle, the final assistant answer is shared with Claude.
- Incoming `task` messages are delivered as queued prompts, so OpenCode actually
  works on them and replies.
- Tools exposed to the model: `onebrain_send`, `onebrain_inbox`, `onebrain_status`.

## Usage

### CLI (both agents)

```bash
# From the repo root
npm run room -- say --from claude --text "Salam, khdemt 3la auth"
npm run room -- inbox --agent opencode --ack
npm run room -- task --from claude --description "Fix the login bug" --context '{"file":"app/auth/signin/page.tsx"}'
npm run room -- result --from opencode --task <task-id> --text "Fixed"
npm run room -- agents
npm run room -- log --limit 20
```

Full help:

```bash
npm run room -- help
```

### Background worker (Windows)

`opencode-worker.ts` polls the room for tasks and executes them with the real
OpenCode CLI (`opencode run --format json`; the prompt travels over stdin). The
result — text, session id, cost — is posted back to the room.

```bash
npm run worker:start                   # hidden background, isolated DB, real CLI
npm run worker:start -- --live         # live room DB (the plugin may also handle tasks)
npm run worker:start -- --simulate     # predefined results, no CLI call (tests only)
npm run worker:start -- --timeout 600 --model provider/model#variant
npm run worker:status
npm run worker:stop
```

- `--auto` is on by default: a delegated task may edit files and run commands.
  Use `--no-auto` to require permissions.
- The CLI is resolved from `OPENCODE_BIN`, then `PATH`, then the desktop app
  bundle (`%APPDATA%\ai.opencode.desktop\cli\*\opencode-cli.exe`).
- `ONE_BRAIN_DISABLE=1` is passed to the child, so the one-brain plugin does not
  start a second room daemon inside a headless run.
- Never start it with `npm run start:opencode &` in Git Bash: the extra `&`
  detaches the job and Windows opens a bare `node.exe` console window for the
  orphan. The launcher detaches itself with `windowsHide: true`.

### Inside OpenCode

The plugin adds three tools; just ask OpenCode to use them:

- `onebrain_send({ text })` — send a message to Claude Code.
- `onebrain_inbox()` — read unread messages from Claude Code.
- `onebrain_status()` — check that the room daemon is connected.

You can also just answer normally: the final answer is shared automatically when
the session goes idle.

### Inside Claude Code

Hooks do the work. To send something manually:

```bash
node .claude/sync/node_modules/tsx/dist/cli.mjs .claude/sync/room.ts say --from claude --text "..."
```

To delegate a real task:

```bash
node .claude/sync/node_modules/tsx/dist/cli.mjs .claude/sync/room.ts task --from claude --description "..."
```

## Simulator worker (optional, for tests/demos)

`opencode-worker.ts` is a **simulator**: it polls tasks and returns a predefined
result after 3 seconds. It does **not** call the real OpenCode CLI — the live
integration is the plugin + `room-daemon.ts`.

Because it registers as `OpenCode` too, running it on the live database would let
it consume real tasks and answer with fake results. The launcher therefore uses an
isolated database (`opencode-worker.db`) by default.

```bash
npm run worker:start              # hidden background, isolated DB
npm run worker:start -- --live    # opt in to the live room (not recommended)
npm run worker:start -- --foreground
npm run worker:status
npm run worker:stop
```

From `.claude/sync` the same launcher is available as `npm run start:opencode`,
`npm run status:opencode`, `npm run stop:opencode`.

**Never** start it with `&` (e.g. `npm run start:opencode &`). The detached job
makes Windows pop a bare `C:\Program Files\nodejs\node.exe` console window, and
closing that window kills the worker. The launcher starts one hidden process with
`windowsHide: true` and returns immediately; logs go to
`.claude/sync/opencode-worker.log`.

## Tests

All tests are Windows-safe (no bash required) and use isolated databases via the
`ONE_BRAIN_DB` environment variable, so they never touch the live room.

```bash
cd .claude/sync
npm run build              # tsc
npm run test:broker        # single-process broker test
npm run test:cross-process # two real processes sharing one DB
npm run test:claude        # Claude adapter + OpenCode worker
```

Expected output ends with `✅ ... PASSED` / `✅ Test passed!`.

## Security

`broker.sendMessage()` redacts common secret formats **before** writing to the
database:

| Input | Stored as |
|-------|-----------|
| `sk-...` | `[REDACTED_API_KEY]` |
| `ghp_...`, `github_pat_...` | `[REDACTED_GITHUB_TOKEN]` |
| `AKIA...` | `[REDACTED_AWS_KEY]` |
| `api_key=...`, `password=...`, `token=...` | `[REDACTED]` |
| `postgres://user:pass@...` | `postgres://user:[REDACTED]@...` |
| `-----BEGIN ... PRIVATE KEY-----` | body replaced with `[REDACTED]` |

Redaction is best-effort. Never paste `.env` files, credentials, or user data
into the room.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `onebrain_status` says daemon not ready | Check the OpenCode log for `[one-brain]`; make sure `.claude/sync/node_modules/tsx` exists (`cd .claude/sync && npm install`). |
| Messages not arriving | `npm run room -- log --limit 20` and `npm run room -- agents` to see queue state. |
| Database locked | The broker sets a 5s busy timeout; a crashed daemon may hold the file. Close OpenCode, then delete `sync.db-shm` / `sync.db-wal` only if no process is running. |
| Reset the room | Stop both agents, delete `sync.db`, `sync.db-wal`, `sync.db-shm`. They are recreated on next start. |

## Known limitations

- **Single machine only** — shared SQLite file, no network transport.
- **No encryption** — the DB is plaintext on disk.
- **No authentication** — any local process can read/write the DB.
- **Best-effort redaction** — not a guarantee.

## File layout

```
.claude/sync/
├── schema.sql
├── broker.ts
├── room.ts
├── room-daemon.ts
├── claude-hook.ts
├── claude-adapter.ts        # legacy programmatic adapter
├── opencode-adapter.ts      # legacy programmatic adapter
├── opencode-worker.ts       # task worker (real CLI, --simulate for tests)
├── opencode-cli.ts          # `opencode run` wrapper (JSON, timeout, kill tree)
├── test-*.ts
├── run-*.mjs                # Windows-safe runners
├── sync.db                  # live room (gitignored)
└── README.md

.opencode/plugins/one-brain/
└── index.ts                 # OpenCode plugin + tools
```
