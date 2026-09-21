import type { Metadata } from "next";
import { DeliveryDetailPage } from "@/features/webhooks/components/delivery-detail";

export const metadata: Metadata = { title: "Delivery Detail | Webhooks | EnCodency OmniPlatform Super Admin" };

export default async function Page({ params }: { params: Promise<{ deliveryId: string }> }) {
  const { deliveryId } = await params;
  return <DeliveryDetailPage deliveryId={deliveryId} />;
}
