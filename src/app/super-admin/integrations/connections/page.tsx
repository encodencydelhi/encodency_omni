import type { Metadata } from "next";
import { Suspense } from "react";
import { ConnectionsPage } from "@/features/integrations";

export const metadata: Metadata = {
  title: "Tenant Connections Directory | EnCodency OmniPlatform Super Admin",
  description: "Platform-wide directory of company account authorizations and external connected resources.",
};

export default function Page() {
  return (
    <Suspense fallback={<div className="h-64 rounded-xl bg-slate-50 animate-pulse" />}>
      <ConnectionsPage />
    </Suspense>
  );
}
