import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from "@/lib/auth/session"

export async function GET(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { taskId } = await params

  try {
    const todos = await prisma.todo.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json(todos)
  } catch (error) {
    console.error("Error fetching todos:", error)
    return NextResponse.json({ error: 'Failed to fetch todos' }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { taskId } = await params
  const { title } = await request.json()

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  try {
    const newTodo = await prisma.todo.create({
      data: {
        title,
        taskId,
      },
    })
    return NextResponse.json(newTodo, { status: 201 })
  } catch (error) {
    console.error("Error creating todo:", error)
    return NextResponse.json({ error: 'Failed to create todo' }, { status: 500 })
  }
}
