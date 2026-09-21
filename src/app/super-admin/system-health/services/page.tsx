import type { Metadata } from "next";
import { SystemHealthOperationsCenter } from "@/features/system-health/components/operations-center";

export const metadata: Metadata = { title: "Services | System Health" };

export default function ServicesPage() {
  return <SystemHealthOperationsCenter page="services" />;
}
