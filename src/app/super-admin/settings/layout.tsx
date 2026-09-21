import type { ReactNode } from "react";
import { Suspense } from "react";
import { SettingsFrame } from "@/features/global-settings/components/settings-frame";

/** The header, summary and section navigation shared by every Global Settings route. */
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <SettingsFrame>{children}</SettingsFrame>
    </Suspense>
  );
}
