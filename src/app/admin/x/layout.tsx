import { Suspense, type ReactNode } from "react";
import { XLayout } from "@/features/admin/x/x-layout";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <XLayout>{children}</XLayout>
    </Suspense>
  );
}
