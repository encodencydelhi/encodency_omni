"use client";

import { ArrowRightIcon, BanIcon, CircleCheckIcon, CreditCardIcon, GaugeIcon, SquareArrowOutUpRightIcon } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/config/routes";
import { formatDate, getInitials } from "@/lib/utils/format";
import type { CompanyCapabilities } from "../data/capability-provider";
import { relativeTime } from "../data/clock";
import { OWNER_STATE_LABEL, USAGE_RESOURCE_BY_KEY, companySectionHref } from "../data/config";
import { useCompany } from "../data/hooks";
import type { CompanyFlow } from "./use-company-actions";
import type { CompanySummary } from "../data/types";
import { formatMrr, formatPercent1 } from "../lib/format";
import { KeyValue, Panel, StatCard, StatGrid } from "./primitives";
import { SectionError } from "./states";
import { AccountStatusBadge, BillingStatusBadge, HealthBadge, SeverityBadge, SubscriptionStatusBadge, UsageLevelBadge } from "./status-badges";

/**
 * A quick look at one tenant without leaving the list. It reads the company by
 * id, so it reflects a suspension or plan change the moment the cache refreshes.
 */
export function CompanyPreviewDrawer({
  companyId,
  fallback,
  capabilities,
  onOpenFlow,
  onClose,
}: {
  companyId: string | null;
  fallback: CompanySummary | undefined;
  capabilities: CompanyCapabilities;
  onOpenFlow: (flow: CompanyFlow) => void;
  onClose: () => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const query = useCompany(companyId ?? "");
  const summary = query.data ?? (fallback?.company.id === companyId ? fallback : undefined);

  return (
    <Sheet open={companyId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        ref={contentRef}
        className="sm:max-w-md"
        // Land focus on the drawer itself, not on the first tooltip trigger in the header:
        // otherwise the first Esc dismisses that tooltip instead of closing the drawer.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          contentRef.current?.focus();
        }}
      >
        {query.error && !summary ? (
          <>
            <SheetHeader>
              <SheetTitle>Company preview</SheetTitle>
              <SheetDescription>This company could not be loaded.</SheetDescription>
            </SheetHeader>
            <SheetBody>
              <SectionError subject="Company" error={query.error} onRetry={() => void query.refetch()} />
            </SheetBody>
          </>
        ) : !summary ? (
          <>
            <SheetHeader>
              <SheetTitle>Company preview</SheetTitle>
              <SheetDescription>Loading...</SheetDescription>
            </SheetHeader>
            <SheetBody className="space-y-3">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-40 w-full" />
            </SheetBody>
          </>
        ) : (
          <PreviewContent summary={summary} capabilities={capabilities} onOpenFlow={onOpenFlow} onClose={onClose} />
        )}
      </SheetContent>
    </Sheet>
  );
}

function PreviewContent({
  summary,
  capabilities,
  onOpenFlow,
  onClose,
}: {
  summary: CompanySummary;
  capabilities: CompanyCapabilities;
  onOpenFlow: (flow: CompanyFlow) => void;
  onClose: () => void;
}) {
  const { company, owner, usage } = summary;
  const id = company.id;
  const resource = usage.resource ? USAGE_RESOURCE_BY_KEY[usage.resource].label : null;

  return (
    <>
      <SheetHeader className="gap-2.5">
        <div className="flex items-center gap-3">
          <Avatar className="size-11 rounded-sm">
            {company.logoUrl ? <AvatarImage src={company.logoUrl} alt={company.name} /> : null}
            <AvatarFallback className="rounded-sm text-sm font-semibold">{getInitials(company.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <SheetTitle className="truncate">{company.name}</SheetTitle>
            <SheetDescription className="truncate">
              {company.domain ?? "No domain"} · {company.displayId}
            </SheetDescription>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <AccountStatusBadge status={company.accountStatus} />
          <SubscriptionStatusBadge status={summary.subscriptionStatus} labelled />
          <HealthBadge health={summary.health} />
        </div>
      </SheetHeader>

      <SheetBody className="space-y-3">
        <StatGrid className="grid-cols-2">
          <StatCard label="MRR" value={formatMrr(summary.mrrMinor, summary.currency)} hint={`${summary.plan.name} · ${summary.plan.billingCycle}`} href={companySectionHref(id, "billing")} />
          <StatCard label="Users" value={summary.counts.users} hint={`${summary.counts.activeUsers} active`} href={companySectionHref(id, "users")} />
          <StatCard label="Clients" value={summary.counts.clients} href={companySectionHref(id, "clients")} />
          <StatCard
            label="Connections"
            value={summary.counts.connections}
            hint={summary.counts.attentionConnections > 0 ? `${summary.counts.attentionConnections} need attention` : "All healthy"}
            href={companySectionHref(id, "integrations")}
          />
        </StatGrid>

        <Panel title="Account">
          <dl className="divide-y divide-border">
            <KeyValue label="Plan">{summary.plan.name} ({summary.plan.billingCycle})</KeyValue>
            <KeyValue label="Billing"><BillingStatusBadge status={summary.billingStatus} /></KeyValue>
            <KeyValue label="Usage">
              <span className="inline-flex items-center gap-1.5">
                {usage.utilization === null ? "-" : formatPercent1(usage.utilization)}
                {resource ? <span className="text-2xs text-muted-foreground">{resource}</span> : null}
                <UsageLevelBadge level={usage.level} />
              </span>
            </KeyValue>
            <KeyValue label="Owner">
              {owner.name}
              <span className="block text-2xs text-muted-foreground">{owner.email || OWNER_STATE_LABEL[owner.state]}</span>
            </KeyValue>
            <KeyValue label="Account manager">
              {summary.internalOwners.accountManager?.name ?? <span className="text-muted-foreground">Unassigned</span>}
            </KeyValue>
            <KeyValue label="Created">{formatDate(company.createdAt)}</KeyValue>
            <KeyValue label="Last active">{relativeTime(company.lastActiveAt)}</KeyValue>
          </dl>
        </Panel>

        <Panel title="Needs attention" description={summary.attention.length === 0 ? undefined : `${summary.attention.length} open`}>
          {summary.attention.length === 0 ? (
            <p className="text-[0.8125rem] text-muted-foreground">
              {company.accountStatus === "active" ? "No open issues." : `Issues are not tracked while the account is ${company.accountStatus}.`}
            </p>
          ) : (
            <ul className="space-y-2">
              {summary.attention.slice(0, 4).map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <SeverityBadge severity={item.severity} />
                      <span className="truncate text-[0.8125rem] font-medium text-foreground">{item.title}</span>
                    </div>
                    <p className="mt-0.5 truncate text-2xs text-muted-foreground">{item.description}</p>
                  </div>
                  <Button asChild variant="ghost" size="icon-sm" aria-label={item.actionLabel}>
                    <Link href={companySectionHref(id, item.section)}>
                      <ArrowRightIcon />
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </SheetBody>

      <SheetFooter className="flex-wrap justify-between">
        <div className="flex gap-1.5">
          <Button asChild variant="outline" size="sm">
            <Link href={companySectionHref(id, "billing")}>
              <CreditCardIcon />
              Billing
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={companySectionHref(id, "usage")}>
              <GaugeIcon />
              Usage
            </Link>
          </Button>
          {company.accountStatus === "active" && capabilities.canSuspendCompany ? (
            <Button variant="outline" size="sm" className="text-danger" onClick={() => { onOpenFlow({ kind: "suspend", targets: [summary] }); onClose(); }}>
              <BanIcon />
              Suspend
            </Button>
          ) : null}
          {company.accountStatus === "suspended" && capabilities.canReactivateCompany ? (
            <Button variant="outline" size="sm" onClick={() => { onOpenFlow({ kind: "reactivate", targets: [summary] }); onClose(); }}>
              <CircleCheckIcon />
              Reactivate
            </Button>
          ) : null}
        </div>
        <Button asChild size="sm">
          <Link href={ROUTES.superAdmin.company(id)}>
            <SquareArrowOutUpRightIcon />
            Open full company
          </Link>
        </Button>
      </SheetFooter>
    </>
  );
}
