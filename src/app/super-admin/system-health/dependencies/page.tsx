import type { Metadata } from "next";
import { SystemHealthOperationsCenter } from "@/features/system-health/components/operations-center";

export const metadata: Metadata = { title: "Dependencies | System Health" };

export default function DependenciesPage() {
  return <SystemHealthOperationsCenter page="dependencies" />;
}
