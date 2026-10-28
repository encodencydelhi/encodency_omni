import type { Metadata } from "next";
import { DeliveriesPage } from "@/features/webhooks/components/deliveries-list";

export const metadata: Metadata = {
  title: "Deliveries & Attempts | Webhooks | EnCodency OmniPlatform Super Admin",
  description: "Outgoing deliveries and delivery attempts.",
};

export default function Page() {
  return <DeliveriesPage />;
}
