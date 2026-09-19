import type { Metadata } from "next";
import { Suspense } from "react";
import { ActivityPage } from "@/features/integrations";

export const metadata: Metadata = {
  title: "Integration Activity Log | EnCodency OmniPlatform Super Admin",
  description: "Platform audit trail of tenant authorizations, provider configurations, and background sync operations.",
};

export default function Page() {
  return (
    <Suspense fallback={<div className="h-64 rounded-xl bg-slate-50 animate-pulse" />}>
      <ActivityPage />
    </Suspense>
  );
}
