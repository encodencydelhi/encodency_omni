import type { Metadata } from "next";
import { Suspense } from "react";
import { InvestigationDetailPage } from "@/features/audit-logs/pages/investigation-detail";

export const metadata: Metadata = {
  title: "Investigation",
  description: "One internal investigation: linked events, timeline and notes.",
};

export default async function Page({ params }: { params: Promise<{ investigationId: string }> }) {
  const { investigationId } = await params;
  return (
    <Suspense fallback={null}>
      <InvestigationDetailPage id={decodeURIComponent(investigationId)} />
    </Suspense>
  );
}
