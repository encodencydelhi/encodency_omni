import type { Metadata } from "next";
import { IncomingEventsPage } from "@/features/webhooks/components/incoming-lists";

export const metadata: Metadata = {
  title: "Incoming Events | Webhooks | EnCodency OmniPlatform Super Admin",
  description: "Incoming webhook events, verification and processing.",
};

export default function Page() {
  return <IncomingEventsPage />;
}
