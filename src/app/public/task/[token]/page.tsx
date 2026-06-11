import { notFound } from "next/navigation"
import type { Metadata } from "next"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"
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

const markdownComponents: Record<string, React.ComponentType<any>> = {
  h1: ({ node, ...props }) => (
    <h1 className="text-xl font-bold text-foreground mt-6 mb-4 border-b pb-2 border-border/60 hover:text-primary transition-colors" {...props} />
  ),
  h2: ({ node, ...props }) => (
    <h2 className="text-lg font-semibold text-foreground mt-5 mb-3 border-l-2 border-primary pl-2 hover:text-primary transition-colors" {...props} />
  ),
  h3: ({ node, ...props }) => (
    <h3 className="text-base font-semibold text-foreground mt-4 mb-2 hover:text-primary transition-colors" {...props} />
  ),
  p: ({ node, ...props }) => (
    <p className="text-sm text-foreground leading-relaxed mb-4" {...props} />
  ),
  a: ({ node, ...props }) => (
    <a className="text-primary hover:underline font-medium transition-colors hover:text-primary/80" target="_blank" rel="noopener noreferrer" {...props} />
  ),
  ul: ({ node, ...props }) => (
    <ul className="list-disc pl-5 mb-4 space-y-1.5 text-sm text-foreground marker:text-primary" {...props} />
  ),
  ol: ({ node, ...props }) => (
    <ol className="list-decimal pl-5 mb-4 space-y-1.5 text-sm text-foreground marker:text-primary" {...props} />
  ),
  li: ({ node, ...props }) => (
    <li className="mb-0.5 text-foreground/90" {...props} />
  ),
  blockquote: ({ node, ...props }) => (
    <blockquote className="border-l-4 border-primary pl-4 italic my-4 text-muted-foreground bg-primary/5 py-2.5 pr-4 rounded-r-md" {...props} />
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
      <code className="bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono text-xs font-semibold" {...props}>
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
    <thead className="bg-primary/5 border-b border-border" {...props} />
  ),
  th: ({ node, ...props }) => (
    <th className="border border-border/60 px-4 py-2.5 font-semibold text-left text-foreground" {...props} />
  ),
  td: ({ node, ...props }) => (
    <td className="border border-border/60 px-4 py-2 text-foreground/90" {...props} />
  ),
  hr: ({ node, ...props }) => (
    <hr className="my-6 border-t border-primary/20" {...props} />
  ),
}

// Fetch a task purely by its public share token. No session is required — this
// is the read-only view shared with people who don't have an account.
async function getSharedTask(token: string) {
  if (!token) return null

  return prisma.task.findUnique({
    where: { shareToken: token },
    include: {
      taskStatus: { select: { name: true, color: true } },
      project: { select: { name: true, color: true } },
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await params
  const task = await getSharedTask(token)
  return {
    title: task ? `${task.title} – Nexus` : "Zadanie nie znalezione",
    robots: { index: false, follow: false },
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm text-foreground">{children}</dd>
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

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header card */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {task.project && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: task.project.color || "#3B82F6" }}
                />
                {task.project.name}
              </span>
            )}
            {task.key && (
              <Badge variant="outline" className="font-mono">
                {task.key}
              </Badge>
            )}
            {task.taskStatus && (
              <Badge
                variant="outline"
                style={{
                  borderColor: task.taskStatus.color,
                  color: task.taskStatus.color,
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

          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {task.title}
          </h1>

          {tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  style={{ borderColor: tag.color, color: tag.color }}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            <Field label="Przypisane do">{displayName(task.assignee)}</Field>
            <Field label="Utworzone przez">{displayName(task.createdBy)}</Field>
            <Field label="Szacowany czas">
              {formatEstimatedHours(task.estimatedHours)}
            </Field>
            {task.dueDate && (
              <Field label="Termin">{formatDate(task.dueDate)}</Field>
            )}
            {task.startTime && (
              <Field label="Początek">{formatDateTime(task.startTime)}</Field>
            )}
            {task.endTime && (
              <Field label="Koniec">{formatDateTime(task.endTime)}</Field>
            )}
            <Field label="Utworzono">{formatDate(task.createdAt)}</Field>
          </dl>
        </div>

        {/* Description */}
        {task.description && task.description !== "<p></p>" && (
          <section className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
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
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
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
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Lista zadań ({completedTodos}/{task.todos.length})
            </h2>
            <ul className="space-y-2">
              {task.todos.map((todo) => (
                <li key={todo.id} className="flex items-center gap-2.5 text-sm">
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      todo.isCompleted
                        ? "border-green-500 bg-green-500 text-white"
                        : "border-muted-foreground/40"
                    }`}
                  >
                    {todo.isCompleted && (
                      <svg
                        viewBox="0 0 16 16"
                        className="h-3 w-3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path d="M3 8.5l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span
                    className={
                      todo.isCompleted ? "text-muted-foreground line-through" : ""
                    }
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
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Obrazy
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {task.images.map((image) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={image.id}
                  src={image.url}
                  alt={image.filename}
                  className="h-32 w-full rounded-lg border object-cover"
                />
              ))}
            </div>
          </section>
        )}

        {/* Attachments */}
        {task.attachments.length > 0 && (
          <section className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
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
                    <span className="truncate">{file.originalName}</span>
                    <span className="ml-3 shrink-0 text-xs text-muted-foreground">
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
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Zarejestrowany czas ({totalTime % 1 === 0 ? totalTime : totalTime.toFixed(1)}h)
            </h2>
            <ul className="divide-y">
              {task.timeEntries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-start justify-between gap-3 py-2 text-sm"
                >
                  <div>
                    <span className="font-medium">{displayName(entry.user)}</span>
                    {entry.description && (
                      <p className="text-muted-foreground">{entry.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatDate(entry.date)}
                    </p>
                  </div>
                  <span className="shrink-0 font-medium">{entry.hours}h</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Comments */}
        {task.comments.length > 0 && (
          <section className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Komentarze ({task.comments.length})
            </h2>
            <ul className="space-y-4">
              {task.comments.map((comment) => (
                <li key={comment.id} className="text-sm">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="font-medium">{displayName(comment.author)}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(comment.createdAt)}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-foreground">
                    {comment.content}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="pt-2 text-center text-xs text-muted-foreground">
          Widok tylko do odczytu · Nexus
        </p>
      </div>
    </div>
  )
}
