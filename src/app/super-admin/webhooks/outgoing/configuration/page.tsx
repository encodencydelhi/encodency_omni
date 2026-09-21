import type { Metadata } from "next";
import { EndpointConfigurationPage } from "@/features/webhooks/components/outgoing-lists";

export const metadata: Metadata = {
  title: "Endpoint Configuration | Webhooks | EnCodency OmniPlatform Super Admin",
  description: "Delivery configuration and retry policies for outgoing endpoints.",
};

export default function Page() {
  return <EndpointConfigurationPage />;
}
