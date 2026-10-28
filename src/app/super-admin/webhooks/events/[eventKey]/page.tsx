import { EventTypeDetailPage } from "@/features/webhooks/components/events-pages";

export default async function Page({ params }: { params: Promise<{ eventKey: string }> }) {
  const { eventKey } = await params;
  return <EventTypeDetailPage eventKey={eventKey} />;
}
