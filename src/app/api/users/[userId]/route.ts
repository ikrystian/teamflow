import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Session } from "next-auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { userId } = await params

    // Get user profile with public information
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        location: true,
        bio: true,
        jobTitle: true,
        company: true,
        website: true,
        createdAt: true,
        // Don't include phone for privacy
        teams: {
          where: {
            members: {
              some: {
                id: session.user.id // Only show teams where current user is also a member
              }
            }
          },
          select: {
            id: true,
            name: true,
            createdAt: true
          }
        },
        assignedTasks: {
          where: {
            project: {
              team: {
                members: {
                  some: {
                    id: session.user.id // Only show tasks from projects where current user has access
                  }
                }
              }
            }
          },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            createdAt: true,
            project: {
              select: {
                id: true,
                name: true,
                team: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          },
          orderBy: {
            createdAt: "desc"
          },
          take: 10 // Limit to recent tasks
        },
        createdTasks: {
          where: {
            project: {
              team: {
                members: {
                  some: {
                    id: session.user.id
                  }
                }
              }
            }
          },
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true
          },
          orderBy: {
            createdAt: "desc"
          },
          take: 5
        },
        comments: {
          where: {
            task: {
              project: {
                team: {
                  members: {
                    some: {
                      id: session.user.id
                    }
                  }
                }
              }
            }
          },
          select: {
            id: true,
            content: true,
            createdAt: true,
            task: {
              select: {
                id: true,
                title: true,
                project: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          },
          orderBy: {
            createdAt: "desc"
          },
          take: 5
        },
        timeEntries: {
          where: {
            task: {
              project: {
                team: {
                  members: {
                    some: {
                      id: session.user.id
                    }
                  }
                }
              }
            }
          },
          select: {
            id: true,
            hours: true,
            date: true,
            description: true,
            task: {
              select: {
                id: true,
                title: true,
                project: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          },
          orderBy: {
            date: "desc"
          },
          take: 10
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Calculate basic statistics
    const totalAssignedTasks = await prisma.task.count({
      where: {
        assigneeId: userId,
        project: {
          team: {
            members: {
              some: {
                id: session.user.id
              }
            }
          }
        }
      }
    })

    const completedTasks = await prisma.task.count({
      where: {
        assigneeId: userId,
        status: "Done",
        project: {
          team: {
            members: {
              some: {
                id: session.user.id
              }
            }
          }
        }
      }
    })

    const totalTimeEntries = await prisma.timeEntry.aggregate({
      where: {
        userId: userId,
        task: {
          project: {
            team: {
              members: {
                some: {
                  id: session.user.id
                }
              }
            }
          }
        }
      },
      _sum: {
        hours: true
      }
    })

    const totalComments = await prisma.comment.count({
      where: {
        authorId: userId,
        task: {
          project: {
            team: {
              members: {
                some: {
                  id: session.user.id
                }
              }
            }
          }
        }
      }
    })

    // Add statistics to user object
    const userWithStats = {
      ...user,
      stats: {
        totalAssignedTasks,
        completedTasks,
        totalHours: totalTimeEntries._sum.hours || 0,
        totalComments,
        completionRate: totalAssignedTasks > 0 ? Math.round((completedTasks / totalAssignedTasks) * 100) : 0,
        teamsCount: user.teams.length
      }
    }

    return NextResponse.json(userWithStats)
  } catch (error) {
    console.error("Error fetching user profile:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
