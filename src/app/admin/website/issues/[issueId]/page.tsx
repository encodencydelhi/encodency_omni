import IssueDetailPage from "@/features/admin/website/components/pages/issue-detail-page";

export const metadata = { title: "Issue · Website" };

export default async function Page({ params }: { params: Promise<{ issueId: string }> }) {
  const { issueId } = await params;
  return <IssueDetailPage issueId={decodeURIComponent(issueId)} />;
}
