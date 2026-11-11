import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const instant = false;

async function getDashboardData(userId: string) {
  const [projects, tasks, recentActivities] = await Promise.all([
    // Get user's projects
    db.project.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
        isArchived: false,
      },
      take: 6,
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: { boards: true, members: true },
        },
      },
    }),

    // Get user's tasks
    db.task.findMany({
      where: {
        OR: [
          { assigneeId: userId },
          {
            column: {
              board: {
                project: {
                  ownerId: userId,
                },
              },
            },
          },
        ],
      },
      include: {
        column: {
          select: { name: true },
        },
      },
    }),

    // Get recent activities
    db.activity.findMany({
      where: {
        OR: [
          { userId },
          {
            project: {
              OR: [
                { ownerId: userId },
                { members: { some: { userId } } },
              ],
            },
          },
        ],
      },
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            name: true,
            image: true,
          },
        },
      },
    }),
  ]);

  const completedTasks = tasks.filter((t) => t.status === "DONE").length;
  const pendingTasks = tasks.filter((t) => t.status !== "DONE" && t.status !== "CANCELLED").length;
  const upcomingDeadlines = tasks
    .filter((t) => t.dueDate && t.status !== "DONE" && new Date(t.dueDate) > new Date())
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 5);

  return {
    totalProjects: projects.length,
    totalTasks: tasks.length,
    completedTasks,
    pendingTasks,
    projects,
    upcomingDeadlines,
    recentActivities,
  };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return null;
  }

  const data = await getDashboardData(session.user.id);

  return (
    <div className="p-8 page-transition perspective-container">
      {/* Header */}
      <div className="mb-8 animate-slide-down">
        <h1 className="text-3xl font-extrabold text-fg-strong tracking-tight">
          Welcome back, {session.user.name?.split(" ")[0] || "there"}!
        </h1>
        <p className="text-muted mt-1 text-sm">
          Here's what's happening with your aura projects today.
        </p>
      </div>

      {/* Stats Grid with Interactive Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Link href="/dashboard/projects">
          <Card className="stagger-item mouse-interactive-card border-line cursor-pointer h-full group hover:shadow-xl hover:shadow-indigo-500/20 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-fg group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                Total Projects
              </CardTitle>
              <svg className="h-5 w-5 text-indigo-500 mouse-icon transition-transform duration-300 group-hover:rotate-12 group-hover:scale-125" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-fg-strong group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-all duration-300 group-hover:scale-110">{data.totalProjects}</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/tasks">
          <Card className="stagger-item mouse-interactive-card border-line cursor-pointer h-full group hover:shadow-xl hover:shadow-blue-500/20 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-fg group-hover:text-blue-600 transition-colors">
                Total Tasks
              </CardTitle>
              <svg className="h-5 w-5 text-blue-500 mouse-icon transition-transform duration-300 group-hover:rotate-12 group-hover:scale-125" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-fg-strong group-hover:text-blue-600 transition-all duration-300 group-hover:scale-110">{data.totalTasks}</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/tasks">
          <Card className="stagger-item mouse-interactive-card border-line cursor-pointer h-full group hover:shadow-xl hover:shadow-green-500/20 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-fg group-hover:text-green-600 dark:text-green-400 transition-colors">
                Completed
              </CardTitle>
              <svg className="h-5 w-5 text-green-500 mouse-icon transition-transform duration-300 group-hover:rotate-12 group-hover:scale-125" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-green-600 dark:text-green-400 transition-all duration-300 group-hover:scale-110">{data.completedTasks}</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/tasks">
          <Card className="stagger-item mouse-interactive-card border-line cursor-pointer h-full group hover:shadow-xl hover:shadow-amber-500/20 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-fg group-hover:text-amber-600 dark:text-amber-400 transition-colors">
                Pending
              </CardTitle>
              <svg className="h-5 w-5 text-amber-500 mouse-icon transition-transform duration-300 group-hover:rotate-12 group-hover:scale-125" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-amber-600 dark:text-amber-400 transition-all duration-300 group-hover:scale-110">{data.pendingTasks}</div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Projects */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-fg-strong tracking-tight">Recent Projects</h2>
          <Link href="/dashboard/projects">
            <Button variant="ghost" size="sm" className="mouse-btn text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-500/10">
              View All
            </Button>
          </Link>
        </div>

        {data.projects.length === 0 ? (
          <Card className="mouse-interactive-card border-dashed border-2 border-line">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <svg className="h-12 w-12 text-muted mb-4 animate-float" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <h3 className="text-lg font-bold text-fg-strong mb-1">No projects yet</h3>
              <p className="text-muted mb-4 text-sm">Get started by creating your first aura project</p>
              <Link href="/dashboard/projects">
                <Button className="mouse-btn bg-indigo-600 hover:bg-indigo-500 text-white">Create Project</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.projects.map((project, idx) => (
              <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
                <Card className="mouse-interactive-card cursor-pointer border-line rounded-2xl group stagger-item hover:shadow-xl hover:shadow-indigo-500/20 transition-all duration-300 transform hover:scale-105 hover:-translate-y-2" style={{ animationDelay: `${idx * 0.08}s` }}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div
                          className="h-3.5 w-3.5 rounded-full transition-all duration-300 group-hover:scale-150 group-hover:shadow-lg"
                          style={{ backgroundColor: project.color }}
                        />
                        <CardTitle className="text-base font-bold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-all duration-300 group-hover:translate-x-1">{project.name}</CardTitle>
                      </div>
                    </div>
                    {project.description && (
                      <p className="text-xs text-muted mt-2 line-clamp-2 group-hover:text-fg transition-colors duration-300">
                        {project.description}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-xs text-muted border-t border-line pt-3 group-hover:text-fg transition-all duration-300">
                      <span className="font-medium transition-all duration-300">{project._count.boards} boards</span>
                      <span className="font-medium transition-all duration-300">{project._count.members} members</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Deadlines */}
      {data.upcomingDeadlines.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-fg-strong mb-4 tracking-tight">Upcoming Deadlines</h2>
          <Card className="mouse-interactive-card border-line">
            <CardContent className="p-0">
              <div className="divide-y divide-line">
                {data.upcomingDeadlines.map((task) => (
                  <div key={task.id} className="p-4 hover:bg-indigo-500/10 transition-all cursor-pointer group hover:pl-6 hover:pr-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-fg-strong text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-all duration-300 group-hover:translate-x-1">{task.title}</h3>
                        <p className="text-xs text-muted mt-1 group-hover:text-fg/70 transition-colors duration-300">{task.column.name}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge
                          className="transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg"
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
                        <span className="text-xs text-muted font-medium group-hover:text-fg transition-colors duration-300">
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Activity */}
      {data.recentActivities.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-fg-strong mb-4 tracking-tight">Recent Activity</h2>
          <Card className="mouse-interactive-card border-line">
            <CardContent className="p-0">
              <div className="divide-y divide-line">
                {data.recentActivities.map((activity) => (
                  <div key={activity.id} className="p-4 hover:bg-indigo-500/10 transition-all group hover:pl-6 hover:pr-2">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-9 w-9 rounded-full bg-indigo-500/15 flex items-center justify-center ring-2 ring-indigo-500/10 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:bg-indigo-500/25">
                          <span className="text-indigo-600 text-sm font-bold group-hover:text-indigo-400 transition-colors duration-300">
                            {activity.user.name?.charAt(0) || "U"}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-fg-strong group-hover:text-fg transition-colors duration-300">
                          <span className="font-bold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300">{activity.user.name}</span>{" "}
                          <span className="text-fg group-hover:translate-x-0.5 transition-transform duration-300 inline-block">{activity.message}</span>
                        </p>
                        <p className="text-xs text-muted mt-1 font-medium group-hover:text-muted transition-colors duration-300">
                          {new Date(activity.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
