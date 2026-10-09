import { Suspense, type ReactNode } from "react";
import { AssistantDeskShell } from "@/features/assistant/desk/desk-shell";

export default function SuperAdminAssistantLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AssistantDeskShell>{children}</AssistantDeskShell>
    </Suspense>
  );
}
