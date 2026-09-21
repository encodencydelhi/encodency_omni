import type { Metadata } from "next";
import { JobsQueuesOperationsCenter } from "@/features/jobs-queues/components/operations-center";

export const metadata: Metadata = {
  title: "Jobs & Queues | EnCodency OmniPlatform Super Admin",
  description: "Background job execution, queue operations and controlled recovery workspace.",
};

export default function JobsQueuesPage() {
  return <JobsQueuesOperationsCenter />;
}
