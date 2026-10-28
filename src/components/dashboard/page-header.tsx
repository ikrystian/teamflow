"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  /** Leading visual, e.g. a project icon tile. */
  icon?: ReactNode
  /** Renders a back button linking here. */
  backHref?: string
  /** Renders a back button calling this (takes precedence over backHref). */
  onBack?: () => void
  /** Inline extras next to the title, e.g. a status badge. */
  meta?: ReactNode
  actions?: ReactNode
  className?: string
}

/**
 * Shared title row rendered into the dashboard header slot via usePageHeader,
 * so every page gets the same typography, spacing and action alignment.
 */
export function PageHeader({
  title,
  description,
  icon,
  backHref,
  onBack,
  meta,
  actions,
  className,
}: PageHeaderProps) {
  const backButton = onBack ? (
    <Button variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground" onClick={onBack} aria-label="Wróć">
      <ArrowLeft />
    </Button>
  ) : backHref ? (
    <Button variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground" asChild>
      <Link href={backHref} aria-label="Wróć">
        <ArrowLeft />
      </Link>
    </Button>
  ) : null

  return (
    <div className={cn("flex w-full min-w-0 items-center justify-between gap-3", className)}>
      <div className="flex min-w-0 items-center gap-2.5">
        {backButton}
        {icon && <div className="shrink-0">{icon}</div>}
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-base font-semibold tracking-tight text-foreground">{title}</h1>
            {meta}
          </div>
          {description && (
            <p className="hidden truncate text-xs text-muted-foreground sm:block">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

/** Consistent outer spacing for page bodies inside the dashboard shell. */
export function PageBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-[1600px] space-y-6 p-4 md:p-6", className)}>{children}</div>
}

/** Small uppercase section heading used between blocks of a page. */
export function SectionHeading({
  icon,
  title,
  description,
  actions,
}: {
  icon?: ReactNode
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground [&>svg]:size-4 [&>svg]:text-muted-foreground">
          {icon}
          {title}
        </h2>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {actions}
    </div>
  )
}
