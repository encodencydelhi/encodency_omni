import { Suspense, type ReactNode } from "react";
import { GoogleBusinessLayout } from "@/features/admin/google-business/google-business-layout";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <GoogleBusinessLayout>{children}</GoogleBusinessLayout>
    </Suspense>
  );
}
