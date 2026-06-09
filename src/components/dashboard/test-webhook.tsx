"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle, CheckCircle, Copy, Play } from "lucide-react"

const DEFAULT_PAYLOAD = {
  repository: "ikrystian/ps-map",
  branch: "main",
  pusher: "ikrystian",
  projectId: "cmq51g1jf000s5rmi7brxqsca",
  before: "a2176047743be5cae817c3691ff72ad27a363fa7",
  after: "d2eae38694e36f759acff83ef867f2e9872f1a94",
  commits: [
    "https://github.com/ikrystian/ps-map/commit/d2eae38694e36f759acff83ef867f2e9872f1a94"
  ]
}

type ResponseStatus = "idle" | "loading" | "success" | "error"

interface ApiResponse {
  data?: Record<string, unknown>
  error?: string
}

export function TestWebhook() {
  const [payload, setPayload] = useState(JSON.stringify(DEFAULT_PAYLOAD, null, 2))
  const [response, setResponse] = useState<ApiResponse | null>(null)
  const [status, setStatus] = useState<ResponseStatus>("idle")
  const [copied, setCopied] = useState(false)

  const handleSendWebhook = async () => {
    setStatus("loading")
    setResponse(null)

    try {
      const parsedPayload = JSON.parse(payload)
      const res = await fetch("https://team.studio-ai.com.pl/api/webhook-commit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsedPayload),
      })

      const data = await res.json()

      if (res.ok) {
        setStatus("success")
        setResponse({ data })
      } else {
        setStatus("error")
        setResponse({ error: data.error || "Unknown error" })
      }
    } catch (error) {
      setStatus("error")
      setResponse({
        error:
          error instanceof Error
            ? error.message
            : "Failed to send webhook",
      })
    }
  }

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(payload)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleReset = () => {
    setPayload(JSON.stringify(DEFAULT_PAYLOAD, null, 2))
    setResponse(null)
    setStatus("idle")
  }

  return (
    <div className="h-full flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Test REST API</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Testuj endpoint webhook-commit
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Request Side */}
        <div className="flex flex-col gap-3 bg-muted/30 rounded-lg p-4 border">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Request (JSON)</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyPayload}
              className="h-8"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Skopiowano
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Kopiuj
                </>
              )}
            </Button>
          </div>
          <Textarea
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            className="font-mono text-sm flex-1 resize-none bg-background"
            placeholder="Wklej JSON..."
          />
          <div className="flex gap-2">
            <Button
              onClick={handleSendWebhook}
              disabled={status === "loading"}
              className="flex-1"
            >
              <Play className="w-4 h-4 mr-2" />
              {status === "loading" ? "Wysyłanie..." : "Wyślij POST"}
            </Button>
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={status === "loading"}
            >
              Reset
            </Button>
          </div>
        </div>

        {/* Response Side */}
        <div className="flex flex-col gap-3 bg-muted/30 rounded-lg p-4 border">
          <h2 className="font-semibold">Response</h2>
          <div className="flex-1 overflow-auto bg-background rounded border p-3 font-mono text-sm">
            {status === "idle" && (
              <div className="text-muted-foreground">
                Wyślij żądanie, aby zobaczyć odpowiedź...
              </div>
            )}
            {status === "loading" && (
              <div className="text-muted-foreground">Ładowanie...</div>
            )}
            {status === "success" && response?.data && (
              <div className="text-green-600 dark:text-green-400">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4" />
                  Success
                </div>
                <pre className="whitespace-pre-wrap break-words text-xs">
                  {JSON.stringify(response.data, null, 2)}
                </pre>
              </div>
            )}
            {status === "error" && response?.error && (
              <div className="text-red-600 dark:text-red-400">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4" />
                  Error
                </div>
                <pre className="whitespace-pre-wrap break-words text-xs">
                  {response.error}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
