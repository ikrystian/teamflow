"use client"

import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserInfoPopover } from "@/components/users/user-info-popover"
import { cn } from "@/lib/utils"

interface ClickableAvatarProps {
  userId: string
  avatarUrl?: string | null
  name?: string | null
  className?: string
  size?: "sm" | "md" | "lg" | "xl"
  showTooltip?: boolean
  disabled?: boolean
}

const sizeClasses = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
  xl: "h-12 w-12"
}

const fallbackSizeClasses = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-lg"
}

export function ClickableAvatar({
  userId,
  avatarUrl,
  name,
  className,
  size = "md",
  showTooltip = true,
  disabled = false
}: ClickableAvatarProps) {
  const avatarElement = (
    <Avatar
      className={cn(
        sizeClasses[size],
        !disabled && "cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all duration-200",
        className
      )}
    >
      <AvatarImage src={avatarUrl || ""} alt={name || ""} />
      <AvatarFallback className={fallbackSizeClasses[size]}>
        {name?.charAt(0) || "U"}
      </AvatarFallback>
    </Avatar>
  )

  if (disabled) {
    return showTooltip ? (
      <UserInfoPopover userId={userId}>
        {avatarElement}
      </UserInfoPopover>
    ) : avatarElement
  }

  const linkElement = (
    <Link href={`/dashboard/profile/${userId}`} className="inline-block" onClick={(e) => e.stopPropagation()}>
      {avatarElement}
    </Link>
  )

  return showTooltip ? (
    <UserInfoPopover userId={userId}>
      {linkElement}
    </UserInfoPopover>
  ) : linkElement
}
