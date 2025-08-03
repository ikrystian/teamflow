'use client'

import { cn } from '@/lib/utils'

interface OnlineStatusProps {
  isOnline?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function OnlineStatus({ isOnline = false, size = 'md', className }: OnlineStatusProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3', 
    lg: 'w-4 h-4'
  }

  return (
    <div className={cn(
      'rounded-full border-2 border-background',
      sizeClasses[size],
      isOnline ? 'bg-green-500' : 'bg-gray-400',
      className
    )} />
  )
}