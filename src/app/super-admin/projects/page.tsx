import { redirect } from "next/navigation";
import { ROUTES } from "@/config/routes";

/** The old Clients route. Kept so bookmarks keep working; the module now lives at /super-admin/clients. */
export default async function LegacyClientsRedirect({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === "string") params.set(key, value);
  }
  const search = params.toString();
  redirect(search ? `${ROUTES.superAdmin.Clients}?${search}` : ROUTES.superAdmin.Clients);
}
