import type { Metadata } from "next";
import { Suspense } from "react";
import { ClientActivityPage } from "@/features/clients/pages/client-activity";

export const metadata: Metadata = { title: "Client activity" };

export default function Page() {
  return <Suspense fallback={null}><ClientActivityPage /></Suspense>;
}
