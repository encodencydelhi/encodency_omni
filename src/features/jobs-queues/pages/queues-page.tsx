"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRightIcon,
  RefreshCwIcon,
  SearchIcon,
  Layers3Icon,
  PlayCircleIcon,
  PauseCircleIcon,
  CircleAlertIcon,
  UsersIcon,
  CircleXIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/format";
import { useQueues, usePauseQueue, useResumeQueue, useResetJobsDemo } from "../data/hooks";
import { QUEUE_STATE_META, MOCK_ENVIRONMENT, MOCK_DATA_SOURCE } from "../data/config";
import type { QueueDefinition } from "../data/types";
import { JobsKpiCards, QueueTable, QueuePreviewDrawer } from "../components";
import { toast } from "sonner";

export function QueuesPage() {
  const router = useRouter();
  const { data: queues = [], isLoading } = useQueues();
  const pauseMutation = usePauseQueue();
  const resumeMutation = useResumeQueue();
  const resetDemo = useResetJobsDemo();

  const [search, setSearch] = useState("");
  const [previewQueue, setPreviewQueue] = useState<QueueDefinition | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return queues;
    const q = search.toLowerCase();
    return queues.filter(
      (queue) =>
        queue.name.toLowerCase().includes(q) ||
        queue.category.toLowerCase().includes(q) ||
        queue.purpose.toLowerCase().includes(q)
    );
  }, [queues, search]);

  const kpis = useMemo(() => {
    const running = queues.filter((q) => q.operationalState === "running").length;
    const paused = queues.filter((q) => q.operationalState === "paused").length;
    const withBacklog = queues.filter((q) => q.waiting > 0).length;
    const withFailures = queues.filter((q) => q.failed > 0).length;
    const withoutWorkers = queues.filter((q) => q.registeredWorkers === 0).length;
    return [
      { label: "Registered Queues", value: queues.length, tone: "info", icon: Layers3Icon },
      { label: "Running Queues", value: running, tone: "success", icon: PlayCircleIcon },
      { label: "Paused Queues", value: paused, tone: "warning", icon: PauseCircleIcon },
      { label: "With Backlog", value: withBacklog, tone: "warning", icon: CircleAlertIcon },
      { label: "With Failures", value: withFailures, tone: "danger", icon: CircleXIcon },
      { label: "No Active Workers", value: withoutWorkers, tone: "danger", icon: UsersIcon },
    ];
  }, [queues]);

  const handleOpenQueue = (queue: QueueDefinition) => {
    setPreviewQueue(queue);
    setPreviewOpen(true);
  };

  const handleOpenFull = (queue: QueueDefinition) => {
    router.push(`/super-admin/jobs?view=queue&queueId=${encodeURIComponent(queue.id)}`);
  };

  const handlePauseResume = (queue: QueueDefinition) => {
    if (queue.operationalState === "running") {
      pauseMutation.mutate(queue.id, {
        onSuccess: () => toast.success(`Pause request drafted for "${queue.name}"`),
        onError: () => toast.error("Failed to draft pause request"),
      });
    } else if (queue.operationalState === "paused") {
      resumeMutation.mutate(queue.id, {
        onSuccess: () => toast.success(`Resume request drafted for "${queue.name}"`),
        onError: () => toast.error("Failed to draft resume request"),
      });
    }
  };

  return (
    <div className="space-y-4 max-w-full pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Queues</h1>
            <span className="px-2 py-0.5 text-xs font-semibold bg-violet-50 text-violet-700 rounded-sm border border-violet-200">Platform</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage queue lifecycle, pause/resume processing, and monitor backlog across all registered queues.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild className="text-xs h-8 font-semibold bg-white text-slate-700">
            <Link href="/super-admin/jobs?tab=overview">
              <ArrowRightIcon className="size-3.5 mr-1.5 text-slate-500" />
              View Backlog
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-8 font-semibold bg-white text-slate-700" onClick={() => resetDemo.mutate()} disabled={resetDemo.isPending}>
            <RefreshCwIcon className={cn("size-3.5 mr-1.5 text-slate-500", resetDemo.isPending && "animate-spin")} />
            Reset Demo
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 bg-slate-50 rounded-sm border border-slate-200/80 px-3 py-2">
        <span className="font-medium">Environment:</span>
        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-sm font-semibold">{MOCK_ENVIRONMENT}</span>
        <span className="text-slate-300">|</span>
        <span className="font-medium">Data Source:</span>
        <span>{MOCK_DATA_SOURCE}</span>
        <span className="text-slate-300">|</span>
        <span className="font-medium">Total Queues:</span>
        <span className="font-semibold">{formatNumber(queues.length)}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 items-stretch">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="rounded-sm border border-slate-200/90 bg-white p-3 shadow-2xs">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{kpi.label}</p>
                <span className={cn(
                  "flex size-6 items-center justify-center rounded-sm border",
                  kpi.tone === "success" && "bg-emerald-50 text-emerald-600 border-emerald-200",
                  kpi.tone === "warning" && "bg-amber-50 text-amber-600 border-amber-200",
                  kpi.tone === "danger" && "bg-red-50 text-red-600 border-red-200",
                  kpi.tone === "info" && "bg-blue-50 text-blue-600 border-blue-200"
                )}>
                  <Icon className="size-3.5" />
                </span>
              </div>
              <p className={cn(
                "text-xl font-extrabold tabular-nums mt-0.5",
                kpi.tone === "success" && "text-emerald-600",
                kpi.tone === "warning" && "text-amber-600",
                kpi.tone === "danger" && "text-red-600",
                kpi.tone === "info" && "text-slate-900"
              )}>
                {formatNumber(kpi.value)}
              </p>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
          <Input
            placeholder="Search queues..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs rounded-sm border-slate-200"
          />
        </div>
      </div>

      <QueueTable queues={filtered} onOpenQueue={handleOpenQueue} isLoading={isLoading} />

      <QueuePreviewDrawer
        queue={previewQueue}
        isOpen={previewOpen}
        onClose={() => { setPreviewOpen(false); setPreviewQueue(null); }}
        onOpenFull={handleOpenFull}
        onPauseResume={handlePauseResume}
      />
    </div>
  );
}
