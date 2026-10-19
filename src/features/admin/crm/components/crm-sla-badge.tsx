"use client";

import { useEffect, useState } from "react";
import type { Contact, CrmTask, Lead } from "../types";

const HOUR = 60 * 60 * 1000;

export function LeadSlaBadge({ lead }: { lead: Lead }) {
  const now = useCurrentTime();
  if (!now) return null;
  if (lead.lastContacted || lead.stage === "won" || lead.stage === "lost") return <span className="text-[11px] font-medium text-emerald-700">Responded</span>;
  const limit = lead.priority === "high" ? 0.25 : lead.priority === "medium" ? 4 : 24;
  const hours = (now - new Date(lead.createdAt).getTime()) / HOUR;
  if (hours <= limit) return <span className="text-[11px] font-medium text-blue-700">Due in {formatHours(limit - hours)}</span>;
  return <span className="rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-semibold text-red-700">SLA +{formatHours(hours - limit)}</span>;
}

export function ContactFollowUpBadge({ contact }: { contact: Contact }) {
  const now = useCurrentTime();
  if (!now) return null;
  if (!contact.nextFollowUp) return <span className="text-[11px] text-slate-400">No follow-up</span>;
  const overdue = now > new Date(contact.nextFollowUp).getTime();
  return <span className={`text-[11px] font-medium ${overdue ? "text-red-700" : "text-emerald-700"}`}>{overdue ? "Follow-up overdue" : "Follow-up scheduled"}</span>;
}

export function TaskSlaBadge({ task }: { task: CrmTask }) {
  const now = useCurrentTime();
  if (!now) return null;
  if (task.status === "completed" || task.status === "cancelled") return null;
  const due = new Date(`${task.dueDate}T${task.dueTime || "23:59"}`).getTime();
  if (Number.isNaN(due) || now <= due) return null;
  return <span className="ml-1 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">Overdue</span>;
}

function formatHours(hours: number) { return hours < 1 ? `${Math.max(1, Math.round(hours * 60))}m` : hours < 48 ? `${Math.round(hours)}h` : `${Math.round(hours / 24)}d`; }

function useCurrentTime() {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const update = () => setNow(Date.now());
    const timer = window.setTimeout(update, 0);
    const interval = window.setInterval(update, 60_000);
    return () => { window.clearTimeout(timer); window.clearInterval(interval); };
  }, []);
  return now;
}
