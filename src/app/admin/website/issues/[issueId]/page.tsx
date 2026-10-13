import { WebsiteIssueDetailPage } from "@/features/admin/website/components/pages/issue-detail-page";

export const metadata = { title: "Issue · Website" };

export default function Page({ params }: { params: Promise<{ issueId: string }> }) {
  const { issueId } = await params;
  return <WebsiteIssueDetailPage issueId={decodeURIComponent(issueId)} />;
}
