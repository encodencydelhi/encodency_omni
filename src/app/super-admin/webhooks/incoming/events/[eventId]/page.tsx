import { IncomingEventDetailPage } from "@/features/webhooks/components/incoming-detail";

export default async function Page({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  return <IncomingEventDetailPage eventId={eventId} />;
}
