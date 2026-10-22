"use client";

import type { ReactNode } from "react";
import { AlertBanner } from "@/components/shared/alert-banner";
import { Skeleton } from "@/components/ui/skeleton";
import type { FeatureKey } from "./feature-flags";
import { useFeature, type FeatureState } from "./use-feature";

/** The explanation shown in place of a feature that is switched off for this workspace. */
export function FeatureUnavailable({ feature, className }: { feature: FeatureState; className?: string }) {
  return (
    <AlertBanner tone="warning" title={`${feature.label} is unavailable`} className={className}>
      {feature.explanation || "This feature is not available for your workspace right now."} If you need it, ask your platform administrator.
    </AlertBanner>
  );
}

/** A quiet note when the availability check itself failed. The feature stays usable; the server still decides. */
export function FeatureCheckFailed({ feature, className }: { feature: FeatureState; className?: string }) {
  if (feature.status !== "error") return null;
  return (
    <AlertBanner
      tone="info"
      className={className}
      action={
        <button type="button" onClick={feature.retry} className="text-2xs font-medium text-primary hover:underline">
          Check again
        </button>
      }
    >
      {feature.explanation}
    </AlertBanner>
  );
}

/**
 * Renders its children only when the Company may use the feature; shows the reason otherwise.
 * Hiding the interface is not enforcement: the backend refuses the call on its own.
 */
export function FeatureGate({ flag, children, loading }: { flag: FeatureKey; children: ReactNode; loading?: ReactNode }) {
  const feature = useFeature(flag);
  if (feature.status === "loading") return <>{loading ?? <Skeleton className="h-24 w-full" />}</>;
  if (feature.status === "disabled") return <FeatureUnavailable feature={feature} />;
  return (
    <>
      <FeatureCheckFailed feature={feature} className="mb-3" />
      {children}
    </>
  );
}
