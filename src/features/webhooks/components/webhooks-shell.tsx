"use client";

import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { PageSkeleton } from "./kit";
import { useWebhooks, WebhooksProvider } from "./webhooks-context";

const tabs = [
  ["/super-admin/webhooks", "Overview"],
  ["/super-admin/webhooks/outgoing", "Endpoints"],
  ["/super-admin/webhooks/deliveries", "Deliveries"],
  ["/super-admin/webhooks/failures", "Failures"],
] as const;

function Content({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { snapshot, isLoading, isFetching, error, refetch } = useWebhooks();
  return <div className="space-y-2">
    <PageHeader title="Outgoing Webhooks" description="Live endpoint configuration and delivery outcomes across OmniPlatform." actions={<Button variant="outline" size="sm" onClick={refetch}><RefreshCw className={cn("size-4", isFetching && "animate-spin")} />Refresh</Button>} />
    <nav className="overflow-x-auto border-b border-border"><div className="flex min-w-max gap-1">{tabs.map(([href, label]) => { const active = href === "/super-admin/webhooks" ? pathname === href : pathname.startsWith(href); return <Link key={href} href={href} className={cn("border-b-2 px-3 py-2 text-[12px] font-medium", active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>{label}</Link>; })}</div></nav>
    {isLoading || (!snapshot && !error) ? <PageSkeleton /> : error || !snapshot ? <div className="rounded-lg border border-border bg-card"><ErrorState error={error ?? new Error("Webhook data is unavailable")} onRetry={refetch} /></div> : children}
  </div>;
}

export function WebhooksShell({ children }: { children: ReactNode }) {
  return <WebhooksProvider><Content>{children}</Content></WebhooksProvider>;
}
