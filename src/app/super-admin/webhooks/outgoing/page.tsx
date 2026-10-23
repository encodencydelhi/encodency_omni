import type { Metadata } from "next";
import { LiveWebhookConsole } from "@/features/webhooks/components/live-console";

export const metadata: Metadata = {
  title: "Outgoing Endpoints | Webhooks | EnCodency OmniPlatform Super Admin",
  description: "Outgoing webhook endpoints and event subscriptions.",
};

export default function Page() {
  return <LiveWebhookConsole view="endpoints" />;
}
