"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Lock, Unlock, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import type { Task } from "@/types"
import type { Session } from "next-auth"

interface TaskBlockDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
  onTaskUpdated?: () => void
}

export function TaskBlockDialog({
  open,
  onOpenChange,
  task,
  onTaskUpdated
}: TaskBlockDialogProps) {
  const { data: session } = useSession() as { data: Session | null }
  const [blockReason, setBlockReason] = useState("")
  const [loading, setLoading] = useState(false)
  const [showUnblockConfirm, setShowUnblockConfirm] = useState(false)

  const isBlocked = task?.isBlocked || false
  
  // Check if user can block/unblock the task
  const canModifyBlock = task && session?.user?.id && (
    task.createdBy?.id === session.user.id || 
    task.assignee?.id === session.user.id
  )

  const handleBlock = async () => {
    if (!task || !blockReason.trim()) {
      toast.error("Powód blokady jest wymagany")
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/tasks/${task.id}/block`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: blockReason.trim()
        }),
      })

      if (response.ok) {
        toast.success("Zadanie zostało zablokowane")
        setBlockReason("")
        onOpenChange(false)
        onTaskUpdated?.()
      } else {
        const data = await response.json()
        toast.error(data.error || "Nie udało się zablokować zadania")
      }
    } catch (error) {
      console.error("Error blocking task:", error)
      toast.error("Wystąpił błąd podczas blokowania zadania")
    } finally {
      setLoading(false)
    }
  }

  const handleUnblock = async () => {
    if (!task) return

    setLoading(true)
    try {
      const response = await fetch(`/api/tasks/${task.id}/block`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success("Zadanie zostało odblokowane")
        onOpenChange(false)
        setShowUnblockConfirm(false)
        onTaskUpdated?.()
      } else {
        const data = await response.json()
        toast.error(data.error || "Nie udało się odblokować zadania")
      }
    } catch (error) {
      console.error("Error unblocking task:", error)
      toast.error("Wystąpił błąd podczas odblokowywania zadania")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setBlockReason("")
    onOpenChange(false)
  }

  if (!task) return null

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isBlocked ? (
                <>
                  <Unlock className="h-5 w-5 text-green-600" />
                  Odblokuj zadanie
                </>
              ) : (
                <>
                  <Lock className="h-5 w-5 text-red-600" />
                  Zablokuj zadanie
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {isBlocked ? (
                "Czy na pewno chcesz odblokować to zadanie?"
              ) : (
                "Zablokowanie zadania uniemożliwi jego edycję do momentu odblokowania."
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <h4 className="font-medium text-sm mb-1">{task.title}</h4>
              <p className="text-xs text-muted-foreground">
                {task.project?.name || "Brak projektu"} • {task.project?.team?.name || ""}
              </p>
            </div>

            {isBlocked ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    Zablokowane
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    przez {task.blockedBy?.name}
                  </span>
                </div>
                
                {task.blockReason && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-red-800">Powód blokady:</p>
                        <p className="text-sm text-red-700 mt-1">{task.blockReason}</p>
                      </div>
                    </div>
                  </div>
                )}

                {!canModifyBlock && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      Tylko autor zadania lub przypisana osoba może je odblokować.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="blockReason">Powód blokady *</Label>
                  <Textarea
                    id="blockReason"
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="Opisz dlaczego zadanie jest blokowane i co należy zrobić aby je odblokować..."
                    className="mt-1"
                    rows={3}
                    disabled={loading}
                  />
                </div>

                {!canModifyBlock && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      Tylko autor zadania lub przypisana osoba może je zablokować.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Anuluj
            </Button>
            {isBlocked ? (
              <Button
                onClick={() => setShowUnblockConfirm(true)}
                disabled={loading || !canModifyBlock}
                className="bg-green-600 hover:bg-green-700"
              >
                <Unlock className="h-4 w-4 mr-2" />
                Odblokuj
              </Button>
            ) : (
              <Button
                onClick={handleBlock}
                disabled={loading || !blockReason.trim() || !canModifyBlock}
                variant="destructive"
              >
                <Lock className="h-4 w-4 mr-2" />
                Zablokuj zadanie
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showUnblockConfirm} onOpenChange={setShowUnblockConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Potwierdź odblokowanie</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz odblokować to zadanie? Po odblokowaniu będzie można je ponownie edytować.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnblock}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              Odblokuj zadanie
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
