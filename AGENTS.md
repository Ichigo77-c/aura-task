<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## One Brain Room (Claude Code + OpenCode)

Had l-projet fih **room mshtarka** bin Claude Code w OpenCode, m-banya 3la SQLite
(`.claude/sync/sync.db`). L-jouj agents kay-serviw f nafs l-machine w kay-twaslo
b messages.

- **Claude Code**: l-hooks f `.claude/settings.json` kay-sifto l-prompts w l-jawab
  l-akhir l room, w kay-injectiw messages dyal OpenCode. Ma-y-blockiw-ch Claude.
- **OpenCode**: l-plugin `.opencode/plugins/one-brain/index.ts` kay-t-charger
  automatiquement w kay-expose tools: `onebrain_send`, `onebrain_inbox`,
  `onebrain_status`.
- **CLI**: `npm run room -- <say|inbox|task|result|status|agents|log> ...`
- **Docs**: `.claude/sync/README.md`

Qa3ida: ma-t-directch `.env`, credentials, wla user data l room. Redaction
best-effort kayn, walakin machi garantie.

### Simulator worker (machi l-OpenCode l-79i9i)

`opencode-worker.ts` ghir **simulator**: kay-rje3 result predefined w ma-kay-3ayetsh
l-OpenCode CLI. L-integration l-79i9ia hiya l-plugin + `room-daemon.ts`.

- Bach t-runni l-simulator b background **bla `&`**:
  `npm run worker:start` (isolated DB), `npm run worker:status`, `npm run worker:stop`.
- `&` kay-detachi l-job w Windows kay-7ell console dyal `node.exe`; ila sedditiha
  l-worker kay-mut. L-launcher kaykhdem b `windowsHide: true` w kay-rje3 dghya.
- Ma-t-runni-ch l-simulator 3la l-live DB: y9der y-consume tasks w y-rje3 results fake.
  `npm run worker:start -- --live` ghir ila bghitha b3da.
