import { WebsitePageAuditPage } from "@/features/admin/website/components/pages/page-audit-page";

export const metadata = { title: "Page audit · Website" };

export default async function Page({ params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await params;
  return <WebsitePageAuditPage pageId={decodeURIComponent(pageId)} />;
}
