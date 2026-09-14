"use client";

import { NotFoundState } from "@/features/admin/meta-ads/components/ui";
import {
  ADS_ROOT,
  AdsWorkspace,
} from "@/features/admin/meta-ads/components/workspace";

/** Catches any unknown route under the Ads Manager workspace. */
export default function AdsNotFound() {
  return (
    <AdsWorkspace>
      <NotFoundState
        title="Page not found"
        description="That Ads Manager page does not exist. It may have been renamed, or the entity it pointed at was deleted."
        backHref={ADS_ROOT}
        backLabel="Back to Ads Manager"
        secondary={{ label: "Open Help Center", href: `${ADS_ROOT}/help` }}
      />
    </AdsWorkspace>
  );
}
