import { Suspense, type ReactNode } from "react";
import { PageSkeleton } from "@/features/webhooks/components/kit";
import { WebhooksShell } from "@/features/webhooks/components/webhooks-shell";

/**
 * Webhooks module layout. The shell (header, environment/range context, section tabs) persists across the
 * eight sections and the nested detail routes, so the Webhooks sidebar item stays active throughout.
 */
export default function WebhooksLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <WebhooksShell>{children}</WebhooksShell>
    </Suspense>
  );
}
