import type { ReactNode } from "react";
import { Suspense } from "react";
import { ModuleFrame } from "@/features/plans-subscriptions/components/module-tabs";

/** The compact Plans & Subscriptions navigation shared by every route in this module. */
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <ModuleFrame>{children}</ModuleFrame>
    </Suspense>
  );
}
