import type { Metadata } from "next";
import { Suspense } from "react";
import { SettingsPage } from "@/features/integrations";

export const metadata: Metadata = {
  title: "Integration Platform Settings | EnCodency OmniPlatform Super Admin",
  description: "Platform-wide governance policies, health monitoring intervals, and background sync defaults.",
};

export default function Page() {
  return (
    <Suspense fallback={<div className="h-64 rounded-xl bg-slate-50 animate-pulse" />}>
      <SettingsPage />
    </Suspense>
  );
}
