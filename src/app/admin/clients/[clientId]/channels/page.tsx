import type { Metadata } from "next";
import { Suspense } from "react";
import { ClientChannelsPage } from "@/features/clients/pages/client-channels";

export const metadata: Metadata = { title: "Client channels" };

export default function Page() {
  return <Suspense fallback={null}><ClientChannelsPage /></Suspense>;
}
