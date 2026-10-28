"use client"

import { usePageHeader } from "@/contexts/header-context"
import { PageHeader } from "@/components/dashboard/page-header"
import { TaskFormContent } from "@/components/shared/task-form-content"

export function NewTaskPageContent() {
  usePageHeader(
    <PageHeader
      backHref="/dashboard/tasks"
      title="Nowe zadanie"
      description="Uzupełnij szczegóły i przypisz zadanie do projektu"
    />,
    []
  )

  return (
    <div className="mx-auto w-full max-w-3xl p-4 md:p-6">
      <div className="rounded-xl border bg-card p-4 shadow-xs md:p-6">
        <TaskFormContent mode="create" />
      </div>
    </div>
  )
}
