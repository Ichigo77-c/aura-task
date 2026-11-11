"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title="Switch between dark and light mode"
      aria-label="Switch between dark and light mode"
      className={cn(
        "theme-toggle inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all duration-200",
        "border-line bg-surface-soft/60 text-muted",
        "hover:border-indigo-500/60 hover:bg-surface-soft hover:text-fg-strong",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        "active:scale-95",
        className
      )}
    >
      <Sun className="icon-sun h-5 w-5" aria-hidden="true" />
      <Moon className="icon-moon h-5 w-5" aria-hidden="true" />
    </button>
  );
}
