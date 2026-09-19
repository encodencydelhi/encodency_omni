"use client";

import { CalendarClockIcon, CircleCheckIcon, CreditCardIcon, RepeatIcon, SlidersHorizontalIcon, SparklesIcon, TimerResetIcon, XCircleIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { ModuleLinkButton } from "../components/module-link";
import { KeyValue, Panel } from "../components/primitives";
import { SectionError, PanelSkeleton, TableSkeleton } from "../components/states";
import { ResourceStatusBadge, SubscriptionStatusBadge } from "../components/status-badges";
import { useCompanyActions, type CompanyFlow } from "../components/use-company-actions";
import type { SubscriptionAction } from "../components/flows/subscription-flows";
import { platformNow } from "../data/clock";
import { USAGE_RESOURCES, companySectionHref } from "../data/config";
import { useCompanySubscription } from "../data/hooks";
import type { CompanySubscriptionData } from "../data/repository";
import { cyclePrice } from "../data/selectors";
import { formatLimit, formatPercent1, formatUsed } from "../lib/format";
import { useCompanyId } from "./company-shell";

export function CompanySubscriptionPage() {
  const companyId = useCompanyId();
  const query = useCompanySubscription(companyId);

  if (query.error) return <SectionError subject="Subscription data" error={query.error} onRetry={() => void query.refetch()} module={{ key: "plans", label: "Plans & Subscriptions" }} />;
  if (!query.data) {
    return (
      <div className="space-y-1">
        <div className="grid grid-cols-1 gap-1 lg:grid-cols-3">
          <PanelSkeleton rows={6} className="lg:col-span-2" />
          <PanelSkeleton rows={6} />
        </div>
        <TableSkeleton rows={9} columns={6} />
      </div>
    );
  }
  return <SubscriptionBody companyId={companyId} data={query.data} />;
}

function ActionButton({ enabled, reason, onClick, icon, children, variant = "outline" }: { enabled: boolean; reason: string; onClick: () => void; icon: ReactNode; children: ReactNode; variant?: "outline" | "default" }) {
  const button = (
    <Button variant={variant} size="sm" disabled={!enabled} onClick={onClick}>
      {icon}
      {children}
    </Button>
  );
  if (enabled) return button;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex" tabIndex={0}>{button}</span>
      </TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  );
}

function SubscriptionBody({ companyId, data }: { companyId: string; data: CompanySubscriptionData }) {
  const { subscription, plan, usage } = data;
  const { capabilities, openFlow, dialogs } = useCompanyActions();
  const status = subscription.status;
  const operating = data.accountStatus !== "archived";
  const manage = capabilities.canManageSubscription && operating;

  const open = (flow: CompanyFlow) => () => openFlow(flow);
  const sub = (action: SubscriptionAction) => open({ kind: "subscription", companyId, action });
  const closed = status === "cancelled" || status === "expired";
  const noPermission = "Your role cannot manage subscriptions.";

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-1 gap-1 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel
            title="Subscription"
            className="h-full"
            action={
              <Button asChild variant="ghost" size="sm">
                <Link href={companySectionHref(companyId, "billing")}>
                  <CreditCardIcon />
                  Billing
                </Link>
              </Button>
            }
          >
            <dl className="grid gap-x-8 sm:grid-cols-2">
              <div className="divide-y divide-border">
                <KeyValue label="Current plan">{plan.name}</KeyValue>
                <KeyValue label="Price per cycle">{formatCurrency(cyclePrice(plan, subscription.billingCycle), plan.currency)}</KeyValue>
                <KeyValue label="Billing cycle"><span className="capitalize">{subscription.billingCycle}</span></KeyValue>
                <KeyValue label="Status"><SubscriptionStatusBadge status={status} /></KeyValue>
                <KeyValue label="Subscription ID"><span className="font-mono text-2xs">{subscription.id}</span></KeyValue>
              </div>
              <div className="divide-y divide-border">
                <KeyValue label="Start date">{formatDate(subscription.startedAt)}</KeyValue>
                <KeyValue label={status === "scheduled_cancellation" ? "Ends" : "Renewal date"}>{closed ? "-" : formatDate(subscription.renewsAt)}</KeyValue>
                <KeyValue label="Trial end">{subscription.trialEndsAt ? formatDate(subscription.trialEndsAt) : "-"}</KeyValue>
                <KeyValue label="Scheduled cancellation">{subscription.scheduledCancellationAt ? formatDate(subscription.scheduledCancellationAt) : "-"}</KeyValue>
                <KeyValue label="Scheduled plan change">
                  {subscription.scheduledChange ? `${subscription.scheduledChange.planTier} on ${formatDate(subscription.scheduledChange.effectiveAt)}` : "-"}
                </KeyValue>
              </div>
            </dl>
          </Panel>
        </div>

        <Panel title="Governance actions" description="Platform-level changes. Each opens a review before anything is applied.">
          <div className="flex flex-wrap gap-1.5">
            <ActionButton enabled={manage && !closed} reason={!manage ? noPermission : "Reactivate the subscription first."} onClick={open({ kind: "changePlan", companyId })} icon={<RepeatIcon />} variant="default">
              Change plan
            </ActionButton>
            <ActionButton enabled={manage && status === "trialing"} reason={!manage ? noPermission : "Only a trialing subscription can be extended."} onClick={sub("extend_trial")} icon={<TimerResetIcon />}>
              Extend trial
            </ActionButton>
            <ActionButton enabled={manage && status === "trialing"} reason={!manage ? noPermission : "Only a trialing subscription can be converted."} onClick={sub("convert_trial")} icon={<SparklesIcon />}>
              Convert to paid
            </ActionButton>
            <ActionButton enabled={manage && !closed} reason={!manage ? noPermission : "Reactivate the subscription first."} onClick={sub("change_cycle")} icon={<CalendarClockIcon />}>
              Change billing cycle
            </ActionButton>
            <ActionButton
              enabled={manage && (status === "active" || status === "trialing" || status === "past_due")}
              reason={!manage ? noPermission : "Cancellation is already scheduled or the subscription has ended."}
              onClick={sub("schedule_cancellation")}
              icon={<XCircleIcon />}
            >
              Schedule cancellation
            </ActionButton>
            <ActionButton
              enabled={manage && (status === "scheduled_cancellation" || status === "paused" || closed)}
              reason={!manage ? noPermission : "The subscription is already active."}
              onClick={sub("reactivate")}
              icon={<CircleCheckIcon />}
            >
              Reactivate subscription
            </ActionButton>
            <ActionButton
              enabled={capabilities.canApplyUsageOverride && operating}
              reason="Your role cannot grant limit overrides."
              onClick={open({ kind: "override", companyId })}
              icon={<SlidersHorizontalIcon />}
            >
              Apply temporary limit override
            </ActionButton>
          </div>
          <div className="mt-2">
            <ModuleLinkButton module="plans" variant="ghost">
              Open Plans &amp; Subscriptions
            </ModuleLinkButton>
          </div>
        </Panel>
      </div>

      <Panel title="Plan limits" description="Included limits, any temporary override and the effective limit are shown separately - an override never rewrites the plan." flush>
        <div className="relative overflow-x-auto border-t border-border">
          <table className="w-full min-w-[42rem] text-[0.8125rem]">
            <thead className="bg-surface-sunken text-left text-2xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-semibold">Resource</th>
                <th className="px-3 py-2 text-right font-semibold">Included limit</th>
                <th className="px-3 py-2 text-right font-semibold">Current usage</th>
                <th className="px-3 py-2 text-right font-semibold">Custom override</th>
                <th className="px-3 py-2 text-right font-semibold">Effective limit</th>
                <th className="px-3 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {USAGE_RESOURCES.map((def) => {
                const record = usage.records.find((item) => item.resource === def.key);
                if (!record) return null;
                return (
                  <tr key={def.key}>
                    <td className="px-3 py-2 font-medium text-foreground">{def.label}</td>
                    <td className="px-3 py-2 text-right tabular text-muted-foreground">{formatLimit(record.includedLimit, def.key)}</td>
                    <td className="px-3 py-2 text-right tabular text-foreground">{formatUsed(record.used, def.key)}</td>
                    <td className="px-3 py-2 text-right tabular">
                      {record.activeOverride ? (
                        <span className="text-info" title={record.activeOverride.reason}>
                          {formatLimit(record.activeOverride.overrideLimit, def.key)}
                          <span className="block text-2xs text-muted-foreground">until {formatDate(record.activeOverride.expiresAt)}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-medium tabular text-foreground">{formatLimit(record.effectiveLimit, def.key)}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1.5">
                        <ResourceStatusBadge status={record.status} />
                        {record.utilization !== null ? <span className="text-2xs tabular text-muted-foreground">{formatPercent1(record.utilization)}</span> : null}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {usage.overrides.length > 0 ? (
        <Panel title="Limit overrides" description="Every override is recorded in the activity log with its approver.">
          <ul className="divide-y divide-border">
            {usage.overrides.map((override) => {
              const def = USAGE_RESOURCES.find((item) => item.key === override.resource);
              const expired = Date.parse(override.expiresAt) <= platformNow();
              return (
                <li key={override.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-[0.8125rem]">
                  <span className="min-w-0">
                    <span className="font-medium text-foreground">{def?.label}</span>{" "}
                    <span className="text-muted-foreground">
                      {formatLimit(override.baseLimit, override.resource)} to {formatLimit(override.overrideLimit, override.resource)}
                    </span>
                    <span className="block text-2xs text-muted-foreground">{override.reason}</span>
                  </span>
                  <span className="text-2xs text-muted-foreground">
                    {formatDate(override.startsAt)} - {formatDate(override.expiresAt)} · approved by {override.approvedBy}
                    {expired ? " · expired" : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </Panel>
      ) : null}
      {dialogs}
    </div>
  );
}
