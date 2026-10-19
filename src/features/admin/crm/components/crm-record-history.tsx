"use client";

import { useEffect, useState } from "react";
import { Bot, CheckSquare2, History, MessageSquareText } from "lucide-react";
import { crmApi, type CrmKind, type CrmRecordHistory, type CrmScope } from "../data/crm-api";

export function CrmRecordHistoryPanel({ kind, recordId, scope }: { kind: CrmKind; recordId: string; scope: CrmScope | null }) {
  const [data, setData] = useState<CrmRecordHistory | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!scope) return;
    let active = true;
    crmApi.history(kind, recordId, scope).then((result) => { if (active) setData(result); }).catch(() => { if (active) setData(null); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [kind, recordId, scope]);

  if (!scope) return null;
  const entries = [
    ...(data?.activities ?? []).map((item) => ({ id: `activity-${item.id}`, icon: MessageSquareText, title: item.description || item.type || "CRM activity", detail: item.actor || "CRM", date: item.createdAt })),
    ...(data?.tasks ?? []).map((item) => ({ id: `task-${item.id}`, icon: CheckSquare2, title: item.title || item.name || "Task", detail: item.status || "Task", date: item.updatedAt })),
    ...(data?.automationRuns ?? []).map((item) => ({ id: `run-${item.id}`, icon: Bot, title: item.workflowName, detail: `Automation · ${item.status}`, date: item.startedAt })),
  ].sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());

  return <section className="rounded-lg border bg-white p-3"><div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800"><History className="size-4 text-indigo-600" /> Communication & automation history</div>{loading ? <p className="text-xs text-slate-500">Loading history...</p> : entries.length ? <div className="max-h-64 space-y-2 overflow-auto">{entries.map((entry) => <div key={entry.id} className="flex gap-2 rounded-md bg-slate-50 p-2"><entry.icon className="mt-0.5 size-4 shrink-0 text-slate-500" /><div className="min-w-0"><p className="truncate text-xs font-medium text-slate-800">{entry.title}</p><p className="text-[11px] text-slate-500">{entry.detail} · {new Date(entry.date).toLocaleString()}</p></div></div>)}</div> : <p className="text-xs text-slate-500">No linked communication, tasks, or automation runs yet.</p>}</section>;
}
