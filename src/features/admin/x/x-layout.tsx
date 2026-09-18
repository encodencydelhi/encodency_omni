"use client";

import type { ReactNode } from "react";
import { XWorkspace } from "./components/workspace";
import { XProvider } from "./store/x-store";

export function XLayout({ children }: { children: ReactNode }) {
  return (
    <XProvider>
      <XWorkspace>{children}</XWorkspace>
    </XProvider>
  );
}
