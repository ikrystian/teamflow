"use client";

import { PageHeader as ShellPageHeader } from "@/components/dashboard/page-header";
import { usePageHeader } from "@/contexts/header-context";

/**
 * Tytuł strony modułu klientów i sejfu — renderowany w pasku nagłówka panelu
 * (tak jak strony modułu projektów), więc cały system ma jeden układ nagłówków.
 */
export function PageHeader({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  usePageHeader(<ShellPageHeader title={title} description={description} actions={actions} />, [title, description, actions]);
  return null;
}

export function EmptyState({ icon, title, description, action }: { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-12 text-center">
      {icon ? <div className="mb-3 text-muted-foreground">{icon}</div> : null}
      <p className="font-medium">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
