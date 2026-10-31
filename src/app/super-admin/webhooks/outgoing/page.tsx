import type { Metadata } from "next";
import { OutgoingEndpointsPage } from "@/features/webhooks/components/outgoing-lists";

export const metadata: Metadata = {
  title: "Outgoing Endpoints | Webhooks | Media360 Super Admin",
  description: "Outgoing webhook endpoints and event subscriptions.",
};

export default function Page() {
  return <OutgoingEndpointsPage />;
}
