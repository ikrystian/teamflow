"use client"

import { useState } from "react"
import { DateTimePicker } from "@/components/ui/datetime-picker"

export default function TestDatePickerPage() {
  const [date1, setDate1] = useState<Date | undefined>()
  const [date2, setDate2] = useState<Date | undefined>()

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Test Date Picker</h1>

      <div className="space-y-8">
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Date Picker with Time
          </label>
          <DateTimePicker
            value={date1}
            onChange={setDate1}
            placeholder="Wybierz datę i czas"
            showTime={true}
          />
          {date1 && (
            <p className="text-sm text-muted-foreground">
              Selected: {date1.toLocaleString('pl-PL')}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Date Picker without Time
          </label>
          <DateTimePicker
            value={date2}
            onChange={setDate2}
            placeholder="Wybierz datę"
            showTime={false}
          />
          {date2 && (
            <p className="text-sm text-muted-foreground">
              Selected: {date2.toLocaleDateString('pl-PL')}
            </p>
          )}
        </div>

        <div className="mt-8 p-4 border rounded-lg bg-muted/50">
          <h2 className="font-semibold mb-2">Test Instructions:</h2>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Click on the date picker button</li>
            <li>The calendar should open</li>
            <li>Click on any date in the calendar</li>
            <li>The date should be selected and the calendar should stay open</li>
            <li>If showTime is true, select hours and minutes</li>
            <li>Click outside to close the calendar</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
