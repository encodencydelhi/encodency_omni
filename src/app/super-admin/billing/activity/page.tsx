import type { Metadata } from "next";
import { Suspense } from "react";
import { FinancialActivityPage } from "@/features/billing";

export const metadata: Metadata = {
  title: "Financial Activity Audit Log | EnCodency OmniPlatform Super Admin",
  description: "Platform-wide audit log of invoice operations, payment allocations, and adjustments.",
};

export default function Page() {
  return (
    <Suspense fallback={<div className="h-64 rounded-sm bg-slate-50 animate-pulse border border-border" />}>
      <FinancialActivityPage />
    </Suspense>
  );
}
