"use client"

import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Clock, CheckCircle, Calendar, CalendarDays, CalendarCheck } from "lucide-react"
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="pb-2">
                            <Skeleton className="h-5 w-24" />
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Skeleton className="h-8 w-16" />
                            <Skeleton className="h-4 w-32" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        )
    }

    if (!data) {
        return null
    }

    const periods = [
        {
            key: "today",
            label: "Dzisiaj",
            icon: Calendar,
            color: "text-blue-500",
            bgColor: "bg-blue-500/10",
            data: data.today
        },
        {
            key: "thisWeek",
            label: "Ten tydzień",
            icon: CalendarDays,
            color: "text-green-500",
            bgColor: "bg-green-500/10",
            data: data.thisWeek
        },
        {
            key: "thisMonth",
            label: "Ten miesiąc",
            icon: CalendarCheck,
            color: "text-purple-500",
            bgColor: "bg-purple-500/10",
            data: data.thisMonth
        }
    ]

    const formatHours = (hours: number) => {
        if (hours === 0) return "0h"
        const h = Math.floor(hours)
        const m = Math.round((hours - h) * 60)
        if (m === 0) return `${h}h`
        return `${h}h ${m}m`
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Moje raporty</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {periods.map((period) => (
                    <Card key={period.key} className="overflow-hidden">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                                <div className={`p-2 rounded-lg ${period.bgColor}`}>
                                    <period.icon className={`h-4 w-4 ${period.color}`} />
                                </div>
                                <CardTitle className="text-sm font-medium">{period.label}</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Clock className="h-4 w-4" />
                                        <span className="text-sm">Zaraportowano</span>
                                    </div>
                                    <span className="text-xl font-bold">{formatHours(period.data.hoursReported)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <CheckCircle className="h-4 w-4" />
                                        <span className="text-sm">Ukończono zadań</span>
                                    </div>
                                    <span className="text-xl font-bold">{period.data.tasksCompleted}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
