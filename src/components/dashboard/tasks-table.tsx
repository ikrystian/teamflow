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
import { ArrowUpDown, ChevronDown, MoreHorizontal, Clock, Eye, EyeOff } from "lucide-react"

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
import { EditableCell } from "./editable-cell"
import { getPriorityColor, getPriorityDisplayName, getTaskStatus, isTaskOverdue } from "@/lib/task-utils"
import { formatTaskDueDateWithRelative } from "@/lib/date-utils"
import type { Task, User, TaskStatus } from "@/types"

interface TasksTableProps {
  tasks: Task[]
  users: User[]
  taskStatuses: TaskStatus[]
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>
}

export function TasksTable({ tasks, users, taskStatuses, onTaskUpdate }: TasksTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    estimatedHours: false, // Hide by default on smaller screens
  })
  const [rowSelection, setRowSelection] = useState({})
  const [hideEmptyGroups, setHideEmptyGroups] = useState(false)

  // Group tasks by status
  const groupedTasks = useMemo(() => {
    const groups: { [key: string]: Task[] } = {}

    tasks.forEach(task => {
      const status = getTaskStatus(task, taskStatuses)
      const statusName = status?.name || "Bez statusu"

      if (!groups[statusName]) {
        groups[statusName] = []
      }
      groups[statusName].push(task)
    })

    // Sort groups by status order
    const sortedGroups: { [key: string]: Task[] } = {}
    const sortedStatuses = [...taskStatuses].sort((a, b) => a.order - b.order)

    // Add groups in status order
    sortedStatuses.forEach(status => {
      if (groups[status.name]) {
        sortedGroups[status.name] = groups[status.name]
      }
    })

    // Add "Bez statusu" group at the end if it exists
    if (groups["Bez statusu"]) {
      sortedGroups["Bez statusu"] = groups["Bez statusu"]
    }

    return sortedGroups
  }, [tasks, taskStatuses])

  const columns: ColumnDef<Task>[] = [
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
        const task = row.original
        return (
          <div className="flex items-center gap-3">
            <div
              className="w-1 h-8 rounded-full"
              style={{ backgroundColor: task.project?.color || '#3B82F6' }}
            />
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
        const task = row.original
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
        const nameA = rowA.original.assignee?.name || ""
        const nameB = rowB.original.assignee?.name || ""
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
        const task = row.original
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
        const priorityOrder = { "High": 3, "Medium": 2, "Low": 1 }
        const priorityA = priorityOrder[rowA.original.priority as keyof typeof priorityOrder] || 0
        const priorityB = priorityOrder[rowB.original.priority as keyof typeof priorityOrder] || 0
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
        const task = row.original
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
        const task = row.original
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
        const statusA = getTaskStatus(rowA.original, taskStatuses)
        const statusB = getTaskStatus(rowB.original, taskStatuses)
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
        const task = row.original
        return (
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: task.project?.color || '#3B82F6' }}
            />
            <span className="text-sm truncate">{task.project?.name}</span>
          </div>
        )
      },
      sortingFn: (rowA, rowB) => {
        const nameA = rowA.original.project?.name || ""
        const nameB = rowB.original.project?.name || ""
        return nameA.localeCompare(nameB)
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
        const task = row.original
        return (
          <div className="flex items-center gap-2">
            {task.estimatedHours && <Clock className="h-3 w-3 text-muted-foreground" />}
            <EditableCell
              value={task.estimatedHours?.toString() || ""}
              type="text"
              onSave={(value) => {
                const hours = value ? parseFloat(value) : null
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
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const task = row.original

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

  const table = useReactTable({
    data: tasks,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
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
                  estimatedHours: "Szacowany czas"
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

      {/* Render grouped tables */}
      <div className="space-y-6">
        {Object.keys(groupedTasks).length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">
              Brak zadań
            </h3>
            <p className="text-muted-foreground">
              Nie znaleziono żadnych zadań w systemie.
            </p>
          </div>
        ) : (
          Object.entries(groupedTasks)
            .filter(([statusName, statusTasks]) => !hideEmptyGroups || statusTasks.length > 0)
            .map(([statusName, statusTasks]) => {
          const status = taskStatuses.find(s => s.name === statusName)

          // Create a separate table for each status group
          const statusTable = useReactTable({
            data: statusTasks,
            columns,
            getCoreRowModel: getCoreRowModel(),
            getSortedRowModel: getSortedRowModel(),
            state: {
              sorting,
            },
          })

          return (
            <div key={statusName} className="space-y-2">
              <div className="flex items-center gap-2 px-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: status?.color || '#6B7280' }}
                />
                <h3 className="font-semibold text-lg">{statusName}</h3>
                <Badge variant="secondary" className="ml-2">
                  {statusTasks.length}
                </Badge>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    {statusTable.getHeaderGroups().map((headerGroup) => (
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
                    {statusTable.getRowModel().rows?.length ? (
                      statusTable.getRowModel().rows.map((row) => (
                        <TableRow key={row.id}>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length}
                          className="h-16 text-center text-muted-foreground"
                        >
                          Brak zadań w tym statusie
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )
        })
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
