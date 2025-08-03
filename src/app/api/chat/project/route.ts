import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the user exists in the database
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 })
    }

    const { projectId } = await request.json()

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Check if project exists and get team members
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        team: {
          include: {
            members: true
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check if user is member of the project's team
    const isMember = project.team.members.some(member => member.id === session.user.id)
    if (!isMember) {
      return NextResponse.json({ error: 'Access denied - not a team member' }, { status: 403 })
    }

    // Check if project chat room already exists
    const existingRoom = await prisma.chatRoom.findFirst({
      where: {
        projectId: projectId,
        type: 'project'
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true
              }
            }
          }
        },
        project: {
          select: {
            id: true,
            name: true,
            color: true,
            icon: true
          }
        }
      }
    })

    if (existingRoom) {
      return NextResponse.json(existingRoom)
    }

    // Create project chat room with all team members
    const chatRoom = await prisma.chatRoom.create({
      data: {
        name: `${project.name} - Czat Projektu`,
        type: 'project',
        projectId: projectId,
        createdById: session.user.id,
        members: {
          create: project.team.members.map(member => ({
            userId: member.id
          }))
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true
              }
            }
          }
        },
        project: {
          select: {
            id: true,
            name: true,
            color: true,
            icon: true
          }
        }
      }
    })

    return NextResponse.json(chatRoom, { status: 201 })
  } catch (error) {
    console.error('Error creating project chat room:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
