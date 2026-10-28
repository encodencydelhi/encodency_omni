import { DeliveryDetailPage } from "@/features/webhooks/components/delivery-detail";

export default async function Page({ params }: { params: Promise<{ deliveryId: string }> }) {
  const { deliveryId } = await params;
  return <DeliveryDetailPage deliveryId={deliveryId} />;
}
