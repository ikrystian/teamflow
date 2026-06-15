import { toast } from "sonner"

export interface SoftDeleteResult {
  ok: boolean
  error?: string
}

/**
 * Two-stage task deletion with an undo window.
 *
 * Soft-deletes the task on the server straight away (so it disappears
 * everywhere it's listed) and shows a 5-second "Cofnij" toast. If the user
 * undoes it, the task is restored via the restore endpoint and `onRestored`
 * is called so the caller can refresh its view. If the window elapses without
 * an undo, the task is permanently deleted (which also cleans up its GitHub
 * branch on the server).
 *
 * The caller is responsible for the optimistic UI removal and for rolling it
 * back when this resolves with `ok: false`.
 */
export async function softDeleteTaskWithUndo(
  taskId: string,
  options: { onRestored?: () => void } = {}
): Promise<SoftDeleteResult> {
  let response: Response
  try {
    response = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" })
  } catch (error) {
    console.error("Error deleting task:", error)
    return { ok: false }
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    return { ok: false, error: data.error }
  }

  let undone = false
  const purgeTimer = setTimeout(() => {
    if (undone) return
    fetch(`/api/tasks/${taskId}?permanent=true`, { method: "DELETE" }).catch(
      (error) => console.error("Error permanently deleting task:", error)
    )
  }, 5000)

  toast("Zadanie zostało usunięte", {
    duration: 5000,
    action: {
      label: "Cofnij",
      onClick: async () => {
        undone = true
        clearTimeout(purgeTimer)
        try {
          const res = await fetch(`/api/tasks/${taskId}/restore`, {
            method: "POST",
          })
          if (!res.ok) throw new Error("restore failed")
          options.onRestored?.()
          toast.success("Przywrócono zadanie")
        } catch (error) {
          console.error("Error restoring task:", error)
          toast.error("Nie udało się przywrócić zadania")
        }
      },
    },
  })

  return { ok: true }
}
