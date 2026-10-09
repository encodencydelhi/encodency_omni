import { AssistantPersonPage } from "@/features/assistant/desk/person-page";

export default async function Page({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  return <AssistantPersonPage userId={userId} />;
}
