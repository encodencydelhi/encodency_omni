import { ProjectDetailPage } from "@/features/admin/projects/components/project-detail-page";

export default async function AdminProjectDetailRoute({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <ProjectDetailPage projectId={projectId} />;
}
