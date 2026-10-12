import { redirect } from 'next/navigation';
export default async function LegacyAdminProjectDetailPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  redirect(`/admin/clients/${encodeURIComponent(projectId)}`);
}
