"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { pl } from 'date-fns/locale';


import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function DatePicker({
  value,
  onChange,
  className,
  compact = false,
}: {
  value?: Date
  onChange: (date?: Date) => void
  className?: string
  /** Icon-only trigger, for tight toolbars that already show the date elsewhere. */
  compact?: boolean
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          size={compact ? "icon" : "default"}
          aria-label={compact ? `Wybierz datę${value ? ` (wybrano ${format(value, "PPP", { locale: pl })})` : ""}` : undefined}
          className={cn(
            !compact && "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className={cn("h-4 w-4", !compact && "mr-2")} />
          {!compact && (value ? format(value, "PPP", { locale: pl }) : <span>Wybierz datę</span>)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          locale={pl}
          mode="single"
          selected={value}
          onSelect={onChange}
        />
      </PopoverContent>
    </Popover>
  )
}
