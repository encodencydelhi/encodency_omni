import { RoleDetailPage } from "@/features/admin/roles/pages/role-detail-page";

export default async function Page(props: { params: Promise<{ roleId: string }> }) {
  const { roleId } = await props.params;
  return <RoleDetailPage roleId={roleId} />;
}
