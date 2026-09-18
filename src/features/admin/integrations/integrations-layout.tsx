"use client";

import type { ReactNode } from "react";
import { IntegrationsWorkspace } from "./components/workspace";
import { IntegrationsProvider } from "./store/integrations-store";

export function IntegrationsLayout({ children }: { children: ReactNode }) {
  return (
    <IntegrationsProvider>
      <IntegrationsWorkspace>{children}</IntegrationsWorkspace>
    </IntegrationsProvider>
  );
}
