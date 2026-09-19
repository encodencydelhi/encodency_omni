"use client";

import { RefreshCw, ServerOff } from "lucide-react";
import { BillingProvider, useBilling } from "../store/billing-store";
import { FlowRouter } from "./flow-router";
import { BillingHeader, StateBanner, SummaryStrip, SummarySkeleton } from "./sections/header";
import { NeedsAttention } from "./sections/attention";
import { CurrentPlanCard, PlanUsageSkeleton, UsageCard } from "./sections/plan-usage";
import { NextPaymentCard, PaymentMethodCard, TwoCardSkeleton } from "./sections/payment";
import { BillingDetailsCard, ContactsCard } from "./sections/details";
import { InvoicesCard, PaymentHistoryCard, TableSkeleton } from "./sections/invoices";
import { AddOnsCard, CreditsCard } from "./sections/credits";
import { PlanFeaturesCard, PreviewPanel, SubscriptionManagement } from "./sections/management";
import { Button, Card, EmptyState } from "./ui";
import { isMockMode } from "../store/billing-store";

export function BillingWorkspace() {
  return (
    <BillingProvider>
      <BillingPage />
    </BillingProvider>
  );
}

function BillingPage() {
  const { status, loadError, retry, can } = useBilling();

  return (
    <div className="-mx-4 -my-5 min-h-[calc(100dvh-60px)] bg-[#F6F8FB] px-4 py-4 sm:-mx-5 sm:px-5 xl:-mx-6 xl:px-6">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-1">
        <BillingHeader />

        {status === "error" ? (
          <Card>
            <EmptyState
              icon={ServerOff}
              title="Billing data unavailable"
              description={
                <>
                  {loadError?.message ?? "OmniPlatform couldn't load your billing details."}
                  <span className="mt-2 block text-[12px] text-[#98A2B3]">{loadError?.hint}</span>
                </>
              }
              action={<Button variant="primary" icon={RefreshCw} onClick={retry}>Retry</Button>}
              secondary={<Button variant="secondary" href="/admin">Back to dashboard</Button>}
            />
          </Card>
        ) : status === "loading" ? (
          <>
            <SummarySkeleton />
            <PlanUsageSkeleton />
            <TableSkeleton rows={3} />
            <TwoCardSkeleton left={7} />
            <TwoCardSkeleton left={7} />
            <TableSkeleton rows={4} />
            <TableSkeleton rows={4} />
          </>
        ) : !can.canViewBilling.allowed ? (
          <>
            <Card>
              <EmptyState icon={ServerOff} title="Billing isn't visible to your role" description={can.canViewBilling.reason ?? "Ask an Organization Admin or Billing Admin for access."} />
            </Card>
            {/* Stays reachable even when the previewed role can't see billing, so "View as role" always has a way back. */}
            {isMockMode && <PreviewPanel />}
          </>
        ) : (
          <>
            <StateBanner />
            <SummaryStrip />
            <NeedsAttention />

            <div className="grid gap-1 xl:grid-cols-12">
              <div className="xl:col-span-4 flex flex-col">
                <CurrentPlanCard />
              </div>
              <div className="xl:col-span-8 relative">
                <div className="xl:absolute xl:inset-0 h-full flex flex-col">
                  <UsageCard />
                </div>
              </div>
            </div>

            <div className="grid gap-1 xl:grid-cols-12">
              <div className="xl:col-span-7 flex flex-col">
                <PaymentMethodCard />
              </div>
              <div className="xl:col-span-5 flex flex-col">
                <NextPaymentCard />
              </div>
            </div>

            <div className="grid gap-1 xl:grid-cols-12">
              <div className="xl:col-span-7 flex flex-col">
                <BillingDetailsCard />
              </div>
              <div className="xl:col-span-5 flex flex-col">
                <ContactsCard />
              </div>
            </div>

            <InvoicesCard />
            <PaymentHistoryCard />

            <div className="grid gap-1 xl:grid-cols-12">
              <div className="xl:col-span-6 flex flex-col">
                <CreditsCard />
              </div>
              <div className="xl:col-span-6 flex flex-col">
                <AddOnsCard />
              </div>
            </div>

            <PlanFeaturesCard />
            <SubscriptionManagement />
            {isMockMode && <PreviewPanel />}
          </>
        )}
      </div>
      <FlowRouter />
    </div>
  );
}
