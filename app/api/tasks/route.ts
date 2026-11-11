import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createTaskSchema, updateTaskSchema } from "@/lib/validations";

/**
 * GET /api/tasks
 * Get all tasks with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const assigneeId = searchParams.get("assigneeId");

    const tasks = await db.task.findMany({
      where: {
        column: {
          board: {
            project: {
              OR: [
                { ownerId: session.user.id },
                {
                  members: {
                    some: {
                      userId: session.user.id,
                    },
                  },
                },
              ],
              ...(projectId ? { id: projectId } : {}),
            },
          },
        },
        ...(status ? { status: status as any } : {}),
        ...(priority ? { priority: priority as any } : {}),
        ...(assigneeId ? { assigneeId } : {}),
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        column: {
          select: {
            id: true,
            name: true,
            boardId: true,
            board: {
              select: {
                id: true,
                name: true,
                project: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    console.error("Get tasks error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tasks
 * Create a new task
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = createTaskSchema.parse(body);

    // Verify user has access to the column's project
    const column = await db.column.findUnique({
      where: { id: validatedData.columnId },
      include: {
        board: {
          include: {
            project: {
              include: {
                members: true,
              },
            },
          },
        },
      },
    });

    if (!column) {
      return NextResponse.json(
        { success: false, error: "Column not found" },
        { status: 404 }
      );
    }

    const hasAccess =
      column.board.project.ownerId === session.user.id ||
      column.board.project.members.some((m) => m.userId === session.user.id);

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    // Get the highest position in the column
    const lastTask = await db.task.findFirst({
      where: { columnId: validatedData.columnId },
      orderBy: { position: "desc" },
    });

    const newPosition = lastTask ? lastTask.position + 1 : 0;

    // Create task
    const task = await db.task.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        columnId: validatedData.columnId,
        assigneeId: validatedData.assigneeId,
        priority: validatedData.priority,
        dueDate: validatedData.dueDate,
        position: newPosition,
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        column: true,
      },
    });

    // Create activity log
    await db.activity.create({
      data: {
        type: "TASK_CREATED",
        message: `Created task "${task.title}"`,
        userId: session.user.id,
        projectId: column.board.project.id,
        taskId: task.id,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Task created successfully",
        data: task,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create task error:", error);

    if (error.name === "ZodError") {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to create task" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tasks
 * Update a task
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Task ID is required" },
        { status: 400 }
      );
    }

    const validatedData = updateTaskSchema.parse(updateData);

    // Verify user has access to the task
    const task = await db.task.findUnique({
      where: { id },
      include: {
        column: {
          include: {
            board: {
              include: {
                project: {
                  include: {
                    members: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      );
    }

    const hasAccess =
      task.column.board.project.ownerId === session.user.id ||
      task.column.board.project.members.some((m) => m.userId === session.user.id);

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    // Update task
    const updatedTask = await db.task.update({
      where: { id },
      data: {
        ...validatedData,
        ...(validatedData.status === "DONE" && !task.completedAt
          ? { completedAt: new Date() }
          : {}),
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        column: true,
      },
    });

    // Create activity log
    await db.activity.create({
      data: {
        type: "TASK_UPDATED",
        message: `Updated task "${updatedTask.title}"`,
        userId: session.user.id,
        projectId: task.column.board.project.id,
        taskId: updatedTask.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Task updated successfully",
      data: updatedTask,
    });
  } catch (error: any) {
    console.error("Update task error:", error);

    if (error.name === "ZodError") {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to update task" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tasks
 * Delete a task
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Task ID is required" },
        { status: 400 }
      );
    }

    // Verify user has access to the task
    const task = await db.task.findUnique({
      where: { id },
      include: {
        column: {
          include: {
            board: {
              include: {
                project: {
                  include: {
                    members: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      );
    }

    const hasAccess =
      task.column.board.project.ownerId === session.user.id ||
      task.column.board.project.members.some((m) => m.userId === session.user.id);

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    // Delete task
    await db.task.delete({
      where: { id },
    });

    // Create activity log
    await db.activity.create({
      data: {
        type: "TASK_DELETED",
        message: `Deleted task "${task.title}"`,
        userId: session.user.id,
        projectId: task.column.board.project.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Delete task error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
