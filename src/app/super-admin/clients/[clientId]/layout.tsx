import type { ReactNode } from "react";
import { Suspense } from "react";
import { ClientShell } from "@/features/clients/pages/client-shell";

/**
 * Frame shared by every client section (identity header, summary strip and
 * section tabs). Each section is its own route, so direct links, refresh and
 * browser Back/Forward all land on the section that was open.
 */
export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <ClientShell>{children}</ClientShell>
    </Suspense>
  );
}
