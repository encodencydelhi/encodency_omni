import type { Metadata } from "next";
import { EndpointDetailPage } from "@/features/webhooks/components/endpoint-detail";

export const metadata: Metadata = { title: "Endpoint Detail | Webhooks | EnCodency OmniPlatform Super Admin" };

export default async function Page({ params }: { params: Promise<{ endpointId: string }> }) {
  const { endpointId } = await params;
  return <EndpointDetailPage endpointId={endpointId} />;
}
