import type { Metadata } from "next";
import { OverviewPage } from "@/features/webhooks/components/overview-page";

export const metadata: Metadata = {
  title: "Overview | Webhooks | EnCodency OmniPlatform Super Admin",
  description: "Webhook configuration, event processing and delivery operations across OmniPlatform.",
};

export default function Page() {
  return <OverviewPage />;
}
