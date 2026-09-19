import type { Metadata } from "next";
import { Suspense } from "react";
import { ConnectionDetailPage } from "@/features/integrations";

export const metadata: Metadata = {
  title: "Connection Command Center | EnCodency OmniPlatform Super Admin",
  description: "Authorization details, client resource mapping, permission health, and sync telemetry.",
};

export default function Page() {
  return (
    <Suspense fallback={<div className="h-64 rounded-xl bg-slate-50 animate-pulse" />}>
      <ConnectionDetailPage />
    </Suspense>
  );
}
