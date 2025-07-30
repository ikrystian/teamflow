"use client"

import { useState, useMemo } from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowUpDown, ChevronDown, ChevronRight, MoreHorizontal, Clock, Eye, EyeOff, Lock } from "lucide-react"

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
import { getPriorityColor, getPriorityDisplayName, getTaskStatus, isTaskOverdue, isTaskBlocked } from "@/lib/task-utils"
import { formatTaskDueDateWithRelative, formatCreatedDate } from "@/lib/date-utils"
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
}

export function TasksTable({ tasks, users, taskStatuses, onTaskUpdate }: TasksTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [rowSelection, setRowSelection] = useState({})
  const [hideEmptyGroups, setHideEmptyGroups] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  // Używamy hooka do zarządzania preferencjami widoczności i kolejności kolumn
  const { columnVisibility, columnOrder, updateColumnVisibility, updateColumnOrder, isLoaded } = useTasksTablePreferences()

  // Funkcja do sortowania kolumn według zapisanej kolejności
  const sortColumnsByOrder = (columns: ColumnDef<TableRow>[]) => {
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
  }

  // Function to toggle group collapse state
  const toggleGroupCollapse = (statusName: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(statusName)) {
        newSet.delete(statusName)
      } else {
        newSet.add(statusName)
      }
      return newSet
    })
  }

  // Function to calculate total reported hours for a task
  const getTotalReportedHours = (task: Task): number => {
    return task.timeEntries?.reduce((total, entry) => total + entry.hours, 0) || 0
  }

  // Create flat data with group headers for single table
  const tableData = useMemo(() => {
    const groups: { [key: string]: Task[] } = {}

    // Filter out tasks from archived projects
    const activeTasks = tasks.filter(task => !task.project?.archived)

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
        // Add tasks only if group is not collapsed
        if (!collapsedGroups.has(status.name)) {
          flatData.push(...groups[status.name])
        }
      }
    })

    // Add "Bez statusu" group at the end if it exists
    if (groups["Bez statusu"] && (!hideEmptyGroups || groups["Bez statusu"].length > 0)) {
      flatData.push({
        isGroupHeader: true,
        statusName: "Bez statusu",
        count: groups["Bez statusu"].length
      })
      // Add tasks only if group is not collapsed
      if (!collapsedGroups.has("Bez statusu")) {
        flatData.push(...groups["Bez statusu"])
      }
    }

    return flatData
  }, [tasks, taskStatuses, hideEmptyGroups, collapsedGroups])

  const columns: ColumnDef<TableRow>[] = [
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
          const isCollapsed = collapsedGroups.has(rowData.statusName)
          return (
            <button
              onClick={() => toggleGroupCollapse(rowData.statusName)}
              className="flex items-center gap-2 w-full text-left hover:bg-muted/50 rounded p-1 -m-1 transition-colors"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
              <h3 className="font-semibold text-lg">{rowData.statusName}</h3>
              <Badge variant="secondary" className="ml-2">
                {rowData.count}
              </Badge>
            </button>
          )
        }

        // Regular task row
        const task = rowData as Task
        const blocked = isTaskBlocked(task)
        return (
          <div className="flex items-center gap-3">
            <div
              className="w-1 h-8 rounded-full"
              style={{ backgroundColor: blocked ? '#EF4444' : (task.project?.color || '#3B82F6') }}
            />
            {blocked && (
              <Lock className="h-4 w-4 text-red-600 flex-shrink-0" />
            )}
            <EditableCell
              value={task.title}
              type="text"
              onSave={(value) => onTaskUpdate(task.id, { title: value })}
              className="font-medium"
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
            onSave={(value) => onTaskUpdate(task.id, { assigneeId: value })}
            placeholder="Przypisz osobę"
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
            onSave={(value) => onTaskUpdate(task.id, { priority: value })}
            placeholder="Ustaw priorytet"
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
              onSave={(value) => onTaskUpdate(task.id, { dueDate: value })}
              placeholder="Ustaw termin"
              className={isOverdue ? 'text-red-600' : ''}
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
            onSave={(value) => onTaskUpdate(task.id, { statusId: value })}
            placeholder="Ustaw status"
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
              className="text-sm truncate font-medium underline hover:no-underline"
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
          <div className="flex items-center gap-2">
            {task.estimatedHours && <Clock className="h-3 w-3 text-muted-foreground" />}
            <EditableCell
              value={task.estimatedHours?.toString() || ""}
              type="text"
              onSave={(value) => {
                const hours = value ? parseFloat(value) : undefined
                onTaskUpdate(task.id, { estimatedHours: hours })
              }}
              placeholder="Szacowany czas (h)"
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
              <DropdownMenuItem>Zobacz szczegóły</DropdownMenuItem>
              <DropdownMenuItem>Edytuj zadanie</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  // Sortuj kolumny według zapisanej kolejności
  const sortedColumns = useMemo(() => sortColumnsByOrder(columns), [columns, columnOrder])

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

                  return (
                    <TableRow
                      key={row.id}
                      className={isGroupHeader ? "bg-muted/30 hover:bg-muted/40" : "hover:bg-muted/20 group"}
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
        )}
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} z{" "}
          {table.getFilteredRowModel().rows.length} zadań wybranych.
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
