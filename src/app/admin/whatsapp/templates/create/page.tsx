import { TemplateCreationPage } from "@/features/admin/channels/demo/template-creation-page";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  return <TemplateCreationPage id={typeof query.id === "string" ? query.id : undefined} preset={typeof query.preset === "string" ? query.preset : undefined} library={typeof query.library === "string" ? query.library : undefined} mode={typeof query.mode === "string" ? query.mode : undefined} />;
}
