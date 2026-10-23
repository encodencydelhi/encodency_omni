import type { Metadata } from "next";
import { SharedReportPage } from "@/features/admin/competitor-analyzer/shared-report-page";

export const metadata: Metadata = {
  title: "Competitor report",
  robots: { index: false, follow: false },
  // The URL is the key to the report; keep it out of referrers.
  referrer: "no-referrer",
};

/** Public: a client opens a shared competitor report without an account. */
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <SharedReportPage token={token} />;
}
