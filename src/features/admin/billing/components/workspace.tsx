"use client";

import { AlertTriangle, ServerOff } from "lucide-react";
import { BillingProvider, useBilling } from "../store/billing-store";
import { Button, EmptyState } from "./ui";

import { BillingHeader, StateBanner, SummaryStrip, SummarySkeleton } from "./sections/header";
import { CurrentPlanCard, UsageCard, PlanUsageSkeleton } from "./sections/plan-usage";
import { NeedsAttention } from "./sections/attention";
import { PaymentMethodCard, NextPaymentCard, TwoCardSkeleton } from "./sections/payment";
import { BillingDetailsCard, ContactsCard } from "./sections/details";
import { InvoicesCard, PaymentHistoryCard, TableSkeleton } from "./sections/invoices";
import { CreditsCard, AddOnsCard } from "./sections/credits";
import { PlanFeaturesCard, SubscriptionManagement, PreviewPanel } from "./sections/management";

import { PaymentFlow } from "./flows/payment-flow";
import { DetailsFlow } from "./flows/details-flow";
import { InvoiceFlow } from "./flows/invoice-flow";
import { UpgradeFlow } from "./flows/upgrade-flow";
import { CreditsFlow } from "./flows/credits-flow";
import { CancellationFlow } from "./flows/cancellation-flow";

function BillingContent() {
  const { loadError: serviceError, simulation, status, retry: retryLoad } = useBilling();
  const ready = status === "ready";

  if (serviceError) {
    return (
      <div className="mt-6 rounded-lg border border-[#DCE2EA] bg-white p-10">
        <EmptyState
          icon={ServerOff}
          title="Unable to load billing data"
          description={
            <>
              {serviceError.message}
              <span className="mt-2 block text-[12px] text-[#6B7890]">{serviceError.hint}</span>
            </>
          }
          action={<Button variant="primary" onClick={retryLoad}>Retry</Button>}
        />
      </div>
    );
  }

  if (simulation.loadError) {
    return (
      <div className="mt-6 rounded-lg border border-[#DCE2EA] bg-white p-10">
        <EmptyState
          icon={AlertTriangle}
          title="Billing data unavailable"
          description="OmniPlatform couldn't load subscription data. Your account remains active."
          action={<Button variant="primary" onClick={retryLoad}>Retry</Button>}
        />
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="mt-6 flex flex-col gap-1">
        <SummarySkeleton />
        <PlanUsageSkeleton />
        <TwoCardSkeleton left={7} />
        <TwoCardSkeleton left={5} />
        <div className="rounded-lg border border-[#DCE2EA] bg-white p-6"><TableSkeleton rows={4} /></div>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-1">
      <StateBanner />
      <SummaryStrip />

      <div className="grid gap-1 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <CurrentPlanCard />
        </div>
        <div className="lg:col-span-8">
          <UsageCard />
        </div>
      </div>

      <NeedsAttention />

      <div className="grid gap-1 md:grid-cols-12">
        <div className="md:col-span-7">
          <PaymentMethodCard />
        </div>
        <div className="md:col-span-5">
          <NextPaymentCard />
        </div>
      </div>

      <div className="grid gap-1 md:grid-cols-12">
        <div className="md:col-span-7">
          <BillingDetailsCard />
        </div>
        <div className="md:col-span-5">
          <ContactsCard />
        </div>
      </div>

      <InvoicesCard />
      <PaymentHistoryCard />

      <div className="grid gap-1 md:grid-cols-12">
        <div className="md:col-span-6">
          <CreditsCard />
        </div>
        <div className="md:col-span-6">
          <AddOnsCard />
        </div>
      </div>

      <PlanFeaturesCard />
      <SubscriptionManagement />

      {/* Renders global preview modals dynamically */}
      <PreviewPanel />
    </div>
  );
}

export function BillingWorkspace() {
  return (
    <BillingProvider>
      <div className="-mx-4 -my-5 min-h-[calc(100dvh-60px)] bg-[#F8FAFC] px-4 py-4 sm:-mx-5 sm:px-5 xl:-mx-6 xl:px-6">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col">
          <BillingHeader />
          <BillingContent />
        </div>
      </div>
      
      {/* Flows */}
      <PaymentFlow />
      <DetailsFlow />
      <InvoiceFlow />
      <UpgradeFlow />
      <CreditsFlow />
      <CancellationFlow />
    </BillingProvider>
  );
}
