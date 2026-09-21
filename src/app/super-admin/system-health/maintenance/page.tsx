import type { Metadata } from "next";
import { SystemHealthOperationsCenter } from "@/features/system-health/components/operations-center";

export const metadata: Metadata = { title: "Maintenance | System Health" };

export default function MaintenancePage() {
  return <SystemHealthOperationsCenter page="maintenance" />;
}
