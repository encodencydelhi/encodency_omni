import { downloadCsv } from "@/features/companies/lib/csv";
import { AVAILABILITY, CHANGE_STATUS, CHANGE_TYPE, LIFECYCLE, OPERATIONAL_STATE, PROTECTION, STRATEGY } from "../data/config";
import type { CompanyAccessRow } from "../data/repository";
import type { CompanyEvaluation, FlagActivity, FlagChange, FlagRow } from "../data/types";

const day = () => new Date().toISOString().slice(0, 10);

/** Every export is built in the browser from what is on screen; nothing is uploaded. */
export function exportFlags(rows: readonly FlagRow[], filename = `feature-flags-${day()}.csv`): void {
  downloadCsv(
    filename,
    ["Name", "Key", "Category", "Type", "Lifecycle", "Protection", "Environment", "State", "Strategy", "Percentage", "Selected companies", "Eligible", "Targeted", "Effective", "Blocked", "Owner", "Updated", "Updated by"],
    rows.map((row) => [
      row.flag.name,
      row.flag.key,
      row.flag.category,
      row.flag.type,
      LIFECYCLE[row.flag.lifecycle].label,
      PROTECTION[row.flag.protection].label,
      row.environment,
      OPERATIONAL_STATE[row.state].label,
      STRATEGY[row.config.strategy].label,
      row.config.strategy === "percentage" ? row.config.percentage : "",
      row.config.strategy === "selected" ? row.config.selectedCompanyIds.length : "",
      row.stats.eligible,
      row.stats.targeted,
      row.stats.effective,
      row.stats.blocked,
      row.flag.ownerTeam,
      row.config.updatedAt,
      row.config.updatedBy,
    ]),
  );
}

export function exportImpact(flagKey: string, rows: readonly CompanyEvaluation[], filename = `${flagKey}-company-impact-${day()}.csv`): void {
  downloadCsv(
    filename,
    ["Company", "Company ID", "Plan", "Subscription", "Targeting matched", "Availability", "Blocked reasons", "Missing prerequisites", "Bucket"],
    rows.map((row) => [row.companyName, row.companyDisplayId, row.planName, row.subscriptionStatus, row.targeted ? "Yes" : "No", AVAILABILITY[row.availability].label, row.reasons.map((reason) => AVAILABILITY[reason].label).join("; "), row.missingPrerequisites.join("; "), row.bucket]),
  );
}

export function exportAccess(company: string, rows: readonly CompanyAccessRow[], filename = `company-feature-access-${day()}.csv`): void {
  downloadCsv(
    filename,
    ["Company", "Feature", "Key", "Category", "Flag state", "Availability", "Blocked reasons", "Action limit"],
    rows.map((row) => [company, row.flag.name, row.flag.key, row.flag.category, row.state, AVAILABILITY[row.evaluation.availability].label, row.evaluation.reasons.map((reason) => AVAILABILITY[reason].label).join("; "), row.evaluation.action.detail ?? ""]),
  );
}

export function exportChanges(rows: readonly FlagChange[], filename = `flag-changes-${day()}.csv`): void {
  downloadCsv(
    filename,
    ["Change ID", "Flag", "Key", "Environment", "Type", "Status", "Requested by", "Requested", "Effective", "Approval required", "Reason"],
    rows.map((row) => [row.id, row.flagName, row.flagKey, row.environment, CHANGE_TYPE[row.type], CHANGE_STATUS[row.status].label, row.requestedBy, row.requestedAt, row.effectiveAt ?? "", row.approvalRequired ? "Yes" : "No", row.reason]),
  );
}

export function exportActivity(rows: readonly FlagActivity[], filename = `flag-activity-${day()}.csv`): void {
  downloadCsv(filename, ["Activity ID", "When", "Actor", "Flag", "Key", "Environment", "Type", "Result", "Summary"], rows.map((row) => [row.id, row.at, row.actor, row.flagName, row.flagKey, row.environment ?? "", CHANGE_TYPE[row.type], row.result, row.summary]));
}
