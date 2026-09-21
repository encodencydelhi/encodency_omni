import type { Metadata } from "next";
import { ApiMonitoringOperationsCenter } from "@/features/api-monitoring/components/operations-center";

export const metadata: Metadata = { title: "Activity & Settings | API Monitoring" };

export default function Page() {
  return <ApiMonitoringOperationsCenter page="activity" />;
}
