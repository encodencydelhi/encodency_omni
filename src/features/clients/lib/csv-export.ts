import { downloadCsv } from "@/features/companies/lib/csv";
import { formatIsoDate } from "@/features/companies/lib/format";
import type { ClientSummary } from "../data/types";

const HEADERS = [
  "Client ID",
  "Client",
  "Company",
  "Company ID",
  "Primary website",
  "Workspace status",
  "Onboarding",
  "Health",
  "Connected accounts",
  "Accounts needing attention",
  "Active members",
  "Client lead",
  "Scheduled posts",
  "Failed posts",
  "Created",
];

export function exportClientRows(rows: ClientSummary[], filename: string): void {
  downloadCsv(
    filename,
    HEADERS,
    rows.map((row) => [
      row.displayId,
      row.client.name,
      row.company.name,
      row.company.id,
      row.primaryWebsite?.domain ?? "",
      row.workspace,
      row.onboarding.status,
      row.health.status,
      row.counts.connections,
      row.counts.attentionConnections,
      row.counts.activeMembers,
      row.lead?.name ?? "",
      row.operations.scheduledPosts,
      row.operations.failedPosts,
      formatIsoDate(row.client.createdAt),
    ]),
  );
}
