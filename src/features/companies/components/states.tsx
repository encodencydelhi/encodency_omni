"use client";

import { AlertTriangleIcon, ArrowLeftIcon, PlugZapIcon, RefreshCwIcon, SearchXIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/utils/cn";
import { ApiError } from "@/types/api";
import { COMPANIES_MOCK_MODE, type GlobalModule } from "../data/config";
import { ModuleLinkButton } from "./module-link";
import { Panel } from "./primitives";

/**
 * Error presentation for every tenant screen.
 *
 * Each screen names what failed ("Billing data unavailable") and offers a way
 * out: retry, back to the list, or the related global module.
 */
export function SectionError({
  subject,
  error,
  onRetry,
  module,
  className,
}: {
  /** What could not be loaded, e.g. "Billing data". */
  subject: string;
  error: unknown;
  onRetry?: () => void;
  module?: { key: GlobalModule; label: string };
  className?: string;
}) {
  const api = ApiError.isApiError(error) ? error : null;
  const notFound = api?.code === "NOT_FOUND";
  const notConnected = api?.code === "SERVICE_UNAVAILABLE" && !COMPANIES_MOCK_MODE;

  const title = notFound ? "Company not found" : notConnected ? "Tenant service not connected" : `${subject} unavailable`;
  const description = notFound
    ? "This company does not exist, or it was removed from this demo workspace."
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
            <Link href={ROUTES.superAdmin.companies}>
              <ArrowLeftIcon />
              Back to Companies
            </Link>
          </Button>
          {module ? <ModuleLinkButton module={module.key}>Open {module.label}</ModuleLinkButton> : null}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Skeletons                                                           */
/* ------------------------------------------------------------------ */

export function StatGridSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid gap-1", className)}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="rounded-sm border border-border bg-card px-3 py-2.5">
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="mt-2.5 h-5 w-14" />
          <Skeleton className="mt-2 h-2.5 w-24" />
        </div>
      ))}
    </div>
  );
}

export function PanelSkeleton({ rows = 4, title = true, className }: { rows?: number; title?: boolean; className?: string }) {
  return (
    <Panel className={className}>
      {title ? <Skeleton className="mb-3 h-3.5 w-32" /> : null}
      <div className="space-y-2.5">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function TableSkeleton({ rows = 6, columns = 6, className }: { rows?: number; columns?: number; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-sm border border-border bg-card", className)}>
      <div className="flex gap-4 border-b border-border bg-surface-sunken px-4 py-2.5">
        {Array.from({ length: columns }, (_, index) => (
          <Skeleton key={index} className="h-2.5 w-16" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-b-0">
          {Array.from({ length: columns }, (_, column) => (
            <Skeleton key={column} className={cn("h-3.5", column === 0 ? "w-40" : "w-16")} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Wraps a page section so its skeleton, error and empty states are handled in one place. */
export function SectionBoundary({
  isPending,
  error,
  onRetry,
  subject,
  module,
  skeleton,
  children,
}: {
  isPending: boolean;
  error: unknown;
  onRetry: () => void;
  subject: string;
  module?: { key: GlobalModule; label: string };
  skeleton: ReactNode;
  children: ReactNode;
}) {
  if (error) return <SectionError subject={subject} error={error} onRetry={onRetry} module={module} />;
  if (isPending) return <>{skeleton}</>;
  return <>{children}</>;
}
