import type { Metadata } from "next";
import { SystemHealthOperationsCenter } from "@/features/system-health/components/operations-center";

export const metadata: Metadata = { title: "Incident Detail | System Health" };

export default async function IncidentDetailPage({ params }: { params: Promise<{ incidentId: string }> }) {
  const { incidentId } = await params;
  return <SystemHealthOperationsCenter page="incident-detail" incidentId={incidentId} />;
}
