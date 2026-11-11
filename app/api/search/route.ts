import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const MAX_PROJECTS = 8;
const MAX_TASKS = 12;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim().slice(0, 80);

    const projectAccess = {
      OR: [
        { ownerId: session.user.id },
        { members: { some: { userId: session.user.id } } },
      ],
      isArchived: false,
    };

    const projectWhere = q
      ? {
          AND: [
            projectAccess,
            {
              OR: [
                { name: { contains: q, mode: "insensitive" as const } },
                { description: { contains: q, mode: "insensitive" as const } },
              ],
            },
          ],
        }
      : projectAccess;

    const taskWhere = q
      ? {
          AND: [
            {
              column: {
                board: {
                  project: projectAccess,
                },
              },
            },
            {
              OR: [
                { title: { contains: q, mode: "insensitive" as const } },
                { description: { contains: q, mode: "insensitive" as const } },
              ],
            },
          ],
        }
      : {
          column: {
            board: {
              project: projectAccess,
            },
          },
        };

    const [projects, tasks] = await Promise.all([
      db.project.findMany({
        where: projectWhere,
        select: {
          id: true,
          name: true,
          description: true,
          color: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
        take: MAX_PROJECTS,
      }),
      db.task.findMany({
        where: taskWhere,
        select: {
          id: true,
          title: true,
          description: true,
          priority: true,
          status: true,
          column: {
            select: {
              name: true,
              board: {
                select: {
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
        },
        orderBy: { updatedAt: "desc" },
        take: MAX_TASKS,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        projects,
        tasks: tasks.map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description,
          priority: task.priority,
          status: task.status,
          columnName: task.column.name,
          projectId: task.column.board.project.id,
          projectName: task.column.board.project.name,
        })),
      },
    });
  } catch (error) {
    console.error("Palette search error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to search" },
      { status: 500 }
    );
  }
}
