import type { Metadata } from "next";
import { SystemHealthOperationsCenter } from "@/features/system-health/components/operations-center";

export const metadata: Metadata = { title: "Impact & Availability | System Health" };

export default function ImpactAvailabilityPage() {
  return <SystemHealthOperationsCenter page="impact" />;
}
