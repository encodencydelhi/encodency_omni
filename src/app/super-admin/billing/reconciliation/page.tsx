import type { Metadata } from "next";
import { Suspense } from "react";
import { ReconciliationPage } from "@/features/billing";

export const metadata: Metadata = {
  title: "Reconciliation & Issues | EnCodency OmniPlatform Super Admin",
  description: "Operational financial discrepancy and exception queue.",
};

export default function Page() {
  return (
    <Suspense fallback={<div className="h-64 rounded-sm bg-slate-50 animate-pulse border border-border" />}>
      <ReconciliationPage />
    </Suspense>
  );
}
