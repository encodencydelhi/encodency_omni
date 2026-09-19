"use client";

import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import {
  ACCOUNT_STATUS,
  BILLING_STATUS_META,
  CONNECTION_STATE_META,
  FACTOR_META,
  HEALTH_META,
  INVOICE_STATUS_META,
  ONBOARDING_META,
  PAYMENT_STATE_META,
  RESOURCE_STATUS_META,
  RESULT_META,
  SEVERITY_META,
  SUBSCRIPTION_STATUS_META,
  USAGE_LEVEL_META,
} from "../data/config";
import type {
  AttentionSeverity,
  CompanyAccountStatus,
  CompanyBillingStatus,
  CompanyHealth,
  CompanyOnboardingStatus,
  CompanySubscriptionStatus,
  FactorStatus,
  IntegrationConnectionState,
  InvoiceStatus,
  PaymentState,
  UsageLevel,
  UsageResourceStatus,
} from "../data/types";
import { WithTooltip } from "./primitives";

/**
 * One badge per status axis. They are deliberately separate components: account,
 * subscription, billing and health are different questions and must never be
 * folded into one ambiguous "status".
 */

export function AccountStatusBadge({ status }: { status: CompanyAccountStatus }) {
  return <StatusBadge registry={ACCOUNT_STATUS} status={status} withDot />;
}

export function SubscriptionStatusBadge({ status, labelled = false }: { status: CompanySubscriptionStatus; labelled?: boolean }) {
  // Next to the account badge both can read "Active"; the prefix says which axis this is.
  return labelled ? (
    <Badge tone={SUBSCRIPTION_STATUS_META[status].tone} title={SUBSCRIPTION_STATUS_META[status].description}>
      <span className="font-normal opacity-70">Subscription</span>
      {SUBSCRIPTION_STATUS_META[status].label}
    </Badge>
  ) : (
    <StatusBadge registry={SUBSCRIPTION_STATUS_META} status={status} />
  );
}

export function BillingStatusBadge({ status }: { status: CompanyBillingStatus }) {
  return <StatusBadge registry={BILLING_STATUS_META} status={status} />;
}

export function UsageLevelBadge({ level }: { level: UsageLevel }) {
  return <StatusBadge registry={USAGE_LEVEL_META} status={level} />;
}

export function ResourceStatusBadge({ status }: { status: UsageResourceStatus }) {
  return <StatusBadge registry={RESOURCE_STATUS_META} status={status} />;
}

export function OnboardingBadge({ status }: { status: CompanyOnboardingStatus }) {
  return <StatusBadge registry={ONBOARDING_META} status={status} />;
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return <StatusBadge registry={INVOICE_STATUS_META} status={status} />;
}

export function PaymentStateBadge({ status }: { status: PaymentState }) {
  return <StatusBadge registry={PAYMENT_STATE_META} status={status} />;
}

export function ConnectionStateBadge({ state }: { state: IntegrationConnectionState }) {
  return <StatusBadge registry={CONNECTION_STATE_META} status={state} />;
}

export function SeverityBadge({ severity }: { severity: AttentionSeverity }) {
  return <StatusBadge registry={SEVERITY_META} status={severity} withDot />;
}

export function FactorBadge({ status }: { status: FactorStatus }) {
  return <StatusBadge registry={FACTOR_META} status={status} withDot />;
}

export function ResultBadge({ result }: { result: "success" | "failure" | "denied" }) {
  return <StatusBadge registry={RESULT_META} status={result} />;
}

/** Health as plain coloured text, for dense summary cards where a badge would clip. */
export function HealthInline({ health }: { health: CompanyHealth }) {
  const meta = HEALTH_META[health.status];
  const tone = { success: "text-success", warning: "text-warning", danger: "text-danger", neutral: "text-neutral", info: "text-info", brand: "text-primary" }[meta.tone];
  return (
    <WithTooltip content={health.reason}>
      <span className={cn("text-[0.8125rem] font-semibold", tone)}>{meta.label}</span>
    </WithTooltip>
  );
}

/** Health with its main reason available on hover and to assistive tech. */
export function HealthBadge({ health, className }: { health: CompanyHealth; className?: string }) {
  const meta = HEALTH_META[health.status];
  return (
    <WithTooltip content={health.reason} className={cn("inline-flex", className)}>
      <Badge tone={meta.tone} aria-label={`${meta.label}. ${health.reason}`}>
        <span
          className={cn(
            "size-1.5 rounded-sm",
            meta.tone === "success" && "bg-success",
            meta.tone === "warning" && "bg-warning",
            meta.tone === "danger" && "bg-danger",
            meta.tone === "neutral" && "bg-neutral",
          )}
          aria-hidden
        />
        {meta.label}
      </Badge>
    </WithTooltip>
  );
}
