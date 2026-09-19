import { downloadCsv } from "@/features/companies/lib/csv";
import { formatIsoDate } from "@/features/companies/lib/format";
import type { SubscriptionRow } from "../data/types";

const HEADERS = [
  "Subscription ID",
  "Company",
  "Company ID",
  "Plan",
  "Plan version",
  "Billing cycle",
  "Status",
  "Currency",
  "Recurring amount (minor units)",
  "MRR (minor units)",
  "Renewal or trial end",
  "Billing health",
  "Active overrides",
  "Pending changes",
  "Started",
];

export function exportSubscriptionRows(rows: SubscriptionRow[], filename: string): void {
  downloadCsv(
    filename,
    HEADERS,
    rows.map((row) => [
      row.id,
      row.company.name,
      row.company.displayId,
      row.planName,
      row.planVersion,
      row.billingCycle,
      row.status,
      row.currency,
      row.recurringMinor,
      row.mrrMinor,
      formatIsoDate(row.status === "trialing" && row.trialEndsAt ? row.trialEndsAt : row.renewsAt),
      row.billingStatus,
      row.activeOverrides,
      row.pendingChanges,
      formatIsoDate(row.startedAt),
    ]),
  );
}
