"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { automationApi } from "../../data/automation-api";
import { errorMessage } from "../../data/hooks";
import type { DurationStats, Metric } from "../../data/trace-types";
import { formatMs, metricText } from "./debugger-utils";

function Unavailable({ reason }: { reason: string }) {
  return <p className="text-[11px] text-slate-500"><span className="font-semibold text-slate-700">Data Unavailable</span> — {reason}</p>;
}

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="rounded border border-slate-200 bg-white p-2.5"><p className="text-[10px] font-medium text-slate-500">{label}</p><div className="mt-1">{children}</div></div>;
}

function Stat({ metric, render }: { metric: Metric<DurationStats>; render: (value: DurationStats) => string }) {
  return metric.available ? <p className="text-[15px] font-semibold text-slate-900">{render(metric.value)}<span className="ml-1.5 text-[10px] font-normal text-slate-500">from {metric.samples} samples</span></p> : <Unavailable reason={metric.reason} />;
}

/** Evidence-backed workflow health for one workflow. A metric with too little data is shown as unavailable, never estimated. */
export function HealthDialog({ open, onClose, clientId, workflowId }: { open: boolean; onClose: () => void; clientId: string; workflowId: string }) {
  const [days, setDays] = useState(30);
  const query = useQuery({ queryKey: ["automation", "insights", clientId, workflowId, days], queryFn: () => automationApi.workflowInsights(clientId, workflowId, days), enabled: open, staleTime: 15_000, retry: false });
  const data = query.data;
  const maxTrend = data?.trend.available ? Math.max(1, ...data.trend.value.map((day) => day.successful + day.failed)) : 1;
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent overlayClassName="z-[130]" className="z-[130] max-h-[90vh] w-[min(960px,96vw)] max-w-none overflow-y-auto p-0 sm:max-w-none">
        <DialogHeader className="border-b border-slate-200 px-4 py-3">
          <DialogTitle className="flex items-center gap-2 text-[14px]"><Activity className="size-4 text-emerald-600" />Workflow Health</DialogTitle>
          <DialogDescription className="text-[11px]">Measured from this workflow’s recorded runs. Metrics that cannot be computed reliably are marked Data Unavailable.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 p-3">
          <div className="flex items-center gap-2">
            <label htmlFor="health-days" className="text-[11px] text-slate-600">Period</label>
            <select id="health-days" value={days} onChange={(e) => setDays(Number(e.target.value))} className="h-7 rounded border border-slate-200 bg-white px-1.5 text-[11px]"><option value={7}>Last 7 Days</option><option value={30}>Last 30 Days</option><option value={90}>Last 90 Days</option></select>
            {data ? <span className="text-[10px] text-slate-500">{data.runsAnalysed} runs analysed{data.truncated ? " (most recent 2,000 only)" : ""}</span> : null}
          </div>
          {query.isLoading ? <p className="py-8 text-center text-[12px] text-slate-500" role="status">Loading Workflow Health…</p> : null}
          {query.isError ? <p className="rounded border border-red-200 bg-red-50 p-3 text-[11px] text-red-900" role="alert">{errorMessage(query.error)}</p> : null}
          {data && data.runsAnalysed === 0 ? <p className="py-8 text-center text-[12px] text-slate-500">No runs were recorded in this period.</p> : null}
          {data && data.runsAnalysed > 0 ? <>
            <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
              <Tile label="Failure Rate">{data.failureRatePercent.available ? <p className="text-[15px] font-semibold text-slate-900">{data.failureRatePercent.value}%<span className="ml-1.5 text-[10px] font-normal text-slate-500">of {data.failureRatePercent.samples} runs</span></p> : <Unavailable reason={data.failureRatePercent.reason} />}</Tile>
              <Tile label="Typical Run Duration (Median)"><Stat metric={data.runDuration} render={(v) => formatMs(v.p50Ms)} /></Tile>
              <Tile label="Slowest Runs (95th Percentile)"><Stat metric={data.runDuration} render={(v) => formatMs(v.p95Ms)} /></Tile>
              <Tile label="Retry Attempts"><p className="text-[15px] font-semibold text-slate-900">{data.retries.total}</p></Tile>
            </div>
            <div className="grid grid-cols-2 gap-1 md:grid-cols-5">
              {(["successful", "failed", "cancelled", "running", "waiting"] as const).map((key) => <Tile key={key} label={key[0]!.toUpperCase() + key.slice(1)}><p className="text-[15px] font-semibold text-slate-900">{data.outcomes[key]}</p></Tile>)}
            </div>
            <div className="grid grid-cols-1 gap-1 lg:grid-cols-2">
              <Tile label="Slowest Steps">
                {data.slowestNodes.length ? <table className="w-full text-[11px]"><thead><tr className="text-left text-[10px] text-slate-500"><th className="font-medium">Step</th><th className="font-medium">Average</th><th className="font-medium">95th Pct.</th><th className="font-medium">Failures</th></tr></thead><tbody>{data.slowestNodes.map((node) => <tr key={node.nodeId} className="border-t border-slate-100"><td className="max-w-[10rem] truncate py-1 pr-2 font-medium text-slate-900">{node.label}</td><td>{metricText(node.duration, (v) => formatMs(v.avgMs))}</td><td>{metricText(node.duration, (v) => formatMs(v.p95Ms))}</td><td>{node.failures}/{node.executions}</td></tr>)}</tbody></table> : <Unavailable reason="No step has enough timed executions yet." />}
              </Tile>
              <Tile label="Retries By Step">
                {data.retries.byNode.length ? <ul className="space-y-0.5 text-[11px]">{data.retries.byNode.slice(0, 6).map((item) => <li key={item.nodeId} className="flex justify-between"><span className="truncate text-slate-800">{data.nodes.find((n) => n.nodeId === item.nodeId)?.label ?? item.nodeId}</span><span className="font-semibold">{item.count}</span></li>)}</ul> : <p className="text-[11px] text-slate-500">No retried attempts were recorded.</p>}
              </Tile>
              <Tile label="Parallel Branch Bottlenecks">{data.branchBottlenecks.available ? <ul className="space-y-0.5 text-[11px]">{data.branchBottlenecks.value.map((item) => <li key={item.key} className="flex justify-between"><span className="truncate text-slate-800">{item.key}</span><span>{formatMs(item.avgMs)} avg · {formatMs(item.maxMs)} max</span></li>)}</ul> : <Unavailable reason={data.branchBottlenecks.reason} />}</Tile>
              <Tile label="For Each & Loop Iteration Bottlenecks">{data.iterationBottlenecks.available ? <ul className="space-y-0.5 text-[11px]">{data.iterationBottlenecks.value.map((item) => <li key={item.key} className="flex justify-between"><span className="truncate text-slate-800">{item.key}</span><span>{formatMs(item.avgMs)} avg · {formatMs(item.maxMs)} max</span></li>)}</ul> : <Unavailable reason={data.iterationBottlenecks.reason} />}</Tile>
              <Tile label="Approval Waiting Time"><Stat metric={data.approvalWait} render={(v) => `${formatMs(v.p50Ms)} median`} /></Tile>
              <Tile label="Queue Delay"><Unavailable reason={data.queueDelay.available ? "" : data.queueDelay.reason} /></Tile>
              <Tile label="Other Waiting Time"><Unavailable reason={data.waitingTime.available ? "" : data.waitingTime.reason} /></Tile>
              <Tile label="Success And Failure Trend">
                {data.trend.available ? <div className="flex h-20 items-end gap-0.5" role="img" aria-label="Daily successful and failed runs">{data.trend.value.map((day) => <div key={day.day} className="flex min-w-1 flex-1 flex-col justify-end" title={`${day.day}: ${day.successful} successful, ${day.failed} failed`}><div className="bg-red-400" style={{ height: `${(day.failed / maxTrend) * 100}%` }} /><div className="bg-emerald-400" style={{ height: `${(day.successful / maxTrend) * 100}%` }} /></div>)}</div> : <Unavailable reason={data.trend.reason} />}
              </Tile>
            </div>
          </> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
