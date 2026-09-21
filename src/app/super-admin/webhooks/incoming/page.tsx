import type { Metadata } from "next";
import { IncomingSourcesPage } from "@/features/webhooks/components/incoming-lists";

export const metadata: Metadata = {
  title: "Incoming Sources | Webhooks | EnCodency OmniPlatform Super Admin",
  description: "Incoming webhook sources and receivers.",
};

export default function Page() {
  return <IncomingSourcesPage />;
}
