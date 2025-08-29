"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowUpDown, ChevronDown, MoreHorizontal, Clock, Eye, EyeOff, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { EditableCell } from "./editable-cell"
import { ColumnOrderDialog } from "./column-order-dialog"
import { getTaskStatus, isTaskOverdue } from "@/lib/task-utils"
import { formatCreatedDate } from "@/lib/date-utils"
import { useTasksTablePreferences } from "@/hooks/use-tasks-table-preferences"
import type { Task, User, TaskStatus } from "@/types"
import Link from "next/link"

type TableRow = Task | { isGroupHeader: true; statusName: string; count: number }

interface TaskUpdateData extends Partial<Task> {
  assigneeId?: string
}

interface TasksTableProps {
  tasks: Task[]
  users: User[]
  taskStatuses: TaskStatus[]
  onTaskUpdate: (taskId: string, updates: TaskUpdateData) => Promise<void>
  onTaskDetails?: (task: Task) => void
  onTaskDelete?: (task: Task) => void
  isAdmin?: boolean
  currentUserId?: string
}

export function TasksTable({ tasks, users, taskStatuses, onTaskUpdate, onTaskDetails, onTaskDelete, isAdmin = false, currentUserId }: TasksTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [rowSelection, setRowSelection] = useState({})
  const [hideEmptyGroups, setHideEmptyGroups] = useState(false)

  // Optimistic updates state
  const [optimisticTasks, setOptimisticTasks] = useState<Task[]>(tasks)
  const [updatingTasks, setUpdatingTasks] = useState<Set<string>>(new Set())

  // Używamy hooka do zarządzania preferencjami widoczności i kolejności kolumn
  const { columnVisibility, columnOrder, updateColumnVisibility, updateColumnOrder, isLoaded } = useTasksTablePreferences()

  // Function to check if current user can edit a task
  const canEditTask = useCallback((task: Task): boolean => {
    if (!currentUserId) return false

    // Admin can edit all tasks
    if (isAdmin) return true

    // User can edit tasks they created or are assigned to
    return task.createdBy?.id === currentUserId || task.assignee?.id === currentUserId
  }, [isAdmin, currentUserId])

  // Function to check if current user can delete a task
  const canDeleteTask = useCallback((task: Task): boolean => {
    if (!currentUserId) return false

    // Admin can delete all tasks
    if (isAdmin) return true

    // User can delete tasks they created or are assigned to
    return task.createdBy?.id === currentUserId || task.assignee?.id === currentUserId
  }, [isAdmin, currentUserId])

  // Sync optimistic tasks with props tasks when they change
  useEffect(() => {
    setOptimisticTasks(tasks)
  }, [tasks])

  // Optimistic update function
  const handleOptimisticTaskUpdate = useCallback(async (taskId: string, updates: TaskUpdateData) => {
    // Find the original task for potential rollback
    const originalTask = optimisticTasks.find(t => t.id === taskId)
    if (!originalTask) return

    // Optimistic update - immediately update UI
    setUpdatingTasks(prev => new Set(prev).add(taskId))
    setOptimisticTasks(prev =>
      prev.map(t => t.id === taskId ? {
        ...t,
        ...updates,
        // Handle assignee update specially
        ...(updates.assigneeId !== undefined && {
          assignee: updates.assigneeId ? users.find(u => u.id === updates.assigneeId) : undefined
        })
      } : t)
    )

    // Show immediate feedback
    toast.loading("Aktualizowanie zadania...", {
      id: `update-task-${taskId}`,
      duration: 2000
    })

    try {
      // Call the original update function
      await onTaskUpdate(taskId, updates)

      // Success feedback
      toast.success("Zadanie zostało zaktualizowane", {
        id: `update-task-${taskId}`
      })
    } catch (error) {
      // Revert optimistic update on error
      setOptimisticTasks(prev =>
        prev.map(t => t.id === taskId ? originalTask : t)
      )
      console.error("Error updating task:", error)
      toast.error("Nie udało się zaktualizować zadania", {
        id: `update-task-${taskId}`
      })
    } finally {
      setUpdatingTasks(prev => {
        const newSet = new Set(prev)
        newSet.delete(taskId)
        return newSet
      })
    }
  }, [optimisticTasks, users, onTaskUpdate])

  // Funkcja do sortowania kolumn według zapisanej kolejności
  const sortColumnsByOrder = useCallback((columns: ColumnDef<TableRow>[]) => {
    return columns.sort((a, b) => {
      // Używamy id kolumny zamiast accessorKey
      const aKey = (a as ColumnDef<TableRow> & { accessorKey?: string; id?: string }).accessorKey ||
                   (a as ColumnDef<TableRow> & { accessorKey?: string; id?: string }).id || ''
      const bKey = (b as ColumnDef<TableRow> & { accessorKey?: string; id?: string }).accessorKey ||
                   (b as ColumnDef<TableRow> & { accessorKey?: string; id?: string }).id || ''

      const aIndex = columnOrder.indexOf(aKey)
      const bIndex = columnOrder.indexOf(bKey)

      // Jeśli kolumna nie ma klucza lub nie jest w kolejności, umieść na końcu
      if (aIndex === -1 && bIndex === -1) return 0
      if (aIndex === -1) return 1
      if (bIndex === -1) return -1

      return aIndex - bIndex
    })
  }, [columnOrder])



  // Function to calculate total reported hours for a task
  const getTotalReportedHours = (task: Task): number => {
    return task.timeEntries?.reduce((total, entry) => total + entry.hours, 0) || 0
  }

  // Helper functions to count actual tasks (excluding group headers)
  const getActualTasksCount = (rows: { original: TableRow }[]) => {
    return rows.filter(row => !('isGroupHeader' in row.original)).length
  }

  const getSelectedTasksCount = (rows: { original: TableRow }[]) => {
    return rows.filter(row => !('isGroupHeader' in row.original)).length
  }

  // Create flat data with group headers for single table
  const tableData = useMemo(() => {
    const groups: { [key: string]: Task[] } = {}

    // Filter out tasks from archived projects - use optimistic tasks
    const activeTasks = optimisticTasks.filter(task => !task.project?.archived)

    activeTasks.forEach(task => {
      const status = getTaskStatus(task, taskStatuses)
      const statusName = status?.name || "Bez statusu"

      if (!groups[statusName]) {
        groups[statusName] = []
      }
      groups[statusName].push(task)
    })

    // Sort groups by status order
    const sortedStatuses = [...taskStatuses].sort((a, b) => a.order - b.order)
    const flatData: (Task | { isGroupHeader: true; statusName: string; count: number })[] = []

    // Add groups in status order
    sortedStatuses.forEach(status => {
      if (groups[status.name] && (!hideEmptyGroups || groups[status.name].length > 0)) {
        // Add group header
        flatData.push({
          isGroupHeader: true,
          statusName: status.name,
          count: groups[status.name].length
        })
        // Always add all tasks (no collapsing)
        flatData.push(...groups[status.name])
      }
    })

    // Add "Bez statusu" group at the end if it exists
    if (groups["Bez statusu"] && (!hideEmptyGroups || groups["Bez statusu"].length > 0)) {
      flatData.push({
        isGroupHeader: true,
        statusName: "Bez statusu",
        count: groups["Bez statusu"].length
      })
      // Always add all tasks (no collapsing)
      flatData.push(...groups["Bez statusu"])
    }

    return flatData
  }, [optimisticTasks, taskStatuses, hideEmptyGroups])

  const columns: ColumnDef<TableRow>[] = useMemo(() => [
    {
      accessorKey: "title",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2"
          >
            Nazwa zadania
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const rowData = row.original

        // Check if this is a group header row
        if ('isGroupHeader' in rowData) {
          return (
            <div className="flex items-center gap-2 w-full text-left p-1 -m-1">
              <h3 className="font-semibold text-lg">{rowData.statusName}</h3>
              <Badge variant="secondary" className="ml-2">
                {rowData.count}
              </Badge>
            </div>
          )
        }

        // Regular task row
        const task = rowData as Task
        return (
          <div className="flex items-center gap-3">
            <div
              className="w-1 h-8 rounded-full"
              style={{ backgroundColor: (task.project?.color || '#3B82F6') }}
            />
            <EditableCell
              value={task.title}
              type="text"
              onSave={(value) => handleOptimisticTaskUpdate(task.id, { title: value })}
              className="font-medium"
              disabled={!canEditTask(task)}
            />
          </div>
        )
      },
    },
    {
      accessorKey: "assignee",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2"
          >
            Osoba przypisana
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const rowData = row.original

        // Return empty cell for group headers
        if ('isGroupHeader' in rowData) {
          return null
        }

        const task = rowData as Task
        return (
          <EditableCell
            value={task.assignee?.id || ""}
            type="user"
            users={users}
            onSave={(value) => handleOptimisticTaskUpdate(task.id, { assigneeId: value })}
            placeholder="Przypisz osobę"
            disabled={!canEditTask(task)}
          />
        )
      },
      sortingFn: (rowA, rowB) => {
        // Group headers should stay at the top
        if ('isGroupHeader' in rowA.original) return -1
        if ('isGroupHeader' in rowB.original) return 1

        const taskA = rowA.original as Task
        const taskB = rowB.original as Task
        const nameA = taskA.assignee?.name || ""
        const nameB = taskB.assignee?.name || ""
        return nameA.localeCompare(nameB)
      },
    },
    {
      accessorKey: "createdBy",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2"
          >
            Autor zadania
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const rowData = row.original

        // Return empty cell for group headers
        if ('isGroupHeader' in rowData) {
          return null
        }

        const task = rowData as Task

        // Wyświetlaj autora analogicznie do osoby przypisanej - tylko avatar z tooltipem
        if (task.createdBy) {
          return (
            <Tooltip>
              <TooltipTrigger>
                <Avatar className="h-6 w-6 cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all duration-200">
                  <AvatarImage src={task.createdBy.avatarUrl || ""} alt={task.createdBy.name} />
                  <AvatarFallback className="text-xs">
                    {task.createdBy.name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <span className="font-medium">{task.createdBy.name}</span>
              </TooltipContent>
            </Tooltip>
          )
        }

        return (
          <Tooltip>
            <TooltipTrigger>
              <Avatar className="h-6 w-6 cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all duration-200">
                <AvatarFallback className="text-xs">
                  ?
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <span>Nieznany autor</span>
            </TooltipContent>
          </Tooltip>
        )
      },
      sortingFn: (rowA, rowB) => {
        // Group headers should stay at the top
        if ('isGroupHeader' in rowA.original) return -1
        if ('isGroupHeader' in rowB.original) return 1

        const taskA = rowA.original as Task
        const taskB = rowB.original as Task
        const nameA = taskA.createdBy?.name || ""
        const nameB = taskB.createdBy?.name || ""
        return nameA.localeCompare(nameB)
      },
    },
    {
      accessorKey: "priority",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2"
          >
            Priorytet
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const rowData = row.original

        // Return empty cell for group headers
        if ('isGroupHeader' in rowData) {
          return null
        }

        const task = rowData as Task
        return (
          <EditableCell
            value={task.priority || ""}
            type="priority"
            onSave={(value) => handleOptimisticTaskUpdate(task.id, { priority: value })}
            placeholder="Ustaw priorytet"
            disabled={!canEditTask(task)}
          />
        )
      },
      sortingFn: (rowA, rowB) => {
        // Group headers should stay at the top
        if ('isGroupHeader' in rowA.original) return -1
        if ('isGroupHeader' in rowB.original) return 1

        const taskA = rowA.original as Task
        const taskB = rowB.original as Task
        const priorityOrder = { "High": 3, "Medium": 2, "Low": 1 }
        const priorityA = priorityOrder[taskA.priority as keyof typeof priorityOrder] || 0
        const priorityB = priorityOrder[taskB.priority as keyof typeof priorityOrder] || 0
        return priorityA - priorityB
      },
    },
    {
      accessorKey: "dueDate",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2"
          >
            Data wykonania
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const rowData = row.original

        // Return empty cell for group headers
        if ('isGroupHeader' in rowData) {
          return null
        }

        const task = rowData as Task
        const isOverdue = task.dueDate && isTaskOverdue(task.dueDate)
        return (
          <div className={`${isOverdue ? 'text-red-600' : ''}`}>
            <EditableCell
              value={task.dueDate || ""}
              type="date"
              onSave={(value) => handleOptimisticTaskUpdate(task.id, { dueDate: value })}
              placeholder="Ustaw termin"
              className={isOverdue ? 'text-red-600' : ''}
              disabled={!canEditTask(task)}
            />
          </div>
        )
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2"
          >
            Status
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const rowData = row.original

        // Return empty cell for group headers
        if ('isGroupHeader' in rowData) {
          return null
        }

        const task = rowData as Task
        return (
          <EditableCell
            value={task.statusId || ""}
            type="status"
            taskStatuses={taskStatuses}
            onSave={(value) => handleOptimisticTaskUpdate(task.id, { statusId: value })}
            placeholder="Ustaw status"
            disabled={!canEditTask(task)}
          />
        )
      },
      sortingFn: (rowA, rowB) => {
        // Group headers should stay at the top
        if ('isGroupHeader' in rowA.original) return -1
        if ('isGroupHeader' in rowB.original) return 1

        const taskA = rowA.original as Task
        const taskB = rowB.original as Task
        const statusA = getTaskStatus(taskA, taskStatuses)
        const statusB = getTaskStatus(taskB, taskStatuses)
        const orderA = statusA?.order ?? 999
        const orderB = statusB?.order ?? 999
        return orderA - orderB
      },
    },
    {
      accessorKey: "project",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2"
          >
            Projekt
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const rowData = row.original

        // Return empty cell for group headers
        if ('isGroupHeader' in rowData) {
          return null
        }

        const task = rowData as Task
        return (
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/projects/${task.project?.id}`}
              className="text-sm truncate font-medium underline hover:no-underline line-height-9 block"
            >
              {task.project?.name}
            </Link>
          </div>
        )
      },
      sortingFn: (rowA, rowB) => {
        // Group headers should stay at the top
        if ('isGroupHeader' in rowA.original) return -1
        if ('isGroupHeader' in rowB.original) return 1

        const taskA = rowA.original as Task
        const taskB = rowB.original as Task
        const nameA = taskA.project?.name || ""
        const nameB = taskB.project?.name || ""
        return nameA.localeCompare(nameB)
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2"
          >
            Data utworzenia
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const rowData = row.original

        // Return empty cell for group headers
        if ('isGroupHeader' in rowData) {
          return null
        }

        const task = rowData as Task
        return (
          <span className="text-sm text-muted-foreground">
            {formatCreatedDate(task.createdAt)}
          </span>
        )
      },
      sortingFn: (rowA, rowB) => {
        // Group headers should stay at the top
        if ('isGroupHeader' in rowA.original) return -1
        if ('isGroupHeader' in rowB.original) return 1

        const taskA = rowA.original as Task
        const taskB = rowB.original as Task
        const dateA = new Date(taskA.createdAt).getTime()
        const dateB = new Date(taskB.createdAt).getTime()
        return dateA - dateB
      },
    },
    {
      accessorKey: "estimatedHours",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2"
          >
            Szacowany czas
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const rowData = row.original

        // Return empty cell for group headers
        if ('isGroupHeader' in rowData) {
          return null
        }

        const task = rowData as Task
        return (
          <div className="flex items-center">
            {task.estimatedHours && <Clock className="h-3 w-3 text-muted-foreground" />}

            <EditableCell
              value={task.estimatedHours?.toString() || ""}
              type="number"
              onSave={(value) => {
                const hours = value ? parseFloat(value) : undefined
                handleOptimisticTaskUpdate(task.id, { estimatedHours: hours })
              }}
              placeholder="Szacowany czas (h)"
              disabled={!canEditTask(task)}
            />
            {task.estimatedHours && <span className="text-xs text-muted-foreground">h</span>}
          </div>
        )
      },
    },
    {
      accessorKey: "reportedHours",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2"
          >
            Zaraportowany czas
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const rowData = row.original

        // Return empty cell for group headers
        if ('isGroupHeader' in rowData) {
          return null
        }

        const task = rowData as Task
        const reportedHours = getTotalReportedHours(task)
        return (
          <div className="flex items-center gap-2">
            {reportedHours > 0 && <Clock className="h-3 w-3 text-muted-foreground" />}
            <span className="text-sm">
              {reportedHours > 0 ? `${reportedHours.toFixed(1)}h` : '-'}
            </span>
          </div>
        )
      },
      sortingFn: (rowA, rowB) => {
        // Group headers should stay at the top
        if ('isGroupHeader' in rowA.original) return -1
        if ('isGroupHeader' in rowB.original) return 1

        const taskA = rowA.original as Task
        const taskB = rowB.original as Task
        const hoursA = getTotalReportedHours(taskA)
        const hoursB = getTotalReportedHours(taskB)
        return hoursA - hoursB
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const rowData = row.original

        // Return empty cell for group headers
        if ('isGroupHeader' in rowData) {
          return null
        }

        const task = rowData as Task
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Otwórz menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Akcje</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(task.id)}
              >
                Kopiuj ID zadania
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onTaskDetails?.(task)}>
                Zobacz szczegóły
              </DropdownMenuItem>
              {canDeleteTask(task) && onTaskDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onTaskDelete(task)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Usuń zadanie
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ], [users, taskStatuses, handleOptimisticTaskUpdate, onTaskDetails, canEditTask, canDeleteTask, onTaskDelete])

  // Sortuj kolumny według zapisanej kolejności
  const sortedColumns = useMemo(() => sortColumnsByOrder(columns), [columns, sortColumnsByOrder])

  const table = useReactTable({
    data: tableData,
    columns: sortedColumns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: updateColumnVisibility,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: (row) => {
      // Disable selection for group headers
      return !('isGroupHeader' in row.original)
    },
    initialState: {
      pagination: {
        pageSize: 70
      }
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  // Nie renderuj tabeli dopóki preferencje nie zostaną załadowane
  if (!isLoaded) {
    return (
      <div className="w-full space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-10 w-64 bg-muted animate-pulse rounded" />
          <div className="h-10 w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="rounded-md border">
          <div className="h-96 bg-muted animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Filtruj zadania..."
            value={(table.getColumn("title")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("title")?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setHideEmptyGroups(!hideEmptyGroups)}
            className="flex items-center gap-2"
          >
            {hideEmptyGroups ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            {hideEmptyGroups ? "Pokaż puste" : "Ukryj puste"}
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <ColumnOrderDialog
            columnOrder={columnOrder}
            columnVisibility={columnVisibility}
            onColumnOrderChange={updateColumnOrder}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Kolumny <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                const columnNames: { [key: string]: string } = {
                  title: "Nazwa zadania",
                  assignee: "Osoba przypisana",
                  priority: "Priorytet",
                  dueDate: "Data wykonania",
                  status: "Status",
                  project: "Projekt",
                  createdBy: "Autor zadania",
                  createdAt: "Data utworzenia",
                  estimatedHours: "Szacowany czas",
                  reportedHours: "Zaraportowany czas"
                }

                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {columnNames[column.id] || column.id}
                  </DropdownMenuCheckboxItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>

      {/* Single table with grouped rows */}
      <div className="rounded-md border">
        {tableData.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">
              Brak zadań
            </h3>
            <p className="text-muted-foreground">
              Nie znaleziono żadnych zadań w systemie.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => {
                  const rowData = row.original
                  const isGroupHeader = 'isGroupHeader' in rowData

                  const isUpdating = !isGroupHeader && updatingTasks.has((rowData as Task).id)

                  return (
                    <TableRow
                      key={row.id}
                      className={`${isGroupHeader ? "bg-muted/30 hover:bg-muted/40" : "hover:bg-muted/20 group"} ${isUpdating ? "opacity-60 pointer-events-none" : ""}`}
                    >
                      {isGroupHeader ? (
                        <TableCell colSpan={columns.length} className="py-3">
                          {flexRender(
                            row.getVisibleCells()[0].column.columnDef.cell,
                            row.getVisibleCells()[0].getContext()
                          )}
                        </TableCell>
                      ) : (
                        row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className="group-hover:bg-muted/10 transition-colors"
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))
                      )}
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-16 text-center text-muted-foreground"
                  >
                    Brak zadań
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {getSelectedTasksCount(table.getFilteredSelectedRowModel().rows)} z{" "}
          {getActualTasksCount(table.getFilteredRowModel().rows)} zadań zaznaczonych.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Poprzednia
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Następna
          </Button>
        </div>
      </div>
    </div>
  )
}
