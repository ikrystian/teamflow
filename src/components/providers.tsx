"use client"

import { SessionProvider } from "next-auth/react"
import { ThemeProvider } from "next-themes"
import { ProjectsProvider } from "@/contexts/projects-context"
import { SocketProvider } from "@/components/providers/socket-provider"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        disableTransitionOnChange
      >
        <ProjectsProvider>
          <SocketProvider>
            {children}
          </SocketProvider>
        </ProjectsProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
