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

// ---------------------------------------------------------------------------
// Expandable log row
// ---------------------------------------------------------------------------
function LogRow({ log }: { log: WebhookLog }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<"payload" | "response" | "headers">("payload")

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
          <span className="text-xs text-muted-foreground">
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
            {(["payload", "response", "headers"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  tab === t
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Code block */}
          <div className="p-4">
            <pre className="text-xs font-mono bg-background/70 border border-border/40 rounded-md p-3 overflow-auto max-h-80 whitespace-pre-wrap break-all leading-relaxed text-foreground/90">
              {tab === "payload" && (prettyPayload ?? "—")}
              {tab === "response" && (prettyResponse ?? "—")}
              {tab === "headers" && (prettyHeaders ?? "—")}
            </pre>
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

export function GithubWebhookLogs() {
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
    <div className="min-h-screen flex flex-col gap-6 p-4 md:p-6">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}
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
