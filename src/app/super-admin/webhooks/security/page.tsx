import type { Metadata } from "next";
import { SecurityPage } from "@/features/webhooks/components/security-page";

export const metadata: Metadata = {
  title: "Security & Verification | Webhooks | EnCodency OmniPlatform Super Admin",
  description: "Webhook verification, signing and destination security.",
};

export default function Page() {
  return <SecurityPage />;
}
