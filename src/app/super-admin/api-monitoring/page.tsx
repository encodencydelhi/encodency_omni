/**
 * EnCodency OmniPlatform - Super Admin API Monitoring Route
 */

import type { Metadata } from "next";
import { Suspense } from "react";
import { ApiMonitoringPage } from "@/features/api-monitoring/pages";

export const metadata: Metadata = {
  title: "API Monitoring | EnCodency OmniPlatform Super Admin",
  description:
    "Monitor API request volumes, response times, error rates, and rate limits across all platform integrations.",
};

export default function ApiMonitoringRoute() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 max-w-full pb-12">
          <div className="h-10 w-64 rounded bg-slate-100 animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 rounded-lg bg-slate-100 animate-pulse" />
            ))}
          </div>
          <div className="h-64 rounded-lg bg-slate-100 animate-pulse" />
          <div className="h-96 rounded-lg bg-slate-100 animate-pulse" />
        </div>
      }
    >
      <ApiMonitoringPage />
    </Suspense>
  );
}
