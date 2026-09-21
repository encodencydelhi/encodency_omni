import type { Metadata } from "next";
import { EventTypeDetailPage } from "@/features/webhooks/components/events-pages";

export const metadata: Metadata = { title: "Event Type | Webhooks | EnCodency OmniPlatform Super Admin" };

export default async function Page({ params }: { params: Promise<{ eventKey: string }> }) {
  const { eventKey } = await params;
  return <EventTypeDetailPage eventKey={decodeURIComponent(eventKey)} />;
}
