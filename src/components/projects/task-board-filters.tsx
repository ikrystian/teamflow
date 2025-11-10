"use client"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Users, User, Filter, Check } from "lucide-react"


interface TaskBoardFiltersProps {
  currentUserId?: string
  selectedFilter: "all" | "mine" | string // "all", "mine", or user ID
  onFilterChange: (filter: "all" | "mine" | string) => void
  taskCounts: {
    all: number
    mine: number
    byUser: Record<string, number>
  }
}

export function TaskBoardFilters({
  currentUserId,
  selectedFilter,
  onFilterChange,
  taskCounts
}: TaskBoardFiltersProps) {
  const getFilterLabel = () => {
    if (selectedFilter === "all") return "Wszystkie zadania"
    if (selectedFilter === "mine") return "Moje zadania"

    return "Nieznany użytkownik"
  }

  const getFilterIcon = () => {
    if (selectedFilter === "all") return <Users className="h-4 w-4" />
    if (selectedFilter === "mine") return <User className="h-4 w-4" />
    return <User className="h-4 w-4" />
  }

  const getTaskCount = () => {
    if (selectedFilter === "all") return taskCounts.all
    if (selectedFilter === "mine") return taskCounts.mine
    return taskCounts.byUser[selectedFilter] || 0
  }

  return (
    <div className="flex items-center space-x-3">
      <div className="flex items-center space-x-2">
        <Filter className="h-4 w-4" />
        <span className="text-sm font-medium text-gray-700">Filtruj:</span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center space-x-2 h-9">
            {getFilterIcon()}
            <span className="text-sm">{getFilterLabel()}</span>
            <Badge variant="secondary" className="ml-2 text-xs">
              {getTaskCount()}
            </Badge>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Filtruj zadania</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* All Tasks */}
          <DropdownMenuItem
            onClick={() => onFilterChange("all")}
            className="flex items-center justify-between"
          >
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Wszystkie zadania</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="text-xs">
                {taskCounts.all}
              </Badge>
              {selectedFilter === "all" && <Check className="h-4 w-4" />}
            </div>
          </DropdownMenuItem>

          {/* My Tasks */}
          {currentUserId && (
            <DropdownMenuItem
              onClick={() => onFilterChange("mine")}
              className="flex items-center justify-between"
            >
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Moje zadania</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="text-xs">
                  {taskCounts.mine}
                </Badge>
                {selectedFilter === "mine" && <Check className="h-4 w-4" />}
              </div>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
