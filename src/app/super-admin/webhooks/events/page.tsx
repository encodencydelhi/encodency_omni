import type { Metadata } from "next";
import { EventCataloguePage } from "@/features/webhooks/components/events-pages";

export const metadata: Metadata = {
  title: "Event Catalogue | Webhooks | EnCodency OmniPlatform Super Admin",
  description: "Outgoing platform event types and schema versions.",
};

export default function Page() {
  return <EventCataloguePage />;
}
