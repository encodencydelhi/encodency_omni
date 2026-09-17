import { Suspense, type ReactNode } from "react";
import { WebsiteWorkspaceProvider } from "@/features/admin/website/components/website-workspace";
import { WebsiteShell } from "@/features/admin/website/components/website-shell";
import { WebsiteSectionFallback } from "@/features/admin/website/components/ui/section-fallback";

export default function WebsiteLayout({ children }: { children: ReactNode }) {
  return (
    <WebsiteWorkspaceProvider>
      <WebsiteShell>
        {/* Screens read their filters from the query string, so they suspend. */}
        <Suspense fallback={<WebsiteSectionFallback />}>{children}</Suspense>
      </WebsiteShell>
    </WebsiteWorkspaceProvider>
  );
}
