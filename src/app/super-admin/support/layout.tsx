import { Suspense, type ReactNode } from "react";
import { DeskShell } from "@/features/support/desk/desk-shell";

export default function SuperAdminSupportLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <DeskShell>{children}</DeskShell>
    </Suspense>
  );
}
