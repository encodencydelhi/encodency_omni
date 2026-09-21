"use client";

import { useState, useMemo } from "react";
import { ServerIcon, CheckCircle2Icon, ClockIcon, XCircleIcon, UsersIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/format";
import { useWorkers, useJobs } from "../data/hooks";
import { WORKER_LIVENESS_META, MOCK_ENVIRONMENT, MOCK_DATA_SOURCE } from "../data/config";
import type { WorkerRecord } from "../data/types";
import { WorkerTable, WorkerDetailDrawer } from "../components";

export function WorkersProcessingPage() {
  const { data: workers = [], isLoading: workersLoading } = useWorkers();
  const { data: jobs = [] } = useJobs();
  const [selectedWorker, setSelectedWorker] = useState<WorkerRecord | null>(null);

  const kpis = useMemo(() => {
    return [
      { label: "Online", value: workers.filter((w) => w.liveness === "online").length, color: "emerald", icon: CheckCircle2Icon },
      { label: "Stale", value: workers.filter((w) => w.liveness === "stale").length, color: "amber", icon: ClockIcon },
      { label: "Offline", value: workers.filter((w) => w.liveness === "offline").length, color: "red", icon: XCircleIcon },
      { label: "Total", value: workers.length, color: "slate", icon: UsersIcon },
    ];
  }, [workers]);

  return (
    <div className="space-y-4 max-w-full pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Workers & Processing</h1>
            <span className="px-2 py-0.5 text-xs font-semibold bg-violet-50 text-violet-700 rounded-sm border border-violet-200">Platform</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Inspect worker liveness, current processing and heartbeat freshness.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 bg-slate-50 rounded-sm border border-slate-200/80 px-3 py-2">
        <span className="font-medium">Environment:</span>
        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-sm font-semibold">{MOCK_ENVIRONMENT}</span>
        <span className="text-slate-300">|</span>
        <span className="font-medium">Data Source:</span>
        <span>{MOCK_DATA_SOURCE}</span>
        <span className="text-slate-300">|</span>
        <span className="font-medium">Total Workers:</span>
        <span className="font-semibold">{formatNumber(workers.length)}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-stretch">
        {kpis.map((item) => (
          <div key={item.label} className="flex items-center gap-3 py-3 px-4 rounded-sm border border-slate-200/90 bg-white shadow-2xs">
            <span className={cn("size-8 rounded-sm flex items-center justify-center shrink-0 border",
              item.color === "emerald" && "bg-emerald-50 text-emerald-600 border-emerald-200",
              item.color === "amber" && "bg-amber-50 text-amber-600 border-amber-200",
              item.color === "red" && "bg-red-50 text-red-600 border-red-200",
              item.color === "slate" && "bg-slate-50 text-slate-600 border-slate-200"
            )}>
              <item.icon className="size-4" />
            </span>
            <div>
              <p className="text-xl font-bold tabular-nums text-slate-900 leading-none">{formatNumber(item.value)}</p>
              <p className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-wider">{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      <WorkerTable
        workers={workers}
        isLoading={workersLoading}
        onOpenWorker={setSelectedWorker}
      />

      <WorkerDetailDrawer
        worker={selectedWorker}
        isOpen={selectedWorker !== null}
        onClose={() => setSelectedWorker(null)}
        jobs={jobs}
      />
    </div>
  );
}
