import { Suspense, type ReactNode } from "react";
import { InfrastructureShell } from "@/features/infrastructure/shell";

export default function InfrastructureLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <InfrastructureShell>{children}</InfrastructureShell>
    </Suspense>
  );
}
