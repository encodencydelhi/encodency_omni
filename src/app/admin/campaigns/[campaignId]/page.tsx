import CampaignDetailPage from "@/features/admin/campaigns/campaign-detail-page";
export default async function Page({ params }: { params: Promise<{ campaignId: string }> }) { const { campaignId } = await params; return <CampaignDetailPage id={campaignId} />; }
