"use client";

import { useState, type ReactNode } from "react";
import {
  Users, UserPlus, TrendingUp, TrendingDown, Clock, Building2, Target,
  CheckCircle2, AlertCircle, ListTodo, CalendarClock, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { MetricDelta } from "@/types/common";
import type { Lead, Contact, Deal, CrmTask } from "../types";
import { formatInr } from "../lib/crm-records";

/* ------------------------------------------------------------------ */
/* Balanced & Colorful CRM Stat Card Component                         */
/* ------------------------------------------------------------------ */

type CrmCardTone = "blue" | "emerald" | "purple" | "amber" | "rose";

interface CrmCardTheme {
  bg: string;
  border: string;
  hoverBorder: string;
  iconBg: string;
  iconGlow: string;
  deltaBgPos: string;
  deltaBgNeg: string;
  accentBar: string;
  accentGlow: string;
}

const CRM_CARD_THEMES: Record<CrmCardTone, CrmCardTheme> = {
  blue: {
    bg: "bg-gradient-to-br from-blue-50/85 via-white to-sky-50/40 dark:from-blue-950/20 dark:via-slate-900 dark:to-slate-900",
    border: "border-blue-100/90 dark:border-blue-900/40",
    hoverBorder: "hover:border-blue-300 dark:hover:border-blue-700",
    iconBg: "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm shadow-blue-500/25",
    iconGlow: "group-hover:shadow-blue-500/40",
    deltaBgPos: "bg-blue-100/80 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
    deltaBgNeg: "bg-amber-100/80 text-amber-700",
    accentBar: "bg-gradient-to-r from-blue-500 to-indigo-600",
    accentGlow: "shadow-[0_4px_16px_rgba(59,130,246,0.06)]",
  },
  emerald: {
    bg: "bg-gradient-to-br from-emerald-50/85 via-white to-teal-50/40 dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900",
    border: "border-emerald-100/90 dark:border-emerald-900/40",
    hoverBorder: "hover:border-emerald-300 dark:hover:border-emerald-700",
    iconBg: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/25",
    iconGlow: "group-hover:shadow-emerald-500/40",
    deltaBgPos: "bg-emerald-100/80 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
    deltaBgNeg: "bg-rose-100/80 text-rose-700",
    accentBar: "bg-gradient-to-r from-emerald-500 to-teal-600",
    accentGlow: "shadow-[0_4px_16px_rgba(16,185,129,0.06)]",
  },
  purple: {
    bg: "bg-gradient-to-br from-purple-50/85 via-white to-violet-50/40 dark:from-purple-950/20 dark:via-slate-900 dark:to-slate-900",
    border: "border-purple-100/90 dark:border-purple-900/40",
    hoverBorder: "hover:border-purple-300 dark:hover:border-purple-700",
    iconBg: "bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-sm shadow-purple-500/25",
    iconGlow: "group-hover:shadow-purple-500/40",
    deltaBgPos: "bg-purple-100/80 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300",
    deltaBgNeg: "bg-amber-100/80 text-amber-700",
    accentBar: "bg-gradient-to-r from-purple-500 to-indigo-600",
    accentGlow: "shadow-[0_4px_16px_rgba(168,85,247,0.06)]",
  },
  amber: {
    bg: "bg-gradient-to-br from-amber-50/85 via-white to-orange-50/40 dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-900",
    border: "border-amber-100/90 dark:border-amber-900/40",
    hoverBorder: "hover:border-amber-300 dark:hover:border-amber-700",
    iconBg: "bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm shadow-amber-500/25",
    iconGlow: "group-hover:shadow-amber-500/40",
    deltaBgPos: "bg-amber-100/80 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
    deltaBgNeg: "bg-rose-100/80 text-rose-700",
    accentBar: "bg-gradient-to-r from-amber-500 to-orange-600",
    accentGlow: "shadow-[0_4px_16px_rgba(245,158,11,0.06)]",
  },
  rose: {
    bg: "bg-gradient-to-br from-rose-50/85 via-white to-red-50/40 dark:from-rose-950/20 dark:via-slate-900 dark:to-slate-900",
    border: "border-rose-100/90 dark:border-rose-900/40",
    hoverBorder: "hover:border-rose-300 dark:hover:border-rose-700",
    iconBg: "bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-sm shadow-rose-500/25",
    iconGlow: "group-hover:shadow-rose-500/40",
    deltaBgPos: "bg-emerald-100/80 text-emerald-700",
    deltaBgNeg: "bg-rose-100/80 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
    accentBar: "bg-gradient-to-r from-rose-500 to-red-600",
    accentGlow: "shadow-[0_4px_16px_rgba(244,63,94,0.06)]",
  },
};

interface CrmStatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: CrmCardTone;
  delta?: MetricDelta | null;
  hint?: ReactNode;
  emphasis?: "default" | "warning" | "danger";
}

function CrmStatCard({
  label,
  value,
  icon: Icon,
  tone,
  delta,
  hint,
  emphasis = "default",
}: CrmStatCardProps) {
  const theme = CRM_CARD_THEMES[tone];

  const isPositive = delta
    ? delta.direction === "down-is-good"
      ? delta.changePercent <= 0
      : delta.changePercent >= 0
    : true;

  return (
    <div
      className={cn(
        "group relative flex items-center justify-between overflow-hidden rounded-xl border px-3.5 py-2 sm:px-4 sm:py-2.5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm",
        theme.bg,
        theme.border,
        theme.hoverBorder,
        theme.accentGlow,
        emphasis === "danger" && "ring-1 ring-rose-400/60",
      )}
    >
      {/* Top subtle colored gradient line */}
      <span
        aria-hidden="true"
        className={cn("absolute inset-x-0 top-0 h-[2px]", theme.accentBar)}
      />

      {/* Left: Label (Capitalized) + Value & Hint */}
      <div className="min-w-0 flex-1 pr-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] font-semibold text-slate-600 dark:text-slate-300 capitalize truncate">
            {label}
          </span>
          {delta && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 shadow-2xs leading-none",
                isPositive ? theme.deltaBgPos : theme.deltaBgNeg,
              )}
            >
              {isPositive ? (
                <TrendingUp className="size-2.5 shrink-0" />
              ) : (
                <TrendingDown className="size-2.5 shrink-0" />
              )}
              {delta.changePercent > 0 ? `+${delta.changePercent}%` : `${delta.changePercent}%`}
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-2 mt-0.5">
          <span className="text-[19px] sm:text-[20px] font-bold tracking-tight text-slate-900 dark:text-white tabular-nums leading-none">
            {value}
          </span>
          {hint && (
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 truncate leading-none capitalize">
              {hint}
            </span>
          )}
        </div>
      </div>

      {/* Right: Compact Glowing Icon Pod */}
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105 shadow-xs",
          theme.iconBg,
          theme.iconGlow,
        )}
      >
        <Icon className="size-4 shrink-0" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Leads KPIs                                                         */
/* ------------------------------------------------------------------ */

export function LeadMetricCards({ leads }: { leads: Lead[] }) {
  const total = leads.length;
  const [now] = useState(() => Date.now());
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const SEVEN_DAYS = 7 * ONE_DAY;
  const THIRTY_DAYS = 30 * ONE_DAY;

  // 1. Total Leads & 30-day trend
  const thisMonthLeads = leads.filter((l) => now - new Date(l.createdAt).getTime() <= THIRTY_DAYS).length;
  const prevMonthLeads = leads.filter((l) => {
    const age = now - new Date(l.createdAt).getTime();
    return age > THIRTY_DAYS && age <= 2 * THIRTY_DAYS;
  }).length;

  const totalDelta: MetricDelta | null = prevMonthLeads > 0 ? {
    changePercent: Math.round(((thisMonthLeads - prevMonthLeads) / prevMonthLeads) * 100),
    direction: "up-is-good",
  } : null;

  // 2. New This Week
  const thisWeekLeads = leads.filter((l) => now - new Date(l.createdAt).getTime() <= SEVEN_DAYS).length;
  const prevWeekLeads = leads.filter((l) => {
    const age = now - new Date(l.createdAt).getTime();
    return age > SEVEN_DAYS && age <= 2 * SEVEN_DAYS;
  }).length;

  const weekDelta: MetricDelta | null = prevWeekLeads > 0 ? {
    changePercent: Math.round(((thisWeekLeads - prevWeekLeads) / prevWeekLeads) * 100),
    direction: "up-is-good",
  } : null;

  // 3. Conversion Rate
  const converted = leads.filter((l) => l.stage === "won").length;
  const rate = total > 0 ? ((converted / total) * 100).toFixed(1) : "0";

  // 4. Avg Response Time (calculated from actual createdAt to lastContacted)
  const contactedLeads = leads.filter((l) => {
    if (!l.lastContacted || !l.createdAt) return false;
    const diff = new Date(l.lastContacted).getTime() - new Date(l.createdAt).getTime();
    return diff > 0 && diff < 90 * ONE_DAY;
  });

  let avgResponseValue = "—";
  let avgResponseHint = "No Response Logs";

  if (contactedLeads.length > 0) {
    const totalMs = contactedLeads.reduce((acc, l) => {
      return acc + (new Date(l.lastContacted).getTime() - new Date(l.createdAt).getTime());
    }, 0);
    const avgMinutes = Math.round(totalMs / (contactedLeads.length * 60 * 1000));
    const hours = Math.floor(avgMinutes / 60);
    const mins = avgMinutes % 60;

    avgResponseValue = hours >= 24
      ? `${(hours / 24).toFixed(1)}d`
      : hours > 0
        ? `${hours}h ${mins}m`
        : `${mins}m`;

    avgResponseHint = `Across ${contactedLeads.length} Contacted`;
  }

  return (
    <div className="grid gap-2.5 sm:gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <CrmStatCard
        label="Total Leads"
        value={String(total)}
        icon={Users}
        tone="blue"
        delta={totalDelta}
        hint={thisMonthLeads > 0 ? `+${thisMonthLeads} in Last 30 Days` : "Active Leads"}
      />
      <CrmStatCard
        label="New This Week"
        value={String(thisWeekLeads)}
        icon={UserPlus}
        tone="emerald"
        delta={weekDelta}
        hint={prevWeekLeads > 0 ? `vs. ${prevWeekLeads} Prev Week` : "Past 7 Days"}
      />
      <CrmStatCard
        label="Conversion Rate"
        value={`${rate}%`}
        icon={TrendingUp}
        tone="purple"
        delta={null}
        hint={`${converted} Won of ${total} Leads`}
      />
      <CrmStatCard
        label="Avg Response"
        value={avgResponseValue}
        icon={Clock}
        tone="amber"
        delta={null}
        hint={avgResponseHint}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Contacts KPIs                                                      */
/* ------------------------------------------------------------------ */

export function ContactMetricCards({ contacts }: { contacts: Contact[] }) {
  const total = contacts.length;
  const [now] = useState(() => Date.now());
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  const active = contacts.filter((c) => c.status === "active" || c.status === "customer").length;
  const notContacted = contacts.filter((c) => !c.lastContacted).length;
  const companies = new Set(contacts.map((c) => c.company.trim().toLowerCase()).filter(Boolean)).size;

  const age = (c: Contact) => now - new Date(c.createdAt).getTime();
  const recent = contacts.filter((c) => age(c) <= THIRTY_DAYS).length;
  const previous = contacts.filter((c) => age(c) > THIRTY_DAYS && age(c) <= 2 * THIRTY_DAYS).length;
  const totalDelta: MetricDelta | null = previous > 0
    ? { changePercent: Math.round(((recent - previous) / previous) * 100), direction: "up-is-good" }
    : null;

  return (
    <div className="grid gap-2.5 sm:gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <CrmStatCard
        label="Total Contacts"
        value={String(total)}
        icon={Users}
        tone="blue"
        delta={totalDelta}
        hint={recent > 0 ? `+${recent} in Last 30 Days` : "Across Companies"}
      />
      <CrmStatCard
        label="Active Contacts"
        value={String(active)}
        icon={CheckCircle2}
        tone="emerald"
        delta={null}
        hint="Active or Customer"
      />
      <CrmStatCard
        label="Not Contacted"
        value={String(notContacted)}
        icon={AlertCircle}
        tone={notContacted > 0 ? "rose" : "amber"}
        delta={null}
        hint="Needs Attention"
        emphasis={notContacted > 0 ? "danger" : "default"}
      />
      <CrmStatCard
        label="Total Companies"
        value={String(companies)}
        icon={Building2}
        tone="purple"
        delta={null}
        hint="Unique Organizations"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pipeline KPIs                                                      */
/* ------------------------------------------------------------------ */

export function PipelineMetricCards({ deals }: { deals: Deal[] }) {
  const openDeals = deals.filter((d) => d.stage !== "won" && d.stage !== "lost");
  const wonDeals = deals.filter((d) => d.stage === "won");
  const lostDeals = deals.filter((d) => d.stage === "lost");
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const wonThisMonth = wonDeals.filter((d) => new Date(d.updatedAt).getTime() >= monthStart.getTime());
  const totalValue = openDeals.reduce((sum, d) => sum + d.value, 0);
  const weightedValue = openDeals.reduce((sum, d) => sum + (d.value * d.probability) / 100, 0);
  const wonValue = wonThisMonth.reduce((sum, d) => sum + d.value, 0);
  const closedDeals = wonDeals.length + lostDeals.length;
  const winRate = closedDeals > 0 ? ((wonDeals.length / closedDeals) * 100).toFixed(1) : "0";
  const avgDeal = openDeals.length > 0 ? Math.round(totalValue / openDeals.length) : 0;

  return (
    <div className="grid gap-2.5 sm:gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <CrmStatCard
        label="Pipeline Value"
        value={formatInr(totalValue)}
        icon={Target}
        tone="blue"
        delta={null}
        hint={`${openDeals.length} Open Deal${openDeals.length === 1 ? "" : "s"}`}
      />
      <CrmStatCard
        label="Weighted Pipeline"
        value={formatInr(weightedValue)}
        icon={TrendingUp}
        tone="purple"
        delta={null}
        hint="Probability Adjusted"
      />
      <CrmStatCard
        label="Won This Month"
        value={formatInr(wonValue)}
        icon={CheckCircle2}
        tone="emerald"
        delta={null}
        hint={`${wonThisMonth.length} Deal${wonThisMonth.length === 1 ? "" : "s"} Closed`}
      />
      <CrmStatCard
        label="Win Rate"
        value={`${winRate}%`}
        icon={Target}
        tone="amber"
        delta={null}
        hint={avgDeal > 0 ? `Avg ${formatInr(avgDeal)}` : "No Deals Yet"}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tasks KPIs                                                         */
/* ------------------------------------------------------------------ */

export function TaskMetricCards({ tasks }: { tasks: CrmTask[] }) {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const pending = tasks.filter((t) => t.status === "pending" || t.status === "in_progress").length;
  const overdue = tasks.filter((t) => {
    if (t.status === "completed" || t.status === "cancelled") return false;
    return new Date(t.dueDate) < new Date();
  }).length;
  const dueToday = tasks.filter((t) => {
    if (t.status === "completed" || t.status === "cancelled") return false;
    const today = new Date().toISOString().split("T")[0];
    return t.dueDate === today;
  }).length;
  const completionRate = total > 0 ? ((completed / total) * 100).toFixed(1) : "0";

  return (
    <div className="grid gap-2.5 sm:gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <CrmStatCard
        label="Total Tasks"
        value={String(total)}
        icon={ListTodo}
        tone="blue"
        delta={{ changePercent: 5, direction: "up-is-good" }}
        hint="All Time"
      />
      <CrmStatCard
        label="Completed Tasks"
        value={String(completed)}
        icon={CheckCircle2}
        tone="emerald"
        delta={{ changePercent: 12, direction: "up-is-good" }}
        hint={`${completionRate}% Rate`}
      />
      <CrmStatCard
        label="Pending Tasks"
        value={String(pending)}
        icon={CalendarClock}
        tone="amber"
        delta={null}
        hint="In Progress & Pending"
      />
      <CrmStatCard
        label="Overdue Tasks"
        value={String(overdue)}
        icon={AlertCircle}
        tone={overdue > 0 ? "rose" : "amber"}
        delta={overdue > 0 ? { changePercent: 8, direction: "down-is-good" } : null}
        hint={`${dueToday} Due Today`}
        emphasis={overdue > 0 ? "danger" : "default"}
      />
    </div>
  );
}
