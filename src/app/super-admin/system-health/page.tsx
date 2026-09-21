import type { Metadata } from "next";
import { SystemHealthOperationsCenter } from "@/features/system-health/components/operations-center";

export const metadata: Metadata = {
  title: "System Health | EnCodency OmniPlatform Super Admin",
  description: "Platform reliability, service health and incident operations center.",
};

export default function SystemHealthPage() {
  return <SystemHealthOperationsCenter page="overview" />;
}
