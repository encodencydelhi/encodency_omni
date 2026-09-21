import type { Metadata } from "next";
import { Suspense } from "react";
import { BillingAccountsPage } from "@/features/billing";

export const metadata: Metadata = {
  title: "Billing Accounts Directory | EnCodency OmniPlatform Super Admin",
  description: "Platform-wide company billing accounts, legal identities, tax details and terms.",
};

export default function Page() {
  return (
    <Suspense fallback={<div className="h-64 rounded-sm bg-slate-50 animate-pulse border border-border" />}>
      <BillingAccountsPage />
    </Suspense>
  );
}
