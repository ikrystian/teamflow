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

interface TeamMember {
  id: string
  name: string
  email: string
  avatarUrl?: string
}

interface TaskBoardFiltersProps {
  teamMembers: TeamMember[]
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
  teamMembers,
  currentUserId,
  selectedFilter,
  onFilterChange,
  taskCounts
}: TaskBoardFiltersProps) {
  const getFilterLabel = () => {
    if (selectedFilter === "all") return "Wszystkie zadania"
    if (selectedFilter === "mine") return "Moje zadania"

    const user = teamMembers.find(member => member.id === selectedFilter)
    return user ? user.name : "Nieznany użytkownik"
  }

  const getFilterIcon = () => {
    if (selectedFilter === "all") return <Users className="h-4 w-4" />
    if (selectedFilter === "mine") return <User className="h-4 w-4" />

    const user = teamMembers.find(member => member.id === selectedFilter)
    if (user) {
      return (
        <Avatar className="h-4 w-4">
          <AvatarImage src={user.avatarUrl} />
          <AvatarFallback className="text-xs">
            {user.name?.charAt(0) || "U"}
          </AvatarFallback>
        </Avatar>
      )
    }
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
        <Filter className="h-4 w-4 text-gray-500" />
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

          {teamMembers.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Członkowie zespołu</DropdownMenuLabel>

              {teamMembers.map((member) => (
                <DropdownMenuItem
                  key={member.id}
                  onClick={() => onFilterChange(member.id)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={member.avatarUrl} />
                      <AvatarFallback className="text-xs">
                        {member.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span>{member.name}</span>
                    {member.id === currentUserId && (
                      <Badge variant="outline" className="text-xs">
                        Ty
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-xs">
                      {taskCounts.byUser[member.id] || 0}
                    </Badge>
                    {selectedFilter === member.id && <Check className="h-4 w-4" />}
                  </div>
                </DropdownMenuItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
