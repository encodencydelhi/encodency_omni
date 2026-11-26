import type { Metadata } from "next";
import { Suspense } from "react";
import { WhatsAppPlatformPage } from "@/features/whatsapp-platform/whatsapp-platform-page";

export const metadata: Metadata = {
  title: "WhatsApp | Media360",
  description: "Every Company's WhatsApp numbers, health, usage, pause switch and plan limits.",
};

export default function Page() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-slate-50" />}>
      <WhatsAppPlatformPage />
    </Suspense>
  );
}
