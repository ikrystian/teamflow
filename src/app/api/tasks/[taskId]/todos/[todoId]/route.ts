import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"

export async function PATCH(request: Request, { params }: { params: Promise<{ taskId: string, todoId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { todoId } = await params
  const { title, isCompleted, timeSpent } = await request.json()

  try {
    const updateData: {
      title?: string;
      isCompleted?: boolean;
      timeSpent?: number;
    } = {}
    if (title !== undefined) updateData.title = title
    if (isCompleted !== undefined) updateData.isCompleted = isCompleted
    if (timeSpent !== undefined) updateData.timeSpent = timeSpent

    const updatedTodo = await prisma.todo.update({
      where: { id: todoId },
      data: updateData,
    })
    return NextResponse.json(updatedTodo)
  } catch (error) {
    console.error("Error updating todo:", error)
    return NextResponse.json({ error: 'Failed to update todo' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ taskId: string, todoId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { taskId, todoId } = await params

  try {
    // Check if user is admin
    const userIsAdmin = await isAdmin()

    // Verify user has access to the task (unless admin)
    if (!userIsAdmin) {
      const task = await prisma.task.findFirst({
        where: {
          id: taskId,
          OR: [
            { createdById: session.user.id },
            { assigneeId: session.user.id },
            {
              project: {

              }
            }
          ]
        }
      })

      if (!task) {
        return NextResponse.json({ error: 'Task not found or access denied' }, { status: 404 })
      }
    }

    // Verify todo exists and belongs to the task
    const todo = await prisma.todo.findFirst({
      where: {
        id: todoId,
        taskId: taskId
      }
    })

    if (!todo) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 })
    }

    await prisma.todo.delete({
      where: { id: todoId },
    })
    return NextResponse.json({ message: 'Todo deleted successfully' }, { status: 200 })
  } catch (error) {
    console.error("Error deleting todo:", error)
    return NextResponse.json({ error: 'Failed to delete todo' }, { status: 500 })
  }
}
