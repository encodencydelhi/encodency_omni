import type { Metadata } from "next";
import { IncomingEventDetailPage } from "@/features/webhooks/components/incoming-detail";

export const metadata: Metadata = { title: "Incoming Event | Webhooks | EnCodency OmniPlatform Super Admin" };

export default async function Page({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  return <IncomingEventDetailPage eventId={eventId} />;
}
