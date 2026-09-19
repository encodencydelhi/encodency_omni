import type { Metadata } from "next";
import { Suspense } from "react";
import { IntegrationsOverviewPage } from "@/features/integrations";

export const metadata: Metadata = {
  title: "Platform Integrations Overview | EnCodency OmniPlatform",
  description: "Manage platform providers, connection health, capabilities and external service availability.",
};

export default function Page() {
  return (
    <Suspense fallback={<div className="h-64 rounded-xl bg-slate-50 animate-pulse" />}>
      <IntegrationsOverviewPage />
    </Suspense>
  );
}
