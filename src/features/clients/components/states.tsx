"use client";

import { AlertTriangleIcon, ArrowLeftIcon, PlugZapIcon, RefreshCwIcon, SearchXIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { ApiError } from "@/types/api";
import { CLIENTS_LIST_ROUTE, CLIENTS_MOCK_MODE } from "../data/config";

export { PanelSkeleton, StatGridSkeleton, TableSkeleton } from "@/features/companies/components/states";

/** Error presentation for every client screen: what failed, and a way out. */
export function ClientError({ subject, error, onRetry, className }: { subject: string; error: unknown; onRetry?: () => void; className?: string }) {
  const api = ApiError.isApiError(error) ? error : null;
  const notFound = api?.code === "NOT_FOUND";
  const notConnected = api?.code === "SERVICE_UNAVAILABLE" && !CLIENTS_MOCK_MODE;

  const title = notFound ? "Client not found" : notConnected ? "Client service not connected" : `${subject} unavailable`;
  const description = notFound
    ? "This client does not exist, or it was removed from this demo workspace. Check the link or return to the client list."
    : (api?.message ?? "The request did not complete. Nothing was changed.");
  const Icon = notFound ? SearchXIcon : notConnected ? PlugZapIcon : AlertTriangleIcon;

  return (
    <div className={cn("rounded-sm border border-border bg-card", className)} role="alert">
      <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <span className="flex size-10 items-center justify-center rounded-sm bg-danger-subtle text-danger">
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mx-auto max-w-md text-[0.8125rem] text-muted-foreground">{description}</p>
        </div>
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          {onRetry && !notFound ? (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCwIcon />
              Retry
            </Button>
          ) : null}
          <Button asChild variant="outline" size="sm">
            <Link href={CLIENTS_LIST_ROUTE}>
              <ArrowLeftIcon />
              Back to Clients
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
