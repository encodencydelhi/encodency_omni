import { EndpointDetailPage } from "@/features/webhooks/components/endpoint-detail";

export default async function Page({ params }: { params: Promise<{ endpointId: string }> }) {
  const { endpointId } = await params;
  return <EndpointDetailPage endpointId={endpointId} />;
}
