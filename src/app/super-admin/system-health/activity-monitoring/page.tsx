import type { Metadata } from "next";
import { SystemHealthOperationsCenter } from "@/features/system-health/components/operations-center";

export const metadata: Metadata = { title: "Activity & Monitoring | System Health" };

export default function ActivityMonitoringPage() {
  return <SystemHealthOperationsCenter page="activity" />;
}
