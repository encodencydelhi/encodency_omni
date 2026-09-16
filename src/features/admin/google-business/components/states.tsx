"use client";

import { useState, type ComponentType } from "react";
import { Hourglass, KeyRound, LockKeyhole, PlugZap, RefreshCw, ShieldAlert, Sparkles, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { gbRoutes } from "../lib/constants";
import { useGbp } from "../store/gbp-store";
import type { Capability } from "../types";
import { Button, Card, EmptyState, Skeleton, gb } from "./ui";

const FIX_META: Record<NonNullable<Capability["fix"]>, { icon: ComponentType<{ className?: string }>; title: string }> = {
  reconnect: { icon: KeyRound, title: "Permission required" },
  request_access: { icon: LockKeyhole, title: "You do not have access" },
  verify_location: { icon: ShieldAlert, title: "Location not verified" },
  wait: { icon: Hourglass, title: "Temporarily unavailable" },
  connect: { icon: PlugZap, title: "No account connected" },
};

export function CapabilityState({ capability, title, className, compact }: { capability: Capability; title?: string; className?: string; compact?: boolean }) {
  const { reconnect, can } = useGbp();
  const [busy, setBusy] = useState(false);
  const meta = FIX_META[capability.fix ?? "request_access"];
  const Icon = meta.icon ?? ShieldAlert;

  return (
    <div className={cn("flex flex-col items-center justify-center px-6 text-center", compact ? "py-6" : "py-12", className)}>
      <span className="grid size-10 place-items-center rounded-xl bg-[#F1F3F4] text-[#5F6368] ring-1 ring-[#E8EAED]">
        <Icon className="size-5" />
      </span>
      <p className="mt-3 text-[13.5px] font-medium text-[#202124]">{title ?? meta.title}</p>
      <p className="mt-1 max-w-[400px] text-[12.5px] leading-5 text-[#5F6368]">{capability.reason}</p>
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
            {capability.fix === "connect" ? "Connect Google Business" : "Reconnect permissions"}
          </Button>
        )}
        {capability.fix === "request_access" && (
          <Button size="sm" variant="secondary" onClick={() => toast.success("Access request sent", { description: "Workspace owners have been notified." })}>
            Request access
          </Button>
        )}
        {capability.fix === "verify_location" && (
          <Button size="sm" variant="secondary" href={gbRoutes.businessProfileManager} external>
            Open Business Profile Manager
          </Button>
        )}
      </div>
    </div>
  );
}

/** Shown when GBP_MOCK_MODE is off and no live provider is wired up yet. */
export function NotConnectedState() {
  return (
    <Card>
      <EmptyState
        icon={PlugZap}
        title="Google Business API not connected"
        description="This workspace has no live Google Business Profile connection yet. Connect an account to load locations, reviews, posts, media and performance data."
        action={
          <Button variant="primary" href={`${gbRoutes.settings}#connection`}>
            Open connection settings
          </Button>
        }
        secondary={
          <Button variant="secondary" href={gbRoutes.businessProfileManager} external>
            Open Business Profile Manager
          </Button>
        }
      />
    </Card>
  );
}

export function LoadErrorState({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <Card>
      <EmptyState
        icon={TriangleAlert}
        title="We could not load your Google Business data"
        description={message ?? "OmniPlatform could not reach its Google Business service. Your profile is not affected."}
        action={
          <Button variant="primary" icon={RefreshCw} onClick={onRetry}>
            Try again
          </Button>
        }
        secondary={
          <Button variant="secondary" href={`${gbRoutes.settings}#connection`}>
            Check connection
          </Button>
        }
      />
    </Card>
  );
}

export function InternalFeatureNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 text-[11.5px] leading-4 text-[#5F6368]">
      <Sparkles className="mt-px size-3 shrink-0 text-[#8430CE]" />
      <span>{children}</span>
    </p>
  );
}

export function PageSkeleton({ variant = "dashboard" }: { variant?: "dashboard" | "table" | "detail" | "grid" }) {
  if (variant === "table") {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading">
        <Skeleton className="h-8 w-52" />
        <div className={cn(gb.card, "overflow-hidden")}>
          <div className="flex gap-2 border-b border-[#F1F3F4] p-3">
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-8 w-28" />
            ))}
          </div>
          {Array.from({ length: 7 }, (_, index) => (
            <div key={index} className="flex items-center gap-3 border-b border-[#F1F3F4] px-3 py-3 last:border-0">
              <Skeleton className="size-4" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-2/5" />
                <Skeleton className="h-2.5 w-1/4" />
              </div>
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (variant === "grid") {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
          {Array.from({ length: 12 }, (_, index) => (
            <div key={index} className={cn(gb.card, "overflow-hidden")}>
              <Skeleton className="aspect-[4/3] w-full rounded-none" />
              <div className="space-y-1.5 p-2.5">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-2.5 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (variant === "detail") {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading">
        <div className={cn(gb.card, "p-4")}>
          <Skeleton className="h-5 w-64" />
          <Skeleton className="mt-2 h-3 w-80" />
          <Skeleton className="mt-4 h-8 w-72" />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className={cn(gb.card, "p-3.5")}>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-3 h-6 w-16" />
            </div>
          ))}
        </div>
        <div className={cn(gb.card, "p-4")}>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className={cn(gb.card, "p-3.5")}>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-6 w-16" />
            <Skeleton className="mt-2 h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="grid gap-3 xl:grid-cols-12">
        <div className={cn(gb.card, "p-4 xl:col-span-8")}>
          <Skeleton className="h-4 w-44" />
          <Skeleton className="mt-4 h-60 w-full" />
        </div>
        <div className={cn(gb.card, "p-4 xl:col-span-4")}>
          <Skeleton className="h-4 w-36" />
          <div className="mt-4 space-y-2.5">
            {[0, 1, 2, 3, 4].map((index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        </div>
      </div>
      <div className="grid gap-3 xl:grid-cols-12">
        <div className={cn(gb.card, "p-4 xl:col-span-7")}>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-4 h-40 w-full" />
        </div>
        <div className={cn(gb.card, "p-4 xl:col-span-5")}>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-4 h-40 w-full" />
        </div>
      </div>
    </div>
  );
}
