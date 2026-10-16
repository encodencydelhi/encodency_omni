"use client";

import { useMemo, useState } from "react";
import { Activity, AlertCircle, CheckCircle2, ChevronRight, Clock3, Play, XCircle, Zap } from "lucide-react";
import { Bar, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChannelLogo } from "@/features/admin/shared/channel-logo";
import type { AutomationPageActions } from "../../automation-page";
import { errorMessage, useAutomationAnalytics, useAutomationScope, useAutomationTemplates, useRuns, useWorkflows } from "../../data/hooks";
import { libraryItem } from "../builder/node-library";
import { EmptyPanel, KpiTile, RunStatusChip, WorkflowStatusChip, channelLabel, formatDuration, timeAgo } from "../shared";
import { WorkflowActions } from "../workflow-actions";

const card = "rounded-lg border border-[#E2E8F0] bg-white p-3 shadow-sm";

function SectionHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <div>
        <h3 className="text-[13px] font-semibold text-[#111C3A]">{title}</h3>
        {sub ? <p className="text-[11px] text-[#6B7A94]">{sub}</p> : null}
      </div>
      {action}
    </div>
  );
}

function LinkButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex items-center gap-1 text-[11.5px] font-medium text-[#2563EB] hover:underline">{label} <ChevronRight className="size-3" /></button>;
}

export function AutomationOverview({ days, onEdit, onTest, onUseTemplate, onOpenRun, onNavigate }: AutomationPageActions) {
  const { clientId } = useAutomationScope();
  const analytics = useAutomationAnalytics(clientId, days);
  const workflowsQuery = useWorkflows(clientId, days);
  const runsQuery = useRuns(clientId, { days, limit: 6 });
  const { data: templates = [] } = useAutomationTemplates(clientId);
  const workflows = useMemo(() => workflowsQuery.data ?? [], [workflowsQuery.data]);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const a = analytics.data;
  const preview = workflows.find((w) => w.id === previewId) ?? workflows.find((w) => w.status === "Active") ?? workflows[0];
  const healthTotal = a?.health.reduce((n, h) => n + h.count, 0) ?? 0;
  const popular = [...templates].sort((x, y) => y.useCount - x.useCount).slice(0, 4);
  const chartData = (a?.activity ?? []).map((p) => ({ ...p, label: new Date(p.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) }));

  if (analytics.error) {
    return <div className={card}><EmptyPanel title="Automation data could not be loaded" body={errorMessage(analytics.error)} action={<button type="button" onClick={() => void analytics.refetch()} className="text-[12px] font-semibold text-[#2563EB] hover:underline">Retry</button>} /></div>;
  }

  return (
    <div className="space-y-1 pb-8 text-[#111C3A]">
      <div className="grid grid-cols-2 gap-1 md:grid-cols-3 xl:grid-cols-6">
        <KpiTile icon={<div className="rounded-lg bg-[#EBF5FF] p-2 text-[#3B82F6]"><Play className="size-4" /></div>} title="Active Workflows" value={a ? String(a.activeWorkflows.value) : "…"} hint="currently live" />
        <KpiTile icon={<div className="rounded-lg bg-[#ECFDF5] p-2 text-[#10B981]"><Activity className="size-4" /></div>} title="Total Runs" value={a ? a.totalRuns.value.toLocaleString() : "…"} trend={a?.totalRuns.trend} />
        <KpiTile icon={<div className="rounded-lg bg-[#ECFDF5] p-2 text-[#10B981]"><CheckCircle2 className="size-4" /></div>} title="Success Rate" value={a ? (a.successRate.value === null ? "—" : `${a.successRate.value}%`) : "…"} trend={a?.successRate.trend} hint={a?.successRate.trend ? "pts vs previous" : "finished runs"} />
        <KpiTile icon={<div className="rounded-lg bg-[#FEF2F2] p-2 text-[#EF4444]"><XCircle className="size-4" /></div>} title="Failed Runs" value={a ? String(a.failedRuns.value) : "…"} trend={a?.failedRuns.trend} invertTrend />
        <KpiTile icon={<div className="rounded-lg bg-[#F5F3FF] p-2 text-[#8B5CF6]"><Clock3 className="size-4" /></div>} title="Time Saved (est.)" value={a ? `${a.timeSavedHours.value} hrs` : "…"} hint={a?.timeSavedHours.estimate ?? ""} />
        <KpiTile icon={<div className="rounded-lg bg-[#FFFBEB] p-2 text-[#F59E0B]"><Zap className="size-4" /></div>} title="Actions Executed" value={a ? a.actionsExecuted.value.toLocaleString() : "…"} trend={a?.actionsExecuted.trend} />
      </div>

      <div className="grid grid-cols-1 gap-1 md:grid-cols-2 xl:grid-cols-4">
        <div className={`${card} md:col-span-2`}>
          <SectionHeader title="Automation Activity" sub={`Successful vs failed runs, last ${days} days`} />
          <div className="h-[160px] w-full">
            {a && a.totalRuns.value > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748B" }} minTickGap={20} />
                  <YAxis yAxisId="left" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748B" }} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748B" }} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Bar yAxisId="left" dataKey="successfulRuns" name="Successful" stackId="a" fill="#34D399" barSize={10} />
                  <Bar yAxisId="left" dataKey="failedRuns" name="Failed" stackId="a" fill="#F87171" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="successRate" name="Success rate" stroke="#3B82F6" strokeWidth={2} dot={false} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <EmptyPanel title={a ? "No runs in this period" : "Loading…"} body="Runs appear here once workflows are triggered or tested." />
            )}
          </div>
        </div>

        <div className={`${card} flex flex-col`}>
          <SectionHeader title="Workflow Health" />
          {healthTotal ? (
            <div className="flex flex-1 items-center">
              <div className="relative h-[116px] w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart><Pie data={a!.health} innerRadius={34} outerRadius={52} paddingAngle={2} dataKey="count" stroke="none">{a!.health.map((h) => <Cell key={h.status} fill={h.color} />)}</Pie></PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-[20px] font-bold">{healthTotal}</span><span className="text-[11px] text-[#6B7A94]">Total</span></div>
              </div>
              <div className="w-1/2 space-y-1.5 pl-3">
                {a!.health.map((h) => (
                  <div key={h.status} className="flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ backgroundColor: h.color }} /><span className="w-5 text-[12px] font-bold">{h.count}</span><span className="text-[11.5px] text-[#6B7A94]">{h.status}</span></div>
                ))}
              </div>
            </div>
          ) : <EmptyPanel title="No workflows" body="Create a workflow to see its health." />}
          <div className="mt-2 border-t border-[#F1F5F9] pt-2"><LinkButton label="View All Workflows" onClick={() => onNavigate("workflows")} /></div>
        </div>

        <div className={`${card} flex flex-col`}>
          <SectionHeader title="Top Trigger Sources" sub={`Share of runs, last ${days} days`} />
          {a?.triggerSources.length ? (
            <div className="flex-1 space-y-2">
              {a.triggerSources.slice(0, 6).map((t) => (
                <div key={t.source} className="flex items-center text-[12px]">
                  <span className="w-28 truncate font-medium text-[#334155]">{t.source}</span>
                  <span className="w-12 text-right text-[11px] font-medium text-[#64748B]">{t.percentage}%</span>
                  <div className="ml-3 h-2 flex-1 overflow-hidden rounded-full bg-[#F1F5F9]"><div className="h-full rounded-full" style={{ width: `${t.percentage}%`, backgroundColor: t.color }} /></div>
                </div>
              ))}
            </div>
          ) : <EmptyPanel title="No runs yet" body="Trigger sources show once runs happen." />}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-1 md:grid-cols-2 xl:grid-cols-4">
        <div className={`${card} flex flex-col md:col-span-2`}>
          <SectionHeader title="Workflows" action={<LinkButton label="View All" onClick={() => onNavigate("workflows")} />} />
          {workflows.length === 0 ? <EmptyPanel title="No workflows yet" body="Use Create Workflow or a template to start." /> : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[500px] text-left text-[11.5px]">
                <thead>
                  <tr className="whitespace-nowrap border-b border-[#E2E8F0] text-[11px] text-[#64748B]">
                    <th className="px-2 py-2 font-semibold">Workflow</th><th className="px-2 py-2 font-semibold">Trigger</th><th className="hidden px-2 py-2 font-semibold 2xl:table-cell">Channels</th>
                    <th className="px-2 py-2 font-semibold">Runs</th><th className="px-2 py-2 font-semibold">Success</th><th className="hidden px-2 py-2 font-semibold 2xl:table-cell">Last run</th>
                    <th className="px-2 py-2 font-semibold">Status</th><th className="px-2 py-2 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {workflows.slice(0, 8).map((wf) => (
                    <tr key={wf.id} className="cursor-pointer whitespace-nowrap hover:bg-[#F8FAFC]" onClick={() => setPreviewId(wf.id)}>
                      <td className="max-w-[150px] truncate px-2 py-2 font-medium" title={wf.name}>{wf.name}</td>
                      <td className="px-2 py-2 text-[#64748B]">{wf.trigger.label}</td>
                      <td className="hidden px-2 py-2 2xl:table-cell">{wf.channels.length ? <div className="flex -space-x-1">{wf.channels.map((ch) => <ChannelLogo key={ch} channel={channelLabel(ch)} className="size-5 rounded-full border border-white bg-white shadow-2xs" />)}</div> : <span className="text-[#94A3B8]">—</span>}</td>
                      <td className="px-2 py-2 font-medium">{wf.runs.toLocaleString()}</td>
                      <td className="px-2 py-2">{wf.successRate === null ? <span className="text-[#94A3B8]">—</span> : <span className={wf.successRate >= 95 ? "font-semibold text-[#10B981]" : "font-semibold text-[#F59E0B]"}>{wf.successRate}%</span>}</td>
                      <td className="hidden px-2 py-2 text-[#64748B] 2xl:table-cell">{timeAgo(wf.lastRunAt)}</td>
                      <td className="px-2 py-2"><WorkflowStatusChip status={wf.status} /></td>
                      <td className="px-2 py-2 text-right" onClick={(e) => e.stopPropagation()}><WorkflowActions workflow={wf} onEdit={onEdit} onTest={onTest} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className={`${card} flex flex-col`}>
          <SectionHeader title="Workflow Preview" action={preview ? <LinkButton label="Open" onClick={() => onEdit(preview)} /> : undefined} />
          {preview ? (
            <>
              <select aria-label="Preview workflow" className="mb-2 h-8 rounded-md border border-[#E2E8F0] bg-white px-2 text-[11.5px]" value={preview.id} onChange={(e) => setPreviewId(e.target.value)}>
                {workflows.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
              <div className="mb-2 flex items-center gap-2"><WorkflowStatusChip status={preview.status} /><span className="text-[10.5px] text-[#64748B]">{preview.nodes.length} step{preview.nodes.length === 1 ? "" : "s"}</span></div>
              <div className="relative flex-1 space-y-1">
                {preview.nodes.length === 0 ? <p className="text-[11.5px] text-[#64748B]">No steps yet.</p> : preview.nodes.slice(0, 5).map((node) => {
                  const item = libraryItem(node.actionId, node.label);
                  const Icon = item?.icon ?? Zap;
                  return (
                    <div key={node.id} className="flex items-center gap-2 rounded-md border border-[#E2E8F0] bg-white px-2 py-1">
                      <div className={`grid size-6 shrink-0 place-items-center rounded ${item?.iconBg ?? "bg-[#64748B]"} text-white`}><Icon className="size-3.5" /></div>
                      <div className="flex min-w-0 flex-1 items-center justify-between gap-2"><div className="truncate text-[11.5px] font-medium">{node.label}</div><div className="shrink-0 text-[9.5px] font-medium capitalize text-[#94A3B8]">{node.type}</div></div>
                    </div>
                  );
                })}
                {preview.nodes.length > 5 ? <p className="text-[10.5px] text-[#64748B]">+{preview.nodes.length - 5} more steps</p> : null}
              </div>
            </>
          ) : <EmptyPanel title="Nothing to preview" body="Create a workflow first." />}
        </div>

        <div className={`${card} flex flex-col`}>
          <SectionHeader title="Needs Attention" action={<LinkButton label="Run History" onClick={() => onNavigate("runs")} />} />
          {a?.alerts.length ? (
            <div className="flex-1 space-y-2.5">
              {a.alerts.map((alert) => (
                <div key={alert.id} className="flex gap-3">
                  <AlertCircle className={`mt-0.5 size-4 shrink-0 ${alert.type === "error" ? "text-[#EF4444]" : "text-[#F59E0B]"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-bold leading-tight">{alert.title}</div>
                    <div className="mt-0.5 line-clamp-2 text-[11px] text-[#64748B]">{alert.description}</div>
                    <div className="mt-1 text-[10px] text-[#94A3B8]">{timeAgo(alert.at)}</div>
                  </div>
                  <button type="button" onClick={() => onNavigate(alert.actionLabel === "Settings" ? "settings" : "runs")} className="h-fit rounded-md border border-[#BFDBFE] bg-[#EFF6FF] px-2 py-1 text-[11px] font-semibold text-[#2563EB] hover:bg-[#DBEAFE]">{alert.actionLabel}</button>
                </div>
              ))}
            </div>
          ) : <EmptyPanel title="All clear" body="No failed runs in the last 7 days." />}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-1 xl:grid-cols-2">
        <div className={`${card} flex flex-col`}>
          <SectionHeader title="Recent Runs" action={<LinkButton label="View All" onClick={() => onNavigate("runs")} />} />
          {(runsQuery.data ?? []).length === 0 ? <EmptyPanel title="No runs yet" body="Test a workflow or wait for its trigger." /> : (
            <div className="-mx-4 overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead><tr className="border-b border-[#E2E8F0] text-[#64748B]"><th className="px-4 py-2 font-medium">Workflow</th><th className="px-2 py-2 font-medium">Record</th><th className="px-2 py-2 font-medium">Started</th><th className="px-2 py-2 font-medium">Duration</th><th className="px-2 py-2 font-medium">Steps</th><th className="px-4 py-2 text-right font-medium">Result</th></tr></thead>
                <tbody>
                  {(runsQuery.data ?? []).map((r) => (
                    <tr key={r.id} className="cursor-pointer border-b border-[#F1F5F9] last:border-0 hover:bg-[#F8FAFC]" onClick={() => onOpenRun(r)}>
                      <td className="max-w-[160px] truncate px-4 py-2 font-medium">{r.workflowName}</td>
                      <td className="px-2 py-2 text-[#64748B]">{r.triggerEntity.label}</td>
                      <td className="px-2 py-2 text-[#64748B]">{timeAgo(r.startedAt)}</td>
                      <td className="px-2 py-2 text-[#64748B]">{formatDuration(r.durationMs)}</td>
                      <td className="px-2 py-2 text-[#64748B]">{r.stepsSucceeded ?? 0}/{r.stepsTotal ?? r.steps.length}</td>
                      <td className="px-4 py-2 text-right"><RunStatusChip status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className={`${card} flex flex-col`}>
          <SectionHeader title="Popular Templates" action={<LinkButton label="All Templates" onClick={() => onNavigate("templates")} />} />
          <div className="grid grid-cols-2 gap-1">
            {popular.map((tpl) => (
              <div key={tpl.id} className="flex flex-col justify-between rounded-md border border-[#E2E8F0] bg-[#FAFBFD] p-2 hover:bg-white">
                <div>
                  <div className="mb-0.5 truncate text-[11px] font-bold leading-tight">{tpl.name}</div>
                  <div className="line-clamp-2 text-[9.5px] leading-tight text-[#64748B]">{tpl.description}</div>
                  {tpl.useCount ? <span className="mt-1 inline-block rounded border border-blue-100 bg-blue-50 px-1.5 py-0.5 text-[9px] font-semibold text-blue-600">Used {tpl.useCount}×</span> : null}
                </div>
                <button type="button" onClick={() => void onUseTemplate(tpl.id)} className="mt-1.5 w-full rounded-md border border-blue-200 bg-blue-50 py-1 text-center text-[10.5px] font-bold text-[#2563EB] hover:bg-blue-600 hover:text-white">Use Template</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
