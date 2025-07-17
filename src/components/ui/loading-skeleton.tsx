import { cn } from "@/lib/utils"

interface LoadingSkeletonProps {
  className?: string
  children?: React.ReactNode
}

export function LoadingSkeleton({ className, children }: LoadingSkeletonProps) {
  return (
    <div
      data-slot="loading-skeleton"
      className={cn(
        "animate-pulse bg-muted rounded",
        className
      )}
    >
      {children}
    </div>
  )
}

interface LoadingCardProps {
  className?: string
  showHeader?: boolean
  headerLines?: number
  contentLines?: number
}

export function LoadingCard({
  className,
  showHeader = true,
  headerLines = 2,
  contentLines = 3
}: LoadingCardProps) {
  return (
    <div
      data-slot="loading-card"
      className={cn("bg-card text-card-foreground border rounded-xl p-6 space-y-4 shadow-sm", className)}
    >
      {showHeader && (
        <div className="space-y-2">
          {Array.from({ length: headerLines }).map((_, i) => (
            <LoadingSkeleton
              key={i}
              className={cn(
                "h-4",
                i === 0 ? "w-3/4" : "w-1/2"
              )}
            />
          ))}
        </div>
      )}
      <div className="space-y-2">
        {Array.from({ length: contentLines }).map((_, i) => (
          <LoadingSkeleton
            key={i}
            className={cn(
              "h-3",
              i === contentLines - 1 ? "w-2/3" : "w-full"
            )}
          />
        ))}
      </div>
    </div>
  )
}

interface LoadingGridProps {
  columns?: number
  items?: number
  className?: string
}

export function LoadingGrid({ columns = 3, items = 6, className }: LoadingGridProps) {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
  }

  return (
    <div className={cn("grid gap-6", gridCols[columns as keyof typeof gridCols], className)}>
      {Array.from({ length: items }).map((_, i) => (
        <LoadingCard key={i} />
      ))}
    </div>
  )
}

interface LoadingStatsGridProps {
  className?: string
}

export function LoadingStatsGrid({ className }: LoadingStatsGridProps) {
  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="border rounded-lg p-6">
          <div className="flex items-center space-x-4">
            <LoadingSkeleton className="h-6 w-6" />
            <div className="flex-1 space-y-2">
              <LoadingSkeleton className="h-4 w-20" />
              <LoadingSkeleton className="h-6 w-12" />
            </div>
          </div>
          <LoadingSkeleton className="h-3 w-32 mt-4" />
        </div>
      ))}
    </div>
  )
}
