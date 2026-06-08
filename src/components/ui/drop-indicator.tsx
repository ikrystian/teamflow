import type { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge"

/**
 * A thin line shown along the closest edge of a drop target while reordering,
 * replacing dnd-kit's built-in sortable transitions.
 */
export function DropIndicator({ edge }: { edge: Edge }) {
  const base = "pointer-events-none absolute left-0 right-0 h-0.5 bg-primary z-10"
  const position = edge === "top" ? "-top-1.5" : "-bottom-1.5"
  return <div className={`${base} ${position}`} />
}
