"use client";

import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";
import { ENVIRONMENT_OPTIONS, RANGE_OPTIONS, WEBHOOK_TABS } from "../data/config";
import type { WebhookEnvironment, WebhookTimeRange } from "../data/types";
import { PageSkeleton } from "./kit";
import { useWebhooks, WebhooksProvider } from "./webhooks-context";

function Content({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { snapshot, isLoading, isFetching, error, refetch, environment, setEnvironment, range, setRange, customHours, setCustomHours } = useWebhooks();
  return <div className="space-y-2">
    <PageHeader
      title="Webhooks"
      description="Incoming sources, outgoing endpoints, delivery health and security controls."
      actions={
        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
          <Select value={environment} onValueChange={(value) => setEnvironment(value as WebhookEnvironment)}>
            <SelectTrigger size="sm" aria-label="Webhook environment" className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>{ENVIRONMENT_OPTIONS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={range} onValueChange={(value) => setRange(value as WebhookTimeRange)}>
            <SelectTrigger size="sm" aria-label="Webhook time range" className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>{RANGE_OPTIONS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
          </Select>
          {range === "custom" ? <Input aria-label="Custom range in hours" type="number" min={1} max={720} value={customHours} onChange={(event) => setCustomHours(Number(event.target.value))} className="h-8 w-20" /> : null}
          <Button variant="outline" size="sm" className="shrink-0" onClick={refetch}><RefreshCw className={cn("size-4", isFetching && "animate-spin")} />Refresh</Button>
        </div>
      }
    />
    <nav aria-label="Webhook sections" className="overflow-x-auto border-b border-border"><div className="flex min-w-max gap-1">{WEBHOOK_TABS.map(({ href, label, match }) => { const active = match === "exact" ? pathname === href : pathname.startsWith(href); return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("border-b-2 px-3 py-2 text-[12px] font-medium", active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>{label}</Link>; })}</div></nav>
    {isLoading || (!snapshot && !error) ? <PageSkeleton /> : error || !snapshot ? <div className="rounded-lg border border-border bg-card"><ErrorState error={error ?? new Error("Webhook data is unavailable")} onRetry={refetch} /></div> : children}
  </div>;
}

export function WebhooksShell({ children }: { children: ReactNode }) {
  return <WebhooksProvider><Content>{children}</Content></WebhooksProvider>;
}
