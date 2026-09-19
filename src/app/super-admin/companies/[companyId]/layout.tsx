import type { ReactNode } from "react";
import { Suspense } from "react";
import { CompanyShell } from "@/features/companies/pages/company-shell";

/**
 * Frame shared by every company section (identity header, summary strip and
 * section navigation). Each section is its own route, so direct links, refresh
 * and browser Back/Forward all land on the section that was open.
 */
export default function CompanyLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <CompanyShell>{children}</CompanyShell>
    </Suspense>
  );
}
