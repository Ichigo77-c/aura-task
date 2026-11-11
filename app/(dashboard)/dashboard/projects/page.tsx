"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const COLOR_OPTIONS = [
  "#3b82f6", // Blue
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#f59e0b", // Amber
  "#10b981", // Emerald
  "#06b6d4", // Cyan
  "#f43f5e", // Rose
  "#6366f1", // Indigo
];

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default function ProjectsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366f1");

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (data.success) {
        setProjects(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load projects", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Aura Command deep link: /dashboard/projects?new=1 opens the composer once.
  const handledNewRef = useRef(false);
  useEffect(() => {
    if (searchParams.get("new") !== "1") {
      handledNewRef.current = false;
      return;
    }
    if (handledNewRef.current) return;
    handledNewRef.current = true;

    setIsModalOpen(true);
    // Clean the URL without scrolling; keep history tidy.
    router.replace("/dashboard/projects", { scroll: false });
  }, [router, searchParams]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      setError("");

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, color }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create project");
        return;
      }

      setName("");
      setDescription("");
      setColor("#6366f1");
      setIsModalOpen(false);
      fetchProjects();
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-fg-strong tracking-tight">Projects</h1>
          <p className="text-muted mt-1 text-sm">Organize your tasks and aura workflows into projects</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="mouse-btn bg-indigo-600 hover:bg-indigo-500 text-white font-semibold">
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Project
        </Button>
      </div>

      {/* Search Bar & Filters */}
      <div className="mb-8 flex items-center gap-4 group">
        <div className="relative flex-1 max-w-md transition-all duration-300 group-hover:max-w-lg">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted transition-all duration-300 group-hover:text-indigo-500 group-hover:scale-125" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <Input
            placeholder="Search projects by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-surface-soft/80 border-line focus:ring-2 focus:ring-indigo-500 rounded-xl transition-all focus:shadow-lg focus:shadow-indigo-500/20 focus:bg-surface-soft"
          />
        </div>
        <div className="text-xs font-semibold text-muted hidden sm:block transition-all duration-300 group-hover:text-fg group-hover:scale-105">
          Showing {filteredProjects.length} of {projects.length} projects
        </div>
      </div>

      {/* Project Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-44 rounded-2xl bg-line/70 animate-pulse" />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card className="border-dashed border-2 border-line mouse-interactive-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-300 mb-4 transition-transform duration-300 hover:scale-110">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-fg-strong mb-2">No projects found</h3>
            <p className="text-muted max-w-sm text-center mb-6 text-sm">
              {searchQuery ? "No projects match your search query." : "Create your first project to start organizing tasks and aura boards."}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsModalOpen(true)} className="mouse-btn bg-indigo-600 hover:bg-indigo-500 text-white font-semibold">
                Create Project
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 perspective-container">
          {filteredProjects.map((project, idx) => (
            <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
              <Card className="mouse-interactive-card border border-line/80 hover:border-indigo-300 h-full flex flex-col justify-between rounded-2xl group stagger-item hover:shadow-xl hover:shadow-indigo-500/25 transition-all duration-300 transform hover:scale-105 hover:-translate-y-2" style={{ animationDelay: `${idx * 0.05}s` }}>
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs transition-all duration-300 group-hover:scale-150 group-hover:shadow-lg"
                        style={{ backgroundColor: project.color || "#6366f1" }}
                      />
                      <CardTitle className="text-lg font-bold truncate text-fg-strong group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-all duration-300 group-hover:translate-x-1">
                        {project.name}
                      </CardTitle>
                    </div>
                  </div>
                  <CardDescription className="line-clamp-2 min-h-[40px] text-muted text-xs leading-relaxed group-hover:text-fg/60 transition-colors duration-300">
                    {project.description || "No description provided."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-xs text-muted border-t border-line pt-4 group-hover:text-fg transition-all duration-300">
                    <span className="flex items-center gap-1.5 font-medium transition-transform duration-300 group-hover:translate-x-0.5">
                      <svg className="w-4 h-4 text-indigo-400 transition-all duration-300 group-hover:rotate-6 group-hover:scale-125" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
                      </svg>
                      {project._count?.boards || 1} Boards
                    </span>
                    <span className="flex items-center gap-1 text-[11px] bg-line/60 px-2 py-1 rounded-md text-muted font-medium transition-all duration-300 group-hover:bg-indigo-500/20 group-hover:text-indigo-400">
                      <svg className="w-3.5 h-3.5 text-indigo-500 transition-transform duration-300 group-hover:rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {project.updatedAt ? formatTimeAgo(project.updatedAt) : "Recently"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-surface-soft rounded-2xl max-w-md w-full shadow-2xl p-6 relative animate-in zoom-in-95 duration-200 border border-line hover:shadow-2xl hover:shadow-indigo-500/30 transition-all">
            <h2 className="text-xl font-bold text-fg-strong mb-1 transition-colors duration-300">Create New Project</h2>
            <p className="text-xs text-muted mb-5 transition-colors duration-300">Set up a new aura workspace for your tasks</p>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 rounded-lg text-sm animate-in slide-in-from-top duration-300">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <Label htmlFor="projectName">Project Name *</Label>
                <Input
                  id="projectName"
                  placeholder="e.g. Website Launch, Mobile App"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 focus:ring-2 focus:ring-indigo-500 transition-all focus:scale-[1.01] focus:shadow-lg focus:shadow-indigo-500/20"
                  autoFocus
                  required
                />
              </div>

              <div>
                <Label htmlFor="projectDesc">Description</Label>
                <Textarea
                  id="projectDesc"
                  placeholder="What is this project about?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 focus:ring-2 focus:ring-indigo-500 transition-all focus:scale-[1.01] focus:shadow-lg focus:shadow-indigo-500/20"
                  rows={3}
                />
              </div>

              <div>
                <Label>Color Tag</Label>
                <div className="flex gap-2.5 mt-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full transition-all duration-300 ${
                        color === c ? "ring-2 ring-offset-2 ring-offset-surface-soft ring-indigo-600 scale-125 shadow-lg" : "hover:scale-110 hover:shadow-md"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-line mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="mouse-btn transition-all duration-300 hover:shadow-md hover:scale-105"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || !name.trim()} className="bg-indigo-600 hover:bg-indigo-500 text-white mouse-btn transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/40 hover:scale-105 disabled:opacity-50">
                  {isSubmitting ? "Creating..." : "Create Project"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
