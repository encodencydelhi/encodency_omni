"use client";

import { AlertTriangleIcon, ArrowLeftIcon, PlugZapIcon, RefreshCwIcon, SearchXIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { ApiError } from "@/types/api";
import { FLAGS_MOCK_MODE, flagRoutes } from "../data/config";

export { PanelSkeleton, StatGridSkeleton, TableSkeleton } from "@/features/companies/components/states";

/** Error presentation for every screen: what failed, and a way out. */
export function FlagsError({ subject, error, onRetry, back = { href: flagRoutes.root, label: "Back to Feature Flags" }, className }: { subject: string; error: unknown; onRetry?: () => void; back?: { href: string; label: string }; className?: string }) {
  const api = ApiError.isApiError(error) ? error : null;
  const notFound = api?.code === "NOT_FOUND";
  const notConnected = api?.code === "SERVICE_UNAVAILABLE" && !FLAGS_MOCK_MODE;
  const title = notFound ? `${subject} Not Found` : notConnected ? "Feature Management Service Not Connected" : `${subject} Unavailable`;
  const description = notFound ? "It does not exist, or it was removed from this demo workspace. Check the link or go back." : (api?.message ?? "The request did not complete. Nothing was changed.");
  const Icon = notFound ? SearchXIcon : notConnected ? PlugZapIcon : AlertTriangleIcon;
  return (
    <div className={cn("rounded-sm border border-border bg-card", className)} role="alert">
      <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
        <span className="flex size-10 items-center justify-center rounded-sm bg-danger-subtle text-danger"><Icon className="size-5" aria-hidden /></span>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mx-auto max-w-md text-[0.8125rem] text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {onRetry && !notFound ? <Button variant="outline" size="sm" onClick={onRetry}><RefreshCwIcon />Retry</Button> : null}
          <Button asChild variant="outline" size="sm"><Link href={back.href}><ArrowLeftIcon />{back.label}</Link></Button>
        </div>
      </div>
    </div>
  );
}
