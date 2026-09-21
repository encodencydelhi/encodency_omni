import type { Metadata } from "next";
import { Suspense } from "react";
import { FlagDetailPage } from "@/features/feature-flags/pages/flag-detail";

export const metadata: Metadata = {
  title: "Feature Flag",
  description: "Rollout, rules, company impact and lifecycle for one feature flag.",
};

export default async function Page({ params }: { params: Promise<{ flagKey: string }> }) {
  const { flagKey } = await params;
  return (
    <Suspense fallback={null}>
      <FlagDetailPage flagKey={decodeURIComponent(flagKey)} />
    </Suspense>
  );
}
