"use client";

import { useState, type ComponentType } from "react";
import { AlertTriangle, Hourglass, KeyRound, LockKeyhole, ShieldAlert, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { YouTubeErrorInfo } from "../live/youtube-errors";
import { LinkChannelDialog } from "./link-channel-dialog";
import { ytRoutes } from "../lib/constants";
import { useYouTube } from "../store/youtube-store";
import type { Capability } from "../types";
import { Button, Skeleton, yt } from "./ui";

const FIX_META: Record<NonNullable<Capability["fix"]>, { icon: ComponentType<{ className?: string }>; title: string }> = {
  reconnect: { icon: KeyRound, title: "Reconnect YouTube" },
  grant: { icon: KeyRound, title: "Permission required" },
  connect: { icon: KeyRound, title: "Connect YouTube" },
  request_access: { icon: LockKeyhole, title: "You don't have access" },
  enable_feature: { icon: Sparkles, title: "Not available for this channel" },
  wait: { icon: Hourglass, title: "Temporarily unavailable" },
};

/** The one button that fixes a permission / connection problem (named consent only, never a raw scope). */
function FixButton({ fix, grant }: { fix: NonNullable<Capability["fix"]>; grant?: Capability["grant"] }) {
  const { startConsent, can, connection } = useYouTube();
  const [busy, setBusy] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const run = async (capability?: Capability["grant"]) => {
    if (busy) return;
    setBusy(true);
    await startConsent(capability);
    setBusy(false);
  };

  if (fix === "reconnect") return <Button size="sm" variant="primary" loading={busy} gate={can.canManageConnection} onClick={() => void run()}>Reconnect YouTube</Button>;
  if (fix === "grant") return <Button size="sm" variant="primary" loading={busy} gate={can.canManageConnection} onClick={() => void run(grant)}>Grant permission</Button>;
  if (fix === "connect") {
    return connection.state === "not_mapped" ? (
      <>
        <Button size="sm" variant="primary" gate={can.canManageConnection} onClick={() => setLinkOpen(true)}>Link channel to this client</Button>
        <LinkChannelDialog open={linkOpen} onOpenChange={setLinkOpen} />
      </>
    ) : (
      <Button size="sm" variant="primary" loading={busy} gate={can.canManageConnection} onClick={() => void run()}>Connect YouTube</Button>
    );
  }
  if (fix === "enable_feature") return <Button size="sm" variant="secondary" href={ytRoutes.studio} external>Open YouTube Studio</Button>;
  return null;
}

/** Shown where a capability is missing: says why, and offers the single action that can fix it. */
export function CapabilityState({ capability, title, className, compact }: { capability: Capability; title?: string; className?: string; compact?: boolean }) {
  const meta = FIX_META[capability.fix ?? "request_access"];
  const Icon = meta.icon ?? ShieldAlert;

  return (
    <div className={cn("flex flex-col items-center justify-center px-6 text-center", compact ? "py-6" : "py-12", className)}>
      <span className="grid size-10 place-items-center rounded-sm bg-[#F3F5F9] text-[#6B7890] ring-1 ring-[#E4E9F0]">
        <Icon className="size-5" />
      </span>
      <p className="mt-3 text-[13.5px] font-semibold text-[#0F1B3D]">{title ?? meta.title}</p>
      <p className="mt-1 max-w-[380px] text-[12.5px] leading-5 text-[#6B7890]">{capability.reason}</p>
      <div className="mt-3.5 flex flex-wrap justify-center gap-2">{capability.fix && <FixButton fix={capability.fix} grant={capability.grant} />}</div>
    </div>
  );
}

/** A failed read: the mapped message, plus Try again and the permission fix when there is one. Never raw JSON. */
export function ErrorState({ error, onRetry, title, className, compact }: { error: YouTubeErrorInfo; onRetry?: () => void; title?: string; className?: string; compact?: boolean }) {
  const fix = error.action === "grant" || error.action === "reconnect" || error.action === "connect" ? error.action : null;
  return (
    <div role="alert" className={cn("flex flex-col items-center justify-center px-6 text-center", compact ? "py-6" : "py-12", className)}>
      <span className="grid size-10 place-items-center rounded-sm bg-[#FEF1F2] text-[#C81E2B] ring-1 ring-[#FBD5D9]">
        <AlertTriangle className="size-5" />
      </span>
      <p className="mt-3 text-[13.5px] font-semibold text-[#0F1B3D]">{title ?? error.title}</p>
      <p className="mt-1 max-w-[380px] text-[12.5px] leading-5 text-[#6B7890]">{error.message}</p>
      <div className="mt-3.5 flex flex-wrap justify-center gap-2">
        {fix && <FixButton fix={fix} grant={error.capability ?? undefined} />}
        {onRetry && error.retryable && <Button size="sm" variant="secondary" onClick={onRetry}>Try again</Button>}
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
          <div className="flex gap-3 p-4"><Skeleton className="size-16 rounded-sm" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-72" /><Skeleton className="h-3 w-full" /></div></div>
        </div>
        <div className={cn(yt.card, "p-4 xl:col-span-4")}><Skeleton className="h-4 w-32" /><div className="mt-4 flex gap-4"><Skeleton className="size-24 rounded-sm" /><div className="flex-1 space-y-2.5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-3 w-full" />)}</div></div></div>
      </div>
      <div className="grid grid-cols-2 gap-1 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className={cn(yt.card, "p-3.5")}><Skeleton className="h-3 w-20" /><Skeleton className="mt-3 h-6 w-24" /><Skeleton className="mt-2 h-3 w-28" /><Skeleton className="mt-3 h-8 w-full" /></div>
        ))}
      </div>
      <div className="grid gap-1 xl:grid-cols-12">
        <div className={cn(yt.card, "p-4 xl:col-span-8")}><Skeleton className="h-4 w-40" /><Skeleton className="mt-4 h-60 w-full" /></div>
        <div className={cn(yt.card, "p-4 xl:col-span-4")}><Skeleton className="h-4 w-32" /><Skeleton className="mx-auto mt-6 size-32 rounded-sm" /></div>
      </div>
    </div>
  );
}
