import type { Metadata } from "next";
import { Suspense } from "react";
import { ClientOverviewPage } from "@/features/clients/pages/client-overview";

export const metadata: Metadata = {
  title: "Client overview",
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ClientOverviewPage />
    </Suspense>
  );
}
