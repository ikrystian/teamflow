"use client"

import { useCallback, useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Filter,
  GitBranch,
  RefreshCw,
  Webhook,
  XCircle,
  ExternalLink,
  GitPullRequest,
  User,
  Folder,
  Tag,
  Activity,
  AlertTriangle,
  HelpCircle,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface WebhookLog {
  id: string
  event: string | null
  action: string | null
  payload: string
  headers: string | null
  signature: string | null
  response: string | null
  statusCode: number
  processedAt: string
  ipAddress: string | null
}

interface ApiResponse {
  logs: WebhookLog[]
  total: number
  page: number
  limit: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function statusColor(code: number) {
  if (code >= 500) return "destructive"
  if (code >= 400) return "destructive"
  if (code >= 200 && code < 300) return "default"
  return "secondary"
}

function StatusIcon({ code }: { code: number }) {
  if (code >= 200 && code < 300)
    return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
  if (code >= 400)
    return <XCircle className="w-4 h-4 text-red-500 shrink-0" />
  return <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(iso))
}

function tryPrettyJson(raw: string | null) {
  if (!raw) return null
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}

const EVENT_COLORS: Record<string, string> = {
  pull_request: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  push: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  ping: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  workflow_success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  workflow_failed: "bg-red-500/15 text-red-400 border-red-500/30",
  unknown: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
}

function EventBadge({ event }: { event: string | null }) {
  const label = event ?? "unknown"
  const cls = EVENT_COLORS[label] ?? EVENT_COLORS.unknown
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      {label}
    </span>
  )
}

function renderPreview(log: WebhookLog) {
  let parsed: any = null
  try {
    parsed = JSON.parse(log.payload)
  } catch {
    return (
      <div className="text-xs text-muted-foreground italic">
        Nie można sparsować payloadu jako JSON. Zobacz surowy Payload w zakładce obok.
      </div>
    )
  }

  // 1. WORKFLOW LOGS
  if (log.event?.startsWith("workflow_")) {
    const isSuccess = parsed.status === "success"
    return (
      <div className="space-y-4 text-sm">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div>
            <h4 className="font-semibold text-foreground flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-violet-400" />
              {parsed.workflow || "GitHub Workflow Run"}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Run ID: <code className="bg-muted px-1 py-0.5 rounded text-[11px] font-mono">{parsed.runId || "N/A"}</code>
            </p>
          </div>
          <div>
            {isSuccess ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" /> Sukces
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-400 border border-red-500/20">
                <XCircle className="w-3.5 h-3.5" /> Błąd
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <GitBranch className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Gałąź (Branch)</p>
                <span className="font-mono text-xs text-foreground bg-muted/60 px-1.5 py-0.5 rounded">{parsed.branch || "N/A"}</span>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Wykonawca (Actor)</p>
                <span className="text-foreground font-medium">{parsed.actor || "N/A"}</span>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Folder className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Repozytorium</p>
                <span className="text-foreground text-xs">{parsed.repo || "N/A"}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {parsed.taskKey && (
              <div className="flex items-start gap-2">
                <Tag className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Powiązane zadanie (Task)</p>
                  <a
                    href={`/dashboard/tasks`}
                    className="text-xs text-violet-400 hover:underline font-mono font-bold"
                  >
                    [{parsed.taskKey}]
                  </a>
                </div>
              </div>
            )}

            {parsed.prUrl && (
              <div className="flex items-start gap-2">
                <GitPullRequest className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Pull Request</p>
                  <a
                    href={parsed.prUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-violet-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    Zobacz na GitHub <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}

            {parsed.runUrl && (
              <div className="flex items-start gap-2">
                <Activity className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Szczegóły uruchomienia (Run URL)</p>
                  <a
                    href={parsed.runUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-violet-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    Workflow Run <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Commit section if available */}
        {(parsed.commitSha || parsed.commitMsg) && (
          <div className="border-t border-border/40 pt-3 mt-2">
            <p className="text-xs font-semibold text-muted-foreground mb-1.5">Ostatni commit</p>
            <div className="bg-background/50 border border-border/30 rounded-lg p-2.5 flex flex-col md:flex-row md:items-center gap-2 justify-between">
              <span className="text-xs text-foreground font-medium max-w-xl truncate">
                {parsed.commitMsg || "Brak wiadomości commitu"}
              </span>
              {parsed.commitSha && (
                <code className="text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                  {parsed.commitSha.substring(0, 7)}
                </code>
              )}
            </div>
          </div>
        )}

        {/* Error message section */}
        {parsed.error && (
          <div className="mt-3 p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-mono">
            <div className="font-semibold flex items-center gap-1 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Błąd wykonania workflow:
            </div>
            {parsed.error}
          </div>
        )}
      </div>
    )
  }

  // 2. PULL REQUEST EVENTS
  if (log.event === "pull_request") {
    const pr = parsed.pull_request
    const repo = parsed.repository
    if (!pr) return null

    return (
      <div className="space-y-4 text-sm">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div>
            <h4 className="font-semibold text-foreground flex items-center gap-1.5">
              <GitPullRequest className="w-4 h-4 text-violet-400" />
              PR #{parsed.number}: {pr.title || "Pull Request"}
            </h4>
            <a
              href={pr.html_url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-muted-foreground hover:underline flex items-center gap-1 mt-0.5"
            >
              {pr.html_url} <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div>
            {pr.merged ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-1 text-xs font-semibold text-purple-400 border border-purple-500/20">
                Merged
              </span>
            ) : pr.state === "closed" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-400 border border-red-500/20">
                Closed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                Open
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div>
              <p className="text-xs text-muted-foreground">Akcja webhooka</p>
              <span className="text-xs font-semibold bg-muted px-1.5 py-0.5 rounded text-foreground uppercase">{parsed.action}</span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Autor PR</p>
              <span className="text-foreground font-medium">{pr.user?.login || "N/A"}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <p className="text-xs text-muted-foreground">Gałąź źródłowa → docelowa</p>
              <span className="font-mono text-xs text-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                {pr.head?.ref} → {pr.base?.ref}
              </span>
            </div>
            {repo && (
              <div>
                <p className="text-xs text-muted-foreground">Repozytorium</p>
                <span className="text-foreground text-xs">{repo.full_name}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 3. PUSH EVENTS
  if (log.event === "push") {
    const branch = parsed.ref?.replace("refs/heads/", "")
    const commits = parsed.commits || []
    const repo = parsed.repository

    return (
      <div className="space-y-4 text-sm">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div>
            <h4 className="font-semibold text-foreground flex items-center gap-1.5">
              <GitBranch className="w-4 h-4 text-blue-400" />
              Push do gałęzi: <span className="font-mono text-blue-400 font-bold bg-blue-500/5 border border-blue-500/10 px-1.5 py-0.5 rounded text-xs">{branch}</span>
            </h4>
            {parsed.compare && (
              <a
                href={parsed.compare}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-muted-foreground hover:underline flex items-center gap-1 mt-0.5"
              >
                Porównaj commity na GitHub <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-400 border border-blue-500/20">
              {commits.length} {commits.length === 1 ? "commit" : commits.length < 5 ? "commity" : "commitów"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Pusher (Wysyłający)</p>
            <span className="text-foreground font-semibold text-xs">{parsed.pusher?.name || parsed.pusher?.email || "N/A"}</span>
          </div>
          {repo && (
            <div>
              <p className="text-xs text-muted-foreground font-medium">Repozytorium</p>
              <span className="text-foreground text-xs">{repo.full_name}</span>
            </div>
          )}
        </div>

        {commits.length > 0 && (
          <div className="border-t border-border/40 pt-3">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Lista commitów</p>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {commits.map((commit: any, idx: number) => (
                <div key={idx} className="bg-background/40 border border-border/30 rounded-lg p-2.5 flex items-start justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{commit.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Autor: {commit.author?.name}</p>
                  </div>
                  {commit.url ? (
                    <a
                      href={commit.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-[10px] text-violet-400 hover:underline shrink-0 bg-muted px-1.5 py-0.5 rounded"
                    >
                      {commit.id?.substring(0, 7) || "link"}
                    </a>
                  ) : (
                    <span className="font-mono text-[10px] text-muted-foreground shrink-0 bg-muted px-1.5 py-0.5 rounded">
                      {commit.id?.substring(0, 7)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // 4. PING EVENTS
  if (log.event === "ping") {
    return (
      <div className="space-y-3 text-sm">
        <h4 className="font-semibold text-foreground flex items-center gap-1.5 border-b border-border/40 pb-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          Połączenie testowe (Ping)
        </h4>
        <p className="text-xs text-muted-foreground">
          GitHub wysłał zdarzenie ping, aby potwierdzić, że ten webhook działa poprawnie.
        </p>
        {parsed.zen && (
          <div className="p-3 bg-muted/30 border border-border/40 rounded-lg italic text-xs text-foreground mt-2">
            &ldquo;{parsed.zen}&rdquo;
          </div>
        )}
      </div>
    )
  }

  // FALLBACK JSON PREVIEW
  return (
    <div className="space-y-2 text-sm">
      <h4 className="font-semibold text-foreground flex items-center gap-1.5 border-b border-border/40 pb-2">
        <HelpCircle className="w-4 h-4 text-muted-foreground" />
        Szybki podgląd (Inne zdarzenie)
      </h4>
      <p className="text-xs text-muted-foreground">
        To zdarzenie nie ma dedykowanego widoku. Możesz przeglądać surową zawartość w zakładce Payload.
      </p>
      {parsed && (
        <div className="bg-background/40 border border-border/30 rounded-lg p-3 text-xs max-h-40 overflow-y-auto mt-2">
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(parsed).slice(0, 8).map(([key, val]) => (
              <div key={key} className="truncate">
                <span className="text-muted-foreground font-medium">{key}:</span>{" "}
                <span className="text-foreground font-mono text-[11px]">
                  {typeof val === "object" ? "[Object]" : String(val)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Expandable log row
// ---------------------------------------------------------------------------
function LogRow({ log }: { log: WebhookLog }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<"podgląd" | "payload" | "response" | "headers">("podgląd")

  const prettyPayload = tryPrettyJson(log.payload)
  const prettyResponse = tryPrettyJson(log.response)
  const prettyHeaders = tryPrettyJson(log.headers)

  return (
    <div className="border border-border/60 rounded-lg overflow-hidden bg-card/40 hover:bg-card/60 transition-colors">
      {/* Header row */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <StatusIcon code={log.statusCode} />

        <EventBadge event={log.event} />

        {log.action && (
          <span className="text-xs text-muted-foreground truncate max-w-[200px] md:max-w-md">
            action: <span className="text-foreground font-medium">{log.action}</span>
          </span>
        )}

        <Badge variant={statusColor(log.statusCode)} className="ml-auto shrink-0 text-xs">
          {log.statusCode}
        </Badge>

        <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDate(log.processedAt)}
        </span>

        {log.ipAddress && (
          <span className="text-xs text-muted-foreground/60 shrink-0 hidden md:inline">
            {log.ipAddress}
          </span>
        )}

        {open ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {/* Expanded details */}
      {open && (
        <div className="border-t border-border/50 bg-muted/20">
          {/* Tabs */}
          <div className="flex gap-1 px-4 pt-3">
            {(["podgląd", "payload", "response", "headers"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  tab === t
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {t === "podgląd" ? "Podgląd" : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-4">
            {tab === "podgląd" && (
              <div className="bg-background/75 border border-border/40 rounded-lg p-4 shadow-sm">
                {renderPreview(log)}
              </div>
            )}
            {tab !== "podgląd" && (
              <pre className="text-xs font-mono bg-background/70 border border-border/40 rounded-md p-3 overflow-auto max-h-80 whitespace-pre-wrap break-all leading-relaxed text-foreground/90">
                {tab === "payload" && (prettyPayload ?? "—")}
                {tab === "response" && (prettyResponse ?? "—")}
                {tab === "headers" && (prettyHeaders ?? "—")}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const ALL_EVENTS = "all"

export function GithubWebhookLogs({ embedMode = false }: { embedMode?: boolean }) {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [eventFilter, setEventFilter] = useState<string>(ALL_EVENTS)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const limit = 20

  const fetchLogs = useCallback(async (p = page) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/github-webhook?page=${p}&limit=${limit}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: ApiResponse = await res.json()
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd pobierania danych")
    } finally {
      setLoading(false)
    }
  }, [page])

  // Initial load + page change
  useEffect(() => {
    fetchLogs(page)
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh every 10s
  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(() => fetchLogs(page), 10_000)
    return () => clearInterval(id)
  }, [autoRefresh, page, fetchLogs])

  // Derive unique events from loaded logs
  const uniqueEvents = data
    ? [ALL_EVENTS, ...Array.from(new Set(data.logs.map((l) => l.event ?? "unknown")))]
    : [ALL_EVENTS]

  const filteredLogs =
    data?.logs.filter(
      (l) => eventFilter === ALL_EVENTS || (l.event ?? "unknown") === eventFilter
    ) ?? []

  const totalPages = data ? Math.ceil(data.total / limit) : 1

  return (
    <div className={embedMode ? "flex flex-col gap-6" : "min-h-screen flex flex-col gap-6 p-4 md:p-6"}>
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}
      {!embedMode ? (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-500/15 border border-violet-500/30">
              <Webhook className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-muted-foreground" />
                GitHub Webhook Logs
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Wszystkie przychodzące żądania do{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">/api/github-webhook</code>
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Event filter */}
            <div className="flex items-center gap-1.5 bg-muted/50 border rounded-lg px-3 py-1.5">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              <select
                value={eventFilter}
                onChange={(e) => setEventFilter(e.target.value)}
                className="text-sm bg-transparent outline-none cursor-pointer"
              >
                {uniqueEvents.map((ev) => (
                  <option key={ev} value={ev}>
                    {ev === ALL_EVENTS ? "Wszystkie eventy" : ev}
                  </option>
                ))}
              </select>
            </div>

            {/* Auto-refresh toggle */}
            <button
              onClick={() => setAutoRefresh((v) => !v)}
              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                autoRefresh
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                  : "bg-muted/50 border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${autoRefresh ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground"}`}
              />
              Auto-refresh
            </button>

            {/* Manual refresh */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchLogs(page)}
              disabled={loading}
              className="gap-1.5"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Odśwież
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <div>
            <h3 className="text-sm font-medium text-foreground">Logi połączenia z GitHub</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Integracja i zdarzenia webhooków oraz workflow</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Event filter */}
            <div className="flex items-center gap-1.5 bg-muted/50 border rounded-lg px-3 py-1.5">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              <select
                value={eventFilter}
                onChange={(e) => setEventFilter(e.target.value)}
                className="text-sm bg-transparent outline-none cursor-pointer bg-card"
              >
                {uniqueEvents.map((ev) => (
                  <option key={ev} value={ev}>
                    {ev === ALL_EVENTS ? "Wszystkie eventy" : ev}
                  </option>
                ))}
              </select>
            </div>

            {/* Auto-refresh toggle */}
            <button
              onClick={() => setAutoRefresh((v) => !v)}
              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                autoRefresh
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                  : "bg-muted/50 border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${autoRefresh ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground"}`}
              />
              Auto-refresh
            </button>

            {/* Manual refresh */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchLogs(page)}
              disabled={loading}
              className="gap-1.5"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Odśwież
            </Button>
          </div>
        </div>
      )}


      {/* ------------------------------------------------------------------ */}
      {/* Stats bar                                                           */}
      {/* ------------------------------------------------------------------ */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: "Łącznie",
              value: data.total,
              icon: <Webhook className="w-4 h-4" />,
              cls: "text-foreground",
            },
            {
              label: "Sukces (2xx)",
              value: data.logs.filter((l) => l.statusCode >= 200 && l.statusCode < 300).length,
              icon: <CheckCircle2 className="w-4 h-4" />,
              cls: "text-emerald-400",
            },
            {
              label: "Błędy (4xx/5xx)",
              value: data.logs.filter((l) => l.statusCode >= 400).length,
              icon: <XCircle className="w-4 h-4" />,
              cls: "text-red-400",
            },
            {
              label: "Na stronie",
              value: filteredLogs.length,
              icon: <Filter className="w-4 h-4" />,
              cls: "text-muted-foreground",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-card/40 border border-border/60 rounded-xl px-4 py-3 flex items-center gap-3"
            >
              <span className={`${stat.cls} opacity-70`}>{stat.icon}</span>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-xl font-bold">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Log list                                                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col gap-2 flex-1">
        {error && (
          <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {loading && !data && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-14 rounded-lg bg-muted/40 border border-border/40 animate-pulse"
              />
            ))}
          </div>
        )}

        {!loading && filteredLogs.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <div className="p-4 rounded-full bg-muted/40 border border-border/40">
              <Webhook className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground text-sm">
              Brak żądań.{" "}
              {eventFilter !== ALL_EVENTS && "Spróbuj zmienić filtr eventu."}
            </p>
          </div>
        )}

        {filteredLogs.map((log) => (
          <LogRow key={log.id} log={log} />
        ))}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Pagination                                                          */}
      {/* ------------------------------------------------------------------ */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Poprzednia
          </Button>
          <span className="text-sm text-muted-foreground px-2">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Następna →
          </Button>
        </div>
      )}
    </div>
  )
}
