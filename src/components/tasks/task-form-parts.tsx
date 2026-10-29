"use client"

import { useState } from "react"
import { Check, ChevronsUpDown, Cloud, Loader2, Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { Tag } from "@/types"
import { cn } from "@/lib/utils"

/** Presentational building blocks of the task form (task-form-content.tsx). */

export const formatHours = (hours: number) => (Number.isInteger(hours) ? `${hours}` : hours.toFixed(1))

/** Small section title used between blocks of the task form. */
export function SectionHeader({
  icon: Icon,
  title,
  meta,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  meta?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <div className="flex min-h-7 items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 text-[13px] font-semibold">
        <Icon className="size-4 text-muted-foreground" />
        {title}
        {meta && <span className="font-normal text-muted-foreground tabular-nums">{meta}</span>}
      </h3>
      {children}
    </div>
  )
}

/** Label/value row of the properties panel. */
export function PropertyRow({
  label,
  icon: Icon,
  htmlFor,
  children,
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-[6.75rem_minmax(0,1fr)] items-center gap-2">
      <label htmlFor={htmlFor} className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="size-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </label>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

/**
 * Native select styled as a quiet inline control (hover reveals it), with an
 * optional leading marker such as a status colour dot.
 */
export function NativeSelect({
  leading,
  className,
  children,
  ...props
}: React.ComponentProps<"select"> & { leading?: React.ReactNode }) {
  return (
    <div className={cn("relative", className)}>
      {leading && (
        <span aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 flex -translate-y-1/2 items-center">
          {leading}
        </span>
      )}
      <select
        className={cn(
          "h-8 w-full cursor-pointer appearance-none truncate rounded-md border border-transparent bg-transparent pr-7 text-[13px] outline-none transition-colors",
          "hover:bg-accent focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20 disabled:cursor-default disabled:hover:bg-transparent",
          leading ? "pl-7" : "pl-2.5"
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronsUpDown aria-hidden className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
}

/** Two-option segmented switch. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-0.5 rounded-lg border bg-muted p-0.5">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-7 truncate rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
              active && "bg-card text-foreground shadow-[var(--glass-edge),var(--glass-tile-shadow)]"
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

/** Selected tags as coloured chips plus a popover to toggle any available tag. */
export function TagPicker({
  tags,
  selectedIds,
  onToggle,
}: {
  tags: Tag[]
  selectedIds: string[]
  onToggle: (id: string) => void
}) {
  const selected = tags.filter((tag) => selectedIds.includes(tag.id))

  return (
    <div className="flex min-h-8 flex-wrap items-center gap-1.5 px-1">
      {selected.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium"
          style={{
            color: tag.color,
            borderColor: `color-mix(in oklch, ${tag.color} 40%, transparent)`,
            backgroundColor: `color-mix(in oklch, ${tag.color} 12%, transparent)`,
          }}
        >
          <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: tag.color }} />
          <span className="truncate">{tag.name}</span>
        </span>
      ))}
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="h-6 gap-1 px-1.5 text-xs text-muted-foreground">
            <Plus className="size-3.5" />
            {selected.length === 0 && "Dodaj tag"}
            <span className="sr-only">Wybierz tagi</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-60 p-1">
          <div className="max-h-64 overflow-y-auto">
            {tags.map((tag) => {
              const checked = selectedIds.includes(tag.id)
              return (
                <button
                  key={tag.id}
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={checked}
                  onClick={() => onToggle(tag.id)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                >
                  <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: tag.color }} />
                  <span className="flex-1 truncate">{tag.name}</span>
                  {checked && <Check className="size-4 text-primary" />}
                </button>
              )
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export type SubtaskDraft = { id: string; title: string; isCompleted: boolean; timeSpent?: number; isNew?: boolean }

/** Inline checklist editor. Changes stay local until the form is saved. */
export function SubtaskList({
  subtasks,
  onChange,
  readOnly = false,
}: {
  subtasks: SubtaskDraft[]
  onChange: React.Dispatch<React.SetStateAction<SubtaskDraft[]>>
  readOnly?: boolean
}) {
  const [newTitle, setNewTitle] = useState("")

  const update = (id: string, patch: Partial<SubtaskDraft>) =>
    onChange((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))

  const add = () => {
    const title = newTitle.trim()
    if (!title) return
    onChange((prev) => [...prev, { id: `temp-${Date.now()}`, title, isCompleted: false, isNew: true }])
    setNewTitle("")
  }

  // Enter inside a form would submit (save & close) — keep it local to the list.
  const swallowEnter = (e: React.KeyboardEvent<HTMLInputElement>, action?: () => void) => {
    if (e.key !== "Enter") return
    e.preventDefault()
    action?.()
  }

  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-card">
      {subtasks.map((subtask) => (
        <li key={subtask.id} className="group flex items-center gap-2.5 px-3 py-1.5">
          <Checkbox
            checked={subtask.isCompleted}
            onCheckedChange={(checked) => update(subtask.id, { isCompleted: checked === true })}
            aria-label={subtask.isCompleted ? "Oznacz jako nieukończone" : "Oznacz jako ukończone"}
          />
          <input
            type="text"
            value={subtask.title}
            onChange={(e) => update(subtask.id, { title: e.target.value })}
            onKeyDown={(e) => swallowEnter(e)}
            aria-label="Treść podzadania"
            className={cn(
              "min-w-0 flex-1 bg-transparent py-1 text-sm outline-none",
              subtask.isCompleted && "text-muted-foreground line-through"
            )}
          />
          <label className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground" title="Zaraportowany czas w godzinach">
            <input
              type="number"
              min="0"
              step="0.5"
              value={subtask.timeSpent || ""}
              onChange={(e) => update(subtask.id, { timeSpent: e.target.value ? parseFloat(e.target.value) : 0 })}
              onKeyDown={(e) => swallowEnter(e)}
              placeholder="0"
              aria-label="Czas w godzinach"
              className="w-10 bg-transparent text-right tabular-nums outline-none"
            />
            h
          </label>
          {!readOnly && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onChange((prev) => prev.filter((s) => s.id !== subtask.id))}
              aria-label="Usuń podzadanie"
              className="size-7 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100"
            >
              <X />
            </Button>
          )}
        </li>
      ))}
      {readOnly && subtasks.length === 0 && (
        <li className="px-3 py-2.5 text-sm text-muted-foreground">Brak podzadań</li>
      )}
      {!readOnly && (
        <li className="flex items-center gap-2.5 px-3 py-1.5">
          <Plus className="size-4 shrink-0 text-muted-foreground" />
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => swallowEnter(e, add)}
            placeholder="Dodaj podzadanie i naciśnij Enter"
            aria-label="Nowe podzadanie"
            className="min-w-0 flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
          />
          {newTitle.trim() && (
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={add}>
              Dodaj
            </Button>
          )}
        </li>
      )}
    </ul>
  )
}

/** Thin progress bar; turns destructive when the value overshoots the max. */
export function Meter({ value, max, label }: { value: number; max: number; label: string }) {
  const percent = max > 0 ? Math.min(100, (value / max) * 100) : value > 0 ? 100 : 0
  const over = max > 0 && value > max

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-1.5 overflow-hidden rounded-full bg-muted"
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-500 ease-glass", over ? "bg-destructive" : "bg-primary")}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

/** Reported vs planned hours with a popover for logging time on the task. */
export function TimeReport({
  entries,
  taskHours,
  subtaskHours,
  plannedHours,
  newHours,
  onNewHoursChange,
  onAdd,
  onDelete,
  adding,
  open,
  onOpenChange,
}: {
  entries: Array<{ id: string; hours: number; date: string }>
  taskHours: number
  subtaskHours: number
  plannedHours: number
  newHours: string
  onNewHoursChange: (value: string) => void
  onAdd: () => void
  onDelete: (id: string) => void
  adding: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const total = taskHours + subtaskHours

  return (
    <div className="space-y-2.5 rounded-lg border bg-card p-3">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-muted-foreground">Zaraportowano</span>
        <span className="font-medium tabular-nums">
          {formatHours(total)} / {formatHours(plannedHours)} h
        </span>
      </div>
      <Meter value={total} max={plannedHours} label="Zaraportowany czas względem planu" />
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="h-7 w-full text-xs">
            <Plus className="size-3.5" />
            Raportuj czas
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 space-y-4 p-4" align="end">
          <div className="space-y-1">
            <h4 className="text-sm leading-none font-semibold">Raportowanie czasu</h4>
            <p className="text-xs text-muted-foreground">
              {formatHours(total)} h z planowanych {formatHours(plannedHours)} h
              {subtaskHours > 0 && ` · w podzadaniach ${formatHours(subtaskHours)} h, bezpośrednio ${formatHours(taskHours)} h`}
            </p>
          </div>

          {entries.length > 0 && (
            <ul className="max-h-40 space-y-1 overflow-y-auto pr-1">
              {entries.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-2 rounded-md border bg-muted px-2.5 py-1.5 text-xs">
                  <span className="font-semibold tabular-nums">{formatHours(entry.hours)} h</span>
                  <span className="text-muted-foreground">{new Date(entry.date).toLocaleDateString("pl-PL")}</span>
                  <button
                    type="button"
                    onClick={() => onDelete(entry.id)}
                    className="text-muted-foreground transition-colors hover:text-destructive"
                    aria-label="Usuń wpis"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2 border-t pt-3">
            <Input
              type="number"
              min="0"
              step="0.5"
              placeholder="Godz."
              aria-label="Liczba godzin"
              value={newHours}
              onChange={(e) => onNewHoursChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  onAdd()
                }
              }}
              className="h-8 w-24 text-sm"
            />
            <Button type="button" size="sm" onClick={onAdd} disabled={adding} className="flex-1">
              <Plus />
              Dodaj wpis
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

/** Auto-save state shown in the dialog header. */
export function SaveIndicator({ saving, savedAt }: { saving: boolean; savedAt: Date | null }) {
  return (
    <span aria-live="polite" className="hidden items-center gap-1.5 px-2 text-xs text-muted-foreground sm:inline-flex">
      {saving ? (
        <>
          <Loader2 className="size-3.5 animate-spin" />
          Zapisywanie…
        </>
      ) : savedAt ? (
        <>
          <Check className="size-3.5 text-success" />
          Zapisano
        </>
      ) : (
        <>
          <Cloud className="size-3.5" />
          Autozapis
        </>
      )}
    </span>
  )
}
