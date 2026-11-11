"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Clock3,
  CornerDownLeft,
  ExternalLink,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  Loader2,
  Moon,
  Plus,
  Search,
  Sparkles,
  Sun,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

const RECENT_KEY = "aura-command-recent";
const OPEN_EVENT = "aura:command-palette";
const MAX_RECENT = 6;

type ItemKind = "nav" | "project" | "task" | "action" | "external";

type PaletteProject = {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
};

type PaletteTask = {
  id: string;
  title: string;
  description?: string | null;
  priority?: string | null;
  status?: string | null;
  columnName?: string | null;
  projectId: string;
  projectName: string;
};

type RecentEntry = {
  key: string;
  kind: Extract<ItemKind, "nav" | "project" | "task">;
  label: string;
  subtitle?: string;
  href: string;
  color?: string | null;
  priority?: string | null;
};

type PaletteItem = {
  key: string;
  kind: ItemKind;
  label: string;
  subtitle?: string;
  href?: string;
  color?: string | null;
  priority?: string | null;
  searchText?: string;
  icon: ReactNode;
  action?: () => void;
};

type PaletteSection = {
  title: string;
  items: PaletteItem[];
};

export function openCommandPalette() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(OPEN_EVENT));
  }
}

function subscribeToPlatform() {
  return () => {};
}

function getModifierSnapshot() {
  return /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent) ? "⌘" : "Ctrl";
}

function getModifierServerSnapshot() {
  return "Ctrl";
}

function readRecent(): RecentEntry[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECENT_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (entry): entry is RecentEntry =>
          Boolean(
            entry &&
              typeof entry.key === "string" &&
              typeof entry.label === "string" &&
              typeof entry.href === "string" &&
              entry.href.startsWith("/") &&
              (entry.kind === "nav" || entry.kind === "project" || entry.kind === "task")
          )
      )
      .slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

/** Fuzzy subsequence score. Exact/prefix/word-boundary hits rank highest. */
function fuzzyScore(text: string, query: string): number | null {
  const haystack = text.toLowerCase();
  const needle = query.toLowerCase().trim();
  if (!needle) return 0;

  const direct = haystack.indexOf(needle);
  if (direct !== -1) {
    let score = 120 - Math.min(direct, 50);
    if (direct === 0) score += 45;
    else if (/[\s\-_/]/.test(haystack[direct - 1] ?? "")) score += 25;
    return score;
  }

  let score = 0;
  let needleIndex = 0;
  let lastMatch = -1;
  let streak = 0;

  for (let index = 0; index < haystack.length && needleIndex < needle.length; index += 1) {
    if (haystack[index] !== needle[needleIndex]) continue;
    score += 2;
    if (index === lastMatch + 1) {
      streak += 1;
      score += streak * 3;
    } else {
      streak = 0;
    }
    if (index === 0 || /[\s\-_/]/.test(haystack[index - 1] ?? "")) {
      score += 8;
    }
    lastMatch = index;
    needleIndex += 1;
  }

  if (needleIndex < needle.length) return null;
  return score - Math.max(0, haystack.length - needle.length) * 0.04;
}

/** Metadata (description/context) only counts on real substring hits to avoid noise. */
function containsScore(text: string, query: string): number | null {
  const haystack = text.toLowerCase();
  const needle = query.toLowerCase().trim();
  if (!needle) return 0;

  const index = haystack.indexOf(needle);
  if (index === -1) return null;

  let score = 100 - Math.min(index, 50);
  if (index === 0) score += 40;
  else if (/[\s\-_/]/.test(haystack[index - 1] ?? "")) score += 20;
  return score;
}

function bestContainsScore(values: Array<string | null | undefined>, query: string): number | null {
  let best: number | null = null;
  for (const value of values) {
    if (!value) continue;
    const score = containsScore(value, query);
    if (score !== null && (best === null || score > best)) best = score;
  }
  return best;
}

function Highlight({ text, query }: { text: string; query: string }) {
  const needle = query.trim();
  if (!needle) return <>{text}</>;

  const index = text.toLowerCase().indexOf(needle.toLowerCase());
  if (index === -1) return <>{text}</>;

  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded-sm bg-transparent font-extrabold text-indigo-600 dark:text-indigo-300">
        {text.slice(index, index + needle.length)}
      </mark>
      {text.slice(index + needle.length)}
    </>
  );
}

function itemIcon(kind: ItemKind, color?: string | null): ReactNode {
  switch (kind) {
    case "project":
      return (
        <span
          className="h-2.5 w-2.5 rounded-full shadow-xs"
          style={{ backgroundColor: color || "#6366f1" }}
        />
      );
    case "task":
      return <ListTodo className="h-4 w-4" />;
    case "action":
      return <Sparkles className="h-4 w-4" />;
    case "external":
      return <ExternalLink className="h-4 w-4" />;
    default:
      return <LayoutDashboard className="h-4 w-4" />;
  }
}

function priorityClass(priority?: string | null) {
  switch (priority) {
    case "URGENT":
      return "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400";
    case "HIGH":
      return "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400";
    case "MEDIUM":
      return "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400";
    default:
      return "border-line bg-line/50 text-muted";
  }
}

export function CommandPalette() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [projects, setProjects] = useState<PaletteProject[]>([]);
  const [tasks, setTasks] = useState<PaletteTask[]>([]);
  const [recent, setRecent] = useState<RecentEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const modifier = useSyncExternalStore(
    subscribeToPlatform,
    getModifierSnapshot,
    getModifierServerSnapshot
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  const openPalette = useCallback(() => {
    lastFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setLoading(true);
    setUnauthorized(false);
    setQuery("");
    setActiveIndex(0);
    setRecent(readRecent());
    setOpen(true);
  }, []);

  // Focus search input when palette opens.
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const closePalette = useCallback(() => {
    setOpen(false);
  }, []);

  // Global shortcut + programmatic open event.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => {
          if (current) return false;
          lastFocusedRef.current =
            document.activeElement instanceof HTMLElement ? document.activeElement : null;
          setLoading(true);
          setQuery("");
          setActiveIndex(0);
          setRecent(readRecent());
          return true;
        });
      }
    };
    const onOpen = () => openPalette();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, [openPalette]);

  // Restore focus when the palette closes.
  useEffect(() => {
    if (open) return;
    const target = lastFocusedRef.current;
    if (target) requestAnimationFrame(() => target.focus());
  }, [open]);

  // Fresh workspace data on open (server-side filtered while typing).
  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(
      async () => {
        try {
          const params = new URLSearchParams();
          const q = query.trim();
          if (q) params.set("q", q);
          const res = await fetch(`/api/search?${params.toString()}`, {
            signal: controller.signal,
          });
          if (res.status === 401) {
            if (!controller.signal.aborted) {
              setUnauthorized(true);
              setProjects([]);
              setTasks([]);
            }
            return;
          }
          if (!res.ok) return;
          const json = await res.json();
          if (!json?.success) return;
          if (!controller.signal.aborted) {
            setUnauthorized(false);
            setProjects((json.data?.projects ?? []) as PaletteProject[]);
            setTasks((json.data?.tasks ?? []) as PaletteTask[]);
          }
        } catch (error) {
          if ((error as Error).name !== "AbortError") {
            // Palette should fail quietly if data is temporarily unavailable.
          }
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      },
      query.trim() ? 140 : 0
    );

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [open, query]);

  // Lock background scrolling while the palette is open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const rememberItem = useCallback((item: PaletteItem) => {
    if (!item.href || (item.kind !== "nav" && item.kind !== "project" && item.kind !== "task")) {
      return;
    }

    const entry: RecentEntry = {
      key: item.key,
      kind: item.kind,
      label: item.label,
      subtitle: item.subtitle,
      href: item.href,
      color: item.color,
      priority: item.priority,
    };

    setRecent((previous) => {
      const next = [entry, ...previous.filter((candidate) => candidate.key !== entry.key)].slice(
        0,
        MAX_RECENT
      );
      try {
        window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        // Ignore unavailable storage.
      }
      return next;
    });
  }, []);

  const select = useCallback(
    (item: PaletteItem) => {
      closePalette();
      if (item.kind === "action" || item.kind === "external") {
        if (item.action) item.action();
        else if (item.href) window.open(item.href, "_blank", "noopener,noreferrer");
        return;
      }

      rememberItem(item);
      if (item.href) router.push(item.href);
    },
    [closePalette, rememberItem, router]
  );

  const navItems = useMemo<PaletteItem[]>(
    () => [
      {
        key: "nav:/dashboard",
        kind: "nav",
        label: "Overview",
        subtitle: "Dashboard",
        href: "/dashboard",
        searchText: "overview dashboard home",
        icon: <LayoutDashboard className="h-4 w-4" />,
      },
      {
        key: "nav:/dashboard/projects",
        kind: "nav",
        label: "Projects",
        subtitle: "Browse every project",
        href: "/dashboard/projects",
        searchText: "projects boards workspace",
        icon: <FolderKanban className="h-4 w-4" />,
      },
      {
        key: "nav:/dashboard/tasks",
        kind: "nav",
        label: "All tasks",
        subtitle: "Every task in one list",
        href: "/dashboard/tasks",
        searchText: "tasks todo list issues",
        icon: <ListTodo className="h-4 w-4" />,
      },
    ],
    []
  );

  const actionItems = useMemo<PaletteItem[]>(
    () => [
      {
        key: "action:theme",
        kind: "action",
        label: `Switch to ${theme === "dark" ? "light" : "dark"} theme`,
        subtitle: "Toggle the aura appearance",
        searchText: "dark light theme appearance mode toggle",
        icon:
          theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />,
        action: toggleTheme,
      },
      {
        key: "action:new-project",
        kind: "action",
        label: "Create new project",
        subtitle: "Open the project composer",
        searchText: "new create project add board",
        icon: <Plus className="h-4 w-4" />,
        action: () => router.push("/dashboard/projects?new=1"),
      },
      {
        key: "action:omniroute",
        kind: "external",
        label: "Open OmniRoute",
        subtitle: "Local AI gateway · localhost:20128",
        href: "http://localhost:20128",
        searchText: "omniroute ai gateway local proxy",
        icon: <ExternalLink className="h-4 w-4" />,
      },
    ],
    [router, theme, toggleTheme]
  );

  const sections = useMemo<PaletteSection[]>(() => {
    const needle = query.trim();
    const next: PaletteSection[] = [];

    const projectRows: PaletteItem[] = projects.map((project) => ({
      key: `project:${project.id}`,
      kind: "project",
      label: project.name,
      subtitle: project.description || "Project",
      searchText: project.description || undefined,
      href: `/dashboard/projects/${project.id}`,
      color: project.color,
      icon: itemIcon("project", project.color),
    }));

    const taskRows: PaletteItem[] = tasks.map((task) => ({
      key: `task:${task.id}`,
      kind: "task",
      label: task.title,
      subtitle:
        [task.projectName, task.columnName].filter(Boolean).join(" · ") || "Task",
      searchText: [task.description, task.projectName, task.columnName]
        .filter(Boolean)
        .join(" "),
      href: `/dashboard/projects/${task.projectId}?task=${task.id}`,
      priority: task.priority,
      icon: itemIcon("task"),
    }));

    const rank = (items: PaletteItem[], titleBonus = 0) =>
      items
        .map((item) => {
          const titleScore = fuzzyScore(item.label, needle);
          const directTitle = item.label.toLowerCase().includes(needle.toLowerCase());
          const usableTitleScore =
            titleScore !== null && (directTitle || titleScore >= 35)
              ? titleScore + titleBonus
              : null;
          const metaScore = bestContainsScore(
            [item.searchText, item.subtitle],
            needle
          );
          const score = usableTitleScore ?? metaScore;
          return score === null ? null : { item, score };
        })
        .filter((match): match is { item: PaletteItem; score: number } => match !== null)
        .sort((a, b) => b.score - a.score)
        .map(({ item }) => item);

    if (!needle) {
      if (recent.length > 0) {
        next.push({
          title: "Recent",
          items: recent.map((entry) => ({
            key: `recent:${entry.key}`,
            kind: entry.kind,
            label: entry.label,
            subtitle: entry.subtitle,
            href: entry.href,
            color: entry.color,
            priority: entry.priority,
            icon:
              entry.kind === "project" ? itemIcon("project", entry.color) : <Clock3 className="h-4 w-4" />,
          })),
        });
      }

      const recentKeys = new Set(recent.map((entry) => entry.key));
      const projectSuggestions = projectRows
        .filter((item) => !recentKeys.has(item.key))
        .slice(0, 5);
      const taskSuggestions = taskRows
        .filter((item) => !recentKeys.has(item.key))
        .slice(0, 5);

      if (projectSuggestions.length > 0) {
        next.push({ title: "Projects", items: projectSuggestions });
      }
      if (taskSuggestions.length > 0) {
        next.push({ title: "Tasks", items: taskSuggestions });
      }

      const nav = navItems.filter((item) => !recentKeys.has(item.key));
      const actions = actionItems.filter((item) => !recentKeys.has(item.key));
      if (nav.length > 0) next.push({ title: "Navigate", items: nav });
      if (actions.length > 0) next.push({ title: "Actions", items: actions });
      return next;
    }

    const projectMatches = rank(projectRows, 25).slice(0, 6);
    const taskMatches = rank(taskRows, 30).slice(0, 10);
    const navMatches = rank(navItems);
    const actionMatches = rank(actionItems);

    if (projectMatches.length > 0) next.push({ title: "Projects", items: projectMatches });
    if (taskMatches.length > 0) next.push({ title: "Tasks", items: taskMatches });
    if (navMatches.length > 0) next.push({ title: "Navigate", items: navMatches });
    if (actionMatches.length > 0) next.push({ title: "Actions", items: actionMatches });

    return next;
  }, [actionItems, navItems, projects, query, recent, tasks]);

  const flatItems = useMemo(() => sections.flatMap((section) => section.items), [sections]);
  const safeActiveIndex = flatItems.length === 0 ? 0 : Math.min(activeIndex, flatItems.length - 1);

  useEffect(() => {
    if (!open) return;
    const element = document.querySelector<HTMLElement>(
      `[data-command-index="${safeActiveIndex}"]`
    );
    element?.scrollIntoView({ block: "nearest" });
  }, [open, safeActiveIndex]);

  // Keyboard navigation inside the dialog.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closePalette();
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((index) =>
          flatItems.length === 0 ? 0 : (index + 1) % flatItems.length
        );
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((index) =>
          flatItems.length === 0
            ? 0
            : (index - 1 + flatItems.length) % flatItems.length
        );
        return;
      }

      if (event.key === "Home") {
        event.preventDefault();
        setActiveIndex(0);
        return;
      }

      if (event.key === "End") {
        event.preventDefault();
        setActiveIndex(Math.max(0, flatItems.length - 1));
        return;
      }

      if (event.key === "Enter") {
        const item = flatItems[safeActiveIndex];
        if (!item) return;
        event.preventDefault();
        select(item);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closePalette, flatItems, open, safeActiveIndex, select]);

  if (!open) return null;

  let runningIndex = 0;

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center px-4 pt-[10vh] sm:pt-[13vh]">
      <div
        className="command-palette-backdrop absolute inset-0 bg-slate-950/45 backdrop-blur-sm dark:bg-slate-950/70"
        onClick={closePalette}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Aura Command"
        className="command-palette-panel relative w-full max-w-2xl overflow-hidden rounded-2xl border border-line bg-surface-soft shadow-2xl shadow-indigo-950/25"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/80 to-transparent" />

        {/* Search */}
        <div className="relative flex items-center gap-3 border-b border-line px-4 py-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
            <Search className="h-5 w-5" />
          </div>
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded="true"
            aria-controls="aura-command-results"
            aria-activedescendant={
              flatItems.length > 0 ? `aura-command-item-${safeActiveIndex}` : undefined
            }
            aria-autocomplete="list"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            placeholder="Search projects, tasks, or run a command…"
            className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-fg-strong outline-none placeholder:text-muted/70"
            spellCheck={false}
            autoComplete="off"
          />
          {loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted" /> : null}
          <kbd className="hidden shrink-0 rounded-md border border-line bg-surface px-1.5 py-0.5 text-[10px] font-bold text-muted sm:block">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div
          id="aura-command-results"
          role="listbox"
          aria-label="Aura Command results"
          className="command-scroll max-h-[min(56vh,460px)] overflow-y-auto overscroll-contain p-2"
        >
          {sections.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500">
                <Search className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-fg-strong">
                {unauthorized ? "Sign in to use Aura Command" : "No aura found"}
              </p>
              <p className="mt-1 max-w-xs text-xs text-muted">
                {unauthorized
                  ? "Your session expired or you don’t have access. Sign in again to search projects and tasks."
                  : "Try a project name, a task title, or a command like “theme”."}
              </p>
            </div>
          ) : (
            sections.map((section) => (
              <div key={section.title} className="mb-1 last:mb-0">
                <div className="flex items-center gap-2 px-3 pb-1 pt-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted/80">
                    {section.title}
                  </span>
                  <span className="h-px flex-1 bg-line/70" />
                </div>
                {section.items.map((item) => {
                  const index = runningIndex;
                  runningIndex += 1;
                  const isActive = index === safeActiveIndex;

                  return (
                    <button
                      key={item.key}
                      id={`aura-command-item-${index}`}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      data-command-index={index}
                      data-command-key={item.key}
                      onMouseMove={() => setActiveIndex(index)}
                      onClick={() => select(item)}
                      className={cn(
                        "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left outline-none transition-colors duration-100",
                        isActive
                          ? "bg-indigo-500/10 text-fg-strong"
                          : "text-fg hover:bg-line/40"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors",
                          isActive
                            ? "border-indigo-500/30 bg-indigo-500/15 text-indigo-600 dark:text-indigo-300"
                            : "border-line/80 bg-surface text-muted"
                        )}
                      >
                        {item.icon}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          <Highlight text={item.label} query={query} />
                        </span>
                        {item.subtitle ? (
                          <span className="mt-0.5 block truncate text-xs text-muted">
                            {item.subtitle}
                          </span>
                        ) : null}
                      </span>

                      {item.kind === "task" && item.priority ? (
                        <span
                          className={cn(
                            "hidden shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-bold tracking-wide sm:block",
                            priorityClass(item.priority)
                          )}
                        >
                          {item.priority}
                        </span>
                      ) : null}

                      {item.kind === "external" ? (
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted" />
                      ) : null}

                      <CornerDownLeft
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 transition-opacity",
                          isActive ? "text-indigo-500 opacity-100" : "opacity-0"
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line bg-surface/60 px-4 py-2.5 text-[11px] text-muted">
          <span className="flex items-center gap-1.5">
            <kbd className="rounded border border-line bg-surface px-1 py-0.5 text-[10px] font-bold text-fg">
              <ArrowUp className="inline h-2.5 w-2.5" />
            </kbd>
            <kbd className="rounded border border-line bg-surface px-1 py-0.5 text-[10px] font-bold text-fg">
              <ArrowDown className="inline h-2.5 w-2.5" />
            </kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="rounded border border-line bg-surface px-1.5 py-0.5 text-[10px] font-bold text-fg">
              ↵
            </kbd>
            Select
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="rounded border border-line bg-surface px-1.5 py-0.5 text-[10px] font-bold text-fg">
              {modifier} K
            </kbd>
            Toggle
          </span>
          <span className="ml-auto flex items-center gap-1.5 font-semibold text-indigo-600 dark:text-indigo-300">
            <Sparkles className="h-3.5 w-3.5" />
            Aura Command
          </span>
        </div>
      </div>
    </div>
  );
}
