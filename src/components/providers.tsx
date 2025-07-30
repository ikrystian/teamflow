"use client"

import { SessionProvider } from "next-auth/react"
import { ThemeProvider } from "next-themes"
import { ProjectsProvider } from "@/contexts/projects-context"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <ProjectsProvider>
          {children}
        </ProjectsProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
