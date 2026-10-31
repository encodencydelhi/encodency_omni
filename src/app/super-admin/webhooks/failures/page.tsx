import type { Metadata } from "next";
import { FailuresPage } from "@/features/webhooks/components/failures-page";

export const metadata: Metadata = {
  title: "Failures & Retries | Webhooks | Media360 Super Admin",
  description: "Webhook failures, retries and recovery requests.",
};

export default function Page() {
  return <FailuresPage />;
}
