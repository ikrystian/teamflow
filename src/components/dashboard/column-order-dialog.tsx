"use client"

import { useState } from "react"
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
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import {
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
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
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: columnId })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-card border rounded-lg hover:bg-muted/50 transition-colors"
    >
      <div
        {...attributes}
        {...listeners}
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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const oldIndex = localOrder.indexOf(active.id as string)
      const newIndex = localOrder.indexOf(over?.id as string)

      const newOrder = arrayMove(localOrder, oldIndex, newIndex)
      setLocalOrder(newOrder)
    }
  }

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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={localOrder}
              strategy={verticalListSortingStrategy}
            >
              {localOrder.map((columnId) => (
                <SortableColumnItem
                  key={columnId}
                  columnId={columnId}
                  columnName={COLUMN_NAMES[columnId] || columnId}
                  isVisible={columnVisibility[columnId] !== false}
                />
              ))}
            </SortableContext>
          </DndContext>
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
