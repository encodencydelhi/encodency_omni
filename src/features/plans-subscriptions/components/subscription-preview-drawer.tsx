"use client";

import { ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/config/routes";
import { BillingStatusBadge, SubscriptionStatusBadge } from "@/features/companies/components/status-badges";
import { KeyValue, Panel, StatCard, StatGrid } from "@/features/companies/components/primitives";
import { companySectionHref } from "@/features/companies/data/config";
import { formatDate } from "@/lib/utils/format";
import { routes } from "../data/config";
import { useSubscription } from "../data/hooks";
import { overrideLabel } from "../data/selectors";
import type { SubscriptionDetail } from "../data/types";
import { money } from "../lib/money";
import { LegacyVersionTag, ScheduledKindBadge } from "./badges";
import { PlansError } from "./states";
import { PeriodCell } from "./subscription-table";
import type { useSubscriptionActions } from "./use-subscription-actions";

/** A quick look at one subscription without leaving the directory. */
export function SubscriptionPreviewDrawer({
  subscriptionId,
  actions,
  onClose,
}: {
  subscriptionId: string | null;
  actions: ReturnType<typeof useSubscriptionActions>;
  onClose: () => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const query = useSubscription(subscriptionId ?? "");

  return (
    <Sheet open={subscriptionId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        ref={contentRef}
        className="sm:max-w-md"
        // Land focus on the drawer itself so the first Esc closes it instead of dismissing a tooltip.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          contentRef.current?.focus();
        }}
      >
        {query.error && !query.data ? (
          <>
            <SheetHeader><SheetTitle>Subscription preview</SheetTitle><SheetDescription>This subscription could not be loaded.</SheetDescription></SheetHeader>
            <SheetBody><PlansError subject="Subscription" error={query.error} onRetry={() => void query.refetch()} back={{ href: routes.subscriptions, label: "Back to Subscriptions" }} /></SheetBody>
          </>
        ) : !query.data ? (
          <>
            <SheetHeader><SheetTitle>Subscription preview</SheetTitle><SheetDescription>Loading...</SheetDescription></SheetHeader>
            <SheetBody className="space-y-3"><Skeleton className="h-10 w-3/4" /><Skeleton className="h-24 w-full" /><Skeleton className="h-40 w-full" /></SheetBody>
          </>
        ) : (
          <PreviewContent detail={query.data} actions={actions} onClose={onClose} />
        )}
      </SheetContent>
    </Sheet>
  );
}

function PreviewContent({ detail, actions, onClose }: { detail: SubscriptionDetail; actions: ReturnType<typeof useSubscriptionActions>; onClose: () => void }) {
  const { row } = detail;
  const allowed = actions.can(row);
  const warnings = detail.entitlements.filter((item) => item.kind === "resource" && (item.status === "exceeded" || item.status === "near_limit"));

  return (
    <>
      <SheetHeader className="gap-2">
        <SheetTitle className="truncate">{row.company.name}</SheetTitle>
        <SheetDescription className="truncate">{row.id} · {row.company.displayId}</SheetDescription>
        <div className="flex flex-wrap items-center gap-1.5">
          <SubscriptionStatusBadge status={row.status} />
          <BillingStatusBadge status={row.billingStatus} />
        </div>
      </SheetHeader>
      <SheetBody className="space-y-3">
        <StatGrid className="grid-cols-2">
          <StatCard label="Recurring" value={<span className="text-base">{money(row.recurringMinor, row.currency)}</span>} hint={`per ${row.billingCycle === "annual" ? "year" : "month"}`} />
          <StatCard label="MRR contribution" value={<span className="text-base">{row.mrrMinor > 0 ? money(row.mrrMinor, row.currency) : "-"}</span>} hint={row.status === "trialing" ? "Trials are not MRR" : "Normalized monthly"} />
        </StatGrid>

        <Panel title="Subscription">
          <dl className="divide-y divide-border">
            <KeyValue label="Plan">{row.planName} v{row.planVersion} {row.isLegacyVersion ? <LegacyVersionTag version={row.planVersion} current={row.currentVersion} /> : null}</KeyValue>
            <KeyValue label="Billing cycle"><span className="capitalize">{row.billingCycle}</span></KeyValue>
            <KeyValue label={row.status === "trialing" ? "Trial end" : "Renewal"}><PeriodCell row={row} /></KeyValue>
            <KeyValue label="Started">{formatDate(row.startedAt)}</KeyValue>
          </dl>
        </Panel>

        <Panel title="Usage warnings" description={warnings.length === 0 ? undefined : `${warnings.length} above 90% or over`}>
          {warnings.length === 0 ? (
            <p className="text-[0.8125rem] text-muted-foreground">No resource is near or above its effective limit.</p>
          ) : (
            <ul className="divide-y divide-border">
              {warnings.map((item) => (
                <li key={item.key} className="flex items-center justify-between gap-2 py-1.5 text-[0.8125rem]">
                  <span>{item.name}</span>
                  <span className={item.status === "exceeded" ? "font-medium text-danger" : "font-medium text-warning"}>{item.used} / {item.effective?.effectiveValue === null ? "unlimited" : item.effective?.effectiveValue}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Active overrides">
          {row.activeOverrides === 0 ? (
            <p className="text-[0.8125rem] text-muted-foreground">No company-specific overrides.</p>
          ) : (
            <ul className="divide-y divide-border">
              {detail.entitlements
                .filter((item) => item.override)
                .slice(0, 3)
                .map((item) => (
                  <li key={item.key} className="flex items-center justify-between gap-2 py-1.5 text-[0.8125rem]">
                    <span>{item.name}</span>
                    <span className="text-2xs text-muted-foreground">{overrideLabel(item)} until {formatDate(item.override?.expiresAt ?? "")}</span>
                  </li>
                ))}
            </ul>
          )}
        </Panel>

        <Panel title="Upcoming changes">
          {detail.scheduled.length === 0 ? (
            <p className="text-[0.8125rem] text-muted-foreground">Nothing is scheduled.</p>
          ) : (
            <ul className="divide-y divide-border">
              {detail.scheduled.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2 py-1.5">
                  <span className="min-w-0"><ScheduledKindBadge kind={item.kind} /><span className="mt-0.5 block truncate text-2xs text-muted-foreground">{item.current} → {item.scheduled}</span></span>
                  <span className="shrink-0 text-2xs tabular text-muted-foreground">{formatDate(item.effectiveAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </SheetBody>
      <SheetFooter className="flex-wrap justify-between">
        <div className="flex flex-wrap gap-1.5">
          <Button asChild variant="outline" size="sm"><Link href={ROUTES.superAdmin.company(row.company.id)}>Open Company</Link></Button>
          <Button asChild variant="outline" size="sm"><Link href={companySectionHref(row.company.id, "usage")}>View Usage</Link></Button>
          <Button asChild variant="outline" size="sm"><Link href={companySectionHref(row.company.id, "billing")}>View Billing</Link></Button>
          {allowed.changePlan ? <Button variant="outline" size="sm" onClick={() => { actions.openFlow({ kind: "change", row }); onClose(); }}>Change Plan</Button> : null}
        </div>
        <Button asChild size="sm"><Link href={routes.subscription(row.id)}><ExternalLinkIcon />Open Full Subscription</Link></Button>
      </SheetFooter>
    </>
  );
}
