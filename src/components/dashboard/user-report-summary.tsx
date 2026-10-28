"use client"

import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Clock, CheckCircle2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface PeriodData {
    hoursReported: number
    tasksCompleted: number
}

interface SummaryData {
    today: PeriodData
    thisWeek: PeriodData
    thisMonth: PeriodData
}

export function UserReportSummary() {
    const [data, setData] = useState<SummaryData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchSummary = async () => {
            try {
                const response = await fetch("/api/dashboard/summary")
                if (response.ok) {
                    const result = await response.json()
                    setData(result)
                }
            } catch (error) {
                if (process.env.NODE_ENV === 'development') {
                    console.warn("Error fetching dashboard summary:", error)
                }
            } finally {
                setLoading(false)
            }
        }

        fetchSummary()
    }, [])

    if (loading) {
        return (
            <Card className="gap-0 py-0">
                <div className="grid grid-cols-1 divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="space-y-3 p-5">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-7 w-24" />
                            <Skeleton className="h-3 w-32" />
                        </div>
                    ))}
                </div>
            </Card>
        )
    }

    if (!data) {
        return null
    }

    const periods = [
        { key: "today", label: "Dzisiaj", data: data.today },
        { key: "thisWeek", label: "Ten tydzień", data: data.thisWeek },
        { key: "thisMonth", label: "Ten miesiąc", data: data.thisMonth },
    ]

    const formatHours = (hours: number) => {
        if (hours === 0) return "0h"
        const h = Math.floor(hours)
        const m = Math.round((hours - h) * 60)
        if (m === 0) return `${h}h`
        return `${h}h ${m}m`
    }

    return (
        <Card className="gap-0 py-0">
            <CardHeader className="border-b py-4 [.border-b]:pb-4">
                <CardTitle>
                    <Clock className="size-4 text-muted-foreground" />
                    Mój czas pracy
                </CardTitle>
                <CardDescription>Zaraportowane godziny i ukończone zadania</CardDescription>
            </CardHeader>
            <div className="grid grid-cols-1 divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                {periods.map((period) => (
                    <CardContent key={period.key} className="px-5 py-4">
                        <div className="text-xs font-medium text-muted-foreground">{period.label}</div>
                        <div className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums">
                            {formatHours(period.data.hoursReported)}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <CheckCircle2 className="size-3.5 text-success" />
                            <span>
                                <span className="font-medium text-foreground tabular-nums">{period.data.tasksCompleted}</span> ukończonych zadań
                            </span>
                        </div>
                    </CardContent>
                ))}
            </div>
        </Card>
    )
}
