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
import {
  Calendar,
  User,
  Clock,
  Paperclip,
  Image as ImageIcon,
  MessageSquare,
  Tag,
  CheckCircle2,
  Circle,
  ExternalLink,
  FileText,
  Sparkles,
  Info,
  CalendarRange,
  Timer,
  UserCheck
} from "lucide-react"

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

function isDescriptionEmpty(html: string | null): boolean {
  if (!html) return true
  const clean = html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, "").trim()
  return clean === ""
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
      <h1 className="text-lg font-bold text-neutral-900 dark:text-neutral-50 mt-6 mb-3 border-b pb-1.5 border-neutral-100 dark:border-neutral-800" {...props} />
    ),
    h2: ({ node, ...props }) => (
      <h2 
        className="text-base font-semibold text-neutral-900 dark:text-neutral-50 mt-5 mb-2.5 border-l-2 pl-2" 
        style={{ borderLeftColor: projectColor }}
        {...props} 
      />
    ),
    h3: ({ node, ...props }) => (
      <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 mt-4 mb-2" {...props} />
    ),
    p: ({ node, ...props }) => (
      <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed mb-3" {...props} />
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
      <ul className="list-disc pl-5 mb-3.5 space-y-1 text-sm text-neutral-600 dark:text-neutral-300" {...props} />
    ),
    ol: ({ node, ...props }) => (
      <ol className="list-decimal pl-5 mb-3.5 space-y-1 text-sm text-neutral-600 dark:text-neutral-300" {...props} />
    ),
    li: ({ node, ...props }) => (
      <li className="mb-0.5 text-neutral-600 dark:text-neutral-300" {...props} />
    ),
    blockquote: ({ node, ...props }) => (
      <blockquote 
        className="border-l-2 pl-4 italic my-3 text-neutral-500 dark:text-neutral-400" 
        style={{ borderLeftColor: projectColor, backgroundColor: `${projectColor}08` }}
        {...props} 
      />
    ),
    code({ node, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || "")
      return match ? (
        <pre className="bg-neutral-50 dark:bg-neutral-900/60 p-3 rounded-lg overflow-x-auto my-3 border border-neutral-200/50 dark:border-neutral-800/50 font-mono text-[11px] text-neutral-800 dark:text-neutral-200">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      ) : (
        <code 
          className="px-1 py-0.5 rounded font-mono text-[11px] font-medium" 
          style={{ color: projectColor, backgroundColor: `${projectColor}15` }}
          {...props}
        >
          {children}
        </code>
      )
    },
    table: ({ node, ...props }) => (
      <div className="overflow-x-auto my-3.5 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60">
        <table className="w-full border-collapse text-xs" {...props} />
      </div>
    ),
    thead: ({ node, ...props }) => (
      <thead className="bg-neutral-50 dark:bg-neutral-900/40 border-b border-neutral-200 dark:border-neutral-800" {...props} />
    ),
    th: ({ node, ...props }) => (
      <th className="border-r border-neutral-200/60 dark:border-neutral-800/60 last:border-r-0 px-3 py-2 font-semibold text-left text-neutral-800 dark:text-neutral-200" {...props} />
    ),
    td: ({ node, ...props }) => (
      <td className="border-r border-b border-neutral-200/60 dark:border-neutral-800/60 last:border-r-0 px-3 py-2 text-neutral-600 dark:text-neutral-300" {...props} />
    ),
    hr: ({ node, ...props }) => (
      <hr className="my-5 border-t border-neutral-200 dark:border-neutral-800" {...props} />
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

  // Determine metadataBase dynamically if possible or fall back to local
  const base = process.env.NEXTAUTH_URL || "http://localhost:3000"
  const baseClean = base.endsWith("/") ? base.slice(0, -1) : base
  let metadataBase: URL | undefined = undefined
  try {
    metadataBase = new URL(baseClean)
  } catch (e) {
    console.error("Invalid NEXTAUTH_URL", e)
  }

  const ogImageUrl = `${baseClean}/public/task/${token}/opengraph-image`

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
      url: `${baseClean}/public/task/${token}`,
      locale: "pl_PL",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${task.key ? `[${task.key}] ` : ""}${task.title}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${task.key ? `[${task.key}] ` : ""}${task.title}`,
      description: ogDescription,
      images: [ogImageUrl],
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
    <div className="min-h-screen bg-neutral-50/50 text-neutral-800 dark:bg-neutral-950 dark:text-neutral-100 font-sans antialiased relative overflow-hidden pb-16">
      
      {/* Decorative top blur blob */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[400px] bg-gradient-to-b from-blue-500/5 to-transparent blur-3xl pointer-events-none" />

      {/* Floating navigation header */}
      <nav className="sticky top-0 z-40 w-full border-b border-neutral-200/60 bg-white/70 backdrop-blur-md dark:border-neutral-800/60 dark:bg-neutral-955/70">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-bold text-sm tracking-tighter">
              N
            </span>
            <span className="font-semibold text-sm tracking-tight">Nexus</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-medium text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
              <span className="h-1 w-1 rounded-full bg-blue-500 animate-pulse" />
              Karta zadania
            </span>
          </div>
          {task.project && (
            <div className="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-900 px-3 py-1 rounded-full border border-neutral-200/40 dark:border-neutral-800/40">
              <ProjectIcon iconName={task.project.icon} color={task.project.color || "#3B82F6"} className="h-3.5 w-3.5" />
              <span>{task.project.name}</span>
            </div>
          )}
        </div>
      </nav>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 relative z-10">
         {/* Main Title Section */}
        <div className="border-b border-neutral-200/60 dark:border-neutral-800/60 pb-8 mb-8">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {task.key && (
              <span className="font-mono text-xs font-semibold text-neutral-500 bg-neutral-100 dark:bg-neutral-900 dark:text-neutral-400 px-2.5 py-0.5 rounded-md border border-neutral-200/50 dark:border-neutral-800/50">
                {task.key}
              </span>
            )}
            {task.taskStatus && (
              <span 
                className="text-xs font-semibold px-2.5 py-0.5 rounded-full border"
                style={{
                  borderColor: `${task.taskStatus.color}40`,
                  backgroundColor: `${task.taskStatus.color}12`,
                  color: task.taskStatus.color,
                }}
              >
                {task.taskStatus.name}
              </span>
            )}
            {task.priority && (
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                task.priority === "HIGH" || task.priority === "URGENT"
                  ? "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400"
                  : task.priority === "MEDIUM"
                  ? "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "border-neutral-500/20 bg-neutral-500/10 text-neutral-600 dark:text-neutral-400"
              }`}>
                {getPriorityDisplayName(task.priority)}
              </span>
            )}
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 leading-tight mb-4">
            {task.title}
          </h1>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {tags.map((tag) => (
                <span
                  key={tag.id}
                  className="text-xs font-medium px-2.5 py-0.5 rounded-full border"
                  style={{
                    borderColor: `${tag.color}40`,
                    backgroundColor: `${tag.color}10`,
                    color: tag.color
                  }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Left / Main Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Description */}
            {task.description && !isDescriptionEmpty(task.description) && (
              <section className="rounded-2xl border border-neutral-200/80 bg-white dark:border-neutral-900/40 p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.015)] backdrop-blur-sm">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-4 flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-neutral-400" /> Opis zadania
                </h2>
                
                <div className="prose prose-neutral max-w-none dark:prose-invert prose-sm sm:prose-base prose-headings:font-bold prose-headings:tracking-tight">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkBreaks]}
                    components={markdownComponents}
                  >
                    {htmlToMarkdown(task.description)}
                  </ReactMarkdown>
                </div>
              </section>
            )}

            {/* Subtasks */}
            {task.todos.length > 0 && (
              <section className="rounded-2xl border border-neutral-200/80 bg-white dark:border-neutral-900/40 p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.015)] backdrop-blur-sm">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Lista podzadań
                  </span>
                  <span className="text-xs font-semibold text-neutral-500 bg-neutral-100 dark:bg-neutral-900 dark:text-neutral-400 px-2.5 py-0.5 rounded-full border border-neutral-200/20 dark:border-neutral-800/20">
                    {completedTodos} z {task.todos.length}
                  </span>
                </h2>
                
                <div className="space-y-2">
                  {task.todos.map((todo) => (
                    <div
                      key={todo.id}
                      className="flex items-center gap-3 p-3.5 rounded-xl border border-neutral-100/50 bg-neutral-50/20 hover:bg-neutral-50/55 dark:border-neutral-800/30 dark:bg-neutral-900/10 dark:hover:bg-neutral-800/20 transition-colors"
                    >
                      <span className="flex shrink-0">
                        {todo.isCompleted ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500 fill-emerald-500/5" />
                        ) : (
                          <Circle className="h-5 w-5 text-neutral-300 dark:text-neutral-800" />
                        )}
                      </span>
                      <span
                        className={`text-sm ${
                          todo.isCompleted
                            ? "text-neutral-400 line-through dark:text-neutral-500 font-normal"
                            : "text-neutral-800 dark:text-neutral-200 font-medium"
                        }`}
                      >
                        {todo.title}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Changes / What was done */}
            {task.changes && task.changes.trim() && (
              <section className="rounded-2xl border border-neutral-200/80 bg-white dark:border-neutral-900/40 p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.015)] backdrop-blur-sm">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-4 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-500" /> Co zostało zrobione
                </h2>
                
                <div className="prose prose-neutral max-w-none dark:prose-invert prose-sm sm:prose-base prose-headings:font-bold prose-headings:tracking-tight">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkBreaks]}
                    components={markdownComponents}
                  >
                    {task.changes}
                  </ReactMarkdown>
                </div>
              </section>
            )}

            {/* Images */}
            {task.images.length > 0 && (
              <section className="rounded-2xl border border-neutral-200/80 bg-white dark:border-neutral-900/40 p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.015)] backdrop-blur-sm">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-4 flex items-center gap-1.5">
                  <ImageIcon className="h-4 w-4 text-neutral-400" /> Obrazy i zrzuty ekranu
                </h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {task.images.map((image) => (
                    <div 
                      key={image.id} 
                      className="group relative overflow-hidden rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 aspect-video"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.url}
                        alt={image.filename}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5">
                        <span className="text-[10px] font-medium text-white truncate w-full">
                          {image.filename}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Attachments */}
            {task.attachments.length > 0 && (
              <section className="rounded-2xl border border-neutral-200/80 bg-white dark:border-neutral-900/40 p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.015)] backdrop-blur-sm">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-4 flex items-center gap-1.5">
                  <Paperclip className="h-4 w-4 text-neutral-400" /> Załączone pliki ({task.attachments.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {task.attachments.map((file) => (
                    <a
                      key={file.id}
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3.5 rounded-xl border border-neutral-200/60 dark:border-neutral-800/80 hover:border-neutral-300 dark:hover:border-neutral-700 bg-neutral-50/30 hover:bg-neutral-50 dark:bg-neutral-900/10 dark:hover:bg-neutral-800/20 transition-all group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center shrink-0">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate group-hover:text-blue-500 transition-colors">
                            {file.originalName}
                          </p>
                          <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                            {formatFileSize(file.size)}
                          </span>
                        </div>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors shrink-0 ml-2" />
                    </a>
                  ))}
                </div>
              </section>
            )}

          </div>

          {/* Right Column / Sidebar */}
          <div className="space-y-6">
            
            {/* Meta Properties Pane */}
            <div className="rounded-2xl border border-neutral-200/80 bg-white dark:border-neutral-900/40 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] backdrop-blur-sm">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-5 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5" /> Informacje
              </h3>
              
              <div className="space-y-4">
                {/* Assignee */}
                <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800/60 pb-3">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-neutral-400 shrink-0" /> Przypisane do
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] font-semibold text-white">
                      {displayName(task.assignee)[0].toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-neutral-800 dark:text-neutral-300">
                      {displayName(task.assignee)}
                    </span>
                  </div>
                </div>

                {/* Creator */}
                <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800/60 pb-3">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                    <UserCheck className="h-3.5 w-3.5 text-neutral-400 shrink-0" /> Utworzone przez
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-[10px] font-semibold text-white">
                      {displayName(task.createdBy)[0].toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-neutral-800 dark:text-neutral-300">
                      {displayName(task.createdBy)}
                    </span>
                  </div>
                </div>

                {/* Estimated Hours */}
                <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800/60 pb-3">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-neutral-400 shrink-0" /> Szacowany czas
                  </span>
                  <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                    {formatEstimatedHours(task.estimatedHours) || "Brak"}
                  </span>
                </div>

                {/* Due Date */}
                {task.dueDate && (
                  <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800/60 pb-3">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-neutral-400 shrink-0" /> Termin
                    </span>
                    <span className="text-sm font-semibold text-red-500 dark:text-red-400">
                      {formatDate(task.dueDate)}
                    </span>
                  </div>
                )}

                {/* Dates Range */}
                {(task.startTime || task.endTime) && (
                  <div className="space-y-2 border-b border-neutral-100 dark:border-neutral-800/60 pb-3">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                      <CalendarRange className="h-3.5 w-3.5 text-neutral-400 shrink-0" /> Okres realizacji
                    </span>
                    <div className="pl-5 text-xs space-y-1 text-neutral-600 dark:text-neutral-400">
                      {task.startTime && (
                        <div>
                          <span className="text-neutral-400 dark:text-neutral-500 mr-1">Od:</span> {formatDateTime(task.startTime)}
                        </div>
                      )}
                      {task.endTime && (
                        <div>
                          <span className="text-neutral-400 dark:text-neutral-500 mr-1">Do:</span> {formatDateTime(task.endTime)}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Created At */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-neutral-400 shrink-0" /> Utworzono
                  </span>
                  <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    {formatDate(task.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Time Tracking Widget */}
            {task.timeEntries.length > 0 && (
              <div className="rounded-2xl border border-neutral-200/80 bg-white dark:border-neutral-900/40 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] backdrop-blur-sm">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Timer className="h-3.5 w-3.5 text-neutral-400 shrink-0" /> Zarejestrowany czas
                  </span>
                  <span className="font-bold text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-900 px-2 py-0.5 rounded text-[11px] border border-neutral-200/40 dark:border-neutral-800/40">
                    {totalTime % 1 === 0 ? totalTime : totalTime.toFixed(1)}h
                  </span>
                </h3>
                
                <ul className="space-y-3 max-h-48 overflow-y-auto pr-1">
                  {task.timeEntries.map((entry) => (
                    <li key={entry.id} className="flex justify-between items-start text-xs border-b border-neutral-100/40 dark:border-neutral-800/40 pb-2.5 last:border-0 last:pb-0">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                          {displayName(entry.user)}
                        </span>
                        {entry.description && (
                          <p className="text-neutral-500 dark:text-neutral-400 text-[11px] line-clamp-1 leading-normal">
                            {entry.description}
                          </p>
                        )}
                        <span className="text-[10px] text-neutral-400 block">
                          {formatDate(entry.date)}
                        </span>
                      </div>
                      <span className="font-bold text-neutral-700 dark:text-neutral-300 shrink-0 ml-2">
                        {entry.hours}h
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Comments List */}
            {task.comments.length > 0 && (
              <div className="rounded-2xl border border-neutral-200/80 bg-white dark:border-neutral-900/40 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] backdrop-blur-sm">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-4 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-neutral-400" /> Komentarze ({task.comments.length})
                </h3>

                <ul className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {task.comments.map((comment) => (
                    <li 
                      key={comment.id} 
                      className="text-xs space-y-1 bg-neutral-50/40 dark:bg-neutral-900/20 p-3 rounded-xl border border-neutral-100/50 dark:border-neutral-800/40"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="h-5 w-5 rounded-full bg-gradient-to-tr from-neutral-200 to-neutral-300 dark:from-neutral-800 dark:to-neutral-700 flex items-center justify-center text-[9px] font-bold text-neutral-700 dark:text-neutral-300">
                            {displayName(comment.author)[0].toUpperCase()}
                          </div>
                          <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                            {displayName(comment.author)}
                          </span>
                        </div>
                        <span className="text-[9px] text-neutral-400 dark:text-neutral-500">
                          {formatDateTime(comment.createdAt)}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-neutral-600 dark:text-neutral-350 pl-6 leading-relaxed">
                        {comment.content}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

          </div>

        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-neutral-200/40 dark:border-neutral-800/40 text-center text-xs text-neutral-400 dark:text-neutral-500">
          <p>Widok tylko do odczytu · Nexus</p>
        </footer>

      </div>
    </div>
  )
}
