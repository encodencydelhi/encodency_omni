import type { Metadata } from "next";
import { Suspense } from "react";
import { CreditsRefundsPage } from "@/features/billing";

export const metadata: Metadata = {
  title: "Credits & Refunds Workspace | EnCodency OmniPlatform Super Admin",
  description: "Credit note adjustments, account balance ledger, and refund requests.",
};

export default function Page() {
  return (
    <Suspense fallback={<div className="h-64 rounded-sm bg-slate-50 animate-pulse border border-border" />}>
      <CreditsRefundsPage />
    </Suspense>
  );
}
