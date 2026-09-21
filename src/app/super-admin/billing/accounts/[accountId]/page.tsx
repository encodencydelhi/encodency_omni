import type { Metadata } from "next";
import { Suspense } from "react";
import { BillingAccountDetailPage } from "@/features/billing";

export const metadata: Metadata = {
  title: "Billing Account Detail | EnCodency OmniPlatform Super Admin",
  description: "Company billing identity, preferences, payment terms and scoped invoices.",
};

export default function Page() {
  return (
    <Suspense fallback={<div className="h-64 rounded-sm bg-slate-50 animate-pulse border border-border" />}>
      <BillingAccountDetailPage />
    </Suspense>
  );
}
