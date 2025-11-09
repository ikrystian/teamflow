import { TimeTrackerWidget } from "@/components/time-tracker-widget"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
      <TimeTrackerWidget />
    </>
  )
}
