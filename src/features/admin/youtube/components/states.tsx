"use client";

import { useState, type ComponentType } from "react";
import { Hourglass, KeyRound, LockKeyhole, ShieldAlert, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { ytRoutes } from "../lib/constants";
import { useYouTube } from "../store/youtube-store";
import type { Capability } from "../types";
import { Button, Skeleton, yt } from "./ui";

const FIX_META: Record<NonNullable<Capability["fix"]>, { icon: ComponentType<{ className?: string }>; title: string }> = {
  reconnect: { icon: KeyRound, title: "Permission required" },
  request_access: { icon: LockKeyhole, title: "You don't have access" },
  enable_feature: { icon: Sparkles, title: "Not available for this channel" },
  wait: { icon: Hourglass, title: "Temporarily unavailable" },
};

export function CapabilityState({ capability, title, className, compact }: { capability: Capability; title?: string; className?: string; compact?: boolean }) {
  const { reconnect, can } = useYouTube();
  const [busy, setBusy] = useState(false);
  const meta = FIX_META[capability.fix ?? "request_access"];
  const Icon = meta.icon ?? ShieldAlert;

  return (
    <div className={cn("flex flex-col items-center justify-center px-6 text-center", compact ? "py-6" : "py-12", className)}>
      <span className="grid size-10 place-items-center rounded-xl bg-[#F3F5F9] text-[#6B7890] ring-1 ring-[#E4E9F0]">
        <Icon className="size-5" />
      </span>
      <p className="mt-3 text-[13.5px] font-semibold text-[#0F1B3D]">{title ?? meta.title}</p>
      <p className="mt-1 max-w-[380px] text-[12.5px] leading-5 text-[#6B7890]">{capability.reason}</p>
      <div className="mt-3.5 flex flex-wrap justify-center gap-2">
        {capability.fix === "reconnect" && (
          <Button
            size="sm"
            variant="primary"
            loading={busy}
            gate={can.canManageConnection}
            onClick={async () => {
              setBusy(true);
              await reconnect();
              setBusy(false);
            }}
          >
            Reconnect permissions
          </Button>
        )}
        {capability.fix === "request_access" && (
          <Button size="sm" variant="secondary" onClick={() => toast.success("Access request sent", { description: "Workspace owners have been notified." })}>
            Request access
          </Button>
        )}
        {capability.fix === "enable_feature" && (
          <Button size="sm" variant="secondary" href={ytRoutes.studio} external>
            Open YouTube Studio
          </Button>
        )}
      </div>
    </div>
  );
}

export function PageSkeleton({ variant = "dashboard" }: { variant?: "dashboard" | "table" | "detail" }) {
  if (variant === "table") {
    return (
      <div className="space-y-1" aria-busy="true" aria-label="Loading">
        <Skeleton className="h-8 w-48" />
        <div className={cn(yt.card, "overflow-hidden")}>
          <div className="flex gap-2 border-b border-[#EEF1F5] p-3">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-28" />)}
          </div>
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-[#EEF1F5] px-3 py-2.5 last:border-0">
              <Skeleton className="size-4" />
              <Skeleton className="h-10 w-[72px]" />
              <div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-2/5" /><Skeleton className="h-2.5 w-1/5" /></div>
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (variant === "detail") {
    return (
      <div className="space-y-1" aria-busy="true" aria-label="Loading">
        <div className={cn(yt.card, "flex gap-4 p-4")}>
          <Skeleton className="h-24 w-44" />
          <div className="flex-1 space-y-2"><Skeleton className="h-5 w-2/3" /><Skeleton className="h-3 w-1/3" /><Skeleton className="h-8 w-64" /></div>
        </div>
        <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className={cn(yt.card, "p-3.5")}><Skeleton className="h-3 w-16" /><Skeleton className="mt-3 h-6 w-20" /></div>)}
        </div>
        <div className={cn(yt.card, "p-4")}><Skeleton className="h-64 w-full" /></div>
      </div>
    );
  }
  return (
    <div className="space-y-1" aria-busy="true" aria-label="Loading">
      <div className="grid gap-1 xl:grid-cols-12">
        <div className={cn(yt.card, "overflow-hidden xl:col-span-8")}>
          <Skeleton className="h-28 w-full rounded-none" />
          <div className="flex gap-3 p-4"><Skeleton className="size-16 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-72" /><Skeleton className="h-3 w-full" /></div></div>
        </div>
        <div className={cn(yt.card, "p-4 xl:col-span-4")}><Skeleton className="h-4 w-32" /><div className="mt-4 flex gap-4"><Skeleton className="size-24 rounded-full" /><div className="flex-1 space-y-2.5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-3 w-full" />)}</div></div></div>
      </div>
      <div className="grid grid-cols-2 gap-1 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className={cn(yt.card, "p-3.5")}><Skeleton className="h-3 w-20" /><Skeleton className="mt-3 h-6 w-24" /><Skeleton className="mt-2 h-3 w-28" /><Skeleton className="mt-3 h-8 w-full" /></div>
        ))}
      </div>
      <div className="grid gap-1 xl:grid-cols-12">
        <div className={cn(yt.card, "p-4 xl:col-span-8")}><Skeleton className="h-4 w-40" /><Skeleton className="mt-4 h-60 w-full" /></div>
        <div className={cn(yt.card, "p-4 xl:col-span-4")}><Skeleton className="h-4 w-32" /><Skeleton className="mx-auto mt-6 size-32 rounded-full" /></div>
      </div>
    </div>
  );
}
