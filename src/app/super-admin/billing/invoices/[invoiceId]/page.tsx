import type { Metadata } from "next";
import { Suspense } from "react";
import { InvoiceDetailPage } from "@/features/billing";

export const metadata: Metadata = {
  title: "Invoice Detail | EnCodency OmniPlatform Super Admin",
  description: "Financial invoice breakdown, allocations, adjustments and printable document view.",
};

export default function Page() {
  return (
    <Suspense fallback={<div className="h-64 rounded-sm bg-slate-50 animate-pulse border border-border" />}>
      <InvoiceDetailPage />
    </Suspense>
  );
}
