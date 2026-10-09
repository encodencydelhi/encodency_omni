import { clientsApi } from "@/features/admin/projects/live/clients-api";
import { teamApi } from "@/features/admin/team/live/team-api";
import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";
import { ApiError } from "@/types/api";
import { organizationApi } from "../live/organization-api";

/** What an export can contain. Every category is read live from the same APIs the rest of the app uses. */
export const EXPORT_CATEGORIES = [
  { id: "organization", label: "Organization Profile", desc: "Legal, contact, address and tax details" },
  { id: "members", label: "Team Members & Roles", desc: "Names, emails, roles, job titles, suspended state and Client access" },
  { id: "clients", label: "Clients", desc: "Every Client of the Company with its profile details" },
  { id: "plan", label: "Plan & Usage", desc: "Current plan, status, limits and usage" },
  { id: "activity", label: "Recent Activity", desc: "The latest 100 recorded actions of your team (Owners and Admins)" },
] as const;

export type ExportCategoryId = (typeof EXPORT_CATEGORIES)[number]["id"];

export interface OrganizationExport {
  exportedAt: string;
  companyId: string;
  /** What was included, with a row count each, or why a category could not be read. */
  summary: Record<string, string>;
  data: Record<string, unknown>;
}

function describeFailure(error: unknown): string {
  if (ApiError.isApiError(error) && error.status === 403) return "Not available for your role.";
  return error instanceof Error && error.message ? error.message : "Could not be read.";
}

/** Reads the chosen categories live and returns one JSON document. A category that fails (for example a role without access) is reported, never faked. */
export async function buildOrganizationExport(companyId: string, categories: readonly ExportCategoryId[]): Promise<OrganizationExport> {
  const data: Record<string, unknown> = {};
  const summary: Record<string, string> = {};
  const run = async (id: ExportCategoryId, read: () => Promise<{ value: unknown; count: number | null }>) => {
    if (!categories.includes(id)) return;
    try {
      const { value, count } = await read();
      data[id] = value;
      summary[id] = count === null ? "included" : `${count} ${count === 1 ? "row" : "rows"}`;
    } catch (error) {
      summary[id] = describeFailure(error);
    }
  };

  await Promise.all([
    run("organization", async () => ({ value: await organizationApi.get(companyId), count: null })),
    run("members", async () => {
      const members = await teamApi.listMembers(companyId);
      return {
        value: members.map((member) => ({
          name: member.user.name ?? null,
          email: member.user.email,
          role: member.systemRole,
          jobTitle: member.jobTitle ?? null,
          department: member.department ?? null,
          joinedAt: member.createdAt,
          suspended: Boolean(member.suspendedAt),
          clientAccess: (member.clientAccess ?? []).map((access) => access.clientName),
        })),
        count: members.length,
      };
    }),
    run("clients", async () => {
      const clients = await clientsApi.list(companyId);
      return { value: clients, count: clients.length };
    }),
    run("plan", async () => ({ value: await apiClient.request({ method: "GET", path: "/billing/summary", headers: companyScopeHeaders(companyId) }), count: null })),
    run("activity", async () => {
      const feed = await teamApi.listActivity(companyId, { limit: 100 });
      return { value: feed.items, count: feed.items.length };
    }),
  ]);

  return { exportedAt: new Date().toISOString(), companyId, summary, data };
}

/** Saves the document as a .json file through the browser (nothing is uploaded or stored anywhere). */
export function downloadJson(document: OrganizationExport, fileStem: string): void {
  const blob = new Blob([JSON.stringify(document, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = `${fileStem}-${document.exportedAt.slice(0, 10)}.json`;
  window.document.body.appendChild(link);
  link.click();
  window.document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
