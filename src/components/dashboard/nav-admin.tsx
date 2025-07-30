"use client"
import { Activity } from "lucide-react"
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

interface NavAdminProps {
  onRecentChangesClick?: () => void
}

export function NavAdmin({ onRecentChangesClick }: NavAdminProps) {


  return (
    <SidebarGroup  className="-mb-5" >
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={onRecentChangesClick}
            tooltip="Zarządzaj ostatnimi zmianami"
          >
            <Activity className="w-4 h-4" />
            <span>Ostatnie zmiany</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}
