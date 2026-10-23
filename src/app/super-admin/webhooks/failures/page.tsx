import type { Metadata } from "next";
import { LiveWebhookConsole } from "@/features/webhooks/components/live-console";

export const metadata: Metadata = {
  title: "Failures & Retries | Webhooks | EnCodency OmniPlatform Super Admin",
  description: "Webhook failures, retries and recovery requests.",
};

export default function Page() {
  return <LiveWebhookConsole view="failures" />;
}
