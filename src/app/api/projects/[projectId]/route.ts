import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isAdmin } from "@/lib/admin"
import { unlink, rm } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"
import type { Session } from "next-auth"

// Helper function to safely delete files and directories
async function deleteFilesSafely(paths: string[]) {
  for (const path of paths) {
    try {
      if (existsSync(path)) {
        await unlink(path)
      }
    } catch (error) {
      console.warn(`Failed to delete file ${path}:`, error)
    }
  }
}

async function deleteDirectorySafely(dirPath: string) {
  try {
    if (existsSync(dirPath)) {
      await rm(dirPath, { recursive: true, force: true })
    }
  } catch (error) {
    console.warn(`Failed to delete directory ${dirPath}:`, error)
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { projectId } = await params

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          {

          },
          // Projects where user is a direct project member
          {
            members: {
              some: {
                userId: session.user.id
              }
            }
          },
          // Projects created by the user (without )
          {
            createdById: session.user.id
          }
        ]
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        },
        client: {
          select: {
            id: true,
            name: true
          }
        },
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
        tasks: {
          include: {
            taskStatus: {
              select: {
                id: true,
                name: true,
                color: true
              }
            },
            assignee: {
              select: {
                id: true,
                name: true,
                avatarUrl: true
              }
            },
            createdBy: {
              select: {
                id: true,
                name: true,
                avatarUrl: true
              }
            },
            todos: true,
            comments: {
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                    avatarUrl: true
                  }
                }
              },
              orderBy: {
                createdAt: 'desc'
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      )
    }

    // Map todos to subtasks for all tasks in the project for simpler frontend consumption
    const projectWithMappedTasks = {
      ...project,
      tasks: project.tasks?.map(task => ({
        ...task,
        subtasks: task.todos,
        todos: undefined
      }))
    }

    return NextResponse.json({ project: projectWithMappedTasks })
  } catch (error) {
    console.error("Error fetching project:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { projectId } = await params
    const {
      name,
      description,
      readme,
      status,
      archived,
      imageUrl,
      color,
      icon,
      repositoryUrl,
      databaseUrl,
      serverUrl,
      apiUrl,
      adminPanelUrl,
      stagingUrl,
      productionUrl,
      credentials,
      slackChannelId,
      clientId
    } = await request.json()

    // Verify user has access to the project
    const existingProject = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          {

          },
          // Projects where user is a direct project member
          {
            members: {
              some: {
                userId: session.user.id
              }
            }
          },
          // Projects created by the user
          {
            createdById: session.user.id
          }
        ]
      }
    })

    if (!existingProject) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      )
    }

    const project = await prisma.project.update({
      where: {
        id: projectId
      },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(readme !== undefined && { readme }),
        ...(status && { status }),
        ...(archived !== undefined && { archived }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(color && { color }),
        ...(icon !== undefined && { icon }),
        ...(repositoryUrl !== undefined && { repositoryUrl }),
        ...(databaseUrl !== undefined && { databaseUrl }),
        ...(serverUrl !== undefined && { serverUrl }),
        ...(apiUrl !== undefined && { apiUrl }),
        ...(adminPanelUrl !== undefined && { adminPanelUrl }),
        ...(stagingUrl !== undefined && { stagingUrl }),
        ...(productionUrl !== undefined && { productionUrl }),
        ...(credentials !== undefined && { credentials }),
        ...(slackChannelId !== undefined && { slackChannelId }),
        ...(clientId !== undefined && { clientId: clientId || null })
      },
      include: {

        client: {
          select: {
            id: true,
            name: true
          }
        },
        tasks: {
          select: {
            id: true,
            title: true,
            statusId: true,
            priority: true,
            dueDate: true,
            assignee: {
              select: {
                id: true,
                name: true,
                avatarUrl: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json({ project })
  } catch (error) {
    console.error("Error updating project:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { projectId } = await params

    // Check if user is admin
    const userIsAdmin = await isAdmin()

    // Verify user has access to the project and get all related data (unless admin)
    const existingProject = await prisma.project.findFirst({
      where: {
        id: projectId,
        ...(userIsAdmin ? {} : {
          OR: [

            // Projects where user is a direct project member
            {
              members: {
                some: {
                  userId: session.user.id
                }
              }
            },
            // Projects created by the user
            {
              createdById: session.user.id
            }
          ]
        })
      },
      include: {
        documents: true,
        tasks: {
          include: {
            images: true,
            attachments: true
          }
        }
      }
    })

    if (!existingProject) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      )
    }

    // Collect all files to delete
    const filesToDelete: string[] = []
    const directoriesToDelete: string[] = []

    // 1. Delete project image if exists
    if (existingProject.imageUrl && existingProject.imageUrl.startsWith("/uploads/projects/")) {
      const projectImagePath = join(process.cwd(), "public", existingProject.imageUrl)
      filesToDelete.push(projectImagePath)
    }

    // 2. Delete project documents
    for (const document of existingProject.documents) {
      if (document.url.startsWith("/uploads/projects/")) {
        const documentPath = join(process.cwd(), "public", document.url)
        filesToDelete.push(documentPath)
      }
    }

    // 3. Delete task-related files
    for (const task of existingProject.tasks) {
      // Delete task images
      for (const image of task.images) {
        if (image.url.startsWith("/uploads/tasks/")) {
          const imagePath = join(process.cwd(), "public", image.url)
          filesToDelete.push(imagePath)
        }
      }

      // Delete task attachments
      for (const attachment of task.attachments) {
        if (attachment.url.startsWith("/uploads/tasks/")) {
          const attachmentPath = join(process.cwd(), "public", attachment.url)
          filesToDelete.push(attachmentPath)
        }
      }

      // Add task directories to delete list
      const taskImagesDir = join(process.cwd(), "public", "uploads", "tasks", task.id)
      const taskAttachmentsDir = join(process.cwd(), "public", "uploads", "tasks", task.id, "attachments")
      directoriesToDelete.push(taskAttachmentsDir, taskImagesDir)
    }

    // 4. Add project directories to delete list
    const projectDocumentsDir = join(process.cwd(), "public", "uploads", "projects", projectId, "documents")
    const projectDir = join(process.cwd(), "public", "uploads", "projects", projectId)
    directoriesToDelete.push(projectDocumentsDir, projectDir)

    // Delete all files first
    await deleteFilesSafely(filesToDelete)

    // Delete directories
    for (const dir of directoriesToDelete) {
      await deleteDirectorySafely(dir)
    }

    // Delete project from database (this will cascade delete tasks, subtasks, comments, etc.)
    await prisma.project.delete({
      where: {
        id: projectId
      }
    })

    return NextResponse.json({
      message: "Project and all associated files deleted successfully",
      deletedFiles: filesToDelete.length,
      deletedDirectories: directoriesToDelete.length
    })
  } catch (error) {
    console.error("Error deleting project:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
