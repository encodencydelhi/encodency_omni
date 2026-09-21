import { NotificationsOperationsCenter } from "@/features/super-admin-notifications/components/operations-center";

export default async function DeliveryDetailPage({ params }: { params: Promise<{ deliveryId: string }> }) {
  const { deliveryId } = await params;
  return <NotificationsOperationsCenter page="delivery" deliveryId={deliveryId} />;
}
