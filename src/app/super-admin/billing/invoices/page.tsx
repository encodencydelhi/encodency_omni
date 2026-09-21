import type { Metadata } from "next";
import { Suspense } from "react";
import { InvoicesPage } from "@/features/billing";

export const metadata: Metadata = {
  title: "Invoices Directory | EnCodency OmniPlatform Super Admin",
  description: "Platform-wide invoice documents, collection progress and outstanding receivables.",
};

export default function Page() {
  return (
    <Suspense fallback={<div className="h-64 rounded-sm bg-slate-50 animate-pulse border border-border" />}>
      <InvoicesPage />
    </Suspense>
  );
}
