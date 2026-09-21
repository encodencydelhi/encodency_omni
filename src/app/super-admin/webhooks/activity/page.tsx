import type { Metadata } from "next";
import { ActivitySettingsPage } from "@/features/webhooks/components/activity-settings-page";

export const metadata: Metadata = {
  title: "Activity & Settings | Webhooks | EnCodency OmniPlatform Super Admin",
  description: "Webhook operational activity and demo settings.",
};

export default function Page() {
  return <ActivitySettingsPage />;
}
