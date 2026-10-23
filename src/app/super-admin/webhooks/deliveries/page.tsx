import type { Metadata } from "next";
import { LiveWebhookConsole } from "@/features/webhooks/components/live-console";

export const metadata: Metadata = {
  title: "Deliveries & Attempts | Webhooks | EnCodency OmniPlatform Super Admin",
  description: "Outgoing deliveries and delivery attempts.",
};

export default function Page() {
  return <LiveWebhookConsole view="deliveries" />;
}
