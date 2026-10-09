import { MyTicketDetailPage } from "@/features/support/admin/ticket-detail-page";

export default async function Page({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  return <MyTicketDetailPage number={Number(number)} />;
}
