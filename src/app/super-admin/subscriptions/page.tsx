import type { Metadata } from "next";
import { Suspense } from "react";
import { PlansSubscriptionsWorkspace } from "@/features/plans-subscriptions/pages/workspace";

export const metadata: Metadata = {
  title: "Subscriptions",
  description: "Inspect and manage company subscriptions across OmniPlatform.",
};

export default function SubscriptionsPage() {
  return (
    <Suspense fallback={null}>
      <PlansSubscriptionsWorkspace initialTab="subscriptions" />
    </Suspense>
  );
}
