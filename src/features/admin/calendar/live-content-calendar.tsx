"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BarChart2,
  ChevronDown,
  FileText,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Filter,
  Image as ImageIcon,
  Megaphone,
  MoreVertical,
  CalendarDays as CalendarDaysIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { describeScheduleError } from "@/features/admin/content/live/scheduling-api";
import { describeScheduleErrorCode, SCHEDULED_POST_STATUS_META } from "@/features/admin/content/live/scheduling-status";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { cn } from "@/lib/utils/cn";
import { getFirstDayIndex } from "@/lib/utils/format";
import { crmApi } from "@/features/admin/crm/data/crm-api";
import type { CrmTask, TaskStatus } from "@/features/admin/crm/types";
import { ChannelLogo } from "../shared/channel-logo";
import { type CalendarChannel, type CalendarPost, type CalendarStatus, type CalendarStatusGroup } from "./live/calendar-api";
import { useCalendar, useCancelScheduledPost } from "./live/use-calendar";

type View = "Month" | "Week" | "List";
type CalendarTask = CrmTask & { clientId: string; clientName: string };
type CalendarStatusFilter = CalendarStatusGroup | `task:${TaskStatus}`;

const DAY = 86_400_000;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const CHANNELS: Array<{ value: CalendarChannel; label: string }> = [
  { value: "FACEBOOK_PAGE", label: "Facebook" },
  { value: "INSTAGRAM_ACCOUNT", label: "Instagram" },
  { value: "LINKEDIN_ORGANIZATION", label: "LinkedIn" },
  { value: "GOOGLE_BUSINESS_LOCATION", label: "Google Business" },
  { value: "YOUTUBE_CHANNEL", label: "YouTube" },
  { value: "WHATSAPP", label: "WhatsApp" },
];
const CHANNEL_NAME = { ...Object.fromEntries(CHANNELS.map((c) => [c.value, c.label])), DRAFT: "Draft" } as Record<string, string>;

/** Where each kind of content is managed, so "Open" goes to the right place. */
const SOURCE_PAGE: Record<CalendarPost["source"], string> = { post: "/admin/content", draft: "/admin/content", youtube: "/admin/youtube", whatsapp: "/admin/whatsapp" };

function PostLogo({ post, className }: { post: Pick<CalendarPost, "channel">; className?: string }) {
  if (post.channel === "DRAFT") return <FileText className={cn("text-gray-500", className)} />;
  return <ChannelLogo channel={CHANNEL_NAME[post.channel] ?? post.channel} className={className} />;
}

const STATUS_FILTERS: Array<{ value: CalendarStatusFilter; label: string }> = [
  { value: "scheduled", label: "Scheduled" },
  { value: "published", label: "Published" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "draft", label: "Drafts" },
  { value: "task:pending", label: "Tasks: Pending" },
  { value: "task:in_progress", label: "Tasks: In progress" },
  { value: "task:completed", label: "Tasks: Completed" },
  { value: "task:cancelled", label: "Tasks: Cancelled" },
];

const pad = (n: number) => String(n).padStart(2, "0");
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const sameMonth = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const dateTimeOf = (iso: string) => new Date(iso).toLocaleString([], { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const shortDateTime = (iso: string) => new Date(iso).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const DRAFT_META = { label: "Draft", className: "bg-gray-100 text-gray-600 ring-gray-200", hint: "Not scheduled yet." };

const CHIP: Record<CalendarStatus, string> = {
  DRAFT: "bg-gray-400",
  SCHEDULED: "bg-blue-500",
  PUBLISHING: "bg-amber-500",
  PUBLISHED: "bg-emerald-500",
  FAILED: "bg-red-500",
  OUTCOME_UNKNOWN: "bg-purple-500",
  CANCELLED: "bg-gray-300",
};

const TASK_STATUS: Record<TaskStatus, { label: string; bar: string; pill: string }> = {
  pending: { label: "Pending", bar: "bg-slate-400", pill: "bg-slate-100 text-slate-700 ring-slate-200" },
  in_progress: { label: "In progress", bar: "bg-blue-500", pill: "bg-blue-50 text-blue-700 ring-blue-200" },
  completed: { label: "Completed", bar: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  cancelled: { label: "Cancelled", bar: "bg-gray-300", pill: "bg-gray-100 text-gray-500 ring-gray-200" },
};

function StatusPill({ status }: { status: CalendarStatus }) {
  const meta = status === "DRAFT" ? DRAFT_META : SCHEDULED_POST_STATUS_META[status];
  return <span className={cn("text-[9px] font-semibold px-2 py-1 rounded ring-1 whitespace-nowrap", meta.className)}>{meta.label}</span>;
}

function TaskStatusPill({ status }: { status: TaskStatus }) {
  const meta = TASK_STATUS[status];
  return <span className={cn("whitespace-nowrap rounded px-2 py-1 text-[9px] font-semibold ring-1", meta.pill)}>{meta.label}</span>;
}

function taskDate(task: CrmTask): Date {
  return new Date(`${task.dueDate}T${task.dueTime || "00:00"}:00`);
}

function normalizeCalendarTask(task: Partial<CrmTask>, clientId: string, clientName: string): CalendarTask | null {
  const dueDate = String(task.dueDate ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return null;
  const status = task.status && task.status in TASK_STATUS ? task.status : "pending";
  return {
    id: String(task.id ?? ""),
    title: String(task.title ?? "Untitled task"),
    description: String(task.description ?? ""),
    type: task.type ?? "other",
    priority: task.priority ?? "medium",
    status,
    assigneeId: String(task.assigneeId ?? ""),
    assigneeName: String(task.assigneeName ?? "Unassigned"),
    dueDate,
    dueTime: /^\d{2}:\d{2}$/.test(String(task.dueTime ?? "")) ? String(task.dueTime) : "",
    reminder: String(task.reminder ?? "none"),
    relatedLeadId: task.relatedLeadId,
    relatedLeadName: task.relatedLeadName,
    relatedContactId: task.relatedContactId,
    relatedContactName: task.relatedContactName,
    relatedDealId: task.relatedDealId,
    relatedDealName: task.relatedDealName,
    tags: Array.isArray(task.tags) ? task.tags : [],
    createdAt: String(task.createdAt ?? ""),
    updatedAt: String(task.updatedAt ?? ""),
    completedAt: task.completedAt,
    clientId,
    clientName,
  };
}

function TaskChip({ task, onSelect }: { task: CalendarTask; onSelect?: () => void }) {
  return (
    <Link
      href="/admin/crm/tasks"
      onClick={(event) => { event.stopPropagation(); onSelect?.(); }}
      className="relative flex w-full items-start gap-1.5 overflow-hidden rounded border bg-white px-1.5 py-1 text-left shadow-sm transition-colors hover:border-red-300"
    >
      <span className={cn("absolute inset-y-0 left-0 w-0.5", TASK_STATUS[task.status].bar)} />
      <CalendarDaysIcon className="ml-0.5 mt-0.5 size-3 shrink-0 text-red-600" />
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate text-[10px] font-semibold leading-tight text-gray-900", task.status === "cancelled" && "text-gray-500 line-through")}>{task.title}</span>
        <span className="block text-[9px] text-gray-500">{task.dueTime || "All day"} · {TASK_STATUS[task.status].label}</span>
      </span>
    </Link>
  );
}

/** The content calendar on the real backend: every post scheduled for the Clients you can open. */
export function LiveContentCalendar() {
  const { companyId } = useTenancyContext();
  const today = useMemo(() => startOfDay(new Date()), []);
  const [view, setView] = useState<View>("Month");
  const [cursor, setCursor] = useState<Date>(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<Date>(today);
  const [clientId, setClientId] = useState("");
  const [channel, setChannel] = useState<"" | CalendarChannel>("");
  const [statusFilter, setStatusFilter] = useState<"" | CalendarStatusFilter>("");
  const [campaignId, setCampaignId] = useState("");
  const [personId, setPersonId] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [pickerYear, setPickerYear] = useState(cursor.getFullYear());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [detail, setDetail] = useState<{ post: CalendarPost; confirmCancel: boolean } | null>(null);
  const [calendarTasks, setCalendarTasks] = useState<CalendarTask[]>([]);
  const [taskLoadError, setTaskLoadError] = useState<string | null>(null);
  const [loadedTaskScopeKey, setLoadedTaskScopeKey] = useState("");
  const [taskReloadKey, setTaskReloadKey] = useState(0);

  const first = startOfMonth(cursor);
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const firstDay = getFirstDayIndex();
  const lead = (first.getDay() - firstDay + 7) % 7;
  const weeks = Math.ceil((lead + daysInMonth) / 7);
  const gridStart = addDays(first, -lead);
  const gridEnd = addDays(gridStart, weeks * 7);
  const cells = Array.from({ length: weeks * 7 }, (_, i) => addDays(gridStart, i));

  const contentStatusGroup = statusFilter && !statusFilter.startsWith("task:") ? statusFilter as CalendarStatusGroup : undefined;
  const taskStatus = statusFilter.startsWith("task:") ? statusFilter.slice(5) as TaskStatus : undefined;
  const showContentItems = !taskStatus;
  const filters = { clientId: clientId || undefined, channel: channel || undefined, campaignId: campaignId || undefined, personId: personId || undefined };
  const { data, isLoading, isFetching, error, refetch } = useCalendar({ from: gridStart.toISOString(), to: gridEnd.toISOString(), statusGroup: contentStatusGroup, ...filters, limit: 500 });

  const taskClientsKey = useMemo(() => {
    const clients = clientId ? (data?.clients ?? []).filter((client) => client.id === clientId) : (data?.clients ?? []);
    return JSON.stringify(clients.map((client) => ({ id: client.id, name: client.name })).sort((left, right) => left.id.localeCompare(right.id)));
  }, [clientId, data?.clients]);
  const taskScopeKey = `${companyId}:${taskClientsKey}`;

  useEffect(() => {
    let cancelled = false;
    const taskClients = JSON.parse(taskClientsKey) as Array<{ id: string; name: string }>;
    if (!companyId || taskClients.length === 0) {
      void Promise.resolve().then(() => {
        if (!cancelled) {
          setCalendarTasks([]);
          setTaskLoadError(null);
          setLoadedTaskScopeKey(taskScopeKey);
        }
      });
      return () => { cancelled = true; };
    }

    void Promise.allSettled(
      taskClients.map(async (taskClient) => {
        const rows = await crmApi.list<CrmTask>("task", { companyId, clientId: taskClient.id });
        return rows
          .map((task) => normalizeCalendarTask(task, taskClient.id, taskClient.name))
          .filter((task): task is CalendarTask => task !== null);
      }),
    ).then((results) => {
      if (cancelled) return;
      setCalendarTasks(results.flatMap((result) => result.status === "fulfilled" ? result.value : []));
      const failed = results.filter((result) => result.status === "rejected").length;
      setTaskLoadError(failed > 0 ? `CRM tasks could not be loaded for ${failed} client${failed === 1 ? "" : "s"}.` : null);
      setLoadedTaskScopeKey(taskScopeKey);
    });

    return () => { cancelled = true; };
  }, [companyId, taskClientsKey, taskReloadKey, taskScopeKey]);

  const upcomingWindow = useMemo(() => {
    const from = new Date();
    from.setMinutes(0, 0, 0);
    return { from: from.toISOString(), to: new Date(from.getTime() + 7 * DAY).toISOString() };
  }, []);
  const upcoming = useCalendar({ ...upcomingWindow, statusGroup: "scheduled", ...filters, limit: 6 });

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarPost[]>();
    for (const post of showContentItems ? (data?.items ?? []) : []) {
      const key = dayKey(new Date(post.scheduledFor));
      const list = map.get(key) ?? [];
      list.push(post);
      map.set(key, list);
    }
    return map;
  }, [data, showContentItems]);

  const scopedPersonId = personId || (!data?.scope.seesEveryone ? data?.scope.viewingPersonId ?? "" : "");
  const showTasksForContentFilters = !channel && !campaignId && !contentStatusGroup;
  const scopedCalendarTasks = useMemo(
    () => loadedTaskScopeKey === taskScopeKey ? calendarTasks : [],
    [calendarTasks, loadedTaskScopeKey, taskScopeKey],
  );
  const personScopedTasks = useMemo(
    () => scopedCalendarTasks.filter((task) => !scopedPersonId || task.assigneeId === scopedPersonId),
    [scopedCalendarTasks, scopedPersonId],
  );
  const visibleCalendarTasks = useMemo(
    () => personScopedTasks.filter((task) => showTasksForContentFilters && (!taskStatus || task.status === taskStatus)),
    [personScopedTasks, showTasksForContentFilters, taskStatus],
  );

  const tasksByDay = useMemo(() => {
    const map = new Map<string, CalendarTask[]>();
    for (const task of visibleCalendarTasks) {
      const list = map.get(task.dueDate) ?? [];
      list.push(task);
      list.sort((left, right) => (left.dueTime || "00:00").localeCompare(right.dueTime || "00:00"));
      map.set(task.dueDate, list);
    }
    return map;
  }, [visibleCalendarTasks]);

  const weekStart = addDays(startOfDay(selected), -((selected.getDay() - firstDay + 7) % 7));
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const selectedPosts = byDay.get(dayKey(selected)) ?? [];
  const selectedTasks = tasksByDay.get(dayKey(selected)) ?? [];
  const monthPosts = (showContentItems ? (data?.items ?? []) : []).filter((p) => sameMonth(new Date(p.scheduledFor), cursor));
  const monthTasks = visibleCalendarTasks.filter((task) => sameMonth(taskDate(task), cursor));
  const monthItems = [
    ...monthPosts.map((post) => ({ kind: "post" as const, at: new Date(post.scheduledFor), post })),
    ...monthTasks.map((task) => ({ kind: "task" as const, at: taskDate(task), task })),
  ].sort((left, right) => left.at.getTime() - right.at.getTime());
  const upcomingTasks = visibleCalendarTasks
    .filter((task) => {
      const due = taskDate(task).getTime();
      const from = new Date(upcomingWindow.from).getTime();
      const to = new Date(upcomingWindow.to).getTime();
      return due >= from && due < to;
    })
    .sort((left, right) => taskDate(left).getTime() - taskDate(right).getTime())
    .slice(0, 6);
  const taskStatusCounts = useMemo(() => ({
    pending: personScopedTasks.filter((task) => task.status === "pending").length,
    in_progress: personScopedTasks.filter((task) => task.status === "in_progress").length,
    completed: personScopedTasks.filter((task) => task.status === "completed").length,
    cancelled: personScopedTasks.filter((task) => task.status === "cancelled").length,
  }), [personScopedTasks]);
  const taskActivity = visibleCalendarTasks
    .map((task) => ({
      id: `task:${task.id}`,
      at: task.completedAt || task.updatedAt || task.createdAt,
      label: `CRM task: ${task.title}`,
      actor: task.assigneeName && task.assigneeName !== "Unassigned" ? `Assigned to ${task.assigneeName}` : "Unassigned",
      clientName: task.clientName,
      outcome: "SUCCESS" as const,
    }))
    .filter((entry) => {
      const at = new Date(entry.at).getTime();
      return Number.isFinite(at) && at >= gridStart.getTime() && at < gridEnd.getTime();
    });
  const calendarActivity = [
    ...(data?.activity ?? []),
    ...taskActivity,
  ].sort((left, right) => right.at.localeCompare(left.at));
  const campaigns = (data?.campaigns ?? []).filter((c) => !clientId || c.clientId === clientId);
  const peopleOptions = useMemo(() => {
    const people = new Map((data?.people ?? []).map((person) => [person.id, person.name]));
    for (const task of scopedCalendarTasks) {
      if (task.assigneeId) people.set(task.assigneeId, task.assigneeName || "Unnamed member");
    }
    return [...people].map(([id, name]) => ({ value: id, label: name })).sort((left, right) => left.label.localeCompare(right.label));
  }, [data?.people, scopedCalendarTasks]);
  const activeFilters = [clientId, channel, statusFilter, campaignId, personId].filter(Boolean).length;

  const goTo = (date: Date) => {
    setSelected(date);
    setCursor(startOfMonth(date));
  };
  const step = (direction: -1 | 1) => {
    if (view === "Week") goTo(addDays(selected, direction * 7));
    else {
      const next = addMonths(cursor, direction);
      setCursor(next);
      setSelected(sameMonth(today, next) ? today : next);
    }
  };
  const resetFilters = () => {
    setClientId("");
    setChannel("");
    setStatusFilter("");
    setCampaignId("");
    setPersonId("");
  };
  const changeStatusFilter = (value: "" | CalendarStatusFilter) => {
    if (value.startsWith("task:")) {
      setChannel("");
      setCampaignId("");
    }
    setStatusFilter(value);
  };
  const changeChannel = (value: "" | CalendarChannel) => {
    if (value && statusFilter.startsWith("task:")) setStatusFilter("");
    setChannel(value);
  };
  const changeCampaign = (value: string) => {
    if (value && statusFilter.startsWith("task:")) setStatusFilter("");
    setCampaignId(value);
  };

  const title =
    view === "Week"
      ? `${weekStart.toLocaleDateString([], { day: "numeric", month: "short" })} – ${addDays(weekStart, 6).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" })}`
      : `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
  const isToday = (d: Date) => dayKey(d) === dayKey(today);

  const counts = data?.counts;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="space-y-1 max-w-[1500px] mx-auto pb-6">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
        <div>
          <div className="text-[11px] text-muted-foreground flex items-center mb-1">
            <span>Dashboard</span>
            <ChevronRight className="mx-1 h-3 w-3" />
            <strong className="text-foreground font-semibold">Calendar</strong>
          </div>
          <h1 className="text-[26px] font-semibold tracking-tight text-foreground">Content Calendar</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Plan, schedule and track your content across all channels. Times are shown in {timeZone}.</p>
        </div>

        <div className="hidden md:flex relative h-[68px] w-[420px] rounded-sm bg-gradient-to-r from-red-50 to-red-100 overflow-hidden items-center px-5 border border-red-100/50 shadow-sm">
          <div className="relative z-10">
            <h3 className="text-[13px] font-semibold text-gray-900 leading-tight">Consistency today.</h3>
            <h3 className="text-[13px] font-semibold text-gray-900 leading-tight mb-1.5">A stronger tomorrow.</h3>
            <div className="w-10 h-[3px] bg-[#EB0711] rounded-sm" />
          </div>
          <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2 opacity-90">
            <div className="w-[52px] h-[52px] bg-white rounded-sm shadow-sm border border-red-100 flex flex-col overflow-hidden relative">
              <div className="h-3.5 bg-[#EB0711]" />
              <div className="flex-1 grid grid-cols-3 gap-[1px] p-1 bg-gray-50">
                {Array.from({ length: 9 }).map((_, i) => <div key={i} className="bg-white rounded-[1px] shadow-sm" />)}
              </div>
            </div>
          </div>
          <div className="absolute right-0 top-0 w-32 h-32 bg-gradient-to-bl from-red-200/40 to-transparent rounded-sm -translate-y-1/2 translate-x-1/4" />
        </div>
      </div>

      <div className="grid gap-1 lg:grid-cols-[1fr_280px] xl:grid-cols-[1fr_300px] items-start">
        <div className="space-y-1">
          <section className="rounded-sm border bg-white shadow-sm overflow-hidden">
            <div className="flex flex-wrap items-center justify-between border-b p-3 bg-white gap-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-sm border shadow-sm overflow-hidden h-9">
                  <button aria-label="Previous" onClick={() => step(-1)} className="grid px-2 h-full place-items-center hover:bg-gray-50 border-r text-gray-600 transition-colors"><ChevronLeft className="size-4" /></button>
                  <button aria-label="Next" onClick={() => step(1)} className="grid px-2 h-full place-items-center hover:bg-gray-50 text-gray-600 transition-colors"><ChevronRight className="size-4" /></button>
                </div>
                <button onClick={() => goTo(today)} className="h-9 rounded-sm border px-4 text-[12px] font-semibold shadow-sm hover:bg-gray-50 text-gray-700 transition-colors">Today</button>
              </div>

              <Popover open={pickerOpen} onOpenChange={(open) => { setPickerOpen(open); if (open) setPickerYear(cursor.getFullYear()); }}>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-2 cursor-pointer hover:opacity-80" aria-label="Pick month">
                    <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
                    <ChevronDown className="size-4 text-gray-500" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" align="center">
                  <div className="mb-2 flex items-center justify-between">
                    <button aria-label="Previous year" onClick={() => setPickerYear((y) => y - 1)} className="size-7 grid place-items-center rounded hover:bg-gray-100"><ChevronLeft className="size-4" /></button>
                    <b className="text-sm">{pickerYear}</b>
                    <button aria-label="Next year" onClick={() => setPickerYear((y) => y + 1)} className="size-7 grid place-items-center rounded hover:bg-gray-100"><ChevronRight className="size-4" /></button>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {MONTHS.map((name, index) => (
                      <button
                        key={name}
                        onClick={() => {
                          const next = new Date(pickerYear, index, 1);
                          setCursor(next);
                          setSelected(sameMonth(today, next) ? today : next);
                          setPickerOpen(false);
                        }}
                        className={cn("rounded px-2 py-1.5 text-xs font-medium hover:bg-gray-100", index === cursor.getMonth() && pickerYear === cursor.getFullYear() && "bg-[#EB0711] text-white hover:bg-[#EB0711]")}
                      >
                        {name.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <div className="flex items-center gap-3">
                <div className="flex rounded-sm bg-gray-100 p-0.5 h-9">
                  {(["Month", "Week", "List"] as const).map((item) => (
                    <button
                      key={item}
                      onClick={() => setView(item)}
                      className={cn("rounded-sm px-4 text-[12px] font-semibold transition-all", view === item ? "bg-[#EB0711] text-white shadow-sm" : "text-gray-600 hover:text-gray-900")}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowFilters((v) => !v)}
                  aria-pressed={showFilters}
                  className="flex h-9 items-center gap-1.5 rounded-sm border px-3 text-[12px] font-semibold shadow-sm hover:bg-gray-50 text-gray-700 transition-colors"
                >
                  <Filter className="size-3.5" /> Filters{activeFilters > 0 ? ` (${activeFilters})` : ""}
                </button>
              </div>
            </div>

            {error && !data ? (
              <div className="grid h-60 place-items-center text-center">
                <div className="space-y-2">
                  <p className="text-[13px] font-semibold text-gray-800">The calendar could not be loaded.</p>
                  <p className="text-xs text-gray-500">{error instanceof Error ? error.message : "Something went wrong."}</p>
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => void refetch()}>Try again</Button>
                </div>
              </div>
            ) : isLoading ? (
              <div className="grid h-60 place-items-center text-[12px] text-gray-500">Loading the calendar...</div>
            ) : (
              <>
                {data?.truncated && (
                  <p className="border-b bg-amber-50 px-3 py-1.5 text-[11px] font-medium text-amber-800">
                    Showing the first {data.items.length} of {data.total} posts. Use the filters to narrow it down.
                  </p>
                )}
                {taskLoadError && loadedTaskScopeKey === taskScopeKey && (
                  <p className="flex items-center justify-between gap-3 border-b bg-amber-50 px-3 py-1.5 text-[11px] font-medium text-amber-800">
                    <span>{taskLoadError} Content calendar data is still available.</span>
                    <button className="shrink-0 font-semibold underline" onClick={() => setTaskReloadKey((key) => key + 1)}>Retry tasks</button>
                  </p>
                )}

                {view === "Month" && (
                  <>
                    <div className="grid grid-cols-7 border-b bg-[#FDFDFD]">
                      {[...WEEKDAYS.slice(firstDay), ...WEEKDAYS.slice(0, firstDay)].map((day) => (
                        <div key={day} className="px-2 py-2.5 text-center text-[11px] font-semibold text-gray-500">{day}</div>
                      ))}
                    </div>
                    <div className={cn("grid grid-cols-7", isFetching && "opacity-70")}>
                      {cells.map((day) => {
                        const posts = byDay.get(dayKey(day)) ?? [];
                        const tasks = tasksByDay.get(dayKey(day)) ?? [];
                        const visiblePosts = posts.slice(0, tasks.length > 0 ? 2 : 3);
                        const visibleTasks = tasks.slice(0, 3 - visiblePosts.length);
                        const hiddenCount = posts.length + tasks.length - visiblePosts.length - visibleTasks.length;
                        const inMonth = sameMonth(day, cursor);
                        const isSelected = dayKey(day) === dayKey(selected);
                        return (
                          <div
                            key={dayKey(day)}
                            onClick={() => setSelected(day)}
                            className={cn("min-h-[96px] border-b border-r p-1.5 relative cursor-pointer transition-colors", isSelected ? "bg-red-50/30" : "hover:bg-gray-50/50", !inMonth && "bg-gray-50/40")}
                          >
                            <div className={cn("text-[11px] font-semibold mb-1 ml-1", inMonth ? "text-gray-700" : "text-gray-400", isToday(day) && "text-[#EB0711]")}>{day.getDate()}</div>
                            {isToday(day) && <div className="absolute inset-0 border-[1.5px] border-[#EB0711] pointer-events-none" />}
                            <div className="space-y-1">
                              {visiblePosts.map((post) => (
                                <button
                                  key={post.id}
                                  onClick={(e) => { e.stopPropagation(); setSelected(day); setDetail({ post, confirmCancel: false }); }}
                                  className="w-full text-left rounded border bg-white px-1.5 py-1 flex items-start gap-1.5 shadow-sm hover:border-blue-300 transition-colors relative overflow-hidden"
                                >
                                  <div className={cn("absolute left-0 top-0 bottom-0 w-0.5", CHIP[post.status])} />
                                  <PostLogo post={post} className="size-3 mt-0.5 shrink-0 ml-0.5" />
                                  <div className="min-w-0 flex-1">
                                    <p className={cn("truncate text-[10px] font-semibold text-gray-900 leading-tight", post.status === "CANCELLED" && "line-through text-gray-500")}>{post.title}</p>
                                    <p className="text-[9px] text-gray-500">{timeOf(post.scheduledFor)}</p>
                                  </div>
                                </button>
                              ))}
                              {visibleTasks.map((task) => <TaskChip key={task.id} task={task} onSelect={() => setSelected(day)} />)}
                              {hiddenCount > 0 && (
                                <button onClick={(e) => { e.stopPropagation(); setSelected(day); }} className="text-[10px] font-semibold text-[#EB0711] hover:underline ml-1">
                                  +{hiddenCount} more
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {view === "Week" && (
                  <div className={cn("grid grid-cols-7", isFetching && "opacity-70")}>
                    {weekDays.map((day) => {
                      const posts = byDay.get(dayKey(day)) ?? [];
                      const tasks = tasksByDay.get(dayKey(day)) ?? [];
                      return (
                        <div key={dayKey(day)} onClick={() => setSelected(day)} className={cn("min-h-[300px] border-r p-1.5 cursor-pointer", dayKey(day) === dayKey(selected) && "bg-red-50/30")}>
                          <div className={cn("mb-2 text-center text-[11px] font-semibold", isToday(day) ? "text-[#EB0711]" : "text-gray-600")}>
                            {WEEKDAYS[day.getDay()]} {day.getDate()}
                          </div>
                          <div className="space-y-1">
                            {posts.length === 0 && tasks.length === 0 && <p className="pt-6 text-center text-[10px] text-gray-400">Nothing scheduled</p>}
                            {posts.map((post) => (
                              <button
                                key={post.id}
                                onClick={(e) => { e.stopPropagation(); setDetail({ post, confirmCancel: false }); }}
                                className="w-full text-left rounded border bg-white px-1.5 py-1.5 flex items-start gap-1.5 shadow-sm hover:border-blue-300 relative overflow-hidden"
                              >
                                <div className={cn("absolute left-0 top-0 bottom-0 w-0.5", CHIP[post.status])} />
                                <PostLogo post={post} className="size-3 mt-0.5 shrink-0 ml-0.5" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-[10px] font-semibold text-gray-900 leading-tight break-words">{post.title}</p>
                                  <p className="text-[9px] text-gray-500">{timeOf(post.scheduledFor)} · {post.clientName ?? ""}</p>
                                </div>
                              </button>
                            ))}
                            {tasks.map((task) => <TaskChip key={task.id} task={task} onSelect={() => setSelected(day)} />)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {view === "List" && (
                  <div className={cn("divide-y", isFetching && "opacity-70")}>
                    {monthItems.length === 0 ? (
                      <p className="px-3 py-12 text-center text-[12px] text-gray-500">No posts or tasks in {MONTHS[cursor.getMonth()]} {cursor.getFullYear()} match these filters.</p>
                    ) : (
                      monthItems.map((item) => item.kind === "post" ? (
                        <button key={`post:${item.post.id}`} onClick={() => setDetail({ post: item.post, confirmCancel: false })} className="grid w-full grid-cols-[120px_1fr_90px] sm:grid-cols-[130px_1fr_130px_90px] items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50">
                          <span className="text-[11px] font-medium text-gray-600 tabular-nums">{shortDateTime(item.post.scheduledFor)}</span>
                          <span className="flex min-w-0 items-center gap-2">
                            <PostLogo post={item.post} className="size-4 shrink-0" />
                            <span className="min-w-0">
                              <b className="block truncate text-[12px] font-semibold text-gray-900">{item.post.title}</b>
                              <small className="block truncate text-[10px] text-gray-500">{item.post.clientName ?? ""}{item.post.campaignName ? ` · ${item.post.campaignName}` : ""}</small>
                            </span>
                          </span>
                          <span className="hidden truncate text-[11px] text-gray-600 sm:block">{CHANNEL_NAME[item.post.channel] ?? item.post.channel}</span>
                          <StatusPill status={item.post.status} />
                        </button>
                      ) : (
                        <Link key={`task:${item.task.id}`} href="/admin/crm/tasks" className="grid w-full grid-cols-[120px_1fr_90px] sm:grid-cols-[130px_1fr_130px_90px] items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50">
                          <span className="text-[11px] font-medium text-gray-600 tabular-nums">{item.at.toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                          <span className="flex min-w-0 items-center gap-2">
                            <CalendarDaysIcon className="size-4 shrink-0 text-red-600" />
                            <span className="min-w-0">
                              <b className="block truncate text-[12px] font-semibold text-gray-900">{item.task.title}</b>
                              <small className="block truncate text-[10px] text-gray-500">{item.task.clientName}</small>
                            </span>
                          </span>
                          <span className="hidden truncate text-[11px] text-gray-600 sm:block">CRM Task</span>
                          <TaskStatusPill status={item.task.status} />
                        </Link>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </section>

          <div className="grid gap-1 lg:grid-cols-[1.5fr_1fr] lg:items-stretch">
            <div className="flex min-h-0 flex-col overflow-hidden rounded-sm border bg-white p-3 shadow-sm lg:h-[260px]">
              <div className="mb-3 flex shrink-0 items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-[14px] font-semibold text-foreground">
                    {isToday(selected) ? "Today's Schedule" : selected.toLocaleDateString([], { weekday: "long", day: "numeric", month: "short" })}
                  </h2>
                  <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-sm bg-gray-100 text-[10px] font-semibold text-gray-700">{selectedPosts.length + selectedTasks.length}</span>
                </div>
                <button onClick={() => setView("List")} className="text-[11px] font-semibold text-[#EB0711] hover:underline flex items-center gap-1">View all &rarr;</button>
              </div>

              {selectedPosts.length === 0 && selectedTasks.length === 0 ? (
                <div className="grid min-h-0 flex-1 place-items-center overflow-y-auto">
                  <p className="py-8 text-center text-[12px] text-gray-500">Nothing is scheduled for this day.</p>
                </div>
              ) : (
                <div className="min-h-0 flex-1 overflow-auto rounded-sm border border-gray-200">
                  <table className="w-full min-w-[680px] table-fixed text-left">
                    <colgroup>
                      <col className="w-[72px]" />
                      <col />
                      <col className="w-[72px]" />
                      <col className="w-[132px]" />
                      <col className="w-[92px]" />
                      <col className="w-[76px]" />
                    </colgroup>
                    <thead className="sticky top-0 z-10 bg-gray-50">
                      <tr className="border-b text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                        <th className="px-2.5 py-2 font-medium">Time</th>
                        <th className="px-2.5 py-2 font-medium">Content</th>
                        <th className="px-2.5 py-2 text-center font-medium">Type</th>
                        <th className="px-2.5 py-2 font-medium">Client</th>
                        <th className="px-2.5 py-2 font-medium">Status</th>
                        <th className="px-2.5 py-2 text-right font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-[12px]">
                      {selectedPosts.map((post) => (
                        <tr key={post.id} className="transition-colors hover:bg-gray-50/80">
                          <td className="whitespace-nowrap px-2.5 py-3 text-[11px] font-medium tabular-nums text-gray-600">{timeOf(post.scheduledFor)}</td>
                          <td className="min-w-0 px-2.5 py-3">
                            <p className="truncate text-[11px] font-semibold text-gray-900" title={post.title}>{post.title}</p>
                            {post.campaignName && <p className="mt-0.5 truncate text-[10px] text-gray-500" title={post.campaignName}>{post.campaignName}</p>}
                          </td>
                          <td className="px-2.5 py-3"><span className="flex justify-center"><PostLogo post={post} className="size-4" /></span></td>
                          <td className="truncate px-2.5 py-3 text-[11px] text-gray-600" title={post.clientName ?? undefined}>{post.clientName ?? "—"}</td>
                          <td className="px-2.5 py-3"><StatusPill status={post.status} /></td>
                          <td className="px-2.5 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => setDetail({ post, confirmCancel: false })} className="text-[10px] font-semibold text-gray-600 border rounded px-2 py-1 hover:bg-gray-50">View</button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button aria-label="More actions" className="border rounded p-1 hover:bg-gray-50 text-gray-500"><MoreVertical className="size-3.5" /></button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem className="text-xs" onClick={() => setDetail({ post, confirmCancel: false })}>View details</DropdownMenuItem>
                                  <OpenStudioItem post={post} />
                                  {post.canCancel && <DropdownMenuItem className="text-xs text-red-600" onClick={() => setDetail({ post, confirmCancel: true })}>Cancel post</DropdownMenuItem>}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {selectedTasks.map((task) => (
                        <tr key={`task:${task.id}`} className="transition-colors hover:bg-gray-50/80">
                          <td className="whitespace-nowrap px-2.5 py-3 text-[11px] font-medium tabular-nums text-gray-600">{task.dueTime || "All day"}</td>
                          <td className="min-w-0 px-2.5 py-3">
                            <p className="truncate text-[11px] font-semibold text-gray-900" title={task.title}>{task.title}</p>
                            {task.description && <p className="mt-0.5 truncate text-[10px] text-gray-500" title={task.description}>{task.description}</p>}
                          </td>
                          <td className="px-2.5 py-3"><span className="flex justify-center"><CalendarDaysIcon className="size-4 text-red-600" /></span></td>
                          <td className="truncate px-2.5 py-3 text-[11px] text-gray-600" title={task.clientName}>{task.clientName}</td>
                          <td className="px-2.5 py-3"><TaskStatusPill status={task.status} /></td>
                          <td className="px-2.5 py-3 text-right">
                            <Link href="/admin/crm/tasks" className="inline-flex h-7 items-center rounded-sm border px-2.5 text-[10px] font-semibold text-gray-700 transition-colors hover:bg-gray-50">View</Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex min-h-0 flex-col lg:h-[260px]">
              <h2 className="mb-3 shrink-0 text-[14px] font-semibold text-foreground">Quick Actions</h2>
              <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-1">
                <Link href="/admin/content" className="text-left p-3.5 rounded-sm bg-[#FFF1F2] hover:bg-red-100/80 transition-colors border border-red-100">
                  <Edit2 className="size-4 text-red-600 mb-2.5" />
                  <p className="text-[12px] font-semibold text-red-900">Create Post</p>
                  <p className="text-[10px] text-red-700/70 leading-tight mt-0.5">Design and schedule content</p>
                </Link>
                <Link href="/admin/campaigns" className="text-left p-3.5 rounded-sm bg-blue-50 hover:bg-blue-100/80 transition-colors border border-blue-100">
                  <Megaphone className="size-4 text-blue-600 mb-2.5" />
                  <p className="text-[12px] font-semibold text-blue-900">Plan Campaign</p>
                  <p className="text-[10px] text-blue-700/70 leading-tight mt-0.5">Create a multi-channel campaign</p>
                </Link>
                <Link href="/admin/media" className="text-left p-3.5 rounded-sm bg-emerald-50 hover:bg-emerald-100/80 transition-colors border border-emerald-100">
                  <ImageIcon className="size-4 text-emerald-600 mb-2.5" />
                  <p className="text-[12px] font-semibold text-emerald-900">Upload Media</p>
                  <p className="text-[10px] text-emerald-700/70 leading-tight mt-0.5">Add images, videos or files</p>
                </Link>
                <Link href="/admin/reports" className="text-left p-3.5 rounded-sm bg-purple-50 hover:bg-purple-100/80 transition-colors border border-purple-100">
                  <BarChart2 className="size-4 text-purple-600 mb-2.5" />
                  <p className="text-[12px] font-semibold text-purple-900">View Reports</p>
                  <p className="text-[10px] text-purple-700/70 leading-tight mt-0.5">See content performance</p>
                </Link>
              </div>
            </div>
          </div>
          <div className="flex h-[410px] min-h-0 flex-col overflow-hidden rounded-sm border bg-white p-3 shadow-sm">
            <div className="mb-3 flex shrink-0 items-center justify-between">
              <h2 className="text-[14px] font-semibold text-foreground">Activity Log</h2>
              <span className="text-[10px] text-gray-500">Who did what, and when, in the visible calendar.</span>
            </div>
            {calendarActivity.length === 0 ? (
              <div className="grid min-h-0 flex-1 place-items-center">
                <p className="text-center text-[12px] text-gray-500">No content or CRM task activity was recorded in this period.</p>
              </div>
            ) : (
              <div className="min-h-0 flex-1 divide-y overflow-y-auto pr-1">
                {calendarActivity.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-3 py-2 text-[12px]">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900">{a.label}{a.outcome === "FAILURE" ? " (failed)" : ""}</p>
                      <p className="truncate text-[10px] text-gray-500">{a.actor}{a.clientName ? ` · ${a.clientName}` : ""}</p>
                    </div>
                    <span className="shrink-0 text-[10px] font-medium text-gray-500 tabular-nums">{dateTimeOf(a.at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <div className="bg-white rounded-sm border shadow-sm p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-semibold text-gray-900">{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</h3>
              <div className="flex items-center gap-1">
                <button aria-label="Previous month" onClick={() => { const n = addMonths(cursor, -1); setCursor(n); setSelected(sameMonth(today, n) ? today : n); }} className="size-6 flex items-center justify-center hover:bg-gray-100 rounded text-gray-500"><ChevronLeft className="size-3.5" /></button>
                <button aria-label="Next month" onClick={() => { const n = addMonths(cursor, 1); setCursor(n); setSelected(sameMonth(today, n) ? today : n); }} className="size-6 flex items-center justify-center hover:bg-gray-100 rounded text-gray-500"><ChevronRight className="size-3.5" /></button>
              </div>
            </div>
            <div className="grid grid-cols-7 mb-2">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => <div key={d} className="text-center text-[10px] font-semibold text-gray-500">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-y-1">
              {cells.map((day) => {
                const inMonth = sameMonth(day, cursor);
                const isSelected = dayKey(day) === dayKey(selected);
                const has = (byDay.get(dayKey(day))?.length ?? 0) > 0 || (tasksByDay.get(dayKey(day))?.length ?? 0) > 0;
                return (
                  <div key={dayKey(day)} className="flex justify-center py-0.5">
                    <button
                      onClick={() => goTo(day)}
                      className={cn("relative size-6 rounded-sm text-[11px] font-medium flex items-center justify-center", isSelected ? "bg-[#EB0711] text-white font-semibold shadow-sm" : inMonth ? "text-gray-700 hover:bg-gray-100" : "text-gray-300 hover:bg-gray-100", isToday(day) && !isSelected && "ring-1 ring-[#EB0711]")}
                    >
                      {day.getDate()}
                      {has && <span className={cn("absolute bottom-0.5 size-1 rounded-full", isSelected ? "bg-white" : "bg-blue-500")} />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {showFilters && (
            <div className="bg-white rounded-sm border shadow-sm p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[13px] font-semibold text-gray-900">Filters</h3>
                <button onClick={resetFilters} disabled={activeFilters === 0} className="text-[11px] font-semibold text-[#EB0711] hover:underline disabled:text-gray-400 disabled:no-underline">Reset</button>
              </div>
              <div className="space-y-3">
                <FilterSelect label="Client" value={clientId} onChange={(v) => { setClientId(v); setCampaignId(""); }} options={(data?.clients ?? []).map((c) => ({ value: c.id, label: c.name }))} all="All Clients" />
                <FilterSelect label="Channel" value={channel} onChange={(v) => changeChannel(v as "" | CalendarChannel)} options={CHANNELS} all="All Channels" />
                <FilterSelect label="Status" value={statusFilter} onChange={(v) => changeStatusFilter(v as "" | CalendarStatusFilter)} options={STATUS_FILTERS} all="All Status" />
                {data?.scope.seesEveryone ? (
                  <FilterSelect label="Person" value={personId} onChange={setPersonId} options={peopleOptions} all="Everyone" />
                ) : (
                  <p className="text-[11px] text-gray-500">Showing only your own work.</p>
                )}
                <FilterSelect label="Campaign" value={campaignId} onChange={changeCampaign} options={campaigns.map((c) => ({ value: c.id, label: c.name }))} all="All Campaigns" />
              </div>
            </div>
          )}

          <div className="bg-white rounded-sm border shadow-sm p-3">
            <h3 className="text-[13px] font-semibold text-gray-900 mb-2.5">Content Status</h3>
            <p className="mb-2 text-[10px] text-gray-500">Posts in the visible calendar.</p>
            <div className="space-y-2">
              {(
                [
                  ["scheduled", "Scheduled", "bg-blue-500", counts?.scheduled],
                  ["published", "Published", "bg-emerald-500", counts?.published],
                  ["failed", "Failed", "bg-red-500", counts?.failed],
                  ["cancelled", "Cancelled", "bg-gray-300", counts?.cancelled],
                  ["draft", "Drafts", "bg-gray-500", counts?.draftsInView],
                ] as const
              ).map(([value, label, dot, n]) => (
                <button
                  key={value}
                  onClick={() => setStatusFilter((current) => (current === value ? "" : value))}
                  className={cn("flex w-full items-center justify-between rounded px-1 py-0.5 text-[12px] hover:bg-gray-50", statusFilter === value && "bg-gray-100")}
                >
                  <span className="flex items-center gap-2 text-gray-700 font-medium"><span className={cn("size-2 rounded-sm", dot)} /> {label}</span>
                  <span className="font-semibold">{n ?? 0}</span>
                </button>
              ))}
              <p className="px-1 pt-1 text-[10px] text-gray-500">{counts?.drafts ?? 0} drafts in total, {counts?.draftsPendingReview ?? 0} waiting for review.</p>
              <div className="border-t pt-2">
                <p className="mb-1 text-[10px] font-semibold text-gray-600">CRM Tasks</p>
                {(
                  [
                    ["pending", "Pending", "bg-slate-400", taskStatusCounts.pending],
                    ["in_progress", "In progress", "bg-blue-500", taskStatusCounts.in_progress],
                    ["completed", "Completed", "bg-emerald-500", taskStatusCounts.completed],
                    ["cancelled", "Cancelled", "bg-gray-300", taskStatusCounts.cancelled],
                  ] as const
                ).map(([value, label, dot, n]) => {
                  const filterValue = `task:${value}` as CalendarStatusFilter;
                  return (
                    <button
                      key={value}
                      onClick={() => changeStatusFilter(statusFilter === filterValue ? "" : filterValue)}
                      className={cn("flex w-full items-center justify-between rounded px-1 py-0.5 text-[12px] hover:bg-gray-50", statusFilter === filterValue && "bg-gray-100")}
                    >
                      <span className="flex items-center gap-2 font-medium text-gray-700"><span className={cn("size-2 rounded-sm", dot)} /> {label}</span>
                      <span className="font-semibold">{n}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex h-[248px] min-h-0 flex-col overflow-hidden rounded-sm border bg-white p-3 shadow-sm">
            <div className="mb-3 flex shrink-0 items-center justify-between">
              <h3 className="text-[13px] font-semibold text-gray-900">Upcoming (Next 7 Days)</h3>
              <button onClick={() => { goTo(today); setStatusFilter(""); setView("List"); }} className="text-[11px] font-semibold text-[#EB0711] hover:underline flex items-center gap-0.5">View all &rarr;</button>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
              {(showContentItems ? (upcoming.data?.items ?? []).length : 0) === 0 && upcomingTasks.length === 0 && <p className="grid h-full place-items-center text-center text-[12px] text-gray-500">{upcoming.isLoading ? "Loading..." : "Nothing is scheduled in the next 7 days."}</p>}
              {(showContentItems ? (upcoming.data?.items ?? []) : []).map((post) => (
                <button key={post.id} onClick={() => setDetail({ post, confirmCancel: false })} className="flex w-full items-start gap-3 text-left">
                  <PostLogo post={post} className="size-5 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-semibold text-gray-900 leading-tight">{post.title}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{CHANNEL_NAME[post.channel] ?? post.channel} • {shortDateTime(post.scheduledFor)}</p>
                  </div>
                </button>
              ))}
              {upcomingTasks.map((task) => (
                <Link key={task.id} href="/admin/crm/tasks" className="flex w-full items-start gap-3 text-left">
                  <CalendarDaysIcon className="size-5 shrink-0 mt-0.5 text-red-600" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-gray-900 leading-tight">{task.title}</p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className="truncate text-[10px] text-gray-500">CRM Task · {taskDate(task).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                      <TaskStatusPill status={task.status} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <PostDetailsDialog
        key={detail ? `${detail.post.id}:${detail.confirmCancel}` : "closed"}
        detail={detail}
        onClose={() => setDetail(null)}
      />
    </div>
  );
}

function FilterSelect({ label, value, onChange, options, all }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; all: string }) {
  return (
    <div>
      <label className="text-[11px] text-gray-500 mb-1 block">{label}</label>
      <div className="relative">
        <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full text-[12px] font-medium h-8 rounded-sm border border-gray-200 px-2.5 outline-none focus:border-gray-300 bg-white appearance-none">
          <option value="">{all}</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown className="size-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}

/** Opens Content Studio on the post's Client so the draft can be edited or re-scheduled there. */
function OpenStudioItem({ post }: { post: CalendarPost }) {
  const { setClientId } = useTenancyContext();
  return (
    <DropdownMenuItem asChild className="text-xs">
      <Link href={SOURCE_PAGE[post.source]} onClick={() => setClientId(post.clientId)}>{post.source === "youtube" ? "Open YouTube" : post.source === "whatsapp" ? "Open WhatsApp" : "Open in Content Studio"}</Link>
    </DropdownMenuItem>
  );
}

function PostDetailsDialog({ detail, onClose }: { detail: { post: CalendarPost; confirmCancel: boolean } | null; onClose: () => void }) {
  return (
    <Dialog open={detail !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[92dvh] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">{detail && <PostDetailsBody post={detail.post} startConfirm={detail.confirmCancel} onClose={onClose} />}</DialogContent>
    </Dialog>
  );
}

function PostDetailsBody({ post, startConfirm, onClose }: { post: CalendarPost; startConfirm: boolean; onClose: () => void }) {
  const cancel = useCancelScheduledPost();
  const { setClientId } = useTenancyContext();
  const [confirming, setConfirming] = useState(startConfirm);
  const reason = describeScheduleErrorCode(post.failureCode) ?? describeScheduleErrorCode(post.lastErrorCode);
  const meta = post.status === "DRAFT" ? DRAFT_META : SCHEDULED_POST_STATUS_META[post.status];

  const rows: Array<[string, string]> = [
    ["Client", post.clientName ?? "—"],
    ["Channel", `${CHANNEL_NAME[post.channel] ?? post.channel}${post.accountName ? ` · ${post.accountName}` : ""}`],
    [post.source === "draft" ? "Last edited" : "When", dateTimeOf(post.scheduledFor)],
    ...(post.publishedAt ? ([["Published at", dateTimeOf(post.publishedAt)]] as Array<[string, string]>) : []),
    ...(post.cancelledAt ? ([["Cancelled at", dateTimeOf(post.cancelledAt)]] as Array<[string, string]>) : []),
    ["Campaign", post.campaignName ?? "None"],
    ["Media", post.mediaCount === 0 ? "None" : `${post.mediaCount} file${post.mediaCount === 1 ? "" : "s"}`],
    [post.source === "draft" ? "Drafted by" : "Created by", post.createdBy ?? "Not recorded"],
    ["Created on", dateTimeOf(post.createdAt)],
    ...(post.reviewStatus ? ([["Review", post.reviewStatus.replace(/_/g, " ").toLowerCase()]] as Array<[string, string]>) : []),
    ...(post.attemptCount > 0 ? ([["Attempts", String(post.attemptCount)]] as Array<[string, string]>) : []),
  ];

  const confirmCancel = () => {
    cancel.mutate(
      { clientId: post.clientId, postId: post.id },
      {
        onSuccess: () => {
          toast.success("The post was cancelled and will not be published.");
          onClose();
        },
        onError: (error) => toast.error(describeScheduleError(error)),
      },
    );
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-base font-bold">
          <PostLogo post={post} className="size-5 shrink-0" />
          <span className="truncate">{post.title}</span>
        </DialogTitle>
        <DialogDescription className="flex items-center gap-2 text-xs">
          <StatusPill status={post.status} />
          <span className="text-slate-500">{meta.hint}</span>
        </DialogDescription>
      </DialogHeader>

      <div className="min-h-0 space-y-3 overflow-y-auto text-xs">
        <div className="whitespace-pre-wrap break-words rounded-sm border bg-slate-50 p-3 text-[12px] text-slate-800">{post.content}</div>
        {reason && <p className="rounded-sm border border-red-200 bg-red-50 p-2 text-[11px] font-medium text-red-700">{reason}</p>}
        <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-3 gap-y-1.5">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="font-semibold text-slate-500">{label}</dt>
              <dd className="min-w-0 break-words text-slate-800">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {confirming ? (
        <div className="rounded-sm border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          Cancel this scheduled post? It will not be published. This cannot be undone, but you can schedule the draft again from Content Studio.
        </div>
      ) : null}

      <DialogFooter className="gap-2 sm:gap-2">
        {confirming ? (
          <>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setConfirming(false)} disabled={cancel.isPending}>Keep it</Button>
            <Button variant="destructive" size="sm" className="text-xs" onClick={confirmCancel} disabled={cancel.isPending}>{cancel.isPending ? "Cancelling…" : "Cancel Post"}</Button>
          </>
        ) : (
          <>
            <Button variant="outline" size="sm" className="text-xs" onClick={onClose}>Close</Button>
            <Button asChild variant="outline" size="sm" className="text-xs">
              <Link href={SOURCE_PAGE[post.source]} onClick={() => setClientId(post.clientId)}>{post.source === "youtube" ? "Open YouTube" : post.source === "whatsapp" ? "Open WhatsApp" : "Open in Content Studio"}</Link>
            </Button>
            {post.canCancel && (
              <Button variant="destructive" size="sm" className="text-xs" onClick={() => setConfirming(true)}>Cancel Post</Button>
            )}
          </>
        )}
      </DialogFooter>
    </>
  );
}
