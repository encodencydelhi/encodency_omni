import { WhatsappChannelPage } from "@/features/admin/channels/components/whatsapp-channel-page";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  return <WhatsappChannelPage initialSection={typeof query.section === "string" ? query.section : undefined} />;
}
