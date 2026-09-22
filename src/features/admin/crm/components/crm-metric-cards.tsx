"use client";

import { Users, UserPlus, TrendingUp, Clock, Phone, Mail, Building2, Target, CheckCircle2, AlertCircle, ListTodo, CalendarClock } from "lucide-react";
import { MetricCard } from "@/components/shared/metric-card";
import type { MetricDelta } from "@/types/common";
import type { Lead, Contact, Deal, CrmTask } from "../types";

/* ------------------------------------------------------------------ */
/* Leads KPIs                                                           */
/* ------------------------------------------------------------------ */

export function LeadMetricCards({ leads }: { leads: Lead[] }) {
  const total = leads.length;
  const thisWeek = leads.filter((l) => {
    const d = new Date(l.createdAt);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return d >= weekAgo;
  }).length;
  const converted = leads.filter((l) => l.stage === "won").length;
  const rate = total > 0 ? ((converted / total) * 100).toFixed(1) : "0";

  const deltas: MetricDelta[] = [
    { changePercent: 12.4, direction: "up-is-good" },
    { changePercent: 8.2, direction: "up-is-good" },
    { changePercent: 1.2, direction: "up-is-good" },
    { changePercent: 18, direction: "up-is-good" },
  ];

  const metrics = [
    { label: "Total Leads", value: String(total), icon: Users, iconColor: "#2563EB", iconBg: "#DBEAFE", delta: deltas[0], hint: "+42 new this month" },
    { label: "New This Week", value: String(thisWeek), icon: UserPlus, iconColor: "#059669", iconBg: "#D1FAE5", delta: deltas[1], hint: "vs last week" },
    { label: "Conversion Rate", value: `${rate}%`, icon: TrendingUp, iconColor: "#7C3AED", iconBg: "#EDE9FE", delta: deltas[2], hint: "won / total" },
    { label: "Avg Response", value: "2h 34m", icon: Clock, iconColor: "#D97706", iconBg: "#FEF3C7", delta: deltas[3], hint: "18% faster" },
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
  const active = contacts.filter((c) => c.status === "active" || c.status === "customer").length;
  const notContacted = contacts.filter((c) => !c.lastContacted).length;
  const companies = new Set(contacts.map((c) => c.companyId)).size;

  const metrics = [
    { label: "Total Contacts", value: String(total), icon: Users, iconColor: "#2563EB", iconBg: "#DBEAFE", delta: { changePercent: 8.5, direction: "up-is-good" as const }, hint: "across all companies" },
    { label: "Active Contacts", value: String(active), icon: CheckCircle2, iconColor: "#059669", iconBg: "#D1FAE5", delta: { changePercent: 5.2, direction: "up-is-good" as const }, hint: "engaged recently" },
    { label: "Not Contacted", value: String(notContacted), icon: AlertCircle, iconColor: "#DC2626", iconBg: "#FEE2E2", delta: { changePercent: 3.1, direction: "down-is-good" as const }, hint: "need attention" },
    { label: "Total Companies", value: String(companies), icon: Building2, iconColor: "#7C3AED", iconBg: "#EDE9FE", delta: { changePercent: 12, direction: "up-is-good" as const }, hint: "unique organizations" },
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
  const totalValue = openDeals.reduce((sum, d) => sum + d.value, 0);
  const weightedValue = openDeals.reduce((sum, d) => sum + (d.value * d.probability) / 100, 0);
  const wonValue = wonDeals.reduce((sum, d) => sum + d.value, 0);
  const lostValue = lostDeals.reduce((sum, d) => sum + d.value, 0);
  const closedDeals = wonDeals.length + lostDeals.length;
  const winRate = closedDeals > 0 ? ((wonDeals.length / closedDeals) * 100).toFixed(1) : "0";
  const avgDeal = openDeals.length > 0 ? Math.round(totalValue / openDeals.length) : 0;

  const format = (n: number) => n >= 100000 ? `${(n / 100000).toFixed(1)}L` : `${(n / 1000).toFixed(0)}K`;

  const metrics = [
    { label: "Pipeline Value", value: `₹${format(totalValue)}`, icon: Target, iconColor: "#2563EB", iconBg: "#DBEAFE", delta: { changePercent: 15, direction: "up-is-good" as const }, hint: `${openDeals.length} open deals` },
    { label: "Weighted Pipeline", value: `₹${format(weightedValue)}`, icon: TrendingUp, iconColor: "#7C3AED", iconBg: "#EDE9FE", delta: { changePercent: 10, direction: "up-is-good" as const }, hint: "probability adjusted" },
    { label: "Won This Month", value: `₹${format(wonValue)}`, icon: CheckCircle2, iconColor: "#059669", iconBg: "#D1FAE5", delta: { changePercent: 22, direction: "up-is-good" as const }, hint: `${wonDeals.length} deals closed` },
    { label: "Win Rate", value: `${winRate}%`, icon: Target, iconColor: "#D97706", iconBg: "#FEF3C7", delta: { changePercent: 3.5, direction: "up-is-good" as const }, hint: `avg deal ₹${format(avgDeal)}` },
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
