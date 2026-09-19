"use client";

import { MoreHorizontalIcon, RepeatIcon, ShieldPlusIcon } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ActionMenu } from "@/components/shared/action-menu";
import { AlertBanner } from "@/components/shared/alert-banner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/config/routes";
import { KeyValue, Panel, StatCard, StatGrid } from "@/features/companies/components/primitives";
import { BillingStatusBadge, SubscriptionStatusBadge } from "@/features/companies/components/status-badges";
import { PanelSkeleton } from "@/features/companies/components/states";
import { ModuleLinkButton } from "@/features/companies/components/module-link";
import { USAGE_RESOURCE_BY_KEY, companySectionHref } from "@/features/companies/data/config";
import { platformNow, relativeTime } from "@/features/companies/data/clock";
import { cn } from "@/lib/utils/cn";
import { formatDate, formatDateTime } from "@/lib/utils/format";
import { DemoTag, LegacyVersionTag, ScheduledKindBadge, ScheduledStatusBadge } from "../components/badges";
import { EntitlementTable } from "../components/entitlement-table";
import { MiniTable } from "../components/mini-table";
import { PlansError } from "../components/states";
import { PeriodCell } from "../components/subscription-table";
import { useSubscriptionActions } from "../components/use-subscription-actions";
import { PLANS_MOCK_MODE, SUBSCRIPTION_SECTIONS, routes, type SubscriptionSection } from "../data/config";
import { describeError, usePlanMutations, useSubscription } from "../data/hooks";
import { overrideLabel } from "../data/selectors";
import type { SubscriptionDetail } from "../data/types";
import { money } from "../lib/money";

function sectionOf(value: string | null): SubscriptionSection {
  return SUBSCRIPTION_SECTIONS.find((item) => item.key === value)?.key ?? "overview";
}

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

function OverviewSection({ detail, actions }: { detail: SubscriptionDetail; actions: ReturnType<typeof useSubscriptionActions> }) {
  const { row, plan, company } = detail;
  const overridden = detail.entitlements.filter((item) => item.override);
  const highest = detail.usageSummary.highest;

  return (
    <div className="grid grid-cols-1 gap-1 lg:grid-cols-3">
      <Panel title="Company" action={<Button asChild variant="ghost" size="sm"><Link href={ROUTES.superAdmin.company(company.id)}>Open Company</Link></Button>}>
        <dl className="divide-y divide-border">
          <KeyValue label="Name">{company.name}</KeyValue>
          <KeyValue label="Company ID">{company.displayId}</KeyValue>
          <KeyValue label="Owner">{company.ownerName}</KeyValue>
          <KeyValue label="Account status"><span className="capitalize">{company.accountStatus}</span></KeyValue>
        </dl>
        <p className="mt-2 text-2xs text-muted-foreground">The company account and its subscription are separate: cancelling one never changes the other.</p>
      </Panel>

      <Panel title="Plan & pricing" action={plan ? <Button asChild variant="ghost" size="sm"><Link href={routes.plan(plan.id)}>Open Plan</Link></Button> : undefined}>
        <dl className="divide-y divide-border">
          <KeyValue label="Plan">{row.planName}</KeyValue>
          <KeyValue label="Version">v{row.planVersion} {row.isLegacyVersion ? <LegacyVersionTag version={row.planVersion} current={row.currentVersion} /> : null}</KeyValue>
          <KeyValue label="Billing cycle"><span className="capitalize">{row.billingCycle}</span></KeyValue>
          <KeyValue label="Recurring price">{money(row.recurringMinor, row.currency)} / {row.billingCycle === "annual" ? "year" : "month"}</KeyValue>
          <KeyValue label="MRR contribution">{row.mrrMinor > 0 ? money(row.mrrMinor, row.currency) : <span className="text-muted-foreground">{row.status === "trialing" ? "Trial - none" : "None"}</span>}</KeyValue>
        </dl>
      </Panel>

      <Panel title="Dates">
        <dl className="divide-y divide-border">
          <KeyValue label="Subscription start">{formatDate(row.startedAt)}</KeyValue>
          {row.trialEndsAt ? <KeyValue label="Trial end">{formatDate(row.trialEndsAt)}</KeyValue> : null}
          <KeyValue label="Renewal">{row.status === "cancelled" || row.status === "expired" ? "Ended" : formatDate(row.renewsAt)}</KeyValue>
          <KeyValue label="Scheduled cancellation">{row.scheduledCancellationAt ? formatDate(row.scheduledCancellationAt) : <span className="text-muted-foreground">None</span>}</KeyValue>
          {detail.extendedDays > 0 ? <KeyValue label="Trial extended">{detail.extendedDays} days</KeyValue> : null}
        </dl>
      </Panel>

      <Panel title="Billing health" action={<Button asChild variant="ghost" size="sm"><Link href={companySectionHref(company.id, "billing")}>Review Billing</Link></Button>}>
        <dl className="divide-y divide-border">
          <KeyValue label="Billing status"><BillingStatusBadge status={row.billingStatus} /></KeyValue>
          <KeyValue label="Payment method">{detail.paymentMethodLabel ?? <span className="text-muted-foreground">None on file</span>}</KeyValue>
          <KeyValue label="Open invoice">{detail.openInvoiceNumber ?? <span className="text-muted-foreground">None</span>}</KeyValue>
        </dl>
        <p className="mt-2 text-2xs text-muted-foreground">Invoices and payments are managed in Billing. This screen never claims a payment was collected.</p>
      </Panel>

      <Panel title="Usage snapshot" action={<Button asChild variant="ghost" size="sm"><Link href={companySectionHref(company.id, "usage")}>Review Usage</Link></Button>}>
        <dl className="divide-y divide-border">
          <KeyValue label="Over an effective limit"><span className={detail.usageSummary.exceeded > 0 ? "font-medium text-danger" : undefined}>{detail.usageSummary.exceeded}</span></KeyValue>
          <KeyValue label="Near a limit">{detail.usageSummary.nearLimit}</KeyValue>
          <KeyValue label="Highest utilisation">{highest ? `${highest.utilization}% (${USAGE_RESOURCE_BY_KEY[highest.resource].label})` : "-"}</KeyValue>
        </dl>
      </Panel>

      <Panel
        title="Active overrides"
        action={actions.can(row).override ? <Button variant="ghost" size="sm" onClick={() => actions.openFlow({ kind: "override", row })}><ShieldPlusIcon />Apply</Button> : undefined}
      >
        {overridden.length === 0 ? (
          <p className="text-[0.8125rem] text-muted-foreground">No company-specific overrides.</p>
        ) : (
          <ul className="divide-y divide-border">
            {overridden.map((item) => (
              <li key={item.key} className="flex items-start justify-between gap-2 py-1.5 text-[0.8125rem]">
                <span>{item.name}<span className="block text-2xs text-muted-foreground">until {formatDate(item.override?.expiresAt ?? "")}</span></span>
                <span className="text-right tabular text-foreground">{overrideLabel(item)}<span className="block text-2xs text-muted-foreground">effective {item.effective?.effectiveValue ?? "unlimited"}</span></span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Scheduled changes" className="lg:col-span-1">
        {detail.scheduled.length === 0 ? (
          <p className="text-[0.8125rem] text-muted-foreground">Nothing is scheduled.</p>
        ) : (
          <ul className="divide-y divide-border">
            {detail.scheduled.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 py-1.5">
                <span className="min-w-0"><ScheduledKindBadge kind={item.kind} /><span className="mt-0.5 block truncate text-2xs text-muted-foreground">{item.current} → {item.scheduled}</span></span>
                <span className="shrink-0 text-right text-2xs tabular text-muted-foreground">{formatDate(item.effectiveAt)}<span className="block"><ScheduledStatusBadge status={item.status} /></span></span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Recent events" className="lg:col-span-2" action={<Button asChild variant="ghost" size="sm"><Link href={routes.subscription(row.id, "history")}>Changes &amp; History</Link></Button>}>
        {detail.history.length === 0 ? (
          <p className="text-[0.8125rem] text-muted-foreground">No events yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {detail.history.slice(0, 5).map((event) => (
              <li key={event.id} className="flex items-start justify-between gap-3 py-1.5">
                <div className="min-w-0"><p className="text-[0.8125rem] text-foreground">{event.summary}</p><p className="text-2xs text-muted-foreground">{event.actor}</p></div>
                <span className="shrink-0 whitespace-nowrap text-2xs text-muted-foreground">{relativeTime(event.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function EntitlementsSection({ detail, actions }: { detail: SubscriptionDetail; actions: ReturnType<typeof useSubscriptionActions> }) {
  const { row } = detail;
  const mutations = usePlanMutations();
  const [revoking, setRevoking] = useState<string | null>(null);
  const canOverride = actions.can(row).override;
  const now = platformNow();
  const overrides = detail.overrides.filter((item) => !item.revokedAt);
  const active = detail.entitlements.filter((item) => item.override).map((item) => item.override);

  return (
    <div className="space-y-1">
      {!detail.version ? (
        <AlertBanner tone="danger" title="No valid plan version">This subscription does not reference a published plan version, so its entitlements cannot be resolved.</AlertBanner>
      ) : (
        <AlertBanner tone="info" title={`Entitlements from ${row.planName} version ${row.planVersion}`}>
          The plan allowance is what the plan version defines. An override is a company-specific exception; the effective allowance is what the company can actually use, and never edits the plan.
        </AlertBanner>
      )}
      <Panel
        title="Entitlements"
        description="Plan allowance, company override, effective allowance and current usage"
        action={
          <>
            {canOverride ? <Button variant="outline" size="sm" onClick={() => actions.openFlow({ kind: "override", row })}><ShieldPlusIcon />Apply Override</Button> : null}
            <ModuleLinkButton module="usage" query={{ company: row.company.id }}>Open Usage &amp; Limits</ModuleLinkButton>
            <Button asChild variant="ghost" size="sm"><Link href={companySectionHref(row.company.id, "usage")}>Company Usage</Link></Button>
          </>
        }
        flush
      >
        <EntitlementTable rows={detail.entitlements} canOverride={canOverride} onOverride={(resource) => actions.openFlow({ kind: "override", row, resource })} />
      </Panel>

      <Panel title="Company overrides" description="Granted to this company only; the plan is unchanged" flush>
        <MiniTable
          caption="Company entitlement overrides"
          rows={overrides}
          getKey={(item) => item.id}
          empty={<p className="px-3 pb-4 text-[0.8125rem] text-muted-foreground">No overrides have been granted to this company.</p>}
          columns={[
            { id: "resource", header: "Resource", cell: (item) => USAGE_RESOURCE_BY_KEY[item.resource].label },
            { id: "rule", header: "Rule", cell: (item) => (item.rule === "additive" ? `Adds ${item.delta}` : `Replaces with ${item.overrideLimit}`) },
            { id: "period", header: "Period", hideBelow: "sm", cell: (item) => <span className="text-2xs tabular">{formatDate(item.startsAt)} → {formatDate(item.expiresAt)}</span> },
            { id: "by", header: "Approved by", hideBelow: "md", cell: (item) => item.approvedBy },
            { id: "reason", header: "Reason", hideBelow: "lg", cell: (item) => <span className="line-clamp-1 text-2xs text-muted-foreground">{item.reason}</span> },
            {
              id: "state",
              header: "State",
              cell: (item) => {
                const isActive = active.some((entry) => entry?.id === item.id);
                return <span className={cn("text-2xs font-medium", isActive ? "text-success" : "text-muted-foreground")}>{isActive ? "Active" : Date.parse(item.startsAt) > now ? "Scheduled" : "Expired"}</span>;
              },
            },
            {
              id: "actions",
              header: <span className="sr-only">Actions</span>,
              align: "right",
              cell: (item) => (canOverride && active.some((entry) => entry?.id === item.id) ? <Button variant="ghost" size="sm" className="text-danger" onClick={() => setRevoking(item.id)}>Revoke</Button> : null),
            },
          ]}
        />
      </Panel>

      <ConfirmDialog
        open={revoking !== null}
        onOpenChange={(open) => !open && setRevoking(null)}
        title="Revoke this override now?"
        description="The company's limit returns to the plan allowance immediately. If usage is above it, the company will show as over its limit."
        confirmLabel="Revoke Override"
        variant="destructive"
        onConfirm={() => {
          const id = revoking;
          setRevoking(null);
          if (id) void mutations.revokeOverride(row.id, id, "Revoked early by Super Admin").then(() => toast.success("Override revoked")).catch((failure: unknown) => toast.error(describeError(failure).message));
        }}
      />
    </div>
  );
}

function HistorySection({ detail }: { detail: SubscriptionDetail }) {
  return (
    <div className="space-y-1">
      <Panel title="Changes & history" description="Subscription lifecycle, plan, trial and override events" flush>
        <MiniTable
          caption="Subscription events"
          rows={detail.history}
          getKey={(event) => event.id}
          empty={<p className="px-3 pb-4 text-[0.8125rem] text-muted-foreground">No events yet.</p>}
          columns={[
            { id: "time", header: "Time", cell: (event) => <span className="whitespace-nowrap text-2xs text-muted-foreground" title={formatDateTime(event.at)}>{relativeTime(event.at)}</span> },
            { id: "event", header: "Event", className: "min-w-56", cell: (event) => <span><span className="block text-foreground">{event.summary}</span><span className="block font-mono text-[10px] text-muted-foreground">{event.action}</span></span> },
            { id: "change", header: "Previous → New", hideBelow: "md", cell: (event) => (event.previousValue || event.newValue ? <span className="text-2xs">{event.previousValue ?? "-"} → <span className="font-medium">{event.newValue ?? "-"}</span></span> : <span className="text-muted-foreground">-</span>) },
            { id: "actor", header: "Actor", hideBelow: "sm", cell: (event) => event.actor },
            { id: "reason", header: "Reason", hideBelow: "lg", cell: (event) => <span className="line-clamp-1 text-2xs text-muted-foreground">{event.reason ?? "-"}</span> },
            { id: "result", header: "Result", cell: (event) => <span className={cn("text-2xs font-medium", event.result === "success" ? "text-success" : "text-danger")}>{event.result === "success" ? "Success" : event.result === "failure" ? "Failed" : "Denied"}</span> },
          ]}
        />
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function SubscriptionDetailPage() {
  const params = useParams<{ subscriptionId: string }>();
  const subscriptionId = decodeURIComponent(params.subscriptionId ?? "");
  const pathname = usePathname();
  const router = useRouter();
  const search = useSearchParams();
  const section = sectionOf(search.get("section"));
  const query = useSubscription(subscriptionId);
  const actions = useSubscriptionActions();
  const detail = query.data;

  if (query.error && !detail) return <PlansError subject="Subscription" error={query.error} onRetry={() => void query.refetch()} back={{ href: routes.subscriptions, label: "Back to Subscriptions" }} />;
  if (!detail) {
    return (
      <div className="space-y-2">
        <div className="rounded-sm border border-border bg-card p-4"><Skeleton className="h-5 w-56" /><Skeleton className="mt-3 h-3.5 w-80 max-w-full" /></div>
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-4 xl:grid-cols-6">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-16" />)}</div>
        <div className="grid grid-cols-1 gap-1 lg:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <PanelSkeleton key={index} rows={5} />)}</div>
      </div>
    );
  }

  const { row, company } = detail;
  const allowed = actions.can(row);
  const menu = actions.menu(row, { hideOpen: true });
  const setSection = (key: SubscriptionSection) => router.replace(key === "overview" ? pathname : `${pathname}?section=${key}`, { scroll: false });

  return (
    <div className="space-y-2">
      <header className="space-y-1">
        <div className="flex flex-col gap-3 rounded-sm border border-border bg-card p-3.5 shadow-xs sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">{company.name}</h1>
              <SubscriptionStatusBadge status={row.status} />
              <span className="rounded-sm border border-border-strong bg-neutral-subtle px-1.5 py-px text-[11px] font-medium capitalize text-neutral">{row.billingCycle}</span>
              {PLANS_MOCK_MODE ? <DemoTag>Demo data</DemoTag> : null}
            </div>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-2xs text-muted-foreground">
              <span className="font-mono">{row.id}</span>
              <span>{row.planName} v{row.planVersion}</span>
              <span>Started {formatDate(row.startedAt)}</span>
              <span className="inline-flex items-center gap-1">{row.status === "trialing" ? "Trial ends" : row.status === "cancelled" || row.status === "expired" ? "" : "Renews"} <PeriodCell row={row} /></span>
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            {allowed.changePlan ? <Button size="sm" onClick={() => actions.openFlow({ kind: "change", row })}><RepeatIcon />Change Plan</Button> : null}
            {menu.length > 0 ? (
              <ActionMenu items={menu} label={`Manage subscription for ${company.name}`} />
            ) : (
              <Button variant="outline" size="icon-sm" disabled aria-label="No actions available"><MoreHorizontalIcon /></Button>
            )}
          </div>
        </div>
        {row.status === "scheduled_cancellation" ? (
          <AlertBanner tone="warning" title="Cancellation is scheduled" action={allowed.undo ? <Button size="sm" variant="outline" onClick={() => actions.openFlow({ kind: "undo", row })}>Undo Cancellation</Button> : undefined}>
            The subscription ends on {row.scheduledCancellationAt ? formatDate(row.scheduledCancellationAt) : "the end of the term"}. The company account is not affected.
          </AlertBanner>
        ) : null}
        {row.status === "cancelled" || row.status === "expired" ? (
          <AlertBanner tone="info" title={`This subscription is ${row.status}`} action={allowed.reactivate ? <Button size="sm" variant="outline" onClick={() => actions.openFlow({ kind: "reactivate", row })}>Reactivate</Button> : undefined}>
            Entitlement overrides no longer apply. The company account and its data are unchanged.
          </AlertBanner>
        ) : null}
        {row.status === "past_due" ? <AlertBanner tone="danger" title="Payment is past due">The renewal payment has not been collected. Review Billing for the invoice.</AlertBanner> : null}
        {row.planMissing ? <AlertBanner tone="danger" title="Missing plan reference">This subscription references a plan that does not exist. Change its plan to fix it.</AlertBanner> : null}
      </header>

      <StatGrid className="grid-cols-2 sm:grid-cols-4 xl:grid-cols-6">
        <StatCard compact label="Plan" value={<span className="text-[0.8125rem]">{row.planName}</span>} hint={`Version ${row.planVersion}`} />
        <StatCard compact label="Recurring" value={<span className="text-base">{money(row.recurringMinor, row.currency, true)}</span>} hint={`per ${row.billingCycle === "annual" ? "year" : "month"}`} />
        <StatCard compact label="MRR" value={<span className="text-base">{row.mrrMinor > 0 ? money(row.mrrMinor, row.currency, true) : "-"}</span>} hint={row.status === "trialing" ? "Trial" : "Normalized"} />
        <StatCard compact label="Billing health" value={<span className="text-[0.8125rem]">{row.billingStatus.replace(/_/g, " ")}</span>} href={companySectionHref(company.id, "billing")} />
        <StatCard compact label="Usage warnings" value={detail.usageSummary.exceeded + detail.usageSummary.nearLimit} hint={detail.usageSummary.exceeded > 0 ? `${detail.usageSummary.exceeded} over limit` : "None over"} tone={detail.usageSummary.exceeded > 0 ? "danger" : "neutral"} href={routes.subscription(row.id, "entitlements")} />
        <StatCard compact label="Pending changes" value={detail.scheduled.length} hint="Scheduled" href={routes.subscription(row.id, "history")} />
      </StatGrid>

      <nav aria-label="Subscription sections" className="overflow-x-auto border-b border-border scrollbar-thin">
        <ul className="flex min-w-max gap-0.5">
          {SUBSCRIPTION_SECTIONS.map((item) => (
            <li key={item.key}>
              <button type="button" onClick={() => setSection(item.key)} aria-current={item.key === section ? "page" : undefined} className={cn("relative px-3 py-2 text-[0.8125rem] font-medium transition-colors", item.key === section ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
                {item.label}
                {item.key === section ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-sm bg-primary" aria-hidden /> : null}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="pt-1">
        {section === "overview" ? <OverviewSection detail={detail} actions={actions} /> : null}
        {section === "entitlements" ? <EntitlementsSection detail={detail} actions={actions} /> : null}
        {section === "history" ? <HistorySection detail={detail} /> : null}
      </div>
      {actions.dialogs}
    </div>
  );
}
