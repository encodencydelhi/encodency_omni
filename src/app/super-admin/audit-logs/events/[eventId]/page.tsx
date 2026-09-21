import type { Metadata } from "next";
import { Suspense } from "react";
import { EventDetailPage } from "@/features/audit-logs/pages/event-detail";

export const metadata: Metadata = {
  title: "Audit Event",
  description: "One recorded audit event with its actor, target, changes and correlated workflow.",
};

export default async function Page({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  return (
    <Suspense fallback={null}>
      <EventDetailPage eventId={decodeURIComponent(eventId)} />
    </Suspense>
  );
}
