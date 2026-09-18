import { MemberDetailPage } from "@/features/admin/team/pages/member-detail-page";

export default async function Page({ params }: PageProps<"/admin/team/[memberId]">) {
  const { memberId } = await params;
  return <MemberDetailPage memberId={memberId} />;
}
