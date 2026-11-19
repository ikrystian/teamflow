"use client"

import { usePathname } from "next/navigation"
import { createContext, useCallback, useContext, useMemo, useState } from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import { NOTES_PANEL_COOKIE, NOTES_PANEL_COOKIE_MAX_AGE } from "@/lib/notes/panel"

type NotesPanelContextValue = {
  /** Zadokowany panel na komputerze (zapamiętywany w ciasteczku). */
  open: boolean
  setOpen: (open: boolean) => void
  /** Wysuwany panel na telefonie (niezapamiętywany). */
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  /** Czy panel jest widoczny w bieżącym wariancie (komputer / telefon). */
  visible: boolean
  toggle: () => void
  close: () => void
  selectedNoteId: string | null
  setSelectedNoteId: (id: string | null) => void
  collapsedGroups: ReadonlySet<string>
  toggleGroup: (groupId: string) => void
}

const NotesPanelContext = createContext<NotesPanelContextValue | null>(null)

export function useNotesPanel() {
  const ctx = useContext(NotesPanelContext)
  if (!ctx) throw new Error("useNotesPanel must be used within NotesPanelProvider")
  return ctx
}

export function NotesPanelProvider({ defaultOpen = false, children }: { defaultOpen?: boolean; children: React.ReactNode }) {
  const isMobile = useIsMobile()
  const pathname = usePathname()
  const [open, setOpenState] = useState(defaultOpen)
  const [openMobile, setOpenMobile] = useState(false)
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<ReadonlySet<string>>(() => new Set())

  const setOpen = useCallback((value: boolean) => {
    setOpenState(value)
    document.cookie = `${NOTES_PANEL_COOKIE}=${value ? "1" : "0"}; path=/; max-age=${NOTES_PANEL_COOKIE_MAX_AGE}; samesite=lax`
  }, [])

  const toggle = useCallback(() => {
    if (isMobile) setOpenMobile((o) => !o)
    else setOpen(!open)
  }, [isMobile, open, setOpen])

  const close = useCallback(() => {
    if (isMobile) setOpenMobile(false)
    else setOpen(false)
  }, [isMobile, setOpen])

  const toggleGroup = useCallback((groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }, [])

  // Na telefonie panel zasłania stronę — zamykamy go po przejściu na inną podstronę.
  const [lastPathname, setLastPathname] = useState(pathname)
  if (pathname !== lastPathname) {
    setLastPathname(pathname)
    setOpenMobile(false)
  }

  const value = useMemo<NotesPanelContextValue>(
    () => ({
      open,
      setOpen,
      openMobile,
      setOpenMobile,
      isMobile,
      visible: isMobile ? openMobile : open,
      toggle,
      close,
      selectedNoteId,
      setSelectedNoteId,
      collapsedGroups,
      toggleGroup,
    }),
    [open, setOpen, openMobile, isMobile, toggle, close, selectedNoteId, collapsedGroups, toggleGroup]
  )

  return <NotesPanelContext.Provider value={value}>{children}</NotesPanelContext.Provider>
}
