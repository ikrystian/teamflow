"use client"

import { useEffect, useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine"
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import {
  attachClosestEdge,
  extractClosestEdge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge"
import { DropIndicator } from "@/components/ui/drop-indicator"
import { reorderWithEdge, type Edge } from "@/lib/dnd-utils"
import { GripVertical, Settings2 } from "lucide-react"
import type { VisibilityState } from "@tanstack/react-table"

interface ColumnOrderDialogProps {
  columnOrder: string[]
  columnVisibility: VisibilityState
  onColumnOrderChange: (newOrder: string[]) => void
}

interface SortableColumnItemProps {
  columnId: string
  columnName: string
  isVisible: boolean
}

const COLUMN_NAMES: { [key: string]: string } = {
  title: "Nazwa zadania",
  assignee: "Osoba przypisana",
  createdBy: "Autor zadania",
  priority: "Priorytet",
  dueDate: "Data wykonania",
  status: "Status",
  project: "Projekt",
  createdAt: "Data utworzenia",
  estimatedHours: "Szacowany czas",
  reportedHours: "Zaraportowany czas"
}

function SortableColumnItem({ columnId, columnName, isVisible }: SortableColumnItemProps) {
  const ref = useRef<HTMLDivElement>(null)
  const handleRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null)

  useEffect(() => {
    const element = ref.current
    const handle = handleRef.current
    if (!element || !handle) return

    return combine(
      draggable({
        element,
        dragHandle: handle,
        getInitialData: () => ({ type: "column-item", columnId }),
        onDragStart: () => setIsDragging(true),
        onDrop: () => setIsDragging(false),
      }),
      dropTargetForElements({
        element,
        canDrop: ({ source }) => source.data.type === "column-item",
        getData: ({ input, element }) =>
          attachClosestEdge(
            { columnId },
            { input, element, allowedEdges: ["top", "bottom"] }
          ),
        onDrag: ({ self, source }) => {
          if (source.data.columnId === columnId) {
            setClosestEdge(null)
            return
          }
          setClosestEdge(extractClosestEdge(self.data))
        },
        onDragLeave: () => setClosestEdge(null),
        onDrop: () => setClosestEdge(null),
      })
    )
  }, [columnId])

  return (
    <div
      ref={ref}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      className="relative flex items-center gap-3 p-3 bg-card border rounded-lg hover:bg-muted/50 transition-colors"
    >
      {closestEdge && <DropIndicator edge={closestEdge} />}
      <div
        ref={handleRef}
        className="cursor-grab hover:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      <div className="flex-1 flex items-center justify-between">
        <span className={`text-sm font-medium ${!isVisible ? 'text-muted-foreground' : ''}`}>
          {columnName}
        </span>
        <Badge variant={isVisible ? "default" : "secondary"} className="text-xs">
          {isVisible ? "Widoczna" : "Ukryta"}
        </Badge>
      </div>
    </div>
  )
}

export function ColumnOrderDialog({ 
  columnOrder, 
  columnVisibility, 
  onColumnOrderChange 
}: ColumnOrderDialogProps) {
  const [open, setOpen] = useState(false)
  const [localOrder, setLocalOrder] = useState(columnOrder)

  useEffect(() => {
    return monitorForElements({
      canMonitor: ({ source }) => source.data.type === "column-item",
      onDrop: ({ source, location }) => {
        const target = location.current.dropTargets[0]
        if (!target) return

        const sourceId = source.data.columnId as string
        const targetId = target.data.columnId as string
        const edge = extractClosestEdge(target.data)

        setLocalOrder((order) => reorderWithEdge(order, sourceId, targetId, edge))
      },
    })
  }, [])

  const handleSave = () => {
    onColumnOrderChange(localOrder)
    setOpen(false)
  }

  const handleCancel = () => {
    setLocalOrder(columnOrder)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Settings2 className="h-4 w-4" />
          Kolejność kolumn
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Kolejność kolumn</DialogTitle>
          <DialogDescription>
            Przeciągnij kolumny, aby zmienić ich kolejność w tabeli. Ukryte kolumny są oznaczone szarym kolorem.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {localOrder.map((columnId) => (
            <SortableColumnItem
              key={columnId}
              columnId={columnId}
              columnName={COLUMN_NAMES[columnId] || columnId}
              isVisible={columnVisibility[columnId] !== false}
            />
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={handleCancel}>
            Anuluj
          </Button>
          <Button onClick={handleSave}>
            Zapisz kolejność
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
