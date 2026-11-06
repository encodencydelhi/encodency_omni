import type { CrmTask } from "../types";
import type { CrmTasksStats } from "./crm-api";

/**
 * The same figures the server returns from /crm/tasks/stats, computed from an in-memory list. Only the sample-data
 * preview uses this; live data always comes from the server. Keeping the rules identical (a missing status counts as
 * pending, overdue means a due date before the viewer's today, completed and cancelled tasks are never overdue)
 * means the cards and charts read the same either way.
 */
export function statsFromTasks(tasks: CrmTask[], today: string): CrmTasksStats {
  const tally = (pick: (task: CrmTask) => string) => {
    const counts: Record<string, number> = {};
    for (const task of tasks) { const key = pick(task); counts[key] = (counts[key] ?? 0) + 1; }
    return counts;
  };
  const dated = (pick: (task: CrmTask) => string | undefined, size: number) => {
    const counts: Record<string, number> = {};
    for (const task of tasks) { const key = pick(task)?.slice(0, size); if (key) counts[key] = (counts[key] ?? 0) + 1; }
    return Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
  };
  const open = tasks.filter((task) => task.status !== "completed" && task.status !== "cancelled");
  const byAssignee = Object.entries(tally((task) => task.assigneeName?.trim() || "Unassigned"))
    .sort(([an, a], [bn, b]) => b - a || an.localeCompare(bn)).slice(0, 50).map(([name, count]) => ({ name, count }));
  return {
    total: tasks.length,
    byStatus: tally((task) => task.status || "pending"),
    byPriority: tally((task) => task.priority || "medium"),
    byType: tally((task) => task.type || "other"),
    byAssignee,
    created: dated((task) => task.createdAt, 10).map(([date, count]) => ({ date, count })),
    completed: dated((task) => task.completedAt, 10).map(([date, count]) => ({ date, count })),
    monthly: dated((task) => task.createdAt, 7).map(([month, count]) => ({ month, count })),
    overdue: open.filter((task) => task.dueDate !== "" && task.dueDate < today).length,
    dueToday: open.filter((task) => task.dueDate === today).length,
  };
}

export const emptyTasksStats: CrmTasksStats = {
  total: 0, byStatus: {}, byPriority: {}, byType: {}, byAssignee: [], created: [], completed: [], monthly: [], overdue: 0, dueToday: 0,
};
