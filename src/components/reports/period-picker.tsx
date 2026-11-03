"use client"

import { useState } from "react"
import { CalendarRange, Check, ChevronLeft, ChevronRight } from "lucide-react"
import { pl } from "date-fns/locale"
import type { DateRange as CalendarRangeValue } from "react-day-picker"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  type DayKey,
  type PeriodSelection,
  PERIOD_PRESETS,
  dayKeyToLocalDate,
  localDayKey,
  periodLabel,
  rangeText,
  selectionRange,
  selectionUnit,
  shiftSelection,
} from "@/lib/reports/period"

/** Okres raportu: strzałki do sąsiednich okresów, presety i własny zakres w kalendarzu. */
export function PeriodPicker({
  selection,
  today,
  onChange,
}: {
  selection: PeriodSelection
  today: DayKey
  onChange: (selection: PeriodSelection) => void
}) {
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<CalendarRangeValue | undefined>()

  const range = selectionRange(selection, today)
  const previous = shiftSelection(selection, -1, today)
  const next = shiftSelection(selection, 1, today)
  const activePreset = selection.kind === "preset" ? selection.preset : null
  const months = isMobile ? 1 : 2

  // Kalendarz kończy się na miesiącu końca zakresu (albo bieżącym), żeby wybór był widoczny od razu.
  const endMonth = dayKeyToLocalDate(range?.to ?? today)
  const startMonth = draft?.from ?? endMonth
  const lastShownStart = new Date(endMonth.getFullYear(), endMonth.getMonth() - (months - 1), 1)
  const defaultMonth = startMonth < lastShownStart ? startMonth : lastShownStart

  const handleOpenChange = (value: boolean) => {
    if (value) setDraft(range ? { from: dayKeyToLocalDate(range.from), to: dayKeyToLocalDate(range.to) } : undefined)
    setOpen(value)
  }

  const choose = (value: PeriodSelection) => {
    onChange(value)
    setOpen(false)
  }

  const applyDraft = () => {
    if (!draft?.from) return
    choose({ kind: "range", range: { from: localDayKey(draft.from), to: localDayKey(draft.to ?? draft.from) }, unit: null })
  }

  return (
    <div className="flex h-8 items-center rounded-md border bg-background shadow-xs">
      <Button
        variant="ghost"
        size="icon"
        className="size-8 rounded-r-none text-muted-foreground"
        disabled={!previous}
        onClick={() => previous && onChange(previous)}
        aria-label="Poprzedni okres"
      >
        <ChevronLeft />
      </Button>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 min-w-36 rounded-none border-x px-3 font-medium sm:min-w-44">
            <CalendarRange className="text-muted-foreground" />
            {periodLabel(range, selectionUnit(selection))}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <div className="flex max-sm:flex-col">
            <div className="flex min-w-44 flex-col gap-0.5 p-1.5 max-sm:border-b sm:border-r" role="group" aria-label="Gotowe okresy">
              {PERIOD_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={activePreset === preset.id}
                  onClick={() => choose({ kind: "preset", preset: preset.id })}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm outline-none transition-colors hover:bg-accent focus-visible:bg-accent",
                    activePreset === preset.id && "font-medium"
                  )}
                >
                  <span className="flex-1">{preset.label}</span>
                  {activePreset === preset.id && <Check className="size-4 stroke-[2.5]" />}
                </button>
              ))}
            </div>
            <div className="p-2">
              <Calendar
                mode="range"
                locale={pl}
                numberOfMonths={months}
                defaultMonth={defaultMonth}
                selected={draft}
                onSelect={setDraft}
                disabled={{ after: dayKeyToLocalDate(today) }}
                className="bg-transparent"
              />
              <div className="flex items-center justify-between gap-3 border-t px-1 pt-2">
                <span className="text-xs text-muted-foreground">
                  {draft?.from
                    ? rangeText({ from: localDayKey(draft.from), to: localDayKey(draft.to ?? draft.from) })
                    : "Wybierz początek i koniec"}
                </span>
                <Button size="sm" onClick={applyDraft} disabled={!draft?.from}>
                  Zastosuj
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 rounded-l-none text-muted-foreground"
        disabled={!next}
        onClick={() => next && onChange(next)}
        aria-label="Następny okres"
      >
        <ChevronRight />
      </Button>
    </div>
  )
}
