"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Plus, MoreHorizontal, Eye, Pencil, Trash2, CheckCircle2, Clock,
  Calendar, Phone, Mail, Users, AlertCircle, ListTodo, CalendarDays,
  Columns3, GripVertical, Check,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DataTable } from "@/components/shared/data-table/data-table";
import { SearchInput } from "@/components/shared/search-input";
import { FilterBar } from "@/components/shared/filter-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { DonutChart } from "@/components/shared/charts/donut-chart";
import { TrendAreaChart, ChartLegend } from "@/components/shared/charts/trend-area-chart";
import { MonthlyBarChart } from "@/components/shared/charts/monthly-bar-chart";
import { AdminPageTitle } from "@/features/admin/shared/admin-page-title";
import type { DataTableColumn } from "@/components/shared/data-table/types";
import type { PaginationMeta, SortSpec } from "@/types/api";
import type { DonutSegment } from "@/components/shared/charts/donut-chart";
import type { TrendSeries } from "@/components/shared/charts/trend-area-chart";
import type { MonthlyPoint } from "@/types/domain/dashboard";
import { TaskMetricCards } from "./components/crm-metric-cards";
import { tasks as initialTasks, activities } from "./data/crm-data";
import type { CrmTask, TaskStatus, TaskPriority, TaskType, TaskViewMode } from "./types";
import { TASK_STATUS_REGISTRY, TASK_PRIORITY_REGISTRY } from "./types";
import { formatDate } from "@/lib/utils/format";

/* ------------------------------------------------------------------ */
/* Constants                                                            */
/* ------------------------------------------------------------------ */

const STATUS_OPTIONS: TaskStatus[] = ["pending", "in_progress", "completed", "cancelled"];
const STATUS_LABELS: Record<TaskStatus, string> = { pending: "Pending", in_progress: "In-progress", completed: "Completed", cancelled: "Cancelled" };
const STATUS_BADGE: Record<string, string> = {
  todo: "bg-slate-50 text-slate-700 border border-slate-200/50 shadow-sm",
  pending: "bg-slate-50 text-slate-700 border border-slate-200/50 shadow-sm",
  in_progress: "bg-blue-50 text-blue-700 border border-blue-200/50 shadow-sm",
  review: "bg-amber-50 text-amber-700 border border-amber-200/50 shadow-sm",
  completed: "bg-emerald-50 text-emerald-700 border border-emerald-200/50 shadow-sm",
  done: "bg-emerald-50 text-emerald-700 border border-emerald-200/50 shadow-sm",
  cancelled: "bg-slate-50 text-slate-400 border border-slate-200/50 shadow-sm",
};

const PRIORITY_OPTIONS: TaskPriority[] = ["high", "medium", "low"];
const PRIORITY_LABELS: Record<TaskPriority, string> = { high: "High", medium: "Medium", low: "Low" };
const PRIORITY_BADGE: Record<string, string> = {
  high: "bg-red-50 text-red-700 border border-red-200/50 shadow-sm",
  medium: "bg-amber-50 text-amber-700 border border-amber-200/50 shadow-sm",
  low: "bg-slate-50 text-slate-600 border border-slate-200/50 shadow-sm",
};

const TYPE_OPTIONS: TaskType[] = ["call", "email", "meeting", "follow_up", "demo", "proposal", "internal", "other"];
const TYPE_LABELS: Record<TaskType, string> = {
  call: "Call", email: "Email", meeting: "Meeting", follow_up: "Follow-up",
  demo: "Demo", proposal: "Proposal", internal: "Internal", other: "Other",
};
const TYPE_ICON: Record<TaskType, typeof Phone> = {
  call: Phone, email: Mail, meeting: Calendar, follow_up: Clock,
  demo: Users, proposal: Pencil, internal: ListTodo, other: MoreHorizontal,
};

const BOARD_COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "pending", label: "To Do" },
  { status: "in_progress", label: "In-progress" },
  { status: "completed", label: "Completed" },
];

/* ------------------------------------------------------------------ */
/* Task type donut                                                      */
/* ------------------------------------------------------------------ */

function computeTypeDistribution(tasks: CrmTask[]): DonutSegment[] {
  const counts: Record<string, number> = {};
  tasks.forEach((t) => { counts[t.type] = (counts[t.type] || 0) + 1; });
  const colors: Record<string, string> = {
    call: "#2563EB", email: "#8B5CF6", meeting: "#F59E0B", follow_up: "#078359",
    demo: "#0866FF", proposal: "#EA580C", internal: "#6B7280", other: "#AAB5C6",
  };
  return Object.entries(counts).map(([key, value]) => ({
    key, label: TYPE_LABELS[key as TaskType] ?? key, value, color: colors[key] ?? "#AAB5C6",
  }));
}

function computePriorityDistribution(tasks: CrmTask[]): DonutSegment[] {
  const counts: Record<string, number> = {};
  tasks.forEach((t) => { counts[t.priority] = (counts[t.priority] || 0) + 1; });
  const colors: Record<string, string> = { high: "#DC2626", medium: "#F59E0B", low: "#6B7280" };
  return Object.entries(counts).map(([key, value]) => ({
    key, label: key.charAt(0).toUpperCase() + key.slice(1), value, color: colors[key] ?? "#AAB5C6",
  }));
}

function computeAssigneeDistribution(tasks: CrmTask[]): DonutSegment[] {
  const counts: Record<string, number> = {};
  tasks.forEach((t) => { counts[t.assigneeName] = (counts[t.assigneeName] || 0) + 1; });
  const colors = ["#2563EB", "#059669", "#7C3AED", "#D97706", "#DC2626", "#0891B2"];
  return Object.entries(counts).map(([key, value], i) => ({
    key, label: key, value, color: colors[i % colors.length] ?? "#AAB5C6",
  }));
}

function computeTasksTrend(tasks: CrmTask[]): TrendSeries[] {
  const byDate: Record<string, { created: number; completed: number }> = {};
  tasks.forEach((t) => {
    const cd = t.createdAt.split("T")[0] ?? "";
    if (!byDate[cd]) byDate[cd] = { created: 0, completed: 0 };
    byDate[cd].created++;
    if (t.completedAt) {
      const compd = t.completedAt.split("T")[0] ?? "";
      if (!byDate[compd]) byDate[compd] = { created: 0, completed: 0 };
      byDate[compd].completed++;
    }
  });
  const pts = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b));
  return [
    { key: "created", label: "Created", color: "#2563EB", data: pts.map(([date, v]) => ({ date, value: v.created })) },
    { key: "completed", label: "Completed", color: "#059669", data: pts.map(([date, v]) => ({ date, value: v.completed })) },
  ];
}

function computeMonthlyTasks(tasks: CrmTask[]): MonthlyPoint[] {
  const counts: Record<string, number> = {};
  tasks.forEach((t) => {
    const d = new Date(t.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, value: count }));
}

/* ------------------------------------------------------------------ */
/* Main Page                                                            */
/* ------------------------------------------------------------------ */

export default function TasksPage() {
  const [tasks, setTasks] = useState<CrmTask[]>(initialTasks);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<SortSpec | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewMode, setViewMode] = useState<TaskViewMode>("list");
  const [detailTask, setDetailTask] = useState<CrmTask | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  /* ---- Derived data ---- */
  const filtered = useMemo(() => {
    let result = tasks;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((t) => t.title.toLowerCase().includes(q) || t.assigneeName.toLowerCase().includes(q));
    }
    if (statusFilter) result = result.filter((t) => t.status === statusFilter);
    if (priorityFilter) result = result.filter((t) => t.priority === priorityFilter);
    if (sort) {
      result = [...result].sort((a, b) => {
        const av = a[sort.field as keyof CrmTask] ?? "";
        const bv = b[sort.field as keyof CrmTask] ?? "";
        return sort.direction === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
      });
    }
    return result;
  }, [tasks, search, statusFilter, priorityFilter, sort]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const pagination: PaginationMeta = useMemo(() => ({
    page, pageSize, total: filtered.length,
    totalPages: Math.ceil(filtered.length / pageSize),
    hasNextPage: page < Math.ceil(filtered.length / pageSize),
    hasPreviousPage: page > 1,
  }), [page, pageSize, filtered.length]);

  const typeDistribution = useMemo(() => computeTypeDistribution(tasks), [tasks]);
  const priorityDistribution = useMemo(() => computePriorityDistribution(tasks), [tasks]);
  const assigneeDistribution = useMemo(() => computeAssigneeDistribution(tasks), [tasks]);
  const tasksTrend = useMemo(() => computeTasksTrend(tasks), [tasks]);
  const monthlyTasks = useMemo(() => computeMonthlyTasks(tasks), [tasks]);

  /* ---- Actions ---- */
  const handleSort = useCallback((field: string) => {
    setSort((prev) =>
      prev?.field === field
        ? prev.direction === "asc" ? { field, direction: "desc" } : null
        : { field, direction: "asc" }
    );
  }, []);

  const handleToggleComplete = (taskId: string) => {
    setTasks((prev) => prev.map((t) =>
      t.id === taskId
        ? { ...t, status: t.status === "completed" ? "pending" : "completed", completedAt: t.status === "completed" ? undefined : new Date().toISOString() }
        : t
    ));
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      toast.success(task.status === "completed" ? "Task reopened" : "Task completed!");
    }
  };

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    setTasks((prev) => prev.map((t) =>
      t.id === taskId ? { ...t, status: newStatus, completedAt: newStatus === "completed" ? new Date().toISOString() : undefined } : t
    ));
    toast.success(`Task moved to ${STATUS_LABELS[newStatus]}`);
  };

  const handlePriorityChange = (taskId: string, newPriority: TaskPriority) => {
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, priority: newPriority } : t));
    toast.success(`Priority changed to ${PRIORITY_LABELS[newPriority]}`);
  };

  const handleDelete = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    toast.success("Task deleted");
    setDetailTask(null);
  };

  const handleBoardDrop = (taskId: string, targetStatus: TaskStatus) => {
    handleStatusChange(taskId, targetStatus);
  };

  /* ---- Table columns ---- */
  const columns: DataTableColumn<CrmTask>[] = useMemo(() => [
    {
      id: "task",
      header: "Task",
      cell: (row) => (
        <div className="flex items-start gap-3 py-1">
          <button onClick={() => handleToggleComplete(row.id)} className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border shadow-sm transition-colors ${row.status === "completed" || row.status === "done" ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white hover:border-emerald-500"}`}>
            {(row.status === "completed" || row.status === "done") && <Check className="size-3.5" />}
          </button>
          <div className="min-w-0">
            <p className={`text-[14px] font-semibold truncate transition-colors ${row.status === "completed" || row.status === "done" ? "text-slate-400 line-through" : "text-slate-800"}`}>{row.title}</p>
            <p className="text-[12px] text-slate-500 truncate mt-0.5">{row.description}</p>
          </div>
        </div>
      ),
      width: "min-w-[250px]",
    },
    {
      id: "type",
      header: "Type",
      cell: (row) => {
        const Icon = TYPE_ICON[row.type];
        return <span className="flex items-center gap-1 text-[12px] text-[#354568]"><Icon className="size-3" /> {TYPE_LABELS[row.type]}</span>;
      },
      sortField: "type",
      hideBelow: "md",
    },
    {
      id: "priority",
      header: "Priority",
      cell: (row) => <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-medium tracking-wide ${PRIORITY_BADGE[row.priority]}`}>{row.priority.toUpperCase()}</span>,
      sortField: "priority",
      hideBelow: "md",
    },
    {
      id: "relatedTo",
      header: "Related To",
      cell: (row) => (
        <span className="text-[12px] text-[#354568]">
          {row.relatedLeadName || row.relatedContactName || row.relatedDealName || "—"}
        </span>
      ),
      hideBelow: "lg",
    },
    {
      id: "assignee",
      header: "Assignee",
      cell: (row) => <span className="text-[12px] text-[#354568]">{row.assigneeName}</span>,
      sortField: "assigneeName",
      hideBelow: "lg",
    },
    {
      id: "dueDate",
      header: "Due Date",
      cell: (row) => {
        const isOverdue = new Date(row.dueDate) < new Date() && row.status !== "completed" && row.status !== "cancelled";
        return (
          <span className={`text-[12px] ${isOverdue ? "text-[#DC2626] font-semibold" : "text-[#354568]"}`}>
            {formatDate(row.dueDate)} {row.dueTime}
          </span>
        );
      },
      sortField: "dueDate",
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-medium tracking-wide ${STATUS_BADGE[row.status]}`}>{STATUS_LABELS[row.status] || row.status}</span>,
      sortField: "status",
      hideBelow: "sm",
    },
    {
      id: "actions",
      header: "",
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon-sm"><MoreHorizontalIcon /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={() => setDetailTask(row)}><Eye /> View</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDetailTask(row)}><Pencil /> Edit</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleToggleComplete(row.id)}>
              <CheckCircle2 /> {row.status === "completed" ? "Reopen" : "Complete"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => handleDelete(row.id)}><Trash2 /> Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      width: "w-10",
    },
  ], [tasks]);

  /* ---- Board View ---- */
  const tasksByStatus = useMemo(() => {
    const map: Record<string, CrmTask[]> = {};
    BOARD_COLUMNS.forEach((c) => { map[c.status] = []; });
    filtered.forEach((t) => {
      if (!map[t.status]) map[t.status] = [];
      map[t.status]!.push(t);
    });
    return map;
  }, [filtered]);

  return (
    <div className="space-y-2">
      <AdminPageTitle
        eyebrow="CRM / Tasks"
        title="Tasks"
        description="Manage sales activities, follow-ups and team productivity."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm"><CalendarDays className="size-3.5" /> Calendar</Button>
            <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="size-3.5" /> Create Task</Button>
          </div>
        }
      />

      <TaskMetricCards tasks={tasks} />

      <FilterBar
        search={<SearchInput value={search} onChange={setSearch} placeholder="Search tasks..." />}
        filters={
          <div className="flex items-center gap-2">
            <Select value={statusFilter ?? "__all__"} onValueChange={(v) => setStatusFilter(v === "__all__" ? null : v)}>
              <SelectTrigger size="sm" className="w-auto min-w-[8rem]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Status</SelectItem>
                {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={priorityFilter ?? "__all__"} onValueChange={(v) => setPriorityFilter(v === "__all__" ? null : v)}>
              <SelectTrigger size="sm" className="w-auto min-w-[8rem]"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Priority</SelectItem>
                {PRIORITY_OPTIONS.map((p) => <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant={viewMode === "list" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("list")}><ListTodo className="size-3.5" /></Button>
            <Button variant={viewMode === "board" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("board")}><Columns3 className="size-3.5" /></Button>
          </div>
        }
        activeFilterCount={(statusFilter ? 1 : 0) + (priorityFilter ? 1 : 0)}
        onClearFilters={() => { setStatusFilter(null); setPriorityFilter(null); setSearch(""); }}
      />

      {viewMode === "list" ? (
        <DataTable
          columns={columns}
          rows={paginated}
          getRowId={(r) => r.id}
          isLoading={false}
          sort={sort}
          onToggleSort={handleSort}
          pagination={pagination}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          onRowClick={(r) => setDetailTask(r)}
          enableColumnVisibility
          emptyState={
            <EmptyState icon={ListTodo} title="No tasks found" description="Create your first task or adjust filters."
              action={<Button size="sm" onClick={() => setShowCreate(true)}><Plus className="size-3.5" /> Create Task</Button>}
            />
          }
        />
      ) : (
        <div className="flex gap-2 overflow-x-auto scrollbar-thin">
          {BOARD_COLUMNS.map((col) => (
            <div
              key={col.status}
              className="flex-1 min-w-[260px] rounded-sm border border-[#DDE4ED] bg-[#F8FAFD]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const taskId = e.dataTransfer.getData("text/plain");
                if (taskId) handleBoardDrop(taskId, col.status);
              }}
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-[#E8EDF3]">
                <h3 className="text-[12px] font-semibold text-[#27375D]">{col.label}</h3>
                <span className="flex size-6 items-center justify-center rounded-sm bg-white text-[12px] font-semibold text-[#27375D] border border-[#E8EDF3]">
                  {(tasksByStatus[col.status] ?? []).length}
                </span>
              </div>
              <div className="p-2 space-y-2 min-h-[300px] max-h-[500px] overflow-y-auto scrollbar-thin">
                {(tasksByStatus[col.status] ?? []).length === 0 ? (
                  <div className="flex items-center justify-center h-20 text-[12px] text-[#75829D]">No tasks</div>
                ) : (
                  (tasksByStatus[col.status] ?? []).map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", task.id)}
                      onClick={() => setDetailTask(task)}
                      className="rounded-sm border border-[#DDE4ED] bg-white p-2.5 shadow-xs cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-[12px] font-medium text-[#172044] leading-tight flex-1">{task.title}</p>
                        <GripVertical className="size-3 text-[#AAB5C6] shrink-0" />
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        <span className={`inline-block rounded-sm px-1.5 py-0.5 text-[12px] font-semibold ${PRIORITY_BADGE[task.priority]}`}>{PRIORITY_LABELS[task.priority]}</span>
                        <span className="inline-block rounded-sm px-1.5 py-0.5 text-[12px] font-semibold bg-[#EEF2F7] text-[#354568]">{TYPE_LABELS[task.type]}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] text-[#75829D]">{task.assigneeName.split(" ")[0]}</span>
                        <span className="text-[12px] text-[#75829D]">{new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---- Analytics Section ---- */}
      <div className="grid gap-2 lg:grid-cols-3">
        <section className="overflow-hidden rounded-sm border border-[#DDE4ED] bg-white shadow-xs">
          <h2 className="border-b border-[#E8EDF3] px-3 py-2 text-[12px] font-semibold">Tasks Over Time</h2>
          <div className="p-2">
            {tasksTrend[0]?.data.length > 0 ? <><TrendAreaChart series={tasksTrend} height={160} /><div className="mt-1"><ChartLegend series={tasksTrend} /></div></> : <p className="text-[12px] text-[#75829D] py-6 text-center">No data yet</p>}
          </div>
        </section>
        <section className="overflow-hidden rounded-sm border border-[#DDE4ED] bg-white shadow-xs">
          <h2 className="border-b border-[#E8EDF3] px-3 py-2 text-[12px] font-semibold">Task Type Distribution</h2>
          <div className="flex items-center gap-3 p-4">
            <DonutChart segments={typeDistribution} centerValue={String(tasks.length)} centerLabel="Total Tasks" size={130} />
            <ul className="flex-1 space-y-0.5">
              {typeDistribution.map((src) => (
                <li key={src.key} className="flex items-center gap-2 rounded-sm px-2 py-0.5">
                  <span className="size-2 rounded-sm" style={{ backgroundColor: src.color }} />
                  <span className="flex-1 text-[12px]">{src.label}</span>
                  <span className="text-[12px] font-semibold">{src.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
        <section className="overflow-hidden rounded-sm border border-[#DDE4ED] bg-white shadow-xs">
          <h2 className="border-b border-[#E8EDF3] px-3 py-2 text-[12px] font-semibold">Priority Distribution</h2>
          <div className="flex items-center gap-3 p-4">
            <DonutChart segments={priorityDistribution} centerValue={String(tasks.length)} centerLabel="Total Tasks" size={130} />
            <ul className="flex-1 space-y-0.5">
              {priorityDistribution.map((src) => (
                <li key={src.key} className="flex items-center gap-2 rounded-sm px-2 py-0.5">
                  <span className="size-2 rounded-sm" style={{ backgroundColor: src.color }} />
                  <span className="flex-1 text-[12px]">{src.label}</span>
                  <span className="text-[12px] font-semibold">{src.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
      <div className="grid gap-2 lg:grid-cols-2">
        <section className="overflow-hidden rounded-sm border border-[#DDE4ED] bg-white shadow-xs">
          <h2 className="border-b border-[#E8EDF3] px-3 py-2 text-[12px] font-semibold">Tasks per Month</h2>
          <div className="p-3">
            {monthlyTasks.length > 0 ? <MonthlyBarChart data={monthlyTasks} color="#2563EB" height={160} valueLabel="Tasks" /> : <p className="text-[12px] text-[#75829D] py-6 text-center">No data yet</p>}
          </div>
        </section>
        <section className="overflow-hidden rounded-sm border border-[#DDE4ED] bg-white shadow-xs">
          <h2 className="border-b border-[#E8EDF3] px-3 py-2 text-[12px] font-semibold">Assignee Breakdown</h2>
          <div className="flex items-center gap-3 p-4">
            <DonutChart segments={assigneeDistribution} centerValue={String(assigneeDistribution.length)} centerLabel="Members" size={130} />
            <ul className="flex-1 space-y-0.5">
              {assigneeDistribution.map((src) => (
                <li key={src.key} className="flex items-center gap-2 rounded-sm px-2 py-0.5">
                  <span className="size-2 rounded-sm" style={{ backgroundColor: src.color }} />
                  <span className="flex-1 text-[12px]">{src.label}</span>
                  <span className="text-[12px] font-semibold">{src.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      {/* ---- Task Detail Sheet ---- */}
      <Sheet open={!!detailTask} onOpenChange={() => setDetailTask(null)}>
        <SheetContent side="right" className="w-full max-w-lg">
          <SheetHeader>
            <SheetTitle>{detailTask?.title}</SheetTitle>
          </SheetHeader>
          <SheetBody>
            {detailTask && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className={`inline-block rounded-sm px-1.5 py-0.5 text-[12px] font-semibold ${STATUS_BADGE[detailTask.status]}`}>{STATUS_LABELS[detailTask.status]}</span>
                  <span className={`inline-block rounded-sm px-1.5 py-0.5 text-[12px] font-semibold ${PRIORITY_BADGE[detailTask.priority]}`}>{PRIORITY_LABELS[detailTask.priority]}</span>
                  <span className="inline-block rounded-sm px-1.5 py-0.5 text-[12px] font-semibold bg-[#EEF2F7] text-[#354568]">{TYPE_LABELS[detailTask.type]}</span>
                </div>
                <div className="rounded-sm border border-[#DDE4ED] p-3 space-y-2">
                  <h3 className="text-[12px] font-semibold text-[#27375D]">Task Details</h3>
                  <div className="grid grid-cols-2 gap-2 text-[12px]">
                    <div><span className="text-[#75829D]">Assignee:</span> <span className="text-[#354568]">{detailTask.assigneeName}</span></div>
                    <div><span className="text-[#75829D]">Due:</span> <span className="text-[#354568]">{formatDate(detailTask.dueDate)} {detailTask.dueTime}</span></div>
                    <div><span className="text-[#75829D]">Reminder:</span> <span className="text-[#354568]">{detailTask.reminder}</span></div>
                    <div><span className="text-[#75829D]">Created:</span> <span className="text-[#354568]">{formatDate(detailTask.createdAt)}</span></div>
                  </div>
                </div>
                {detailTask.description && (
                  <div className="rounded-sm border border-[#DDE4ED] p-3">
                    <h3 className="text-[12px] font-semibold text-[#27375D] mb-1">Description</h3>
                    <p className="text-[12px] text-[#354568]">{detailTask.description}</p>
                  </div>
                )}
                {(detailTask.relatedLeadName || detailTask.relatedContactName || detailTask.relatedDealName) && (
                  <div className="rounded-sm border border-[#DDE4ED] p-3 space-y-1">
                    <h3 className="text-[12px] font-semibold text-[#27375D]">Related Records</h3>
                    {detailTask.relatedLeadName && <p className="text-[12px] text-[#354568]">Lead: {detailTask.relatedLeadName}</p>}
                    {detailTask.relatedContactName && <p className="text-[12px] text-[#354568]">Contact: {detailTask.relatedContactName}</p>}
                    {detailTask.relatedDealName && <p className="text-[12px] text-[#354568]">Deal: {detailTask.relatedDealName}</p>}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleToggleComplete(detailTask.id)}>
                    <CheckCircle2 className="size-3.5" /> {detailTask.status === "completed" ? "Reopen" : "Complete"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { toast.info("Edit coming soon"); }}>Edit</Button>
                </div>
              </div>
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>

      {/* ---- Create Task Modal ---- */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
            <DialogDescription>Add a new task to your list.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Task Title" />
            <Textarea placeholder="Description" rows={2} />
            <Select>
              <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((t) => <SelectItem key={t} value={t}>{TYPE_LABELS[t as TaskType]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((p) => <SelectItem key={p} value={p}>{PRIORITY_LABELS[p as TaskPriority]}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" placeholder="Due Date" />
              <Input type="time" placeholder="Due Time" />
            </div>
            <Select>
              <SelectTrigger><SelectValue placeholder="Assignee" /></SelectTrigger>
              <SelectContent>
                {["Priya Sharma", "Amit Singh", "Neha Verma", "Rohit Kumar"].map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => { toast.success("Task created"); setShowCreate(false); }}>Save Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MoreHorizontalIcon() { return <MoreHorizontal className="size-4" />; }
