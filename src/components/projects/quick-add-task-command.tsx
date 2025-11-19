/* eslint-disable react/no-unescaped-entities */
"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import type { Session } from "next-auth"
import { Command } from "@/components/ui/command"
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Zap } from "lucide-react"
import { toast } from "sonner"

interface QuickAddTaskCommandProps {
  projectId: string
  onTaskCreated?: () => void
}

export function QuickAddTaskCommand({ projectId, onTaskCreated }: QuickAddTaskCommandProps) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const { data: session } = useSession() as { data: Session | null }
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [open])

  const handleCreateTask = async () => {
    if (!input.trim()) return
    if (!session?.user?.id) return

    setLoading(true)
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: input.trim(),
          projectId: projectId,
          assigneeId: session.user.id, // Przypisz zadanie do aktualnego użytkownika
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Nie udało się utworzyć zadania")
      }

      const data = await response.json()
      toast.success(`Zadanie "${data.task.title}" zostało utworzone`)
      setInput("")
      setOpen(false)
      onTaskCreated?.()
    } catch (error) {
      console.error("Error creating task:", error)
      toast.error(error instanceof Error ? error.message : "Wystąpił błąd podczas tworzenia zadania")
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleCreateTask()
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        className="relative h-8 w-full justify-start text-sm text-muted-foreground sm:pr-12"
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="hidden lg:inline">Szybkie dodanie zadania...</span>
        <span className="inline lg:hidden">Dodaj zadanie...</span>
        <kbd className="pointer-events-none absolute right-[0.3rem] top-[0.3rem] hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command className="rounded-lg border shadow-md">
          <div className="flex items-center border-b px-3">
            <Zap className="mr-2 h-4 w-4 text-muted-foreground" />
            <CommandInput
              ref={inputRef}
              placeholder="Wpisz nazwę zadania i naciśnij Enter..."
              value={input}
              onValueChange={setInput}
              onKeyDown={handleKeyDown}
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <CommandList>
            <CommandEmpty>
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Plus className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {input.trim() ? "Naciśnij Enter aby utworzyć zadanie" : "Wpisz nazwę zadania"}
                </p>
                {input.trim() && (
                  <Button
                    onClick={handleCreateTask}
                    disabled={loading}
                    size="sm"
                    className="mt-2"
                  >
                    {loading ? "Tworzenie..." : "Utwórz zadanie"}
                  </Button>
                )}
              </div>
            </CommandEmpty>
            <CommandGroup heading="Szybkie dodanie zadania">
              {input.trim() && (
                <CommandItem
                  onSelect={handleCreateTask}
                  disabled={loading}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <span>Utwórz zadanie: "{input.trim()}"</span>
                  {loading && <Badge className="ml-auto" variant="secondary">Tworzenie...</Badge>}
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}