import "server-only";
import { prisma } from "@/lib/prisma";
import { isDoneStatusName } from "@/lib/task-status-helpers";

/**
 * Projekty klienta z modułu projektów (MongoDB) do karty klienta w CRM.
 * Widoczność jak w module projektów: członkowie i twórca projektu, a pełna lista dla
 * właściciela/administratora przestrzeni klientów i administratora systemu.
 */
export type ClientProject = {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  status: string;
  archived: boolean;
  totalTasks: number;
  doneTasks: number;
  overdueTasks: number;
  hoursLogged: number;
  lastActivityAt: string;
  members: { id: string; name: string | null; avatarUrl: string | null }[];
};

export async function projectsForClient(clientId: string, viewer: { userId: string; seesAll: boolean }): Promise<ClientProject[]> {
  const projects = await prisma.project.findMany({
    where: {
      clientId,
      ...(viewer.seesAll ? {} : { OR: [{ createdById: viewer.userId }, { members: { some: { userId: viewer.userId } } }] }),
    },
    orderBy: [{ archived: "asc" }, { sortOrder: "asc" }],
    select: {
      id: true,
      name: true,
      color: true,
      icon: true,
      status: true,
      archived: true,
      updatedAt: true,
      members: { select: { user: { select: { id: true, name: true, avatarUrl: true } } } },
    },
  });
  if (!projects.length) return [];
  const ids = projects.map((p) => p.id);
  const now = new Date();
  const tasks = await prisma.task.findMany({
    where: { projectId: { in: ids }, deletedAt: null, archived: false },
    select: { id: true, projectId: true, dueDate: true, updatedAt: true, taskStatus: { select: { name: true } } },
  });
  const entries = await prisma.timeEntry.findMany({
    where: { taskId: { in: tasks.map((t) => t.id) } },
    select: { hours: true, taskId: true },
  });
  const projectOfTask = new Map(tasks.map((t) => [t.id, t.projectId]));
  const hours = new Map<string, number>();
  for (const e of entries) {
    const pid = projectOfTask.get(e.taskId);
    if (pid) hours.set(pid, (hours.get(pid) ?? 0) + e.hours);
  }
  return projects.map((p) => {
    const own = tasks.filter((t) => t.projectId === p.id);
    const done = own.filter((t) => isDoneStatusName(t.taskStatus?.name));
    const last = own.reduce((max, t) => (t.updatedAt > max ? t.updatedAt : max), p.updatedAt);
    return {
      id: p.id,
      name: p.name,
      color: p.color,
      icon: p.icon,
      status: p.status,
      archived: p.archived,
      totalTasks: own.length,
      doneTasks: done.length,
      overdueTasks: own.filter((t) => t.dueDate && t.dueDate < now && !isDoneStatusName(t.taskStatus?.name)).length,
      hoursLogged: Math.round((hours.get(p.id) ?? 0) * 10) / 10,
      lastActivityAt: last.toISOString(),
      members: p.members.map((m) => m.user),
    };
  });
}

/** Liczba projektów klienta (zakładka w karcie klienta, lista klientów). */
export async function projectCounts(clientIds: string[]): Promise<Map<string, number>> {
  if (!clientIds.length) return new Map();
  const rows = await prisma.project.groupBy({ by: ["clientId"], where: { clientId: { in: clientIds }, archived: false }, _count: { _all: true } });
  return new Map(rows.filter((r) => r.clientId).map((r) => [r.clientId as string, r._count._all]));
}

/** Klient usunięty z CRM — projekty zostają, tracą tylko powiązanie (jak wcześniej w nexusie). */
export async function unlinkClientProjects(clientId: string) {
  await prisma.project.updateMany({ where: { clientId }, data: { clientId: null } });
}
