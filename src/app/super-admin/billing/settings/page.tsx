import type { Metadata } from "next";
import { Suspense } from "react";
import { BillingSettingsPage } from "@/features/billing";

export const metadata: Metadata = {
  title: "Billing Governance & Settings | EnCodency OmniPlatform Super Admin",
  description: "Platform billing policies, payment limits, invoice numbering and refund approval thresholds.",
};

export default function Page() {
  return (
    <Suspense fallback={<div className="h-64 rounded-sm bg-slate-50 animate-pulse border border-border" />}>
      <BillingSettingsPage />
    </Suspense>
  );
}
