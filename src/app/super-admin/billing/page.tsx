import type { Metadata } from "next";
import { Suspense } from "react";
import { BillingOverviewPage } from "@/features/billing";

export const metadata: Metadata = {
  title: "Billing & Payments Overview | EnCodency OmniPlatform Super Admin",
  description: "Platform-wide company billing, invoices, payments, credits and financial reconciliation.",
};

export default function Page() {
  return (
    <Suspense fallback={<div className="h-64 rounded-sm bg-slate-50 animate-pulse border border-border" />}>
      <BillingOverviewPage />
    </Suspense>
  );
}
