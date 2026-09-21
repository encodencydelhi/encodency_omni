import type { Metadata } from "next";
import { IncomingSourceDetailPage } from "@/features/webhooks/components/incoming-detail";

export const metadata: Metadata = { title: "Source Detail | Webhooks | EnCodency OmniPlatform Super Admin" };

export default async function Page({ params }: { params: Promise<{ sourceId: string }> }) {
  const { sourceId } = await params;
  return <IncomingSourceDetailPage sourceId={sourceId} />;
}
