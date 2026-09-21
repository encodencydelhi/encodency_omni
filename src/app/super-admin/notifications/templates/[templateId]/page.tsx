import { NotificationsOperationsCenter } from "@/features/super-admin-notifications/components/operations-center";

export default async function TemplateDetailPage({ params }: { params: Promise<{ templateId: string }> }) {
  const { templateId } = await params;
  return <NotificationsOperationsCenter page="template" templateId={templateId} />;
}
