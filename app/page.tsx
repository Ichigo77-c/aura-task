import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InstallAppButton } from "@/components/shared/install-app-button";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-surface text-fg transition-colors duration-300 selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-line bg-surface-soft/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <span className="text-white font-black text-xl tracking-wider">A</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-fg-strong">Aura Tasks</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle />
            <InstallAppButton
              variant="outline"
              className="hidden md:inline-flex border-line-strong bg-surface-soft/50 hover:bg-surface-soft text-fg"
            />
            <Link href="/auth/signin">
              <Button variant="ghost" className="text-muted-soft hover:text-fg-strong hover:bg-surface-soft">Sign In</Button>
            </Link>
            <Link href="/auth/signup">
              <Button className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative container mx-auto px-6 py-28 text-center overflow-hidden">
          <div className="absolute inset-0 -z-10 flex items-center justify-center">
            <div className="w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-8 animate-pulse">
            ✨ Next-Gen Workflow & Aura Kanban
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-fg-strong mb-6 tracking-tight leading-tight">
            Manage Projects With
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-blue-400 bg-clip-text text-transparent">
              Absolute Clarity
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted mb-10 max-w-2xl mx-auto leading-relaxed">
            Elevate your team&apos;s productivity with lightning-fast kanban boards, real-time collaboration, and gorgeous aura workflows.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/signup" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto text-base px-8 py-6 bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/30 rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:-translate-y-1">
                Start Free Trial
              </Button>
            </Link>
            <a href="/api/download-desktop" download className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-8 py-6 border-2 border-indigo-500/40 bg-indigo-500/5 hover:bg-indigo-500/15 text-indigo-400 hover:text-indigo-300 rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/20">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Desktop
              </Button>
            </a>
            <InstallAppButton variant="outline" size="lg" className="w-full sm:w-auto text-base px-8 py-6 border-line-strong bg-surface-soft/60 hover:bg-surface-soft text-fg rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:-translate-y-1" />
          </div>
        </section>

        {/* Features Section */}
        <section className="bg-surface-soft/50 border-y border-line/80 py-24">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl font-bold text-center text-fg-strong mb-4 tracking-tight">
              Engineered for High-Performance Teams
            </h2>
            <p className="text-muted text-center mb-16 max-w-xl mx-auto">
              Everything you need to orchestrate tasks, boards, and deadlines with effortless style.
            </p>

            <div className="grid md:grid-cols-3 gap-8">
              <Card className="bg-surface-soft/80 border-line text-fg p-2 hover:border-indigo-500/50 transition-all duration-300">
                <CardHeader>
                  <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4 text-indigo-400">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <CardTitle className="text-fg-strong text-xl">Dynamic Kanban</CardTitle>
                  <CardDescription className="text-muted">
                    Visualize workflows with drag-and-drop columns, instant priority filters, and lightning-fast updates.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="bg-surface-soft/80 border-line text-fg p-2 hover:border-emerald-500/50 transition-all duration-300">
                <CardHeader>
                  <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 text-emerald-400">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <CardTitle className="text-fg-strong text-xl">Aura Collaboration</CardTitle>
                  <CardDescription className="text-muted">
                    Invite team members, assign tasks securely, and track live activity streams in real-time.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="bg-surface-soft/80 border-line text-fg p-2 hover:border-purple-500/50 transition-all duration-300">
                <CardHeader>
                  <div className="h-12 w-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4 text-purple-400">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <CardTitle className="text-fg-strong text-xl">Real-time Analytics</CardTitle>
                  <CardDescription className="text-muted">
                    Monitor completion rates, project health, and upcoming milestones with clean, actionable insights.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-6 py-24 text-center">
          <div className="max-w-3xl mx-auto p-12 rounded-3xl bg-gradient-to-b from-indigo-500/10 to-surface-soft/80 border border-indigo-500/20 shadow-xl shadow-indigo-500/10 relative overflow-hidden">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-600/20 via-transparent to-transparent" />

            <h2 className="text-3xl md:text-4xl font-bold text-fg-strong mb-4 tracking-tight">
              Ready to transform your workflow?
            </h2>
            <p className="text-muted mb-8 max-w-lg mx-auto">
              Join high-performing teams using Aura Tasks to build products faster and better.
            </p>
            <Link href="/auth/signup">
              <Button size="lg" className="text-base px-10 py-6 bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/30 rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:-translate-y-1 hover:shadow-2xl">
                Get Started for Free
              </Button>
            </Link>
            <a href="/api/download-desktop" download className="inline-block">
              <Button size="lg" variant="outline" className="text-base px-10 py-6 border-2 border-indigo-500/40 bg-indigo-500/5 hover:bg-indigo-500/15 text-indigo-400 hover:text-indigo-300 rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/20">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Desktop App (.exe)
              </Button>
            </a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-line bg-surface-soft/40 py-10">
        <div className="container mx-auto px-6 text-center text-muted text-sm">
          <p>&copy; 2026 Aura Tasks Inc. All rights reserved. Built with Next.js &amp; Tailwind CSS.</p>
        </div>
      </footer>
    </div>
  );
}
