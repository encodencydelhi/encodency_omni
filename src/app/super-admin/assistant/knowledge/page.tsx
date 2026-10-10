import { Suspense } from "react";
import { AssistantKnowledgePage } from "@/features/assistant/desk/knowledge-page";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AssistantKnowledgePage />
    </Suspense>
  );
}
