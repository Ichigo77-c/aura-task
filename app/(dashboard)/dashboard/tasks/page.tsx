"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "TODO" | "IN_PROGRESS" | "DONE">("ALL");

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (data.success) {
        setTasks(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load tasks", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const filteredTasks = tasks.filter((t) => {
    if (filter === "ALL") return true;
    return t.status === filter;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-fg-strong">All Tasks</h1>
          <p className="text-muted mt-1">View and manage tasks across all your projects</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex bg-line/60 p-1 rounded-xl text-sm self-start">
          {(["ALL", "TODO", "IN_PROGRESS", "DONE"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                filter === tab
                  ? "bg-surface-soft text-fg-strong shadow-xs"
                  : "text-muted hover:text-fg-strong"
              }`}
            >
              {tab === "ALL" ? "All" : tab === "TODO" ? "To Do" : tab === "IN_PROGRESS" ? "In Progress" : "Done"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-16 bg-line/70 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-fg-strong mb-1">No tasks found</h3>
            <p className="text-muted mb-4">
              {filter === "ALL" ? "Start by adding tasks inside a project" : `No tasks with status "${filter}"`}
            </p>
            <Link href="/dashboard/projects">
              <Button>Go to Projects</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <Card key={task.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      task.status === "DONE"
                        ? "bg-green-500"
                        : task.status === "IN_PROGRESS"
                        ? "bg-blue-500"
                        : "bg-muted"
                    }`}
                  />
                  <div className="min-w-0">
                    <h4 className="font-medium text-fg-strong text-sm truncate">{task.title}</h4>
                    {task.description && (
                      <p className="text-xs text-muted truncate mt-0.5">{task.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Badge
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
                  <span className="text-xs text-muted">
                    {task.column?.name || "Column"}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
