import type { Metadata } from "next";
import { OverviewPage } from "@/features/webhooks/components/overview-page";

export const metadata: Metadata = {
  title: "Overview | Webhooks | Media360 Super Admin",
  description: "Webhook configuration, event processing and delivery operations across Media360.",
};

export default function Page() {
  return <OverviewPage />;
}
