"use client"

import Link from "next/link"
import { TopBarUser } from "@/components/dashboard/top-bar-user"
import {
  Home,
  Users,
  FolderOpen,
  CheckSquare,
  Calendar,
  BarChart3,
} from "lucide-react"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "My Tasks", href: "/dashboard/tasks", icon: CheckSquare },
    { name: "Teams", href: "/dashboard/teams", icon: Users },
    { name: "Projects", href: "/dashboard/projects", icon: FolderOpen },
    { name: "Reports", href: "/dashboard/reports", icon: BarChart3 },
    { name: "Calendar", href: "/dashboard/calendar", icon: Calendar },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar - always visible, narrow on mobile, full width on desktop */}
      <div className="fixed inset-y-0 left-0 flex w-16 lg:w-64 flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          {/* Header - show logo on desktop, hide on mobile */}
          <div className="hidden lg:flex h-16 items-center px-4">
            <h1 className="text-xl font-bold text-gray-900 flex-1">TeamFlow</h1>
            <TopBarUser />
          </div>

          {/* Mobile header - just user avatar */}
          <div className="flex lg:hidden h-16 items-center justify-center px-2">
            <TopBarUser />
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="group flex items-center justify-center lg:justify-start px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                title={item.name} // Show tooltip on mobile
              >
                <item.icon className="h-5 w-5 lg:mr-3" />
                <span className="hidden lg:block">{item.name}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-16 lg:pl-64">

            {children}

      </div>
    </div>
  )
}
