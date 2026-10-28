import { IncomingSourceDetailPage } from "@/features/webhooks/components/incoming-detail";

export default async function Page({ params }: { params: Promise<{ sourceId: string }> }) {
  const { sourceId } = await params;
  return <IncomingSourceDetailPage sourceId={sourceId} />;
}
