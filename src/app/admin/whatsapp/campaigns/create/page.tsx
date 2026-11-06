import { CampaignCreationPage } from "@/features/admin/channels/demo/campaign-creation-page";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  return <CampaignCreationPage initialAudience={typeof query.audience === "string" ? query.audience : undefined} id={typeof query.id === "string" ? query.id : undefined} />;
}
