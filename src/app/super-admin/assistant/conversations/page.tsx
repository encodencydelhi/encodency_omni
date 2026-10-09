import { Suspense } from "react";
import { AssistantConversationsPage } from "@/features/assistant/desk/conversations-page";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AssistantConversationsPage />
    </Suspense>
  );
}
