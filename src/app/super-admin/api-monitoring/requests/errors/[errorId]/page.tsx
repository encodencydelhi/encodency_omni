import type { Metadata } from "next";
import { ApiMonitoringOperationsCenter } from "@/features/api-monitoring/components/operations-center";

export const metadata: Metadata = { title: "Error Group Detail | API Monitoring" };

export default async function Page({ params }: { params: Promise<{ errorId: string }> }) {
  const { errorId } = await params;
  return <ApiMonitoringOperationsCenter page="error" errorId={errorId} />;
}
