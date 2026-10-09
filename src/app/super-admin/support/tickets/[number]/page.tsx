import { DeskTicketPage } from "@/features/support/desk/ticket-page";

export default async function Page({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  return <DeskTicketPage number={Number(number)} />;
}
