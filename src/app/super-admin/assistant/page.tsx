import { Suspense } from "react";
import { AssistantOverviewPage } from "@/features/assistant/desk/overview-page";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AssistantOverviewPage />
    </Suspense>
  );
}
