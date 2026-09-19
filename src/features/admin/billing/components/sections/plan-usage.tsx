"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import {
  ArrowUpRight,
  Blocks,
  Building2,
  CalendarClock,
  ChevronRight,
  FileBarChart,
  Gauge,
  HardDrive,
  Layers,
  RefreshCcw,
  Sparkles,
  Users,
  Workflow,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { CYCLE_LABEL, HEADLINE_LIMITS, LIMIT_META, SUPPORT_LABEL } from "../../billing-data/config";
import { useBillingView } from "../../billing-data/hooks";
import { cycleUnit, effectiveLimits, formatLimit, formatUsed, longDate, money, periodPrice, planById, shortDate, type UsageRow } from "../../billing-data/selectors";
import type { LimitKey } from "../../billing-data/types";
import { useBilling } from "../../store/billing-store";
import { Badge, Button, Section, SectionHeader, Skeleton, SubscriptionChip, UsageChip, UsageMeter, x } from "../ui";

export const LIMIT_ICON: Record<LimitKey, ComponentType<{ className?: string }>> = {
  clients: Building2,
  teamMembers: Users,
  channels: Blocks,
  aiCredits: Sparkles,
  automations: Workflow,
  automationRuns: Zap,
  scheduledPosts: CalendarClock,
  reports: FileBarChart,
  storageGb: HardDrive,
};

/* ------------------------------------------------------------------ */
/* Current plan                                                        */
/* ------------------------------------------------------------------ */

export function CurrentPlanCard() {
  const { snapshot, plan, flags } = useBillingView();
  const { gates, can, openFlow } = useBilling();
  const { subscription } = snapshot;
  const limits = effectiveLimits(plan, snapshot.addOns, snapshot.addOnCatalog);
  const price = periodPrice(plan, subscription.cycle);
  const pending = subscription.pendingChange;

  const dateLabel = flags.trial ? "Trial ends" : flags.cancelling ? "Cancels" : flags.cancelled ? "Ended" : "Renews";
  const date = flags.trial ? subscription.trialEndsAt : flags.cancelling ? subscription.cancelAt : flags.cancelled ? subscription.cancelledAt : subscription.currentPeriodEnd;

  return (
    <Section id="current-plan" className="flex h-full flex-col">
      <SectionHeader id="current-plan" icon={Layers} title="Current plan" badge={<Badge tone="blue">Current plan</Badge>} />
      <div className="flex flex-1 flex-col px-4 pb-4">
        <div className="rounded-[8px] border border-[#E4E9F0] bg-[linear-gradient(180deg,#F8FAFF_0%,#FFFFFF_70%)] p-3.5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[18px] font-semibold leading-6 tracking-[-0.01em] text-[#0F1B3D]">{plan.name} Plan</p>
              <p className="text-[12px] text-[#6B7890]">{plan.tagline}</p>
            </div>
            <SubscriptionChip status={subscription.status} />
          </div>
          <p className="mt-2.5 flex items-baseline gap-1">
            <span className="text-[24px] font-semibold leading-7 tracking-[-0.02em] tabular-nums text-[#0F1B3D]">{price === null ? "Custom" : money(price)}</span>
            {price !== null && <span className="text-[12.5px] text-[#6B7890]">/ {cycleUnit(subscription.cycle)} + GST</span>}
          </p>
          <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-[#EEF1F5] pt-2.5">
            <div>
              <dt className="text-[11px] text-[#6B7890]">{dateLabel}</dt>
              <dd className="text-[12.5px] font-semibold text-[#0F1B3D]">{date ? shortDate(date) : "—"}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-[#6B7890]">Billing cycle</dt>
              <dd className="text-[12.5px] font-semibold text-[#0F1B3D]">{CYCLE_LABEL[subscription.cycle]}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-[#6B7890]">Support</dt>
              <dd className="truncate text-[12.5px] font-semibold text-[#0F1B3D]" title={SUPPORT_LABEL[plan.support]}>
                {SUPPORT_LABEL[plan.support].replace(" support", "")}
              </dd>
            </div>
          </dl>
        </div>

        {pending && (
          <p className="mt-2 rounded-sm bg-[#FFF7E8] px-2.5 py-1.5 text-[12px] leading-4 text-[#B54708]">
            {pending.kind === "downgrade"
              ? `Moves to ${planById(snapshot.plans, pending.toPlan).name} on ${longDate(pending.effectiveAt)}.`
              : `Switches to ${CYCLE_LABEL[pending.toCycle].toLowerCase()} billing on ${longDate(pending.effectiveAt)}.`}
          </p>
        )}

        <p className="mb-1.5 mt-3.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">Included limits</p>
        <ul className="grid grid-cols-2 gap-1">
          {HEADLINE_LIMITS.map((key) => {
            const Icon = LIMIT_ICON[key];
            const extra = limits[key] !== null && plan.limits[key] !== null ? (limits[key] ?? 0) - (plan.limits[key] ?? 0) : 0;
            return (
              <li key={key} className="flex min-w-0 items-center gap-2 rounded-sm bg-[#F8FAFC] px-2 py-1.5">
                <Icon className="size-3.5 shrink-0 text-[#6B7890]" />
                <span className="min-w-0 truncate text-[12px] text-[#3C4A66]">
                  <b className="font-semibold tabular-nums text-[#0F1B3D]">{formatLimit(key, limits[key])}</b> {LIMIT_META[key].short.toLowerCase()}
                  {LIMIT_META[key].perPeriod && key !== "aiCredits" ? " / mo" : ""}
                  {extra > 0 && <span className="text-[#067647]"> (+{extra})</span>}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="mt-auto flex gap-1.5 pt-3.5 overflow-x-auto custom-scrollbar pb-1">
          {flags.trial || flags.cancelled ? (
            <Button className="flex-1" variant="primary" size="sm" icon={Sparkles} gate={can.canManageSubscription} onClick={() => openFlow({ kind: "upgrade", planId: flags.cancelled ? plan.id : undefined })}>
              {flags.trial ? "Choose plan" : "Reactivate"}
            </Button>
          ) : (
            <Button className="flex-1" variant="primary" size="sm" icon={ArrowUpRight} gate={gates?.upgrade} onClick={() => openFlow({ kind: "upgrade" })}>
              Upgrade
            </Button>
          )}
          <Button className="flex-1" variant="secondary" size="sm" onClick={() => openFlow({ kind: "plan_details" })}>
            Details
          </Button>
          {!flags.trial && !flags.cancelled && (
            <Button className="flex-1" variant="secondary" size="sm" icon={RefreshCcw} gate={gates?.changeCycle} onClick={() => openFlow({ kind: "cycle" })}>
              Change cycle
            </Button>
          )}
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Usage & limits                                                      */
/* ------------------------------------------------------------------ */

export function UsageCard() {
  const { snapshot, usage, flags } = useBillingView();
  const pressured = usage.filter((row) => row.state === "near" || row.state === "exhausted").length;

  return (
    <Section id="usage" className="flex h-full flex-col">
      <SectionHeader
        id="usage"
        icon={Gauge}
        title="Usage & limits"
        description={flags.cancelled ? "Usage as of cancellation" : `This billing period · monthly limits reset ${shortDate(snapshot.credits.resetsAt)}`}
        badge={pressured > 0 ? <Badge tone="amber">{pressured} near limit</Badge> : <Badge tone="green">All healthy</Badge>}
      />
      <div className="hidden grid-cols-[minmax(150px,1.1fr)_minmax(0,1.6fr)_104px_104px] gap-3 border-y border-[#EEF1F5] bg-[#F8FAFC] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7890] md:grid">
        <span>Metric</span>
        <span>Used / limit</span>
        <span>State</span>
        <span className="text-right">Action</span>
      </div>
      <ul className="flex-1 overflow-y-auto min-h-0 max-xl:max-h-[400px] divide-y divide-[#EEF1F5] max-md:border-t max-md:border-[#EEF1F5] custom-scrollbar">
        {usage.map((row) => (
          <UsageRowItem key={row.key} row={row} />
        ))}
      </ul>
    </Section>
  );
}

function UsageRowItem({ row }: { row: UsageRow }) {
  const { gates, openFlow } = useBilling();
  const { flags } = useBillingView();
  const meta = LIMIT_META[row.key];
  const Icon = LIMIT_ICON[row.key];
  const pressured = row.state === "near" || row.state === "exhausted";
  const isCredits = row.key === "aiCredits";
  const link = isCredits ? null : meta.link;

  const action =
    pressured && flags.live ? (
      isCredits ? (
        <Button size="xs" variant={row.state === "exhausted" ? "primary" : "secondary"} icon={Sparkles} gate={gates?.buyCredits} onClick={() => openFlow({ kind: "credits" })}>
          Buy credits
        </Button>
      ) : (
        <Button size="xs" variant={row.state === "exhausted" ? "primary" : "secondary"} icon={ArrowUpRight} gate={gates?.upgrade} onClick={() => openFlow({ kind: "upgrade" })}>
          Upgrade
        </Button>
      )
    ) : isCredits && flags.live ? (
      <Button size="xs" variant="ghost" gate={gates?.buyCredits} onClick={() => openFlow({ kind: "credits" })}>
        Buy credits
      </Button>
    ) : null;

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-4 py-2.5 md:grid-cols-[minmax(150px,1.1fr)_minmax(0,1.6fr)_104px_104px]">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={cn("grid size-7 shrink-0 place-items-center rounded-sm", row.state === "exhausted" ? "bg-[#FEF1F2] text-[#C81E2B]" : row.state === "near" ? "bg-[#FFF7E8] text-[#B54708]" : "bg-[#F3F5F9] text-[#475467]")}>
          <Icon className="size-3.5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[12.5px] font-semibold text-[#0F1B3D]">
            {meta.label}
            {meta.perPeriod && <span className="font-normal text-[#98A2B3]"> · monthly</span>}
          </p>
          {link ? (
            <Link href={link.href} className={cn("inline-flex items-center gap-0.5 rounded text-[11.5px] font-medium text-[#2563EB] hover:text-[#1D4ED8] hover:underline", x.focus)}>
              {link.label}
              <ChevronRight className="size-3" />
            </Link>
          ) : (
            <p className="text-[11.5px] text-[#6B7890]">{row.extra > 0 ? `Includes ${formatUsed(row.key, row.extra)} purchased` : "Plan credits reset monthly"}</p>
          )}
        </div>
      </div>

      <div className="col-span-2 min-w-0 md:col-span-1 md:row-start-1 md:col-start-2">
        <div className="mb-1 flex items-baseline justify-between gap-2 text-[12px] tabular-nums">
          <span className="text-[#3C4A66]">
            <b className="font-semibold text-[#0F1B3D]">{formatUsed(row.key, row.used)}</b>
            <span className="text-[#98A2B3]"> / </span>
            {formatLimit(row.key, row.limit)}
            {row.extra > 0 && !isCredits && <span className="text-[#067647]"> incl. +{row.extra} add-on</span>}
          </span>
          <span className={cn("font-semibold", row.state === "exhausted" ? "text-[#C81E2B]" : row.state === "near" ? "text-[#B54708]" : "text-[#6B7890]")}>
            {row.limit === null ? "—" : `${row.percent}%`}
          </span>
        </div>
        <UsageMeter percent={row.percent} state={row.state} label={`${meta.label}: ${row.limit === null ? "unlimited" : `${row.percent}% used`}`} />
      </div>

      <div className="col-start-2 row-start-1 flex justify-end md:col-start-3 md:justify-start">
        <UsageChip state={row.state} />
      </div>
      <div className={cn("col-span-2 flex justify-end md:col-span-1 md:col-start-4 md:row-start-1", !action && "max-md:hidden")}>{action}</div>
    </li>
  );
}

export function PlanUsageSkeleton() {
  return (
    <div className="grid gap-1 xl:grid-cols-12" aria-hidden="true">
      <div className={cn(x.card, "space-y-3 p-4 xl:col-span-4")}>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-28 w-full" />
        <div className="grid grid-cols-2 gap-1">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <Skeleton key={index} className="h-7" />
          ))}
        </div>
      </div>
      <div className={cn(x.card, "space-y-3 p-4 xl:col-span-8")}>
        <Skeleton className="h-3 w-32" />
        {[0, 1, 2, 3, 4, 5, 6].map((index) => (
          <div key={index} className="flex items-center gap-3">
            <Skeleton className="size-7" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-1.5 flex-1" />
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
