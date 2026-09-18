"use client";

import { useState, type ComponentType } from "react";
import { Hourglass, KeyRound, LockKeyhole, PlugZap, RefreshCw, ServerOff, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { xRoutes } from "../lib/constants";
import { useX } from "../store/x-store";
import type { Capability } from "../x-data/types";
import { Button, Card, EmptyState, Skeleton, x } from "./ui";

const FIX_META: Record<NonNullable<Capability["fix"]>, { icon: ComponentType<{ className?: string }>; title: string }> = {
  reconnect: { icon: KeyRound, title: "Permission required" },
  request_access: { icon: LockKeyhole, title: "You don't have access" },
  wait: { icon: Hourglass, title: "Temporarily unavailable" },
  connect: { icon: PlugZap, title: "No account connected" },
};

/**
 * Replaces a section the current user can't see. Always names the reason and
 * offers the action that unblocks them.
 */
export function CapabilityState({
  capability,
  title,
  className,
  compact,
}: {
  capability: Capability;
  title?: string;
  className?: string;
  compact?: boolean;
}) {
  const { reconnect, can } = useX();
  const [busy, setBusy] = useState(false);
  const meta = FIX_META[capability.fix ?? "request_access"];
  const Icon = meta.icon ?? ShieldAlert;

  return (
    <div className={cn("flex flex-col items-center justify-center px-6 text-center", compact ? "py-6" : "py-12", className)}>
      <span className="grid size-10 place-items-center rounded-sm bg-[#F3F5F9] text-[#6B7890] ring-1 ring-[#E4E9F0]">
        <Icon className="size-5" />
      </span>
      <p className="mt-3 text-[13.5px] font-semibold text-[#0F1B3D]">{title ?? meta.title}</p>
      <p className="mt-1 max-w-[380px] text-[12.5px] leading-5 text-[#6B7890]">{capability.reason}</p>
      <div className="mt-3.5 flex flex-wrap justify-center gap-2">
        {(capability.fix === "reconnect" || capability.fix === "connect") && (
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
            {capability.fix === "connect" ? "Connect X account" : "Reconnect account"}
          </Button>
        )}
        {capability.fix === "request_access" && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => toast.success("Access request sent", { description: "Workspace owners have been notified." })}
          >
            Request access
          </Button>
        )}
        {capability.fix === "wait" && (
          <Button size="sm" variant="secondary" href={`${xRoutes.settings}#sync`}>
            View API usage
          </Button>
        )}
      </div>
    </div>
  );
}

/** Shown when the repository itself can't be reached — never fake data instead. */
export function ServiceUnavailableState({ message, hint }: { message: string; hint: string }) {
  const { retryLoad } = useX();
  return (
    <Card>
      <EmptyState
        icon={ServerOff}
        title="X service not connected"
        description={
          <>
            {message}
            <span className="mt-2 block text-[12px] text-[#98A2B3]">{hint}</span>
          </>
        }
        action={
          <Button variant="primary" icon={RefreshCw} onClick={retryLoad}>
            Try again
          </Button>
        }
        secondary={
          <Button variant="secondary" href="/admin/integrations">
            Open integrations
          </Button>
        }
      />
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Skeletons                                                           */
/* ------------------------------------------------------------------ */

export function PageSkeleton({ variant = "dashboard" }: { variant?: "dashboard" | "table" | "detail" | "inbox" | "settings" }) {
  if (variant === "table") {
    return (
      <div className="space-y-1" aria-busy="true" aria-label="Loading">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-28" />
        </div>
        <div className={cn(x.card, "overflow-hidden")}>
          <div className="flex gap-2 border-b border-[#EEF1F5] p-3">
            {[0, 1, 2, 3, 4].map((index) => (
              <Skeleton key={index} className="h-7 w-24" />
            ))}
          </div>
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="flex items-center gap-3 border-b border-[#EEF1F5] px-3 py-3 last:border-0">
              <Skeleton className="size-11 rounded-sm" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-3/5" />
                <Skeleton className="h-2.5 w-1/4" />
              </div>
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-3 w-14" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "inbox") {
    return (
      <div className="space-y-1" aria-busy="true" aria-label="Loading">
        <div className="grid grid-cols-2 gap-1 md:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className={cn(x.card, "p-3.5")}>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-3 h-6 w-16" />
            </div>
          ))}
        </div>
        <div className={cn(x.card, "overflow-hidden")}>
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="flex gap-3 border-b border-[#EEF1F5] p-4 last:border-0">
              <Skeleton className="size-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "detail") {
    return (
      <div className="space-y-1" aria-busy="true" aria-label="Loading">
        <div className={cn(x.card, "p-4")}>
          <div className="flex gap-3">
            <Skeleton className="size-11 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-40 w-full max-w-md" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1 md:grid-cols-6">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className={cn(x.card, "p-3.5")}>
              <Skeleton className="h-3 w-16" />
              <Skeleton className="mt-3 h-6 w-20" />
            </div>
          ))}
        </div>
        <div className={cn(x.card, "p-4")}>
          <Skeleton className="h-56 w-full" />
        </div>
      </div>
    );
  }

  if (variant === "settings") {
    return (
      <div className="grid gap-1 lg:grid-cols-[220px_minmax(0,1fr)]" aria-busy="true" aria-label="Loading">
        <div className={cn(x.card, "space-y-2 p-3")}>
          {Array.from({ length: 9 }, (_, index) => (
            <Skeleton key={index} className="h-7 w-full" />
          ))}
        </div>
        <div className="space-y-1">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className={cn(x.card, "space-y-3 p-4")}>
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-9 w-full max-w-sm" />
              <Skeleton className="h-9 w-full max-w-sm" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1" aria-busy="true" aria-label="Loading">
      <div className={cn(x.card, "overflow-hidden")}>
        <Skeleton className="h-24 w-full rounded-none" />
        <div className="flex gap-3 p-4">
          <Skeleton className="size-16 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-52" />
            <Skeleton className="h-3 w-72" />
            <Skeleton className="h-3 w-full max-w-lg" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className={cn(x.card, "p-3.5")}>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-6 w-24" />
            <Skeleton className="mt-2 h-3 w-28" />
            <Skeleton className="mt-3 h-8 w-full" />
          </div>
        ))}
      </div>
      <div className="grid gap-1 xl:grid-cols-12">
        <div className={cn(x.card, "p-4 xl:col-span-8")}>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-4 h-60 w-full" />
        </div>
        <div className={cn(x.card, "p-4 xl:col-span-4")}>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mx-auto mt-6 size-28 rounded-full" />
          <div className="mt-6 space-y-2">
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-3 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Inline row skeletons for cards that load independently of the page. */
export function ListSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-2 p-4", className)} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-sm" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}
