import { NotificationsOperationsCenter } from "@/features/super-admin-notifications/components/operations-center";

export default async function CampaignDetailPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  return <NotificationsOperationsCenter page="campaign" campaignId={campaignId} />;
}
