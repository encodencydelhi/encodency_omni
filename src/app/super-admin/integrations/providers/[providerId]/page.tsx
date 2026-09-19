import type { Metadata } from "next";
import { Suspense } from "react";
import { ProviderDetailPage } from "@/features/integrations";

export const metadata: Metadata = {
  title: "Provider Command Center | EnCodency OmniPlatform Super Admin",
  description: "Provider capabilities, configuration, tenant connections, and operational health diagnostics.",
};

export default function Page() {
  return (
    <Suspense fallback={<div className="h-64 rounded-xl bg-slate-50 animate-pulse" />}>
      <ProviderDetailPage />
    </Suspense>
  );
}
