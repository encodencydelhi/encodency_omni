import { CampaignReportPage } from "@/features/admin/channels/demo/campaign-report";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CampaignReportPage id={id} />;
}
