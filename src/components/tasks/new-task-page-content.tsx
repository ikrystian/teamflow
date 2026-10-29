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
      {/* The form brings its own padding and footer bar. */}
      <div className="glass-inset flex flex-col overflow-hidden rounded-xl border">
        <TaskFormContent mode="create" />
      </div>
    </div>
  )
}
