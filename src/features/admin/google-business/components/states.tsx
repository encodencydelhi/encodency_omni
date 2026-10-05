"use client";

import { useEffect, useState, type ComponentType } from "react";
import { Hourglass, KeyRound, LockKeyhole, PlugZap, RefreshCw, ShieldAlert, Sparkles, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { gbRoutes } from "../lib/constants";
import { discoverGoogleLocations, linkGoogleLocations, type GbpLocationChoice } from "../live/google-business-api";
import { ApiError } from "@/types/api";
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

/** Shown when the workspace has nothing to load: no Google login, a login to reconnect, or no location linked to this Client yet. */
export function NotConnectedState() {
  const { notConnected, reconnect } = useGbp();
  const [busy, setBusy] = useState(false);

  if (notConnected?.reason === "no_location" && notConnected.integrationId) {
    return <LocationPicker integrationId={notConnected.integrationId} />;
  }

  const reconnecting = notConnected?.reason === "reconnect";
  const connect = async () => {
    if (busy) return;
    setBusy(true);
    const started = await reconnect();
    // A successful start leaves the page for Google; only a failure comes back here.
    if (!started) setBusy(false);
  };

  return (
    <Card>
      <EmptyState
        icon={PlugZap}
        title={reconnecting ? "Reconnect Google Business" : "Connect Google Business"}
        description={
          reconnecting
            ? "The Google connection for this company has expired or was revoked. Sign in with Google again to load locations, reviews, posts, media and performance."
            : "Sign in with the Google account that manages your Business Profile. You will choose which locations belong to this client next."
        }
        action={
          <Button variant="primary" icon={PlugZap} loading={busy} onClick={() => void connect()}>
            {reconnecting ? "Reconnect with Google" : "Connect with Google"}
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

/** The Google login is connected; pick which of its locations belong to the active Client. */
function LocationPicker({ integrationId }: { integrationId: string }) {
  const { reload, reconnect } = useGbp();
  const [choices, setChoices] = useState<GbpLocationChoice[] | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    discoverGoogleLocations(integrationId)
      .then((list) => {
        if (cancelled) return;
        setChoices(list);
        if (list.length === 1) setPicked([list[0]!.id]);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const reason = (err as { reason?: string } | null)?.reason;
        setFailure(
          reason === "provider_quota_not_granted"
            ? "Google has not given this Google Cloud project any quota for the Business Profile API yet. In Google Cloud, open the My Business Account Management API, check its Quotas page (requests per minute should not be 0), and request Business Profile API access if Google has not approved it yet."
            : reason === "provider_rate_limited"
            ? "Google limits how often Business Profile locations can be requested (only a few times a minute). Wait about a minute, then try again."
            : reason === "provider_permission_required"
              ? "Google refused access. Make sure the Business Profile APIs are enabled for this Google Cloud project and that Google has approved the project's access."
              : ApiError.isApiError(err)
              ? err.message
              : "Google Business locations could not be loaded.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [integrationId]);

  const toggle = (id: string) => setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const link = async () => {
    if (!picked.length || saving) return;
    setSaving(true);
    try {
      await linkGoogleLocations(integrationId, picked);
      toast.success(picked.length === 1 ? "Location linked" : `${picked.length} locations linked`);
      reload();
    } catch (err) {
      toast.error(ApiError.isApiError(err) ? err.message : "The locations could not be linked", { description: "Only an owner or admin can link locations." });
      setSaving(false);
    }
  };

  if (failure) {
    return (
      <Card>
        <EmptyState
          icon={TriangleAlert}
          title="Could not load your Google locations"
          description={failure}
          action={
            <Button variant="primary" icon={RefreshCw} onClick={reload}>
              Try again
            </Button>
          }
          secondary={
            <Button variant="secondary" onClick={() => void reconnect()}>
              Connect a different Google account
            </Button>
          }
        />
      </Card>
    );
  }

  if (choices === null) return <Skeleton className="h-48 w-full" />;

  if (choices.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={PlugZap}
          title="No Business Profile locations found"
          description="This Google account does not manage any Business Profile locations. Sign in with the account that owns or manages them."
          action={
            <Button variant="primary" onClick={() => void reconnect()}>
              Connect a different Google account
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

  return (
    <Card>
      <div className="mx-auto max-w-[560px] px-5 py-8">
        <h2 className="text-[16px] font-semibold text-[#202124]">Choose locations for this client</h2>
        <p className="mt-1 text-[13px] text-[#5F6368]">These locations come from your connected Google account. Linked locations load their profile, reviews, posts, media and performance here.</p>
        <ul className="mt-4 space-y-2">
          {choices.map((choice) => (
            <li key={choice.id}>
              <label className={cn("flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-[13px]", picked.includes(choice.id) ? "border-[#1A73E8] bg-[#F1F6FE]" : "border-[#E8EAED] hover:bg-[#F8F9FA]")}>
                <input type="checkbox" className="size-4 accent-[#1A73E8]" checked={picked.includes(choice.id)} onChange={() => toggle(choice.id)} />
                <span className="min-w-0 flex-1 truncate font-medium text-[#202124]">{choice.name}</span>
              </label>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex justify-end">
          <Button variant="primary" loading={saving} disabled={!picked.length} onClick={() => void link()}>
            {picked.length > 1 ? `Link ${picked.length} locations` : "Link location"}
          </Button>
        </div>
      </div>
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
