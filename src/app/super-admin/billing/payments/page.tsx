import type { Metadata } from "next";
import { Suspense } from "react";
import { PaymentsPage } from "@/features/billing";

export const metadata: Metadata = {
  title: "Payments Directory | EnCodency OmniPlatform Super Admin",
  description: "Payment transaction inspection, settlement tracking and invoice allocation status.",
};

export default function Page() {
  return (
    <Suspense fallback={<div className="h-64 rounded-sm bg-slate-50 animate-pulse border border-border" />}>
      <PaymentsPage />
    </Suspense>
  );
}
