"use client";

import type { ReactNode } from "react";
import { GoogleBusinessWorkspace } from "./components/workspace";
import { GoogleBusinessProvider } from "./store/gbp-store";

export function GoogleBusinessLayout({ children }: { children: ReactNode }) {
  return (
    <GoogleBusinessProvider>
      <GoogleBusinessWorkspace>{children}</GoogleBusinessWorkspace>
    </GoogleBusinessProvider>
  );
}
