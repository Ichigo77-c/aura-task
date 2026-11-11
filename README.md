# TaskFlow - Project & Task Management Platform

A modern, full-stack task management application built with Next.js 14, TypeScript, and PostgreSQL. Manage projects, collaborate with teams, and track tasks with an intuitive Kanban-style interface.

## 🚀 Features

### Core Features
- ✅ **User Authentication** - Secure sign-up/sign-in with NextAuth.js
  - Email/Password authentication
  - OAuth providers (Google, GitHub)
  - Session-based authentication with JWT

- 📊 **Project Management**
  - Create and manage multiple projects
  - Color-coded project organization
  - Archive/restore projects
  - Project ownership and access control

- 📋 **Kanban Boards**
  - Drag-and-drop task management
  - Customizable columns
  - Multiple boards per project
  - Visual task organization

- ✏️ **Task Management**
  - Create, update, and delete tasks
  - Assign tasks to team members
  - Set priorities (Low, Medium, High, Urgent)
  - Due date tracking
  - Task descriptions and comments
  - Status tracking (To Do, In Progress, Done, Cancelled)

- 👥 **Team Collaboration**
  - Invite team members to projects
  - Role-based access control (Admin, Member, Viewer)
  - Real-time activity logs
  - Team member management

- 📈 **Dashboard & Analytics**
  - Project statistics
  - Task completion metrics
  - Upcoming deadlines
  - Recent activity feed

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS
- **UI Components:** Custom components built with Radix UI primitives
- **Form Handling:** React Hook Form
- **Validation:** Zod schemas
- **State Management:** React Context API + Zustand

### Backend
- **API:** Next.js API Routes (Serverless)
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** NextAuth.js v5
- **Password Hashing:** bcryptjs

### Deployment
- **Platform:** Vercel (recommended)
- **Database Hosting:** Supabase / Neon / Railway

## 📋 Prerequisites

Before you begin, ensure you have:
- Node.js 20.9 or higher
- npm, yarn, pnpm, or bun package manager
- PostgreSQL database (local or hosted)
- Git

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd taskflow
```

### 2. Install dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Set up environment variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/taskflow?schema=public"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here-generate-with-openssl-rand-base64-32"

# OAuth Providers (Optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_ID="your-github-app-id"
GITHUB_SECRET="your-github-app-secret"
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 4. Set up the database

```bash
# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma db push

# (Optional) Seed the database
npx prisma db seed
```

### 5. Run the development server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
taskflow/
├── app/                      # Next.js App Router
│   ├── (dashboard)/          # Protected dashboard routes
│   │   ├── dashboard/        # Main dashboard
│   │   └── layout.tsx        # Dashboard layout
│   ├── api/                  # API routes
│   │   ├── auth/             # Authentication endpoints
│   │   ├── projects/         # Project CRUD operations
│   │   └── tasks/            # Task CRUD operations
│   ├── auth/                 # Authentication pages
│   │   ├── signin/           # Sign in page
│   │   └── signup/           # Sign up page
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Landing page
├── components/               # React components
│   ├── ui/                   # Base UI components
│   ├── forms/                # Form components
│   └── shared/               # Shared layouts
├── lib/                      # Utility functions
│   ├── auth.ts               # NextAuth configuration
│   ├── db.ts                 # Prisma client
│   ├── utils.ts              # Utility functions
│   └── validations.ts        # Zod schemas
├── prisma/                   # Database schema
│   └── schema.prisma         # Prisma schema
├── types/                    # TypeScript types
│   └── index.ts              # Global type definitions
├── hooks/                    # Custom React hooks
└── public/                   # Static assets
```

## 🔒 Authentication Setup

### Email/Password Authentication
Users can sign up with email and password. Passwords are hashed using bcryptjs with 12 salt rounds.

### OAuth Providers

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Client Secret to `.env`

#### GitHub OAuth
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App
3. Set Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
4. Copy Client ID and Client Secret to `.env`

## 🗄️ Database Schema

The application uses a relational database with the following main entities:

- **User** - User accounts and authentication
- **Project** - Project containers
- **Board** - Kanban boards within projects
- **Column** - Board columns (To Do, In Progress, Done)
- **Task** - Individual tasks
- **Comment** - Task comments
- **Activity** - Activity logs
- **ProjectMember** - Team member associations

See `prisma/schema.prisma` for the complete schema.

## 🎨 UI Components

Custom UI components built following best practices:

- **Button** - Multiple variants and sizes
- **Input** - Form input with validation states
- **Card** - Container component
- **Badge** - Status indicators
- **Avatar** - User profile pictures
- **Label** - Form labels
- **Textarea** - Multi-line text input

## 🔐 Security Features

- Password hashing with bcryptjs
- JWT-based session management
- Protected API routes
- Role-based access control (RBAC)
- Input validation with Zod
- CSRF protection via NextAuth
- SQL injection prevention via Prisma

## 🚢 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import project to Vercel
3. Add environment variables
4. Deploy

### Database Setup

**Recommended providers:**
- [Supabase](https://supabase.com/) - Free tier available
- [Neon](https://neon.tech/) - Serverless Postgres
- [Railway](https://railway.app/) - Full-stack platform

## 📝 Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Database
npx prisma studio    # Open Prisma Studio
npx prisma generate  # Generate Prisma Client
npx prisma db push   # Push schema to database
npx prisma migrate   # Run migrations
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/)
- [Prisma](https://www.prisma.io/)
- [NextAuth.js](https://next-auth.js.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Radix UI](https://www.radix-ui.com/)

## 📧 Support

For support, email support@taskflow.com or open an issue on GitHub.

---

Built with ❤️ using Next.js and TypeScript
