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
