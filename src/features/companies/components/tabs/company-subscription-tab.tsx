"use client";

import { DefinitionList } from "@/components/shared/definition-list";
import { ErrorState } from "@/components/shared/error-state";
import { CardSkeleton } from "@/components/shared/loading-state";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils/format";
import {
  BILLING_CYCLE,
  PAYMENT_STATUS,
  SUBSCRIPTION_STATUS,
} from "@/types/domain/subscription";
import { useCompanySubscription } from "../../hooks/use-companies";

/** Commercial state for one tenant. */
export function CompanySubscriptionTab({ companyId }: { companyId: string }) {
  const { data, isPending, error, refetch } = useCompanySubscription(companyId);

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-card">
        <ErrorState error={error} onRetry={() => void refetch()} />
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SectionCard title="Current subscription">
        {isPending || !data ? (
          <CardSkeleton lines={6} />
        ) : (
          <DefinitionList
            items={[
              { label: "Plan", value: data.planName },
              {
                label: "Status",
                value: <StatusBadge registry={SUBSCRIPTION_STATUS} status={data.status} withDot />,
              },
              {
                label: "Billing cycle",
                value: <StatusBadge registry={BILLING_CYCLE} status={data.billingCycle} />,
              },
              {
                label: "Payment",
                value: <StatusBadge registry={PAYMENT_STATUS} status={data.paymentStatus} />,
              },
              { label: "Amount", value: formatCurrency(data.amountMinor, data.currency) },
              { label: "Seats", value: formatNumber(data.seats) },
            ]}
          />
        )}
      </SectionCard>

      <SectionCard title="Term">
        {isPending || !data ? (
          <CardSkeleton lines={4} />
        ) : (
          <DefinitionList
            items={[
              { label: "Started", value: formatDate(data.startedAt) },
              { label: "Renews", value: formatDate(data.renewsAt) },
              { label: "Auto renew", value: data.autoRenew ? "Enabled" : "Disabled" },
              {
                label: "Cancelled",
                value: data.cancelledAt ? formatDate(data.cancelledAt) : "—",
              },
            ]}
          />
        )}
      </SectionCard>
    </div>
  );
}
