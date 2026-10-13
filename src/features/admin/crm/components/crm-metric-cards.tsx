"use client";

import { useState } from "react";
import { Users, UserPlus, TrendingUp, Clock, Building2, Target, CheckCircle2, AlertCircle, ListTodo, CalendarClock } from "lucide-react";
import { MetricCard } from "@/components/shared/metric-card";
import type { MetricDelta } from "@/types/common";
import type { Lead, Contact, Deal, CrmTask } from "../types";
import { formatInr } from "../lib/crm-records";

/* ------------------------------------------------------------------ */
/* Leads KPIs                                                           */
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
  let avgResponseHint = "No response logs yet";

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

    avgResponseHint = `across ${contactedLeads.length} contacted lead${contactedLeads.length === 1 ? "" : "s"}`;
  }

  const metrics = [
    {
      label: "Total Leads",
      value: String(total),
      icon: Users,
      iconColor: "#2563EB",
      iconBg: "#DBEAFE",
      delta: totalDelta,
      hint: thisMonthLeads > 0 ? `+${thisMonthLeads} in last 30 days` : "total active leads",
    },
    {
      label: "New This Week",
      value: String(thisWeekLeads),
      icon: UserPlus,
      iconColor: "#059669",
      iconBg: "#D1FAE5",
      delta: weekDelta,
      hint: prevWeekLeads > 0 ? `vs. ${prevWeekLeads} previous week` : "past 7 days",
    },
    {
      label: "Conversion Rate",
      value: `${rate}%`,
      icon: TrendingUp,
      iconColor: "#7C3AED",
      iconBg: "#EDE9FE",
      delta: null,
      hint: `${converted} won out of ${total} leads`,
    },
    {
      label: "Avg Response",
      value: avgResponseValue,
      icon: Clock,
      iconColor: "#D97706",
      iconBg: "#FEF3C7",
      delta: null,
      hint: avgResponseHint,
    },
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((m) => (
        <MetricCard key={m.label} label={m.label} value={m.value} icon={m.icon} iconColor={m.iconColor} iconBg={m.iconBg} delta={m.delta} hint={m.hint} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Contacts KPIs                                                        */
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

  const metrics = [
    { label: "Total Contacts", value: String(total), icon: Users, iconColor: "#2563EB", iconBg: "#DBEAFE", delta: totalDelta, hint: recent > 0 ? `+${recent} in last 30 days` : "across all companies" },
    { label: "Active Contacts", value: String(active), icon: CheckCircle2, iconColor: "#059669", iconBg: "#D1FAE5", delta: null, hint: "active or customer" },
    { label: "Not Contacted", value: String(notContacted), icon: AlertCircle, iconColor: "#DC2626", iconBg: "#FEE2E2", delta: null, hint: "need attention" },
    { label: "Total Companies", value: String(companies), icon: Building2, iconColor: "#7C3AED", iconBg: "#EDE9FE", delta: null, hint: "unique organizations" },
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((m) => (
        <MetricCard key={m.label} label={m.label} value={m.value} icon={m.icon} iconColor={m.iconColor} iconBg={m.iconBg} delta={m.delta} hint={m.hint} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pipeline KPIs                                                        */
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

  const metrics = [
    { label: "Pipeline Value", value: formatInr(totalValue), icon: Target, iconColor: "#2563EB", iconBg: "#DBEAFE", hint: `${openDeals.length} open deal${openDeals.length === 1 ? "" : "s"}` },
    { label: "Weighted Pipeline", value: formatInr(weightedValue), icon: TrendingUp, iconColor: "#7C3AED", iconBg: "#EDE9FE", hint: "probability adjusted" },
    { label: "Won This Month", value: formatInr(wonValue), icon: CheckCircle2, iconColor: "#059669", iconBg: "#D1FAE5", hint: `${wonThisMonth.length} deal${wonThisMonth.length === 1 ? "" : "s"} closed` },
    { label: "Win Rate", value: `${winRate}%`, icon: Target, iconColor: "#D97706", iconBg: "#FEF3C7", hint: `avg open deal ${formatInr(avgDeal)}` },
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((m) => (
        <MetricCard key={m.label} label={m.label} value={m.value} icon={m.icon} iconColor={m.iconColor} iconBg={m.iconBg} delta={null} hint={m.hint} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tasks KPIs                                                           */
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

  const metrics = [
    { label: "Total Tasks", value: String(total), icon: ListTodo, iconColor: "#2563EB", iconBg: "#DBEAFE", delta: { changePercent: 5, direction: "up-is-good" as const }, hint: "all time" },
    { label: "Completed", value: String(completed), icon: CheckCircle2, iconColor: "#059669", iconBg: "#D1FAE5", delta: { changePercent: 12, direction: "up-is-good" as const }, hint: `${completionRate}% rate` },
    { label: "Pending", value: String(pending), icon: CalendarClock, iconColor: "#D97706", iconBg: "#FEF3C7", delta: { changePercent: 0, direction: "up-is-good" as const }, hint: "in progress + pending" },
    { label: "Overdue", value: String(overdue), icon: AlertCircle, iconColor: "#DC2626", iconBg: "#FEE2E2", delta: { changePercent: overdue > 0 ? 8 : 0, direction: "down-is-good" as const }, hint: `${dueToday} due today`, emphasis: overdue > 0 ? "danger" as const : "default" as const },
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((m) => (
        <MetricCard key={m.label} label={m.label} value={m.value} icon={m.icon} iconColor={m.iconColor} iconBg={m.iconBg} delta={m.delta} hint={m.hint} emphasis={"emphasis" in m ? m.emphasis : undefined} />
      ))}
    </div>
  );
}
