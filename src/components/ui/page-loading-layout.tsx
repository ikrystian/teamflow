import { cn } from "@/lib/utils"
import { LoadingSkeleton, LoadingStatsGrid, LoadingGrid } from "./loading-skeleton"

interface PageLoadingLayoutProps {
  className?: string
  variant?: "dashboard" | "list" | "details" | "calendar" | "minimal"
  showTopBar?: boolean
  showStats?: boolean
  showGrid?: boolean
  gridColumns?: number
  gridItems?: number
}

export function PageLoadingLayout({ 
  className,
  variant = "list",
  showTopBar = true,
  showStats = false,
  showGrid = true,
  gridColumns = 3,
  gridItems = 6
}: PageLoadingLayoutProps) {
  
  const renderDashboardLoading = () => (
    <div className="space-y-8">
      {/* Welcome section skeleton */}
      <div className="space-y-2">
        <LoadingSkeleton className="h-8 w-1/3" />
        <LoadingSkeleton className="h-4 w-1/2" />
      </div>
      
      {/* Stats grid */}
      <LoadingStatsGrid />
      
      {/* Quick actions card */}
      <div className="border rounded-lg p-6 space-y-4">
        <div className="space-y-2">
          <LoadingSkeleton className="h-6 w-32" />
          <LoadingSkeleton className="h-4 w-48" />
        </div>
        <div className="flex space-x-4">
          <LoadingSkeleton className="h-10 w-32" />
          <LoadingSkeleton className="h-10 w-32" />
          <LoadingSkeleton className="h-10 w-32" />
        </div>
      </div>
      
      {/* Recent tasks card */}
      <div className="border rounded-lg p-6 space-y-4">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <LoadingSkeleton className="h-6 w-32" />
            <LoadingSkeleton className="h-4 w-48" />
          </div>
          <LoadingSkeleton className="h-8 w-20" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1 space-y-2">
                <LoadingSkeleton className="h-4 w-48" />
                <LoadingSkeleton className="h-3 w-32" />
              </div>
              <div className="flex items-center space-x-2">
                <LoadingSkeleton className="h-6 w-16" />
                <LoadingSkeleton className="h-6 w-20" />
                <LoadingSkeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderListLoading = () => (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex justify-between items-center">
        <LoadingSkeleton className="h-8 w-48" />
        <LoadingSkeleton className="h-10 w-32" />
      </div>
      
      {/* Grid of items */}
      {showGrid && <LoadingGrid columns={gridColumns} items={gridItems} />}
    </div>
  )

  const renderDetailsLoading = () => (
    <div className="space-y-6">
      {/* Page header with back button */}
      <div className="flex items-center space-x-4">
        <LoadingSkeleton className="h-8 w-8" />
        <LoadingSkeleton className="h-8 w-64" />
      </div>
      
      {/* Stats or info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border rounded-lg p-6 space-y-4">
            <div className="space-y-2">
              <LoadingSkeleton className="h-4 w-3/4" />
              <LoadingSkeleton className="h-3 w-1/2" />
            </div>
            <LoadingSkeleton className="h-8 w-full" />
          </div>
        ))}
      </div>
      
      {/* Main content area */}
      <div className="border rounded-lg p-6 space-y-4">
        <LoadingSkeleton className="h-6 w-48" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    </div>
  )

  const renderCalendarLoading = () => (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex justify-between items-center">
        <LoadingSkeleton className="h-8 w-32" />
        <div className="flex space-x-2">
          <LoadingSkeleton className="h-10 w-10" />
          <LoadingSkeleton className="h-10 w-10" />
        </div>
      </div>
      
      {/* Calendar grid */}
      <div className="border rounded-lg p-6">
        <div className="space-y-4">
          <LoadingSkeleton className="h-6 w-48" />
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <LoadingSkeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  const renderMinimalLoading = () => (
    <div className="space-y-4">
      <LoadingSkeleton className="h-8 w-48" />
      <LoadingSkeleton className="h-4 w-32" />
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <LoadingSkeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    </div>
  )

  const renderContent = () => {
    switch (variant) {
      case "dashboard":
        return renderDashboardLoading()
      case "details":
        return renderDetailsLoading()
      case "calendar":
        return renderCalendarLoading()
      case "minimal":
        return renderMinimalLoading()
      default:
        return renderListLoading()
    }
  }

  return (
    <div className={cn("animate-pulse", className)}>
      {showTopBar && (
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1 items-center">
              <div className="space-y-2">
                <LoadingSkeleton className="h-6 w-48" />
                <LoadingSkeleton className="h-3 w-64" />
              </div>
            </div>
          </div>
        </div>
      )}
      
      <main className="py-10">
        <div className="px-4 sm:px-6 lg:px-8">
          {renderContent()}
        </div>
      </main>
    </div>
  )
}
