import type { Metadata } from "next";
import { Suspense } from "react";
import { PlanEditorPage } from "@/features/plans-subscriptions/pages/plan-editor";

export const metadata: Metadata = {
  title: "Edit plan",
  description: "Edit the draft version of a plan.",
};

export default function Page() {
  // Filters and sections live in the URL, which needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <PlanEditorPage />
    </Suspense>
  );
}
