"use client"

import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      // Phones: stay clear of the home indicator / notch.
      mobileOffset={{
        bottom: "calc(env(safe-area-inset-bottom) + 16px)",
        top: "calc(env(safe-area-inset-top) + 16px)",
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:glass-menu group-[.toaster]:text-popover-foreground group-[.toaster]:border-border group-[.toaster]:rounded-xl",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
