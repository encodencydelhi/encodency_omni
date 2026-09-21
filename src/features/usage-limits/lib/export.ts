import { downloadCsv } from "@/features/companies/lib/csv";
import { RESOURCE_BY_KEY } from "../data/catalogue";
import { UTILIZATION_STATE } from "../data/config";
import type { OverrideRow, UsageAlert, UsageEvent, UsageRow } from "../data/types";

const day = () => new Date().toISOString().slice(0, 10);

/** Every export is built in the browser from what is on screen; nothing is uploaded. */
export function exportUsageRows(rows: readonly UsageRow[], filename = `usage-${day()}.csv`): void {
  downloadCsv(
    filename,
    ["Company", "Company ID", "Plan", "Subscription status", "Resource", "Unit", "Used", "Base allowance", "Override", "Effective allowance", "Utilization %", "State", "Metering", "Next reset", "Last updated"],
    rows.map((row) => [
      row.companyName,
      row.companyDisplayId,
      row.planName,
      row.subscriptionStatus,
      RESOURCE_BY_KEY[row.resource].name,
      RESOURCE_BY_KEY[row.resource].unit,
      row.used ?? "Data unavailable",
      row.base ?? "Unlimited",
      row.override ? (row.override.rule === "additive" ? `+${row.override.amount}` : `${row.override.amount} (absolute)`) : "",
      row.effective ?? "Unlimited",
      row.resolved.percent ?? "",
      UTILIZATION_STATE[row.resolved.state].label,
      row.metering,
      row.resetAt ?? "No periodic reset",
      row.updatedAt,
    ]),
  );
}

export function exportAlerts(rows: readonly UsageAlert[], filename = `usage-alerts-${day()}.csv`): void {
  downloadCsv(filename, ["Alert ID", "Type", "Severity", "Status", "Company", "Resource", "Used", "Effective limit", "Utilization %", "Triggered", "Acknowledged by", "Reason"], rows.map((alert) => [alert.id, alert.type, alert.severity, alert.status, alert.companyName, RESOURCE_BY_KEY[alert.resource].name, alert.used ?? "", alert.limit ?? "Unlimited", alert.percent ?? "", alert.firstTriggeredAt, alert.acknowledgedBy ?? "", alert.reason]));
}

export function exportOverrides(rows: readonly OverrideRow[], filename = `usage-overrides-${day()}.csv`): void {
  downloadCsv(filename, ["Override ID", "Company", "Resource", "Type", "Amount", "Base", "Effective", "Starts", "Expires", "Status", "Approved by", "Reason"], rows.map((row) => [row.id, row.companyName, RESOURCE_BY_KEY[row.resource].name, row.rule, row.amount, row.base ?? "Unlimited", row.effective ?? "Unlimited", row.startsAt, row.expiresAt, row.status, row.approvedBy, row.reason]));
}

export function exportEvents(rows: readonly UsageEvent[], filename = `usage-events-${day()}.csv`): void {
  downloadCsv(filename, ["Event ID", "Timestamp", "Company", "Client", "Resource", "Quantity", "Unit", "Source", "Status", "Counted", "Reference"], rows.map((event) => [event.id, event.occurredAt, event.companyName, event.clientName ?? "", RESOURCE_BY_KEY[event.resource].name, event.quantity, event.unit, event.source, event.status, event.counted ? "yes" : "no", event.reference]));
}
