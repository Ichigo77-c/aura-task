# Aura Tasks - Log w L-Kholasa dyal L-Projet (By Darija)

Hada fichier kansajjlo fih kolchi li drna f l-projet bach mni t-t-mha l-chat wla t-fih l-PC, t-3awd t-fhem l-contexte b sorça.

## 1. Chno howa l-Projet?
**Aura Tasks** (li kan smito TaskFlow qbel) howa modern SaaS application dyal task management w project tracking, b style Linear & Jira modern:
- **Next.js 16** (App Router)
- **Prisma ORM** m3a **PostgreSQL** (Neon DB)
- **Tailwind CSS v4** (Dark & Indigo Aura Theme)
- **NextAuth.js** (L-authentification: Credentials w Social login)
- **PWA & Desktop Support**: Icon, manifest, w Direct Desktop download launcher.

## 2. Ach lli wajd w khdam lyoum?
- **Rebranding L-Kamel**: Smia tbeddlat l **Aura Tasks**, m3a logo jdid violet/indigo aura glow, metadata w icons jdad.
- **Home Landing Page (Modern SaaS Pro)**:
  - Dark Aura theme m3a glowing backdrop blur.
  - Linear-style typography w modern micro-animations.
  - Direct "Download Desktop App" button.
- **L-Authentification:** Pages dyal Sign In w Sign Up, m-rabtin mzyan b l-base de données w bcrypt.
- **Dashboard (`/dashboard`):** L-wajiha r-ra2issiya li kat-byen les stats, l-projets, upcoming deadlines, w les activités.
- **Les Projets (`/dashboard/projects`):** 
  - La liste dyal les projets b l-alwan dyalhom.
  - Modal bach t-creé projet jdid (smia, wasf, loun).
- **Kanban Board (`/dashboard/projects/[id]`):**
  - Les colonnes (*To Do*, *In Progress*, *Done*).
  - T-creé les tâches w t-hndlhom b les priorités (*LOW*, *MEDIUM*, *HIGH*, *URGENT*).
  - Boutonat bach t-déplaci la tâche mn colonne l colonne b zerba.
- **L-API Routes:** 
  - `/api/projects` (GET, POST)
  - `/api/tasks` (GET, POST, PATCH, DELETE)
  - `/api/download-desktop` (Direct launcher generation)

## 3. L-Build Status
- `npm run build` daz mzian 100% b najaḥ bla hta chi error.

## 4. One Brain Room (Claude Code + OpenCode)
- **Room mshtarka** bin Claude Code w OpenCode f `.claude/sync/sync.db` (SQLite, WAL).
- **Claude Code**: hooks f `.claude/settings.json` (`SessionStart`, `UserPromptSubmit`,
  `Stop`) → `.claude/sync/claude-hook.ts`. Kay-sifto l-prompts w l-jawab l-akhir l room,
  w kay-injectiw messages dyal OpenCode. Hooks ma-kay-blockiw-ch Claude (exit 0 dima).
- **OpenCode**: plugin `.opencode/plugins/one-brain/index.ts` kay-t-charger automatiquement,
  kay-spawni `.claude/sync/room-daemon.ts`, w kay-expose tools:
  `onebrain_send`, `onebrain_inbox`, `onebrain_status`.
- **Messages dyal OpenCode**: kay-banou f session b `synthetic` (`resume:false`) — kay-banou
  walakin ma-kay-triggeriw-ch turn zyada. L-jawab l-akhir kay-t-share automatiquement mnin
  session y-wli idle.
- **CLI**: `npm run room -- say|inbox|task|result|status|agents|log ...`
- **Tests**: `cd .claude/sync && npm run build && npm run test:broker && npm run test:cross-process && npm run test:claude`
  (kolhom kay-khdmo 3la Windows w kay-sta3mlo DB m-fassla via `ONE_BRAIN_DB`).
- **Docs**: `.claude/sync/README.md`.
- **Sécurité**: ma-t-directch `.env` wla credentials. Redaction best-effort kayn walakin
  machi garantie.
- **Worker (executor)**: `opencode-worker.ts` kay-nfEd tasks b l-OpenCode CLI l-79i9i
  (`opencode run --format json`, prompt 3la stdin) w kay-rje3 result + sessionID + cost.
  - Start hidden b bla `&`: `npm run worker:start` (isolated DB) · `npm run worker:status` ·
    `npm run worker:stop`.
  - `--simulate` = results predefined bla CLI (ghir l-tests); `--timeout`, `--model`,
    `--agent`, `--no-auto` kaynin.
  - `npm run start:opencode &` kay-7ell console dyal `node.exe`; seddiha = worker kay-mut.
  - Launcher: `.claude/sync/start-opencode.mjs` (`windowsHide: true`, `detached`, pid + log).
  - Ma-t-runni-ch l-worker 3la live DB (y9der y-sr9 tasks); `--live` ghir b3da.
  - `ONE_BRAIN_DISABLE=1` kay-t-passed l `opencode run` bach ma-y-spawnich room-daemon tani.
