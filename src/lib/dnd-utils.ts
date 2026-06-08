import type { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge"

export type { Edge }

/**
 * Reorder a list of ids by moving `sourceId` next to `targetId`, on the side
 * indicated by `edge` (the closest edge of the target reported by the hitbox).
 * Replaces dnd-kit's `arrayMove`.
 */
export function reorderWithEdge<T extends string>(
  list: T[],
  sourceId: T,
  targetId: T,
  edge: Edge | null
): T[] {
  const startIndex = list.indexOf(sourceId)
  const targetIndex = list.indexOf(targetId)
  if (startIndex === -1 || targetIndex === -1 || sourceId === targetId) {
    return list
  }

  const without = list.filter((id) => id !== sourceId)
  let insertIndex = without.indexOf(targetId)
  if (edge === "bottom") {
    insertIndex += 1
  }

  without.splice(insertIndex, 0, sourceId)
  return without
}
