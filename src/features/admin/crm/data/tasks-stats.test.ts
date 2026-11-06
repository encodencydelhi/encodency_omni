import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CrmTask } from "../types";
import { statsFromTasks } from "./tasks-stats";

const task = (over: Partial<CrmTask>): CrmTask => ({
  id: over.title ?? "t", title: "t", description: "", type: "other", priority: "medium", status: "pending", assigneeId: "", assigneeName: "Unassigned",
  dueDate: "", dueTime: "", reminder: "none", tags: [], createdAt: "2026-10-01T10:00:00.000Z", updatedAt: "2026-10-01T10:00:00.000Z", ...over,
});

// The same five tasks as the server's real-PostgreSQL test (backend/test/crm-tasks-db.e2e.ts): both must agree.
const tasks = [
  task({ title: "Call Acme", status: "pending", priority: "high", type: "call", assigneeName: "Asha", dueDate: "2026-11-03", createdAt: "2026-10-01T10:00:00.000Z" }),
  task({ title: "Email Beta", status: "in_progress", priority: "medium", type: "email", assigneeName: "Ravi", dueDate: "2026-11-04", createdAt: "2026-10-02T10:00:00.000Z" }),
  task({ title: "Demo Gamma", status: "completed", priority: "low", type: "demo", assigneeName: "Asha", dueDate: "2026-11-01", completedAt: "2026-11-02T09:00:00.000Z", createdAt: "2026-10-02T12:00:00.000Z" }),
  task({ title: "Proposal Delta", status: "cancelled", priority: "high", type: "proposal", assigneeName: "Asha", dueDate: "2026-10-01", createdAt: "2026-11-01T08:00:00.000Z" }),
  task({ title: "Follow up Eps", status: "pending", priority: "medium", type: "follow_up", assigneeName: "", dueDate: "", createdAt: "2026-11-02T08:00:00.000Z" }),
];

describe("statsFromTasks (preview mode) agrees with the server's rules", () => {
  it("matches the server's figures for the shared fixture", () => {
    const stats = statsFromTasks(tasks, "2026-11-04");
    assert.equal(stats.total, 5);
    assert.deepEqual(stats.byStatus, { pending: 2, in_progress: 1, completed: 1, cancelled: 1 });
    assert.deepEqual(stats.byPriority, { high: 2, medium: 2, low: 1 });
    assert.deepEqual(stats.byType, { call: 1, email: 1, demo: 1, proposal: 1, follow_up: 1 });
    assert.deepEqual(stats.byAssignee, [{ name: "Asha", count: 3 }, { name: "Ravi", count: 1 }, { name: "Unassigned", count: 1 }]);
    assert.equal(stats.overdue, 1);
    assert.equal(stats.dueToday, 1);
    assert.deepEqual(stats.created, [{ date: "2026-10-01", count: 1 }, { date: "2026-10-02", count: 2 }, { date: "2026-11-01", count: 1 }, { date: "2026-11-02", count: 1 }]);
    assert.deepEqual(stats.completed, [{ date: "2026-11-02", count: 1 }]);
    assert.deepEqual(stats.monthly, [{ month: "2026-10", count: 3 }, { month: "2026-11", count: 2 }]);
  });

  it("moves tasks between overdue and due today as the day changes, never counting one twice", () => {
    const later = statsFromTasks(tasks, "2026-11-05");
    assert.deepEqual([later.overdue, later.dueToday], [2, 0]);
    assert.equal(statsFromTasks(tasks, "2026-11-03").overdue, 0);
  });

  it("is empty for no tasks", () => {
    const stats = statsFromTasks([], "2026-11-04");
    assert.equal(stats.total, 0);
    assert.deepEqual(stats.byAssignee, []);
    assert.equal(stats.overdue, 0);
  });
});
