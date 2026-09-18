import { GroupDetailPage } from "@/features/admin/team/pages/group-detail-page";
export default async function Page({ params }: PageProps<"/admin/team/groups/[groupId]">) { const { groupId } = await params; return <GroupDetailPage groupId={groupId}/>; }
