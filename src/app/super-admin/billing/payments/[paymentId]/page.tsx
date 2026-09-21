import type { Metadata } from "next";
import { Suspense } from "react";
import { PaymentDetailPage } from "@/features/billing";

export const metadata: Metadata = {
  title: "Payment Transaction Detail | EnCodency OmniPlatform Super Admin",
  description: "Gateway payment details, invoice allocations, and refund history.",
};

export default function Page() {
  return (
    <Suspense fallback={<div className="h-64 rounded-sm bg-slate-50 animate-pulse border border-border" />}>
      <PaymentDetailPage />
    </Suspense>
  );
}
