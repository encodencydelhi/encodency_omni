import type { Metadata } from "next";
import { Suspense } from "react";
import { MeteringActivityPage } from "@/features/usage-limits/pages/metering-activity";

export const metadata: Metadata = {
  title: "Metering & activity",
  description: "Usage events, metering health and activity.",
};

export default function Page() {
  // Filters live in the URL, which needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <MeteringActivityPage />
    </Suspense>
  );
}
