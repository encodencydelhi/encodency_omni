import type { Metadata } from "next";
import { LiveWebhookConsole } from "@/features/webhooks/components/live-console";

export const metadata: Metadata = {
  title: "Overview | Webhooks | EnCodency OmniPlatform Super Admin",
  description: "Webhook configuration, event processing and delivery operations across OmniPlatform.",
};

export default function Page() {
  return <LiveWebhookConsole view="overview" />;
}
