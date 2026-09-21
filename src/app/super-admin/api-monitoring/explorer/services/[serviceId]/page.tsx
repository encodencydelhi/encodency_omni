import type { Metadata } from "next";
import { ApiMonitoringOperationsCenter } from "@/features/api-monitoring/components/operations-center";

export const metadata: Metadata = { title: "API Service Detail | API Monitoring" };

export default async function Page({ params }: { params: Promise<{ serviceId: string }> }) {
  const { serviceId } = await params;
  return <ApiMonitoringOperationsCenter page="service" serviceId={serviceId} />;
}
