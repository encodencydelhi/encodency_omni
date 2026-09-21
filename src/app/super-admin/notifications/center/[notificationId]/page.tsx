import { NotificationsOperationsCenter } from "@/features/super-admin-notifications/components/operations-center";

export default async function NotificationDetailPage({ params }: { params: Promise<{ notificationId: string }> }) {
  const { notificationId } = await params;
  return <NotificationsOperationsCenter page="notification" notificationId={notificationId} />;
}
