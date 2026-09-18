import { Suspense, type ReactNode } from "react";
import { IntegrationsLayout } from "@/features/admin/integrations/integrations-layout";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <IntegrationsLayout>{children}</IntegrationsLayout>
    </Suspense>
  );
}
