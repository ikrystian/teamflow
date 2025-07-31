"use client"

import * as React from "react"
import { Clock } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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

interface TimePickerProps {
  value?: Date
  onChange: (time?: Date) => void
  className?: string
  placeholder?: string
}

export function TimePicker({
  value,
  onChange,
  className,
  placeholder = "Wybierz czas"
}: TimePickerProps) {
  const [hours, setHours] = React.useState<string>("")
  const [minutes, setMinutes] = React.useState<string>("")

  // Initialize hours and minutes from value
  React.useEffect(() => {
    if (value) {
      setHours(value.getHours().toString().padStart(2, '0'))
      setMinutes(value.getMinutes().toString().padStart(2, '0'))
    } else {
      setHours("")
      setMinutes("")
    }
  }, [value])

  const handleTimeChange = (newHours: string, newMinutes: string) => {
    if (newHours && newMinutes) {
      const newTime = new Date()
      newTime.setHours(parseInt(newHours), parseInt(newMinutes), 0, 0)
      onChange(newTime)
    } else {
      onChange(undefined)
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

  const formatTime = (time?: Date) => {
    if (!time) return null
    return time.toLocaleTimeString('pl-PL', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    })
  }

  // Generate hours (00-23)
  const hourOptions = Array.from({ length: 24 }, (_, i) => 
    i.toString().padStart(2, '0')
  )

  // Generate minutes (00, 15, 30, 45)
  const minuteOptions = ['00', '15', '30', '45']

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <Clock className="mr-2 h-4 w-4" />
          {value ? formatTime(value) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="space-y-4">
          <div className="text-sm font-medium">Wybierz czas</div>
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
                Wybrany czas: {formatTime(value)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
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
      </PopoverContent>
    </Popover>
  )
}
