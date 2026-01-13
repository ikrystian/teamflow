"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Tag, Clock, CheckCircle } from "lucide-react"

interface TagStat {
    id: string
    name: string
    color: string
    totalHours: number
    taskCount: number
    completedTasks: number
    completionRate: number
}

export function TagsSummary() {
    const [tagStats, setTagStats] = useState<TagStat[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchTagStats = async () => {
            try {
                const response = await fetch("/api/reports?timeRange=month")
                if (response.ok) {
                    const data = await response.json()
                    setTagStats(data.tables?.tagStats || [])
                }
            } catch (error) {
                console.error("Error fetching tag stats:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchTagStats()
    }, [])

    if (loading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </CardContent>
            </Card>
        )
    }

    if (tagStats.length === 0) {
        return null // Don't show if no tags
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Tag className="h-5 w-5 text-purple-500" />
                    <CardTitle>Podsumowanie wg tagów</CardTitle>
                </div>
                <CardDescription>
                    Statystyki zadań z ostatnich 30 dni, grupowane według tagów
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {tagStats.map((tag) => (
                        <div
                            key={tag.id}
                            className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: tag.color }}
                                />
                                <Badge
                                    variant="outline"
                                    style={{
                                        borderColor: tag.color,
                                        color: tag.color
                                    }}
                                >
                                    {tag.name}
                                </Badge>
                            </div>

                            <div className="space-y-2 text-sm">
                                <div className="flex items-center justify-between text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <CheckCircle className="h-3.5 w-3.5" />
                                        Zadania
                                    </span>
                                    <span className="font-medium text-foreground">
                                        {tag.completedTasks}/{tag.taskCount}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <Clock className="h-3.5 w-3.5" />
                                        Godziny
                                    </span>
                                    <span className="font-medium text-foreground">
                                        {tag.totalHours.toFixed(1)}h
                                    </span>
                                </div>

                                {tag.taskCount > 0 && (
                                    <div className="pt-2 mt-2 border-t">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-muted-foreground">Ukończono</span>
                                            <span className="text-xs font-medium">{tag.completionRate.toFixed(0)}%</span>
                                        </div>
                                        <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all"
                                                style={{
                                                    width: `${tag.completionRate}%`,
                                                    backgroundColor: tag.color
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
