import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export async function PATCH(request: Request, { params }: { params: Promise<{ taskId: string, todoId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { todoId } = await params
  const { title, isCompleted } = await request.json()

  try {
    const updatedTodo = await prisma.todo.update({
      where: { id: todoId },
      data: {
        title,
        isCompleted,
      },
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

  const { todoId } = await params

  try {
    await prisma.todo.delete({
      where: { id: todoId },
    })
    return NextResponse.json({ message: 'Todo deleted successfully' }, { status: 200 })
  } catch (error) {
    console.error("Error deleting todo:", error)
    return NextResponse.json({ error: 'Failed to delete todo' }, { status: 500 })
  }
}
