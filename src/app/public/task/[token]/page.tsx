import { notFound } from "next/navigation"
import type { Metadata } from "next"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"
import * as LucideIcons from "lucide-react"
import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import {
  formatEstimatedHours,
  getPriorityColor,
  getPriorityDisplayName,
} from "@/lib/task-format-utils"

export const dynamic = "force-dynamic"

// Convert basic HTML (stored from TipTap editor) to Markdown so ReactMarkdown can render it properly.
function htmlToMarkdown(html: string): string {
  if (!html) return ""
  
  // If it doesn't look like HTML (no tag-like structure), return it as is
  if (!/<[a-z][\s\S]*>/i.test(html)) {
    return html
  }

  let md = html
    // Replace headings
    .replace(/<h1>([\s\S]*?)<\/h1>/gi, "# $1\n\n")
    .replace(/<h2>([\s\S]*?)<\/h2>/gi, "## $1\n\n")
    .replace(/<h3>([\s\S]*?)<\/h3>/gi, "### $1\n\n")
    // Replace strong/bold
    .replace(/<strong>([\s\S]*?)<\/strong>/gi, "**$1**")
    .replace(/<b>([\s\S]*?)<\/b>/gi, "**$1**")
    // Replace em/italic
    .replace(/<em>([\s\S]*?)<\/em>/gi, "*$1*")
    .replace(/<i>([\s\S]*?)<\/i>/gi, "*$1*")
    // Replace code blocks
    .replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/gi, "```\n$1\n```\n\n")
    .replace(/<code>([\s\S]*?)<\/code>/gi, "`$1`")
    // Replace lists
    .replace(/<ul>([\s\S]*?)<\/ul>/gi, "$1\n")
    .replace(/<ol>([\s\S]*?)<\/ol>/gi, "$1\n")
    .replace(/<li>([\s\S]*?)<\/li>/gi, "- $1\n")
    // Replace paragraphs
    .replace(/<p>([\s\S]*?)<\/p>/gi, "$1\n\n")
    // Replace breaks
    .replace(/<br\s*\/?>/gi, "\n")
    // Replace links
    .replace(/<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)")
    // Strip blockquotes
    .replace(/<blockquote>([\s\S]*?)<\/blockquote>/gi, "> $1\n\n")
    // Trim extra spaces and double newlines
    .trim()

  // Remove other HTML tags if any remain
  md = md.replace(/<[^>]+>/g, "")

  return md
}

function ProjectIcon({ iconName, color, className = "w-5 h-5" }: {
  iconName?: string | null,
  color?: string,
  className?: string
}) {
  if (!iconName) {
    return (
      <LucideIcons.Folder
        className={className}
        style={{ color: color || '#3B82F6' }}
      />
    )
  }

  const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>>)[iconName]

  if (!IconComponent) {
    return (
      <LucideIcons.Folder
        className={className}
        style={{ color: color || '#3B82F6' }}
      />
    )
  }

  return (
    <IconComponent
      className={className}
      style={{ color: color || '#3B82F6' }}
    />
  )
}

function getMarkdownComponents(projectColor: string): Record<string, React.ComponentType<any>> {
  return {
    h1: ({ node, ...props }) => (
      <h1 className="text-xl font-bold text-foreground mt-6 mb-4 border-b pb-2 border-border/60 transition-colors" {...props} />
    ),
    h2: ({ node, ...props }) => (
      <h2 
        className="text-lg font-semibold text-foreground mt-5 mb-3 border-l-2 pl-2 transition-colors" 
        style={{ borderLeftColor: projectColor }}
        {...props} 
      />
    ),
    h3: ({ node, ...props }) => (
      <h3 className="text-base font-semibold text-foreground mt-4 mb-2 transition-colors" {...props} />
    ),
    p: ({ node, ...props }) => (
      <p className="text-sm text-foreground leading-relaxed mb-4" {...props} />
    ),
    a: ({ node, ...props }) => (
      <a 
        className="hover:underline font-medium transition-colors" 
        style={{ color: projectColor }}
        target="_blank" 
        rel="noopener noreferrer" 
        {...props} 
      />
    ),
    ul: ({ node, ...props }) => (
      <ul className="list-disc pl-5 mb-4 space-y-1.5 text-sm text-foreground" {...props} />
    ),
    ol: ({ node, ...props }) => (
      <ol className="list-decimal pl-5 mb-4 space-y-1.5 text-sm text-foreground" {...props} />
    ),
    li: ({ node, ...props }) => (
      <li className="mb-0.5 text-foreground/90" {...props} />
    ),
    blockquote: ({ node, ...props }) => (
      <blockquote 
        className="border-l-4 pl-4 italic my-4 text-muted-foreground py-2.5 pr-4 rounded-r-md" 
        style={{ borderLeftColor: projectColor, backgroundColor: `${projectColor}08` }}
        {...props} 
      />
    ),
    code({ node, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || "")
      return match ? (
        <pre className="bg-muted/80 p-4 rounded-lg overflow-x-auto my-4 border border-border/80 font-mono text-xs text-foreground shadow-inner">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      ) : (
        <code 
          className="px-1.5 py-0.5 rounded font-mono text-xs font-semibold" 
          style={{ color: projectColor, backgroundColor: `${projectColor}15` }}
          {...props}
        >
          {children}
        </code>
      )
    },
    table: ({ node, ...props }) => (
      <div className="overflow-x-auto my-4 rounded-lg border border-border/60">
        <table className="w-full border-collapse text-sm" {...props} />
      </div>
    ),
    thead: ({ node, ...props }) => (
      <thead className="bg-muted border-b border-border" {...props} />
    ),
    th: ({ node, ...props }) => (
      <th className="border border-border/60 px-4 py-2.5 font-semibold text-left text-foreground" {...props} />
    ),
    td: ({ node, ...props }) => (
      <td className="border border-border/60 px-4 py-2 text-foreground/90" {...props} />
    ),
    hr: ({ node, ...props }) => (
      <hr className="my-6 border-t border-border/40" {...props} />
    ),
  }
}

// Fetch a task purely by its public share token. No session is required — this
// is the read-only view shared with people who don't have an account.
async function getSharedTask(token: string) {
  if (!token) return null

  return prisma.task.findUnique({
    where: { shareToken: token },
    include: {
      taskStatus: { select: { name: true, color: true } },
      project: { select: { name: true, color: true, imageUrl: true, icon: true } },
      assignee: { select: { name: true, email: true } },
      createdBy: { select: { name: true, email: true } },
      todos: { orderBy: { createdAt: "asc" } },
      images: true,
      attachments: { orderBy: { createdAt: "desc" } },
      timeEntries: {
        include: { user: { select: { name: true } } },
        orderBy: { date: "desc" },
      },
      comments: {
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
      taskTags: { include: { tag: true } },
    },
  })
}

function stripMarkdownAndHtml(text: string): string {
  if (!text) return ""
  return text
    // Replace HTML tags
    .replace(/<[^>]+>/g, " ")
    // Replace markdown headings, lists, links, images, bold, italic
    .replace(/[#*`~_]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Replace multiple spaces/newlines with a single space
    .replace(/\s+/g, " ")
    .trim()
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await params
  const task = await getSharedTask(token)

  if (!task) {
    return {
      title: "Zadanie nie znalezione – Nexus",
      robots: { index: false, follow: false },
    }
  }

  const parts: string[] = []
  if (task.project?.name) parts.push(`Projekt: ${task.project.name}`)
  if (task.taskStatus?.name) parts.push(`Status: ${task.taskStatus.name}`)
  if (task.priority) parts.push(`Priorytet: ${getPriorityDisplayName(task.priority)}`)
  if (task.assignee?.name) parts.push(`Przypisane: ${task.assignee.name}`)

  const metaInfo = parts.join(" | ")
  const cleanDesc = task.description ? stripMarkdownAndHtml(task.description).substring(0, 160) : ""
  const ogDescription = metaInfo + (cleanDesc ? ` — ${cleanDesc}...` : "")

  const imageUrls: string[] = []
  if (task.images && task.images.length > 0) {
    imageUrls.push(task.images[0].url)
  } else if (task.project?.imageUrl) {
    imageUrls.push(task.project.imageUrl)
  }

  // Determine metadataBase dynamically if possible or fall back to local
  const base = process.env.NEXTAUTH_URL || "http://localhost:3000"
  let metadataBase: URL | undefined = undefined
  try {
    metadataBase = new URL(base)
  } catch (e) {
    console.error("Invalid NEXTAUTH_URL", e)
  }

  return {
    metadataBase,
    title: `${task.key ? `[${task.key}] ` : ""}${task.title} – Nexus`,
    description: ogDescription,
    robots: { index: false, follow: false },
    openGraph: {
      title: `${task.key ? `[${task.key}] ` : ""}${task.title}`,
      description: ogDescription,
      type: "website",
      siteName: "Nexus",
      images: imageUrls.length > 0 ? imageUrls.map(url => ({ url })) : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${task.key ? `[${task.key}] ` : ""}${task.title}`,
      description: ogDescription,
      images: imageUrls.length > 0 ? imageUrls : undefined,
    },
  }
}

const formatDate = (date: Date | null) =>
  date
    ? new Date(date).toLocaleDateString("pl-PL", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null

const formatDateTime = (date: Date | null) =>
  date
    ? new Date(date).toLocaleString("pl-PL", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null

const displayName = (
  person: { name: string | null; email?: string | null } | null
) => person?.name || person?.email || "Nieznany"

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 shrink-0 text-muted-foreground/80">
        {icon}
      </div>
      <div className="space-y-0.5">
        <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
          {label}
        </dt>
        <dd className="text-sm font-semibold text-foreground leading-snug">{children}</dd>
      </div>
    </div>
  )
}

export default async function PublicTaskPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const task = await getSharedTask(token)

  if (!task) {
    notFound()
  }

  const tags = task.taskTags.map((tt) => tt.tag)
  const completedTodos = task.todos.filter((t) => t.isCompleted).length
  const totalTime = task.timeEntries.reduce((sum, e) => sum + e.hours, 0)

  const projectColor = task.project?.color || "#3B82F6"
  const markdownComponents = getMarkdownComponents(projectColor)

  return (
    <div className="min-h-screen bg-muted/30 pb-16">
      {/* Banner Header */}
      <div 
        className="relative w-full h-48 md:h-64 flex items-end overflow-hidden"
        style={{
          ...(task.project?.imageUrl
            ? {
                backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.25), rgba(15, 23, 42, 0.8)), url(${task.project.imageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : {
                backgroundImage: `linear-gradient(135deg, ${projectColor} 0%, #0f172a 100%)`,
              }),
        }}
      >
        <div 
          className="absolute bottom-0 left-0 right-0 h-1.5 shadow-lg" 
          style={{ backgroundColor: projectColor }}
        />
        
        <div className="mx-auto max-w-3xl w-full px-4 pb-8 md:pb-12 relative z-10">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span 
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-white backdrop-blur-sm border border-white/15"
              >
                <ProjectIcon iconName={task.project?.icon} color="#FFFFFF" className="h-3 w-3" />
                Projekt
              </span>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight drop-shadow-md">
              {task.project?.name || "Projekt"}
            </h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 -mt-6 md:-mt-10 relative z-20 space-y-6">
        {/* Header card */}
        <div 
          className="rounded-xl border bg-card p-6 shadow-sm border-t-4"
          style={{ borderTopColor: projectColor }}
        >
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {task.project && (
              <span 
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                style={{
                  backgroundColor: `${projectColor}12`,
                  color: projectColor,
                  borderColor: `${projectColor}30`,
                }}
              >
                <ProjectIcon iconName={task.project.icon} color={projectColor} className="h-3.5 w-3.5" />
                {task.project.name}
              </span>
            )}
            {task.key && (
              <Badge 
                variant="outline" 
                className="font-mono text-xs font-semibold"
                style={{ 
                  borderColor: `${projectColor}40`,
                  color: projectColor,
                  backgroundColor: `${projectColor}08`
                }}
              >
                {task.key}
              </Badge>
            )}
            {task.taskStatus && (
              <Badge
                variant="outline"
                style={{
                  borderColor: `${task.taskStatus.color}40`,
                  color: task.taskStatus.color,
                  backgroundColor: `${task.taskStatus.color}08`,
                }}
              >
                {task.taskStatus.name}
              </Badge>
            )}
            {task.priority && (
              <Badge variant="outline" className={getPriorityColor(task.priority)}>
                {getPriorityDisplayName(task.priority)}
              </Badge>
            )}
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 leading-tight mb-4">
            {task.title}
          </h1>

          {tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5 border-t pt-3 border-border/40">
              {tags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  style={{ borderColor: `${tag.color}50`, color: tag.color, backgroundColor: `${tag.color}08` }}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
            <Field 
              label="Przypisane do" 
              icon={<LucideIcons.User className="h-4 w-4" style={{ color: projectColor }} />}
            >
              {displayName(task.assignee)}
            </Field>
            <Field 
              label="Utworzone przez" 
              icon={<LucideIcons.UserCheck className="h-4 w-4" style={{ color: projectColor }} />}
            >
              {displayName(task.createdBy)}
            </Field>
            <Field 
              label="Szacowany czas" 
              icon={<LucideIcons.Timer className="h-4 w-4" style={{ color: projectColor }} />}
            >
              {formatEstimatedHours(task.estimatedHours)}
            </Field>
            {task.dueDate && (
              <Field 
                label="Termin" 
                icon={<LucideIcons.Calendar className="h-4 w-4" style={{ color: projectColor }} />}
              >
                {formatDate(task.dueDate)}
              </Field>
            )}
            {task.startTime && (
              <Field 
                label="Początek" 
                icon={<LucideIcons.CalendarRange className="h-4 w-4" style={{ color: projectColor }} />}
              >
                {formatDateTime(task.startTime)}
              </Field>
            )}
            {task.endTime && (
              <Field 
                label="Koniec" 
                icon={<LucideIcons.CalendarDays className="h-4 w-4" style={{ color: projectColor }} />}
              >
                {formatDateTime(task.endTime)}
              </Field>
            )}
            <Field 
              label="Utworzono" 
              icon={<LucideIcons.CalendarDays className="h-4 w-4" style={{ color: projectColor }} />}
            >
              {formatDate(task.createdAt)}
            </Field>
          </dl>
        </div>

        {/* Description */}
        {task.description && task.description !== "<p></p>" && (
          <section className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <LucideIcons.FileText className="h-4.5 w-4.5" style={{ color: projectColor }} />
              Opis
            </h2>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
                components={markdownComponents}
              >
                {htmlToMarkdown(task.description)}
              </ReactMarkdown>
            </div>
          </section>
        )}

        {/* Changes / what was done — stored as markdown */}
        {task.changes && task.changes.trim() && (
          <section className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <LucideIcons.CheckSquare className="h-4.5 w-4.5" style={{ color: projectColor }} />
              Co zostało zrobione
            </h2>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
                components={markdownComponents}
              >
                {task.changes}
              </ReactMarkdown>
            </div>
          </section>
        )}

        {/* Subtasks */}
        {task.todos.length > 0 && (
          <section className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <LucideIcons.ListChecks className="h-4.5 w-4.5" style={{ color: projectColor }} />
              Lista zadań ({completedTodos}/{task.todos.length})
            </h2>
            <ul className="space-y-2.5">
              {task.todos.map((todo) => (
                <li key={todo.id} className="flex items-center gap-3 text-sm">
                  <span
                    className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border transition-colors ${
                      todo.isCompleted
                        ? "border-green-500 bg-green-500 text-white"
                        : "border-muted-foreground/30 hover:border-muted-foreground/50"
                    }`}
                  >
                    {todo.isCompleted && (
                      <svg
                        viewBox="0 0 16 16"
                        className="h-3 w-3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                      >
                        <path d="M3 8.5l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span
                    className={`font-medium ${
                      todo.isCompleted ? "text-muted-foreground line-through" : "text-foreground"
                    }`}
                  >
                    {todo.title}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Images */}
        {task.images.length > 0 && (
          <section className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <LucideIcons.Image className="h-4.5 w-4.5" style={{ color: projectColor }} />
              Obrazy
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {task.images.map((image) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={image.id}
                  src={image.url}
                  alt={image.filename}
                  className="h-32 w-full rounded-lg border object-cover hover:opacity-90 transition-opacity cursor-zoom-in"
                />
              ))}
            </div>
          </section>
        )}

        {/* Attachments */}
        {task.attachments.length > 0 && (
          <section className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <LucideIcons.Paperclip className="h-4.5 w-4.5" style={{ color: projectColor }} />
              Załączniki
            </h2>
            <ul className="space-y-2">
              {task.attachments.map((file) => (
                <li key={file.id}>
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-accent"
                  >
                    <span className="truncate font-medium flex items-center gap-2">
                      <LucideIcons.File className="h-4 w-4 text-muted-foreground" />
                      {file.originalName}
                    </span>
                    <span className="ml-3 shrink-0 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      {formatFileSize(file.size)}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Time entries */}
        {task.timeEntries.length > 0 && (
          <section className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <LucideIcons.Clock className="h-4.5 w-4.5" style={{ color: projectColor }} />
              Zarejestrowany czas ({totalTime % 1 === 0 ? totalTime : totalTime.toFixed(1)}h)
            </h2>
            <ul className="divide-y divide-border/40">
              {task.timeEntries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-start justify-between gap-3 py-3 text-sm"
                >
                  <div className="space-y-1">
                    <span className="font-semibold text-foreground">{displayName(entry.user)}</span>
                    {entry.description && (
                      <p className="text-muted-foreground text-xs">{entry.description}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      {formatDate(entry.date)}
                    </p>
                  </div>
                  <span className="shrink-0 font-bold bg-muted/80 px-2 py-1 rounded text-xs">
                    {entry.hours}h
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Comments */}
        {task.comments.length > 0 && (
          <section className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <LucideIcons.MessageSquare className="h-4.5 w-4.5" style={{ color: projectColor }} />
              Komentarze ({task.comments.length})
            </h2>
            <ul className="space-y-4">
              {task.comments.map((comment) => (
                <li key={comment.id} className="text-sm border-b border-border/30 last:border-0 pb-3 last:pb-0">
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="font-semibold text-foreground">{displayName(comment.author)}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(comment.createdAt)}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-foreground/90 pl-1 leading-relaxed">
                    {comment.content}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="pt-4 text-center text-xs text-muted-foreground/60 flex items-center justify-center gap-1.5">
          <LucideIcons.Lock className="h-3 w-3" />
          Widok tylko do odczytu · Nexus
        </p>
      </div>
    </div>
  )
}
