import { User, Project, Board, Column, Task, Comment, Activity, ProjectMember } from "@prisma/client";

/**
 * Extended NextAuth types
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: string;
    };
  }

  interface User {
    role: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
  }
}

/**
 * API Response Types
 */
export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

/**
 * Extended Models with Relations
 */
export type ProjectWithMembers = Project & {
  owner: User;
  members: (ProjectMember & { user: User })[];
  _count?: {
    boards: number;
    members: number;
  };
};

export type BoardWithColumns = Board & {
  columns: ColumnWithTasks[];
  project: Project;
};

export type ColumnWithTasks = Column & {
  tasks: TaskWithAssignee[];
};

export type TaskWithAssignee = Task & {
  assignee?: User | null;
  _count?: {
    comments: number;
  };
};

export type TaskWithDetails = Task & {
  assignee?: User | null;
  column: Column;
  comments: (Comment & { user: User })[];
};

export type ActivityWithUser = Activity & {
  user: User;
  project?: Project | null;
  task?: Task | null;
};

/**
 * Form Types
 */
export type CreateProjectInput = {
  name: string;
  description?: string;
  color?: string;
};

export type UpdateProjectInput = Partial<CreateProjectInput>;

export type CreateBoardInput = {
  name: string;
  description?: string;
  projectId: string;
};

export type CreateTaskInput = {
  title: string;
  description?: string;
  columnId: string;
  assigneeId?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate?: Date | string;
};

export type UpdateTaskInput = Partial<CreateTaskInput> & {
  status?: "TODO" | "IN_PROGRESS" | "DONE" | "CANCELLED";
};

export type CreateCommentInput = {
  content: string;
  taskId: string;
};

export type InviteMemberInput = {
  email: string;
  projectId: string;
  role?: "ADMIN" | "MEMBER" | "VIEWER";
};

/**
 * Dashboard Stats Types
 */
export type DashboardStats = {
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  upcomingDeadlines: TaskWithAssignee[];
  recentActivities: ActivityWithUser[];
};

/**
 * Filter and Sort Types
 */
export type TaskFilter = {
  status?: "TODO" | "IN_PROGRESS" | "DONE" | "CANCELLED";
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  assigneeId?: string;
  search?: string;
};

export type TaskSort = {
  field: "createdAt" | "updatedAt" | "dueDate" | "priority";
  order: "asc" | "desc";
};
