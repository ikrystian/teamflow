"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "next-themes"
import { useState } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ProjectsProvider } from "@/contexts/projects-context"

export function Providers({ children, nonce }: { children: React.ReactNode; nonce?: string }) {
  // Pamięć podręczna zapytań modułu klientów żyje tylko w pamięci karty (bez persystencji).
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 } },
      })
  )
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      nonce={nonce}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={300}>
          <ProjectsProvider>
            {children}
          </ProjectsProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
