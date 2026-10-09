import { Suspense } from "react";
import { AssistantPeoplePage } from "@/features/assistant/desk/people-page";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AssistantPeoplePage />
    </Suspense>
  );
}
