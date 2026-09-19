/**
 * EnCodency OmniPlatform - Super Admin Integrations Module
 * Real Frontend Export Utilities (CSV & JSON)
 * Safe metadata only: NEVER exports secrets, tokens, or raw credentials.
 */

import type {
  IntegrationActivity,
  IntegrationIssue,
  IntegrationProvider,
  ProviderAuthorization,
} from "./types";

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function exportProvidersToCsv(providers: IntegrationProvider[]): void {
  const headers = [
    "Provider ID",
    "Provider Name",
    "Category",
    "Availability",
    "External API Access",
    "Operational Health",
    "Active Connections",
    "Connected Resources",
    "Affected Companies",
    "Healthy Connections",
    "Reconnect Required",
    "Last Updated",
  ];

  const rows = providers.map((p) => [
    p.id,
    `"${p.name.replace(/"/g, '""')}"`,
    p.category,
    p.platformAvailability,
    p.externalApiAccess,
    p.operationalHealth,
    p.activeConnectionsCount,
    p.connectedResourcesCount,
    p.affectedCompaniesCount,
    p.healthyConnectionsCount,
    p.reconnectRequiredCount,
    p.updatedAt,
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  downloadFile(
    csvContent,
    `omniplatform-providers-${new Date().toISOString().slice(0, 10)}.csv`,
    "text/csv;charset=utf-8;"
  );
}

export function exportConnectionsToCsv(connections: ProviderAuthorization[]): void {
  const headers = [
    "Authorization ID",
    "Provider",
    "Company Name",
    "Company ID",
    "Account Label",
    "Authorization Status",
    "Health Status",
    "Granted Scopes",
    "Missing Scopes",
    "Connected By",
    "Connected At",
    "Token Expires At",
    "Last Sync At",
  ];

  const rows = connections.map((c) => [
    c.id,
    c.providerId,
    `"${c.companyName.replace(/"/g, '""')}"`,
    c.companyId,
    `"${c.authorizationLabel.replace(/"/g, '""')}"`,
    c.status,
    c.healthStatus,
    `"${c.grantedScopes.join("; ")}"`,
    `"${c.missingScopes.join("; ")}"`,
    `"${c.connectedBy.name} (${c.connectedBy.email})"`,
    c.connectedAt,
    c.tokenExpiresAt || "Never",
    c.lastSuccessfulSyncAt || "None",
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  downloadFile(
    csvContent,
    `omniplatform-connections-${new Date().toISOString().slice(0, 10)}.csv`,
    "text/csv;charset=utf-8;"
  );
}

export function exportIssuesToCsv(issues: IntegrationIssue[]): void {
  const headers = [
    "Issue ID",
    "Number",
    "Severity",
    "Scope",
    "Provider",
    "Title",
    "Status",
    "Affected Companies Count",
    "Affected Connections Count",
    "Detected At",
    "Updated At",
    "Owner",
  ];

  const rows = issues.map((i) => [
    i.id,
    i.issueNumber,
    i.severity,
    i.scope,
    i.providerId,
    `"${i.title.replace(/"/g, '""')}"`,
    i.status,
    i.affectedCompanyIds.length,
    i.affectedConnectionIds.length,
    i.detectedAt,
    i.updatedAt,
    i.internalOwner ? `"${i.internalOwner.name}"` : "Unassigned",
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  downloadFile(
    csvContent,
    `omniplatform-integration-issues-${new Date().toISOString().slice(0, 10)}.csv`,
    "text/csv;charset=utf-8;"
  );
}

export function exportActivitiesToCsv(activities: IntegrationActivity[]): void {
  const headers = [
    "Timestamp",
    "Actor",
    "Actor Type",
    "Event Type",
    "Provider",
    "Company",
    "Description",
    "Result",
  ];

  const rows = activities.map((a) => [
    a.timestamp,
    `"${a.actor.name}"`,
    a.actor.type,
    a.eventType,
    a.providerId,
    a.companyName ? `"${a.companyName.replace(/"/g, '""')}"` : "N/A",
    `"${a.description.replace(/"/g, '""')}"`,
    a.result,
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  downloadFile(
    csvContent,
    `omniplatform-integration-activity-${new Date().toISOString().slice(0, 10)}.csv`,
    "text/csv;charset=utf-8;"
  );
}
