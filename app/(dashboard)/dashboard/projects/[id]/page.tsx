"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export default function ProjectDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params?.id as string;

  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const handledTaskRef = useRef<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");

  // New task modal
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [activeColumnId, setActiveColumnId] = useState<string>("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskPriority, setTaskPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [taskError, setTaskError] = useState("");

  // Edit task modal
  const [editingTask, setEditingTask] = useState<any>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPriority, setEditPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [editColumnId, setEditColumnId] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      const pRes = await fetch("/api/projects");
      const pData = await pRes.json();
      if (pData.success) {
        const found = pData.data.find((p: any) => p.id === projectId);
        setProject(found || null);
      }

      const tRes = await fetch(`/api/tasks?projectId=${projectId}`);
      const tData = await tRes.json();
      if (tData.success) {
        setTasks(tData.data || []);
      }
    } catch (err) {
      console.error("Error loading project details", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
    }
  }, [projectId]);

  // Aura Command deep link: /dashboard/projects/:id?task=:id highlights the card.
  useEffect(() => {
    const taskId = searchParams.get("task");
    if (!taskId || loading) return;

    const element = document.getElementById(`task-${taskId}`);
    if (!element) return;

    const frame = requestAnimationFrame(() => {
      setHighlightedTaskId(taskId);

      if (handledTaskRef.current === taskId) return;
      handledTaskRef.current = taskId;

      element.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });

      const url = new URL(window.location.href);
      url.searchParams.delete("task");
      window.history.replaceState(null, "", url.toString());
    });

    return () => cancelAnimationFrame(frame);
  }, [loading, searchParams, tasks]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !activeColumnId) return;

    try {
      setIsSubmitting(true);
      setTaskError("");
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskTitle,
          description: taskDesc,
          columnId: activeColumnId,
          priority: taskPriority,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTaskTitle("");
        setTaskDesc("");
        setTaskPriority("MEDIUM");
        setIsTaskModalOpen(false);
        fetchProjectData();
      } else {
        setTaskError(data.error || "Failed to create task");
      }
    } catch (err: any) {
      console.error("Failed to create task", err);
      setTaskError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editTitle.trim()) return;

    try {
      setIsUpdating(true);
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingTask.id,
          title: editTitle,
          description: editDesc,
          priority: editPriority,
          columnId: editColumnId,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setEditingTask(null);
        fetchProjectData();
      }
    } catch (err) {
      console.error("Failed to update task", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMoveTask = async (taskId: string, targetColumnId: string, newStatus?: string) => {
    try {
      await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: taskId,
          columnId: targetColumnId,
          ...(newStatus ? { status: newStatus } : {}),
        }),
      });
      fetchProjectData();
    } catch (err) {
      console.error("Failed to update task", err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await fetch(`/api/tasks?id=${taskId}`, {
        method: "DELETE",
      });
      if (editingTask?.id === taskId) {
        setEditingTask(null);
      }
      fetchProjectData();
    } catch (err) {
      console.error("Failed to delete task", err);
    }
  };

  const openEditModal = (task: any) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditDesc(task.description || "");
    setEditPriority(task.priority || "MEDIUM");
    setEditColumnId(task.columnId);
  };

  const board = project?.boards?.[0];
  const columns = board?.columns?.sort((a: any, b: any) => a.position - b.position) || [];

  // Filter tasks based on Search query and Priority
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesPriority = priorityFilter === "ALL" || task.priority === priorityFilter;

      return matchesSearch && matchesPriority;
    });
  }, [tasks, searchQuery, priorityFilter]);

  // Project Progress stats
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "DONE" || t.column?.name?.toLowerCase().includes("done")).length;
  const progressPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-line/70 rounded-md animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-96 bg-line/70 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8 max-w-7xl mx-auto text-center py-20">
        <h2 className="text-2xl font-bold text-fg-strong mb-2">Project not found</h2>
        <p className="text-muted mb-6">This project may have been deleted or moved.</p>
        <Link href="/dashboard/projects">
          <Button className="mouse-btn">Back to Projects</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col h-full min-h-[calc(100vh-2rem)]">
      {/* Header & Progress */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 bg-surface-soft p-6 rounded-2xl border border-line shadow-xs mouse-interactive-card">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted uppercase tracking-wider mb-2">
            <Link href="/dashboard/projects" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Projects</Link>
            <span>/</span>
            <span className="text-fg-strong">{project.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="w-4 h-4 rounded-full ring-4 ring-indigo-500/10 shadow-xs transition-transform duration-300 hover:scale-125"
              style={{ backgroundColor: project.color || "#6366f1" }}
            />
            <h1 className="text-2xl font-bold text-fg-strong tracking-tight">{project.name}</h1>
          </div>
          {project.description && (
            <p className="text-muted text-sm mt-1 max-w-xl">{project.description}</p>
          )}
        </div>

        {/* Progress Bar & Metric Badge */}
        <div className="flex items-center gap-6 min-w-[280px]">
          <div className="flex-1">
            <div className="flex justify-between items-center text-xs font-semibold mb-1.5">
              <span className="text-fg">Progress</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-bold">{progressPercent}%</span>
            </div>
            <div className="w-full bg-line/60 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-700 ease-out shadow-sm"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-muted mt-1">{doneTasks} of {totalTasks} tasks completed</p>
          </div>
        </div>
      </div>

      {/* Action Bar (Search & Priority Filters) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="relative w-full sm:w-80">
          <svg className="w-4 h-4 absolute left-3 top-3 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-surface-soft border-line text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all duration-200 focus:scale-[1.01]"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-line/60 p-1 rounded-xl self-start sm:self-auto">
          {["ALL", "URGENT", "HIGH", "MEDIUM", "LOW"].map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-200 ${
                priorityFilter === p
                  ? "bg-surface-soft text-indigo-700 dark:text-indigo-300 shadow-xs scale-105"
                  : "text-muted hover:text-fg-strong hover:scale-102"
              }`}
            >
              {p === "ALL" ? "All" : p}
            </button>
          ))}
        </div>
      </div>

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 items-start perspective-container">
        {columns.map((col: any) => {
          const colTasks = filteredTasks.filter((t: any) => t.columnId === col.id);

          return (
            <div
              key={col.id}
              className="kanban-col-interactive bg-surface rounded-2xl p-4 border border-line/60 flex flex-col min-h-[520px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full transition-transform duration-300 hover:scale-150"
                    style={{ backgroundColor: col.color || "#6366f1" }}
                  />
                  <h3 className="font-semibold text-fg-strong text-sm tracking-tight">{col.name}</h3>
                  <span className="bg-surface-soft/90 text-fg text-xs px-2 py-0.5 rounded-full font-bold shadow-2xs transition-transform duration-200 hover:scale-110">
                    {colTasks.length}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 rounded-lg text-muted hover:text-fg-strong hover:bg-surface-soft mouse-btn"
                  onClick={() => {
                    setActiveColumnId(col.id);
                    setIsTaskModalOpen(true);
                  }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </Button>
              </div>

              {/* Tasks List */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                {colTasks.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-line rounded-xl text-xs text-muted">
                    No tasks found
                  </div>
                ) : (
                  colTasks.map((task: any) => (
                    <Card
                      key={task.id}
                      id={`task-${task.id}`}
                      onClick={() => openEditModal(task)}
                      className={cn(
                        "mouse-interactive-card bg-surface-soft cursor-pointer border-line/80 rounded-xl group relative overflow-hidden",
                        highlightedTaskId === task.id && "task-highlight"
                      )}
                    >
                      <CardContent className="p-4 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-fg-strong text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {task.title}
                          </h4>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTask(task.id);
                            }}
                            className="text-muted/60 hover:text-red-600 transition-all p-1 hover:scale-125"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>

                        {task.description && (
                          <p className="text-xs text-muted line-clamp-2">
                            {task.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-line text-xs">
                          <Badge
                            className="transition-transform duration-200 hover:scale-105"
                            variant={
                              task.priority === "URGENT"
                                ? "destructive"
                                : task.priority === "HIGH"
                                ? "warning"
                                : "secondary"
                            }
                          >
                            {task.priority}
                          </Badge>

                          {/* Quick Move Dropdown buttons */}
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            {columns.filter((c: any) => c.id !== col.id).map((otherCol: any) => (
                              <button
                                key={otherCol.id}
                                onClick={() =>
                                  handleMoveTask(
                                    task.id,
                                    otherCol.id,
                                    otherCol.name === "Done" ? "DONE" : "IN_PROGRESS"
                                  )
                                }
                                title={`Move to ${otherCol.name}`}
                                className="px-2 py-0.5 bg-line/50 hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 rounded text-[10px] text-muted font-semibold transition-all hover:scale-105 active:scale-95 border border-line"
                              >
                                → {otherCol.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* Add Task Quick Button */}
              <Button
                variant="ghost"
                className="w-full mt-3 text-xs text-fg hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-surface-soft border border-transparent hover:border-line rounded-xl font-medium mouse-btn"
                onClick={() => {
                  setActiveColumnId(col.id);
                  setIsTaskModalOpen(true);
                }}
              >
                + Add Task
              </Button>
            </div>
          );
        })}
      </div>

      {/* Edit / Details Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-surface-soft rounded-2xl max-w-lg w-full shadow-2xl p-6 relative border border-line animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
              <h2 className="text-lg font-bold text-fg-strong">Task Details & Editing</h2>
              <button
                onClick={() => setEditingTask(null)}
                className="text-muted hover:text-fg p-1 rounded-lg hover:bg-line/60 transition-transform duration-200 hover:scale-110"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleUpdateTask} className="space-y-4">
              <div>
                <Label htmlFor="editTitle">Title *</Label>
                <Input
                  id="editTitle"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="mt-1 font-semibold focus:ring-2 focus:ring-indigo-500 transition-all focus:scale-[1.01]"
                  required
                />
              </div>

              <div>
                <Label htmlFor="editDesc">Description</Label>
                <Textarea
                  id="editDesc"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="mt-1 focus:ring-2 focus:ring-indigo-500 transition-all focus:scale-[1.01]"
                  rows={4}
                  placeholder="Add notes or task details..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Column</Label>
                  <select
                    value={editColumnId}
                    onChange={(e) => setEditColumnId(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2 bg-surface-soft border border-line rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    {columns.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Priority</Label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as any)}
                    className="w-full mt-1.5 px-3 py-2 bg-surface-soft border border-line rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-line mt-6">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="mouse-btn"
                  onClick={() => handleDeleteTask(editingTask.id)}
                >
                  Delete Task
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="mouse-btn"
                    onClick={() => setEditingTask(null)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isUpdating || !editTitle.trim()} className="bg-indigo-600 hover:bg-indigo-500/100 text-white mouse-btn">
                    {isUpdating ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-surface-soft rounded-2xl max-w-md w-full shadow-2xl p-6 relative border border-line animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-fg-strong mb-1">Create Task</h2>
            <p className="text-sm text-muted mb-5">Add a new item to your aura board</p>

            {taskError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 rounded-lg text-sm">
                {taskError}
              </div>
            )}

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <Label htmlFor="taskTitle">Title *</Label>
                <Input
                  id="taskTitle"
                  placeholder="Task title"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="mt-1 focus:ring-2 focus:ring-indigo-500 transition-all focus:scale-[1.01]"
                  required
                />
              </div>

              <div>
                <Label htmlFor="taskDesc">Description</Label>
                <Textarea
                  id="taskDesc"
                  placeholder="Additional details..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="mt-1 focus:ring-2 focus:ring-indigo-500 transition-all focus:scale-[1.01]"
                  rows={3}
                />
              </div>

              <div>
                <Label>Priority</Label>
                <div className="grid grid-cols-4 gap-2 mt-1.5">
                  {(["LOW", "MEDIUM", "HIGH", "URGENT"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setTaskPriority(p)}
                      className={`py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 hover:scale-105 active:scale-95 ${
                        taskPriority === p
                          ? "border-indigo-600 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 shadow-2xs"
                          : "border-line text-fg hover:bg-line/50"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-line mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsTaskModalOpen(false)}
                  disabled={isSubmitting}
                  className="mouse-btn"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || !taskTitle.trim()} className="bg-indigo-600 hover:bg-indigo-500/100 text-white mouse-btn">
                  {isSubmitting ? "Adding..." : "Add Task"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
