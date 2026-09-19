import type { Metadata } from "next";
import { Suspense } from "react";
import { ProvidersPage } from "@/features/integrations";

export const metadata: Metadata = {
  title: "Provider Catalogue | EnCodency OmniPlatform Super Admin",
  description: "Configure and manage third-party integration providers, API credentials and platform availability.",
};

export default function Page() {
  return (
    <Suspense fallback={<div className="h-64 rounded-xl bg-slate-50 animate-pulse" />}>
      <ProvidersPage />
    </Suspense>
  );
}
