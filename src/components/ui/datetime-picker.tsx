"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Clock } from "lucide-react"
import { pl } from 'date-fns/locale'

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DateTimePickerProps {
  value?: Date
  onChange: (date?: Date) => void
  className?: string
  placeholder?: string
  showTime?: boolean
}

export function DateTimePicker({
  value,
  onChange,
  className,
  placeholder = "Wybierz datę i czas",
  showTime = true
}: DateTimePickerProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(value)
  const [hours, setHours] = React.useState<string>("")
  const [minutes, setMinutes] = React.useState<string>("")

  // Initialize date and time from value
  React.useEffect(() => {
    if (value) {
      setSelectedDate(value)
      setHours(value.getHours().toString().padStart(2, '0'))
      setMinutes(value.getMinutes().toString().padStart(2, '0'))
    } else {
      setSelectedDate(undefined)
      setHours("")
      setMinutes("")
    }
  }, [value])

  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date)
    if (date) {
      const newDateTime = new Date(date)
      if (showTime && hours && minutes) {
        newDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)
      } else if (!showTime) {
        newDateTime.setHours(0, 0, 0, 0)
      }
      onChange(newDateTime)
    } else {
      onChange(undefined)
    }
  }

  const handleTimeChange = (newHours: string, newMinutes: string) => {
    if (selectedDate && newHours && newMinutes) {
      const newDateTime = new Date(selectedDate)
      newDateTime.setHours(parseInt(newHours), parseInt(newMinutes), 0, 0)
      onChange(newDateTime)
    }
  }

  const handleHoursChange = (newHours: string) => {
    setHours(newHours)
    handleTimeChange(newHours, minutes)
  }

  const handleMinutesChange = (newMinutes: string) => {
    setMinutes(newMinutes)
    handleTimeChange(hours, newMinutes)
  }

  const formatDateTime = (date?: Date) => {
    if (!date) return null
    if (showTime) {
      return format(date, "PP 'o' HH:mm", { locale: pl })
    } else {
      return format(date, "PP", { locale: pl })
    }
  }

  // Generate hours (00-23)
  const hourOptions = Array.from({ length: 24 }, (_, i) =>
    i.toString().padStart(2, '0')
  )

  // Generate minutes (00, 30)
  const minuteOptions = ['00', '30']

  return (
    <Popover modal={false}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? formatDateTime(value) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="space-y-4">
          <Calendar
            locale={pl}
            mode="single"
            selected={selectedDate}
            onSelect={handleDateChange}
            initialFocus
          />

          {showTime && (
            <div className="border-t p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">Czas</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Godzina</label>
                  <Select value={hours} onValueChange={handleHoursChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="--" />
                    </SelectTrigger>
                    <SelectContent>
                      {hourOptions.map((hour) => (
                        <SelectItem key={hour} value={hour}>
                          {hour}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Minuta</label>
                  <Select value={minutes} onValueChange={handleMinutesChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="--" />
                    </SelectTrigger>
                    <SelectContent>
                      {minuteOptions.map((minute) => (
                        <SelectItem key={minute} value={minute}>
                          {minute}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {value && (
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm text-muted-foreground">
                    {formatDateTime(value)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedDate(undefined)
                      setHours("")
                      setMinutes("")
                      onChange(undefined)
                    }}
                  >
                    Wyczyść
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
