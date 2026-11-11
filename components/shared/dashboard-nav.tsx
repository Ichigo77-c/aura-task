"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/lib/utils";
import { InstallAppButton } from "@/components/shared/install-app-button";
import { openCommandPalette } from "@/components/shared/command-palette";
import { ThemeToggle } from "@/components/theme-toggle";

interface DashboardNavProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: (
      <svg className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    title: "Projects",
    href: "/dashboard/projects",
    icon: (
      <svg className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
  },
  {
    title: "Tasks",
    href: "/dashboard/tasks",
    icon: (
      <svg className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
];

function subscribeToPlatform() {
  return () => {};
}

function getModifierSnapshot() {
  return /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent) ? "⌘" : "Ctrl";
}

function getModifierServerSnapshot() {
  return "Ctrl";
}

export default function DashboardNav({ user }: DashboardNavProps) {
  const pathname = usePathname();
  const modifier = useSyncExternalStore(
    subscribeToPlatform,
    getModifierSnapshot,
    getModifierServerSnapshot
  );

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  return (
    <aside className="flex w-64 flex-col border-r border-line bg-surface-soft/90 backdrop-blur-md shadow-xs transition-colors duration-300">
      {/* Logo + theme toggle */}
      <div className="flex h-18 items-center justify-between gap-2 border-b border-line px-4">
        <Link href="/dashboard" className="flex items-center space-x-3 group">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-blue-500 flex items-center justify-center shadow-md shadow-indigo-500/25 transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
            <span className="text-white font-black text-lg">A</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-fg-strong group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Aura Tasks</span>
        </Link>
        <ThemeToggle className="h-9 w-9" />
      </div>

      {/* Command palette trigger */}
      <div className="px-3 pt-4">
        <button
          type="button"
          onClick={openCommandPalette}
          aria-label={`Open Aura Command (${modifier}+K)`}
          title={`Search projects and tasks (${modifier}+K)`}
          className="group flex w-full items-center gap-2.5 rounded-xl border border-line bg-surface/80 px-3 py-2.5 text-left text-sm text-muted shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-500/40 hover:bg-surface hover:text-fg-strong hover:shadow-md hover:shadow-indigo-500/5"
        >
          <Search className="h-4 w-4 shrink-0 transition-colors group-hover:text-indigo-500 dark:group-hover:text-indigo-400" />
          <span className="min-w-0 flex-1 truncate font-medium">Quick search</span>
          <kbd className="shrink-0 rounded-md border border-line bg-surface-soft px-1.5 py-0.5 text-[10px] font-bold text-muted transition-colors group-hover:border-indigo-500/30 group-hover:text-indigo-600 dark:group-hover:text-indigo-300">
            {modifier} K
          </kbd>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1.5 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center space-x-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200",
                isActive
                  ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 shadow-xs border border-indigo-500/20 scale-[1.02]"
                  : "text-muted hover:bg-surface hover:text-fg-strong hover:translate-x-1"
              )}
            >
              <div className={cn(isActive ? "text-indigo-600 dark:text-indigo-400" : "text-muted group-hover:text-fg")}>
                {item.icon}
              </div>
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="border-t border-line p-4 space-y-3 bg-surface/50">
        <InstallAppButton variant="outline" size="sm" className="w-full text-xs border-indigo-500/30 hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-300 text-indigo-600 dark:text-indigo-400 rounded-xl transition-all" />
        <div className="flex items-center space-x-3 mb-2 px-1">
          <Avatar className="ring-2 ring-indigo-500/20">
            {user.image ? (
              <AvatarImage src={user.image} alt={user.name || ""} />
            ) : null}
          <AvatarFallback className="bg-indigo-600 text-white font-bold">
              {user.name ? getInitials(user.name) : "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-fg-strong truncate">
              {user.name || "User"}
            </p>
            <p className="text-xs text-muted truncate">{user.email}</p>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full rounded-xl border-line hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-colors text-xs font-semibold"
          size="sm"
          onClick={handleSignOut}
        >
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
