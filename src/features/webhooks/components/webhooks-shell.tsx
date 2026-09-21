/**
 * EnCodency OmniPlatform - Super Admin Webhooks Module
 * Module shell: header, global webhook context, eight-section navigation and the data gate.
 */

"use client";

import { ArrowDownLeftIcon, ArrowUpRightIcon, MoreHorizontalIcon, RefreshCwIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";
import { DEMO_DATA_LABEL, DEMO_DATA_NOTICE, ENVIRONMENT_OPTIONS, RANGE_OPTIONS, WEBHOOK_ROUTES, WEBHOOK_TABS } from "../data/config";
import { freshness } from "../data/selectors";
import type { WebhookEnvironment, WebhookTimeRange } from "../data/types";
import { PageSkeleton, Timestamp } from "./kit";
import { useWebhooks, WebhooksProvider } from "./webhooks-context";

function ModuleTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Webhooks sections" className="overflow-x-auto border-b border-border scrollbar-thin">
      <ul className="flex min-w-max gap-0.5">
        {WEBHOOK_TABS.map((tab) => {
          const active = tab.match === "exact" ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex px-3 py-2.5 text-[0.8125rem] font-medium outline-none transition-colors focus-visible:bg-accent",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
                {active ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function ContextBar() {
  const { environment, range, customHours, snapshot, setEnvironment, setRange, setCustomHours, isFetching, refetch } = useWebhooks();
  const fresh = snapshot ? freshness(snapshot) : null;
  return (
    <div className="rounded-sm border border-border bg-card px-3.5 py-2.5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <Badge tone="brand">{DEMO_DATA_LABEL}</Badge>
          <Badge tone="neutral">{DEMO_DATA_NOTICE}</Badge>
          {fresh ? (
            <span className="inline-flex flex-wrap items-center gap-1.5 text-2xs text-muted-foreground">
              Last recorded event
              <span className="text-foreground">
                <Timestamp iso={fresh.lastRecordedAt} relative={false} />
              </span>
              <Badge tone={fresh.state === "fresh" ? "info" : "warning"} title="Demo clock. This is not live monitoring.">
                {fresh.state === "fresh" ? "Recent (demo clock)" : fresh.state === "stale" ? `Stale: ${fresh.ageMinutes} min old` : "No data"}
              </Badge>
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={environment} onValueChange={(value) => setEnvironment(value as WebhookEnvironment)}>
            <SelectTrigger size="sm" aria-label="Environment" className="w-auto min-w-[9.5rem] gap-1.5">
              <span className="text-muted-foreground">Environment:</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENVIRONMENT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={range} onValueChange={(value) => setRange(value as WebhookTimeRange)}>
            <SelectTrigger size="sm" aria-label="Time range" className="w-auto min-w-[9rem] gap-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {range === "custom" ? (
            <label className="inline-flex items-center gap-1.5 text-[0.8125rem] text-muted-foreground">
              Hours
              <Input
                type="number"
                min={1}
                max={720}
                value={customHours}
                onChange={(event) => setCustomHours(Number(event.target.value))}
                aria-label="Custom range in hours"
                className="h-8 w-20"
              />
            </label>
          ) : null}
          <Button variant="ghost" size="icon-sm" aria-label="Refresh demo data" onClick={refetch}>
            <RefreshCwIcon className={cn(isFetching && "animate-spin")} />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ModuleHeader() {
  return (
    <PageHeader
      title="Webhooks"
      description="Manage webhook sources, event subscriptions, deliveries and processing failures across OmniPlatform."
      actions={
        <>
          <Button asChild variant="outline" size="sm">
            <Link href={WEBHOOK_ROUTES.incoming}>
              <ArrowDownLeftIcon />
              View Incoming
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={WEBHOOK_ROUTES.outgoing}>
              <ArrowUpRightIcon />
              View Outgoing
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontalIcon />
                More
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuItem asChild><Link href={`${WEBHOOK_ROUTES.deliveries}?state=failed`}>Review Failed Deliveries</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href={WEBHOOK_ROUTES.subscriptions}>View Event Subscriptions</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href={`${WEBHOOK_ROUTES.incomingEvents}?verification=rejected`}>Review Verification Failures</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href={WEBHOOK_ROUTES.activity}>Open Webhook Activity</Link></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      }
    />
  );
}

function Gate({ children }: { children: ReactNode }) {
  const { isLoading, error, snapshot, refetch } = useWebhooks();
  if (isLoading || (!snapshot && !error)) return <PageSkeleton />;
  if (error || !snapshot) {
    return (
      <div className="rounded-sm border border-border bg-card">
        <ErrorState error={error ?? new Error("Webhook data is unavailable")} onRetry={refetch} />
      </div>
    );
  }
  return <>{children}</>;
}

export function WebhooksShell({ children }: { children: ReactNode }) {
  return (
    <WebhooksProvider>
      <div className="space-y-1">
        <ModuleHeader />
        <ContextBar />
        <ModuleTabs />
        <Gate>{children}</Gate>
      </div>
    </WebhooksProvider>
  );
}
