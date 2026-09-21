import type { Metadata } from "next";
import { SystemHealthOperationsCenter } from "@/features/system-health/components/operations-center";

export const metadata: Metadata = { title: "Incidents | System Health" };

export default function IncidentsPage() {
  return <SystemHealthOperationsCenter page="incidents" />;
}
