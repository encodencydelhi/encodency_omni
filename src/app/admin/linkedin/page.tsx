import { Suspense } from "react";
import { LinkedInChannelPage } from "@/features/admin/channels/components/linkedin-channel-page";

export default function Page() {
  // The page reads ?tab= (e.g. a notification opening the Inbox), which needs a Suspense boundary.
  return <Suspense fallback={null}><LinkedInChannelPage /></Suspense>;
}
