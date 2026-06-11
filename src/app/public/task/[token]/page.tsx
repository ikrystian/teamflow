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
  UserCheck,
  Share2
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

const getAvatarBg = (name: string) => {
  const colors = [
    "from-blue-500 to-indigo-600",
    "from-emerald-500 to-teal-600",
    "from-violet-500 to-purple-600",
    "from-pink-500 to-rose-600",
    "from-amber-500 to-orange-600",
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % colors.length
  return colors[index]
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
  const progressPercent = task.todos.length > 0 ? Math.round((completedTodos / task.todos.length) * 100) : 0

  const projectColor = task.project?.color || "#3B82F6"
  const markdownComponents = getMarkdownComponents(projectColor)

  return (
    <div className="min-h-screen bg-slate-50/50 text-neutral-800 dark:bg-neutral-950 dark:text-neutral-100 font-sans antialiased relative overflow-hidden pb-16">
      
      {/* Decorative top blur blob */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[350px] opacity-20 dark:opacity-15 blur-3xl pointer-events-none transition-all duration-1000"
        style={{
          background: `radial-gradient(circle 450px at 50% -50px, ${projectColor}, transparent)`
        }}
      />

      {/* Floating navigation header */}
      <nav className="sticky top-0 z-40 w-full border-b border-neutral-200/50 bg-white/75 backdrop-blur-md dark:border-neutral-800/50 dark:bg-neutral-900/75">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <span 
              className="flex h-7 w-7 items-center justify-center rounded-lg text-white font-bold text-sm tracking-tighter transition-transform hover:scale-105"
              style={{ backgroundColor: projectColor }}
            >
              N
            </span>
            <span className="font-semibold text-sm tracking-tight text-neutral-900 dark:text-neutral-50">Nexus</span>
            
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border bg-neutral-50 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400 dark:border-neutral-800">
              <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: projectColor }} />
              Karta zadania
            </span>
          </div>
          {task.project && (
            <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border bg-white/50 dark:bg-neutral-900/50 shadow-sm border-neutral-200/50 dark:border-neutral-800/50">
              <ProjectIcon iconName={task.project.icon} color={task.project.color || "#3B82F6"} className="h-3.5 w-3.5" />
              <span className="max-w-[120px] sm:max-w-[200px] truncate text-neutral-700 dark:text-neutral-300">{task.project.name}</span>
            </div>
          )}
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 relative z-10">
        
        {/* Breadcrumbs & Navigation Path */}
        <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 dark:text-neutral-500 mb-3 font-semibold tracking-wide uppercase">
          <span>Projekty</span>
          <span>/</span>
          <span className="hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors truncate max-w-[150px]">{task.project?.name || "Bez projektu"}</span>
          <span>/</span>
          <span className="font-mono text-neutral-600 dark:text-neutral-400 font-bold">{task.key || "ZADANIE"}</span>
        </div>

        {/* Hero Title Section */}
        <div className="pb-6 mb-8 border-b border-neutral-200/40 dark:border-neutral-800/40">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-3 max-w-4xl">
              <div className="flex flex-wrap items-center gap-2">
                {task.key && (
                  <span className="font-mono text-[10px] font-bold text-neutral-500 bg-neutral-100 dark:bg-neutral-900 dark:text-neutral-400 px-2 py-0.5 rounded border border-neutral-200/40 dark:border-neutral-800/40">
                    {task.key}
                  </span>
                )}
                {task.taskStatus && (
                  <span 
                    className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider"
                    style={{
                      borderColor: `${task.taskStatus.color}35`,
                      backgroundColor: `${task.taskStatus.color}08`,
                      color: task.taskStatus.color,
                    }}
                  >
                    {task.taskStatus.name}
                  </span>
                )}
                {task.priority && (
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                    task.priority === "HIGH" || task.priority === "URGENT"
                      ? "border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400"
                      : task.priority === "MEDIUM"
                      ? "border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400"
                      : "border-neutral-500/20 bg-neutral-50/5 text-neutral-600 dark:text-neutral-400"
                  }`}>
                    {getPriorityDisplayName(task.priority)}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50 leading-tight">
                {task.title}
              </h1>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                      style={{
                        borderColor: `${tag.color}30`,
                        backgroundColor: `${tag.color}08`,
                        color: tag.color
                      }}
                    >
                      #{tag.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Action / Shared Badge */}
            <div className="flex shrink-0 self-start md:self-center items-center gap-1.5 text-xs text-neutral-400 dark:text-neutral-500 bg-neutral-100/50 dark:bg-neutral-900/50 px-3 py-1.5 rounded-xl border border-neutral-200/30 dark:border-neutral-800/30 shadow-sm">
              <Share2 className="h-3.5 w-3.5" style={{ color: projectColor }} />
              <span>Widok publiczny</span>
            </div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Left / Main Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Description */}
            {task.description && !isDescriptionEmpty(task.description) && (
              <section className="rounded-2xl border border-neutral-200/50 bg-white/80 dark:bg-neutral-900/60 dark:border-neutral-800/40 p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.01)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all duration-300 backdrop-blur-md">
                <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-5 flex items-center gap-2">
                  <FileText className="h-4 w-4" style={{ color: projectColor }} /> Opis zadania
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
              <section className="rounded-2xl border border-neutral-200/50 bg-white/80 dark:bg-neutral-900/60 dark:border-neutral-800/40 p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.01)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all duration-300 backdrop-blur-md">
                <div className="mb-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Lista podzadań
                    </h2>
                    <span className="text-xs font-bold text-neutral-500 bg-neutral-100 dark:bg-neutral-900 dark:text-neutral-400 px-2.5 py-0.5 rounded-full border border-neutral-200/20 dark:border-neutral-800/20 shadow-sm">
                      {completedTodos} z {task.todos.length} ({progressPercent}%)
                    </span>
                  </div>
                  
                  {/* Beautiful Progress Bar */}
                  <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-2 rounded-full overflow-hidden mt-3 border border-neutral-200/20 dark:border-neutral-700/20">
                    <div 
                      className="h-full transition-all duration-700 ease-out rounded-full shadow-sm" 
                      style={{ width: `${progressPercent}%`, backgroundColor: projectColor }} 
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-2">
                  {task.todos.map((todo) => (
                    <div
                      key={todo.id}
                      className="flex items-center gap-3 p-3.5 rounded-xl border border-neutral-100/60 bg-neutral-50/20 hover:bg-neutral-50/60 dark:border-neutral-800/30 dark:bg-neutral-900/20 dark:hover:bg-neutral-800/30 transition-all duration-200 group"
                    >
                      <span className="flex shrink-0 transform group-hover:scale-110 transition-transform">
                        {todo.isCompleted ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500 fill-emerald-500/5" />
                        ) : (
                          <Circle className="h-5 w-5 text-neutral-300 dark:text-neutral-800 group-hover:text-neutral-400 dark:group-hover:text-neutral-700" />
                        )}
                      </span>
                      <span
                        className={`text-sm transition-colors duration-200 ${
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
              <section 
                className="rounded-2xl border-l-4 bg-white/80 dark:bg-neutral-900/60 p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.01)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all duration-300 backdrop-blur-md border-y border-r border-neutral-200/50 dark:border-neutral-800/40"
                style={{ borderLeftColor: projectColor }}
              >
                <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-5 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" /> Co zostało zrobione
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
              <section className="rounded-2xl border border-neutral-200/50 bg-white/80 dark:bg-neutral-900/60 dark:border-neutral-800/40 p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.01)] backdrop-blur-md">
                <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-5 flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-neutral-400" /> Obrazy i zrzuty ekranu
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {task.images.map((image) => (
                    <div 
                      key={image.id} 
                      className="group relative overflow-hidden rounded-xl border border-neutral-200/60 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 aspect-video shadow-sm hover:shadow-md transition-all duration-300"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.url}
                        alt={image.filename}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 via-neutral-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end p-3.5">
                        <span className="text-xs font-semibold text-white truncate w-full">
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
              <section className="rounded-2xl border border-neutral-200/50 bg-white/80 dark:bg-neutral-900/60 dark:border-neutral-800/40 p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.01)] backdrop-blur-md">
                <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-5 flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-neutral-400" /> Załączone pliki ({task.attachments.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {task.attachments.map((file) => (
                    <a
                      key={file.id}
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3.5 rounded-xl border border-neutral-200/60 dark:border-neutral-800/80 hover:border-neutral-300 dark:hover:border-neutral-700 bg-neutral-50/20 hover:bg-neutral-50 dark:bg-neutral-900/10 dark:hover:bg-neutral-800/20 transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div 
                          className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                          style={{ backgroundColor: `${projectColor}15`, color: projectColor }}
                        >
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200 truncate group-hover:text-neutral-950 dark:group-hover:text-white transition-colors">
                            {file.originalName}
                          </p>
                          <span className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500">
                            {formatFileSize(file.size)}
                          </span>
                        </div>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-neutral-400 group-hover:text-neutral-750 dark:group-hover:text-neutral-200 transition-colors shrink-0 ml-2" />
                    </a>
                  ))}
                </div>
              </section>
            )}

          </div>

          {/* Right Column / Sidebar */}
          <div className="space-y-6">
            
            {/* Meta Properties Pane */}
            <div className="rounded-2xl border border-neutral-200/50 bg-white/80 dark:bg-neutral-900/60 dark:border-neutral-800/40 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.01)] backdrop-blur-md">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-5 flex items-center gap-2">
                <Info className="h-3.5 w-3.5" style={{ color: projectColor }} /> Informacje
              </h3>
              
              <div className="space-y-4">
                {/* Assignee */}
                <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800/40 pb-3.5">
                  <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500 flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-neutral-400 shrink-0" /> Przypisane do
                  </span>
                  <div className="flex items-center gap-2">
                    <div className={`h-6 w-6 rounded-full bg-gradient-to-tr ${getAvatarBg(displayName(task.assignee))} flex items-center justify-center text-[10px] font-bold text-white shadow-sm`}>
                      {displayName(task.assignee)[0].toUpperCase()}
                    </div>
                    <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-300 font-medium">
                      {displayName(task.assignee)}
                    </span>
                  </div>
                </div>

                {/* Creator */}
                <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800/40 pb-3.5">
                  <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500 flex items-center gap-2">
                    <UserCheck className="h-3.5 w-3.5 text-neutral-400 shrink-0" /> Utworzone przez
                  </span>
                  <div className="flex items-center gap-2">
                    <div className={`h-6 w-6 rounded-full bg-gradient-to-tr ${getAvatarBg(displayName(task.createdBy))} flex items-center justify-center text-[10px] font-bold text-white shadow-sm`}>
                      {displayName(task.createdBy)[0].toUpperCase()}
                    </div>
                    <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-300 font-medium">
                      {displayName(task.createdBy)}
                    </span>
                  </div>
                </div>

                {/* Estimated Hours */}
                <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800/40 pb-3.5">
                  <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500 flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-neutral-400 shrink-0" /> Szacowany czas
                  </span>
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    {formatEstimatedHours(task.estimatedHours)}
                  </span>
                </div>

                {/* Due Date */}
                {task.dueDate && (
                  <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800/40 pb-3.5">
                    <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500 flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-neutral-400 shrink-0" /> Termin
                    </span>
                    <span className="text-xs font-bold text-red-500 dark:text-red-400 bg-red-500/5 px-2 py-0.5 rounded border border-red-500/10">
                      {formatDate(task.dueDate)}
                    </span>
                  </div>
                )}

                {/* Dates Range */}
                {(task.startTime || task.endTime) && (
                  <div className="space-y-2 border-b border-neutral-100 dark:border-neutral-800/40 pb-3.5">
                    <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500 flex items-center gap-2">
                      <CalendarRange className="h-3.5 w-3.5 text-neutral-400 shrink-0" /> Okres realizacji
                    </span>
                    <div className="pl-5 text-xs space-y-1.5 text-neutral-600 dark:text-neutral-400">
                      {task.startTime && (
                        <div className="flex justify-between items-center bg-neutral-50/50 dark:bg-neutral-900/30 p-1.5 rounded">
                          <span className="text-neutral-405 dark:text-neutral-500 font-medium">Od:</span>
                          <span className="font-semibold">{formatDateTime(task.startTime)}</span>
                        </div>
                      )}
                      {task.endTime && (
                        <div className="flex justify-between items-center bg-neutral-50/50 dark:bg-neutral-900/30 p-1.5 rounded">
                          <span className="text-neutral-405 dark:text-neutral-500 font-medium">Do:</span>
                          <span className="font-semibold">{formatDateTime(task.endTime)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Created At */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500 flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-neutral-400 shrink-0" /> Utworzono
                  </span>
                  <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400 font-medium">
                    {formatDate(task.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Time Tracking Widget */}
            {task.timeEntries.length > 0 && (
              <div className="rounded-2xl border border-neutral-200/50 bg-white/80 dark:bg-neutral-900/60 dark:border-neutral-800/40 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.01)] backdrop-blur-md">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 flex items-center gap-2">
                    <Timer className="h-3.5 w-3.5 text-neutral-400 shrink-0" /> Zarejestrowany czas
                  </h3>
                  <span className="font-bold text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-900 px-2.5 py-0.5 rounded-full text-xs border border-neutral-200/30 dark:border-neutral-800/30 shadow-sm">
                    {totalTime % 1 === 0 ? totalTime : totalTime.toFixed(1)}h
                  </span>
                </div>
                
                <div className="relative border-l border-neutral-200 dark:border-neutral-800 pl-4 ml-1 space-y-4 max-h-56 overflow-y-auto pr-1">
                  {task.timeEntries.map((entry) => (
                    <div key={entry.id} className="relative text-xs group">
                      {/* Timeline dot */}
                      <div 
                        className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full border bg-white dark:bg-neutral-900 transition-transform group-hover:scale-125"
                        style={{ borderColor: projectColor }}
                      />
                      <div className="flex justify-between items-start">
                        <div className="space-y-0.5 min-w-0 pr-2">
                          <span className="font-bold text-neutral-800 dark:text-neutral-200 hover:text-neutral-950 dark:hover:text-white transition-colors">
                            {displayName(entry.user)}
                          </span>
                          {entry.description && (
                            <p className="text-neutral-500 dark:text-neutral-400 text-[11px] leading-normal break-words">
                              {entry.description}
                            </p>
                          )}
                          <span className="text-[10px] text-neutral-400 block font-medium">
                            {formatDate(entry.date)}
                          </span>
                        </div>
                        <span className="font-bold text-neutral-700 dark:text-neutral-300 shrink-0 bg-neutral-50 dark:bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-200 dark:border-neutral-800 shadow-sm">
                          {entry.hours}h
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comments List */}
            {task.comments.length > 0 && (
              <div className="rounded-2xl border border-neutral-200/50 bg-white/80 dark:bg-neutral-900/60 dark:border-neutral-800/40 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.01)] backdrop-blur-md">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-5 flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5 text-neutral-400" /> Komentarze ({task.comments.length})
                </h3>

                <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
                  {task.comments.map((comment) => (
                    <div 
                      key={comment.id} 
                      className="text-xs p-3.5 rounded-xl border border-neutral-100/80 dark:border-neutral-800 bg-neutral-50/20 hover:bg-neutral-50/40 dark:bg-neutral-900/10 dark:hover:bg-neutral-900/30 transition-all duration-200"
                    >
                      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-neutral-100 dark:border-neutral-800/40">
                        <div className="flex items-center gap-2">
                          <div className={`h-5 w-5 rounded-full bg-gradient-to-tr ${getAvatarBg(displayName(comment.author))} flex items-center justify-center text-[9px] font-bold text-white shadow-sm`}>
                            {displayName(comment.author)[0].toUpperCase()}
                          </div>
                          <span className="font-bold text-neutral-800 dark:text-neutral-200">
                            {displayName(comment.author)}
                          </span>
                        </div>
                        <span className="text-[9px] font-medium text-neutral-400 dark:text-neutral-500">
                          {formatDateTime(comment.createdAt)}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-neutral-600 dark:text-neutral-300 leading-relaxed pl-1">
                        {comment.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-neutral-205 dark:border-neutral-800/30 text-center text-xs text-neutral-400 dark:text-neutral-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Nexus. Wszystkie prawa zastrzeżone.</p>
          <div className="flex items-center gap-2 text-[10px] text-neutral-400 dark:text-neutral-500 bg-neutral-100/50 dark:bg-neutral-900/50 px-2.5 py-1 rounded-full border border-neutral-200/40 dark:border-neutral-800/40 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Widok tylko do odczytu</span>
          </div>
        </footer>

      </div>
    </div>
  )
}

