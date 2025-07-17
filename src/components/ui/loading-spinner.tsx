import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface LoadingSpinnerProps {
  className?: string
  size?: "sm" | "md" | "lg"
  text?: string
}

export function LoadingSpinner({ className, size = "md", text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8"
  }

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className="flex flex-col items-center space-y-2">
        <Loader2 className={cn("animate-spin", sizeClasses[size])} />
        {text && (
          <p className="text-sm text-gray-500">{text}</p>
        )}
      </div>
    </div>
  )
}

interface LoadingOverlayProps {
  className?: string
  text?: string
}

export function LoadingOverlay({ className, text = "Loading..." }: LoadingOverlayProps) {
  return (
    <div className={cn(
      "absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50",
      className
    )}>
      <LoadingSpinner size="lg" text={text} />
    </div>
  )
}

interface LoadingPageProps {
  className?: string
  text?: string
}

export function LoadingPage({ className, text = "Loading page..." }: LoadingPageProps) {
  return (
    <div className={cn(
      "min-h-screen flex items-center justify-center bg-gray-50",
      className
    )}>
      <LoadingSpinner size="lg" text={text} />
    </div>
  )
}
