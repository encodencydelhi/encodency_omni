import type { Metadata } from "next";
import { SubscriptionsDirectoryPage } from "@/features/webhooks/components/events-pages";

export const metadata: Metadata = {
  title: "Subscriptions | Webhooks | EnCodency OmniPlatform Super Admin",
  description: "Endpoint event subscriptions.",
};

export default function Page() {
  return <SubscriptionsDirectoryPage />;
}
