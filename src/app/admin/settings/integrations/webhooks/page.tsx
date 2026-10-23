import type { Metadata } from "next";
import { CompanyWebhooksPage } from "@/features/admin/webhooks/company-webhooks-page";

export const metadata: Metadata = { title: "Webhooks | Integrations | Settings" };

export default function Page() {
  return <CompanyWebhooksPage />;
}
