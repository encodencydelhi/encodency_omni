import type { Metadata } from "next";
import { Suspense } from "react";
import { IssuesPage } from "@/features/integrations";

export const metadata: Metadata = {
  title: "Integration Issues & Incidents | EnCodency OmniPlatform Super Admin",
  description: "Platform-wide integration incident investigation, provider outages, and authorization failures.",
};

export default function Page() {
  return (
    <Suspense fallback={<div className="h-64 rounded-xl bg-slate-50 animate-pulse" />}>
      <IssuesPage />
    </Suspense>
  );
}
