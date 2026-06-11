import { ImageResponse } from 'next/og'
import { prisma } from "@/lib/prisma"

export const alt = 'Karta zadania Nexus'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const task = await prisma.task.findUnique({
    where: { shareToken: token },
    include: {
      taskStatus: { select: { name: true, color: true } },
      project: { select: { name: true, color: true } },
      assignee: { select: { name: true, email: true } },
    },
  })

  if (!task) {
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#09090b',
            color: '#fafafa',
            fontFamily: 'sans-serif',
          }}
        >
          <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.05em', color: '#ffffff', marginBottom: 12 }}>Nexus</div>
          <div style={{ fontSize: 18, color: '#71717a' }}>Zadanie nie zostało znalezione</div>
        </div>
      ),
      {
        ...size,
      }
    )
  }

  const projectColor = task.project?.color || '#3b82f6'
  const projectName = task.project?.name || 'Brak projektu'
  const statusColor = task.taskStatus?.color || '#6b7280'
  const statusName = task.taskStatus?.name || 'Brak'

  // Normalize priority
  const priority = task.priority || ''
  const priorityLower = priority.toLowerCase()
  let priorityLabel = 'Brak'
  let priorityColor = '#a1a1aa'
  let priorityBg = '#27272a'
  let priorityBorder = '#3f3f46'

  if (priorityLower === 'high' || priorityLower === 'urgent') {
    priorityLabel = priorityLower === 'urgent' ? 'Pilny' : 'Wysoki'
    priorityColor = '#ef4444'
    priorityBg = 'rgba(239, 68, 68, 0.1)'
    priorityBorder = 'rgba(239, 68, 68, 0.2)'
  } else if (priorityLower === 'medium') {
    priorityLabel = 'Średni'
    priorityColor = '#f59e0b'
    priorityBg = 'rgba(245, 158, 11, 0.1)'
    priorityBorder = 'rgba(245, 158, 11, 0.2)'
  } else if (priorityLower === 'low') {
    priorityLabel = 'Niski'
    priorityColor = '#10b981'
    priorityBg = 'rgba(16, 185, 129, 0.1)'
    priorityBorder = 'rgba(16, 185, 129, 0.2)'
  }

  const assigneeName = task.assignee?.name || task.assignee?.email || 'Nieprzypisany'
  const assigneeInitials = (task.assignee?.name || task.assignee?.email || '?').charAt(0).toUpperCase()

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#09090b',
          color: '#fafafa',
          padding: '60px 80px',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Background glow dynamic to project color */}
        <div
          style={{
            position: 'absolute',
            top: -100,
            right: -100,
            width: 450,
            height: 450,
            borderRadius: 225,
            background: `radial-gradient(circle, ${projectColor}18 0%, rgba(0, 0, 0, 0) 70%)`,
            zIndex: 1,
          }}
        />

        {/* Top Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span
              style={{
                display: 'flex',
                height: 36,
                width: 36,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 10,
                backgroundColor: '#ffffff',
                color: '#09090b',
                fontWeight: 800,
                fontSize: 18,
              }}
            >
              N
            </span>
            <span
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: '#ffffff',
                marginLeft: 12,
                letterSpacing: '-0.03em',
              }}
            >
              Nexus
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: '#a1a1aa',
              border: '1px solid #27272a',
              backgroundColor: '#18181b',
              padding: '6px 12px',
              borderRadius: 20,
              letterSpacing: '0.05em',
            }}
          >
            KARTA ZADANIA
          </div>
        </div>

        {/* Main Content Area */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            flex: 1,
            marginTop: 40,
            marginBottom: 40,
            zIndex: 10,
          }}
        >
          {/* Left Block */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              paddingRight: 40,
            }}
          >
            {/* Project Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: projectColor,
                  marginRight: 8,
                }}
              />
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#a1a1aa',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {projectName}
              </span>
            </div>

            {/* Task Key */}
            {task.key && (
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  fontFamily: 'monospace',
                  color: projectColor,
                  marginBottom: 8,
                }}
              >
                {task.key}
              </div>
            )}

            {/* Task Title */}
            <div
              style={{
                fontSize: 44,
                fontWeight: 800,
                color: '#ffffff',
                lineHeight: 1.2,
                letterSpacing: '-0.04em',
                wordBreak: 'break-word',
              }}
            >
              {task.title}
            </div>
          </div>

          {/* Right Block (Details Pane) */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: 320,
              borderLeft: '1px solid #27272a',
              paddingLeft: 40,
              gap: 24,
            }}
          >
            {/* Status */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#71717a',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: 6,
                }}
              >
                Status
              </span>
              <div
                style={{
                  display: 'flex',
                  alignSelf: 'flex-start',
                  fontSize: 14,
                  fontWeight: 600,
                  color: statusColor,
                  backgroundColor: `${statusColor}15`,
                  border: `1px solid ${statusColor}30`,
                  padding: '5px 12px',
                  borderRadius: 16,
                }}
              >
                {statusName}
              </div>
            </div>

            {/* Priority */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#71717a',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: 6,
                }}
              >
                Priorytet
              </span>
              <div
                style={{
                  display: 'flex',
                  alignSelf: 'flex-start',
                  fontSize: 14,
                  fontWeight: 600,
                  color: priorityColor,
                  backgroundColor: priorityBg,
                  border: `1px solid ${priorityBorder}`,
                  padding: '5px 12px',
                  borderRadius: 16,
                }}
              >
                {priorityLabel}
              </div>
            </div>

            {/* Assignee */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#71717a',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: 8,
                }}
              >
                Przypisane do
              </span>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div
                  style={{
                    display: 'flex',
                    height: 32,
                    width: 32,
                    borderRadius: 16,
                    background: `linear-gradient(135deg, ${projectColor}, #4f46e5)`,
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {assigneeInitials}
                </div>
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#e4e4e7',
                    marginLeft: 10,
                  }}
                >
                  {assigneeName}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            borderTop: '1px solid #18181b',
            paddingTop: 24,
            zIndex: 10,
          }}
        >
          <span style={{ fontSize: 13, color: '#71717a' }}>Widok tylko do odczytu</span>
          <span style={{ fontSize: 13, color: '#3f3f46', fontFamily: 'monospace' }}>teamflow.nexus</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
