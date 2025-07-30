"use client"

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react'

interface HeaderContextType {
  headerContent: ReactNode
  setHeaderContent: (content: ReactNode) => void
}

const HeaderContext = createContext<HeaderContextType | undefined>(undefined)

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [headerContent, setHeaderContent] = useState<ReactNode>(
    <h2 className="text-lg font-semibold">Dashboard</h2>
  )

  const setHeaderContentCallback = useCallback((content: ReactNode) => {
    setHeaderContent(content)
  }, [])

  return (
    <HeaderContext.Provider value={{ headerContent, setHeaderContent: setHeaderContentCallback }}>
      {children}
    </HeaderContext.Provider>
  )
}

export function useHeader() {
  const context = useContext(HeaderContext)
  if (context === undefined) {
    throw new Error('useHeader must be used within a HeaderProvider')
  }
  return context
}

export function usePageHeader(content: ReactNode, deps: React.DependencyList = []) {
  const { setHeaderContent } = useHeader()

  // Memoize content to prevent unnecessary re-renders
  const memoizedContent = useMemo(() => content, deps)

  useEffect(() => {
    setHeaderContent(memoizedContent)

    // Cleanup - reset to default when component unmounts
    return () => {
      setHeaderContent(<h2 className="text-lg font-semibold">Dashboard</h2>)
    }
  }, [memoizedContent, setHeaderContent])
}
