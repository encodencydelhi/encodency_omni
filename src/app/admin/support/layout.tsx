import { Suspense, type ReactNode } from "react";
import { SupportShell } from "@/features/support/admin/support-shell";

export default function AdminSupportLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <SupportShell>{children}</SupportShell>
    </Suspense>
  );
}
