import type { Metadata } from "next";
import { ApiMonitoringOperationsCenter } from "@/features/api-monitoring/components/operations-center";

export const metadata: Metadata = { title: "Endpoint Detail | API Monitoring" };

export default async function Page({ params }: { params: Promise<{ endpointId: string }> }) {
  const { endpointId } = await params;
  return <ApiMonitoringOperationsCenter page="endpoint" endpointId={endpointId} />;
}
