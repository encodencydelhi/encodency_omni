/**
 * EnCodency OmniPlatform - Super Admin Integrations Module
 * Selectors, Filtering, and Sorting Utilities
 */

import type {
  ExternalApiAccess,
  IntegrationActivity,
  IntegrationIssue,
  IntegrationProvider,
  IssueSeverity,
  IssueStatus,
  OperationalHealth,
  PlatformAvailability,
  ProviderAuthorization,
  ConnectionHealthStatus,
} from "./types";

export interface ProviderFilters {
  query?: string;
  category?: string;
  availability?: PlatformAvailability | "all";
  apiAccess?: ExternalApiAccess | "all";
  health?: OperationalHealth | "all";
  sortBy?: "name" | "connections" | "health" | "updated";
  sortDirection?: "asc" | "desc";
}

export function filterProviders(
  providers: IntegrationProvider[],
  filters: ProviderFilters
): IntegrationProvider[] {
  return providers.filter((p) => {
    if (filters.query) {
      const q = filters.query.toLowerCase().trim();
      const matches =
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.shortDescription.toLowerCase().includes(q);
      if (!matches) return false;
    }

    if (filters.category && filters.category !== "all" && p.category !== filters.category) {
      return false;
    }

    if (filters.availability && filters.availability !== "all" && p.platformAvailability !== filters.availability) {
      return false;
    }

    if (filters.apiAccess && filters.apiAccess !== "all" && p.externalApiAccess !== filters.apiAccess) {
      return false;
    }

    if (filters.health && filters.health !== "all" && p.operationalHealth !== filters.health) {
      return false;
    }

    return true;
  }).sort((a, b) => {
    const dir = filters.sortDirection === "desc" ? -1 : 1;
    switch (filters.sortBy) {
      case "name":
        return dir * a.name.localeCompare(b.name);
      case "connections":
        return dir * (a.activeConnectionsCount - b.activeConnectionsCount);
      case "health":
        return dir * a.operationalHealth.localeCompare(b.operationalHealth);
      case "updated":
      default:
        return dir * (new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }
  });
}

export interface ConnectionFilters {
  query?: string;
  providerId?: string | "all";
  companyId?: string | "all";
  clientId?: string | "all";
  healthStatus?: ConnectionHealthStatus | "all";
  authStatus?: "active" | "expired" | "revoked" | "all";
  sortBy?: "recent" | "company" | "health" | "last_sync" | "expiring_soon";
}

export function filterConnections(
  connections: ProviderAuthorization[],
  filters: ConnectionFilters
): ProviderAuthorization[] {
  return connections.filter((c) => {
    if (filters.query) {
      const q = filters.query.toLowerCase().trim();
      const matches =
        c.authorizationLabel.toLowerCase().includes(q) ||
        c.companyName.toLowerCase().includes(q) ||
        c.providerId.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.connectedBy.name.toLowerCase().includes(q);
      if (!matches) return false;
    }

    if (filters.providerId && filters.providerId !== "all" && c.providerId !== filters.providerId) {
      return false;
    }

    if (filters.companyId && filters.companyId !== "all" && c.companyId !== filters.companyId) {
      return false;
    }

    if (filters.healthStatus && filters.healthStatus !== "all" && c.healthStatus !== filters.healthStatus) {
      return false;
    }

    if (filters.authStatus && filters.authStatus !== "all" && c.status !== filters.authStatus) {
      return false;
    }

    return true;
  }).sort((a, b) => {
    switch (filters.sortBy) {
      case "company":
        return a.companyName.localeCompare(b.companyName);
      case "health":
        return a.healthStatus.localeCompare(b.healthStatus);
      case "last_sync": {
        const tA = a.lastSuccessfulSyncAt ? new Date(a.lastSuccessfulSyncAt).getTime() : 0;
        const tB = b.lastSuccessfulSyncAt ? new Date(b.lastSuccessfulSyncAt).getTime() : 0;
        return tB - tA;
      }
      case "expiring_soon": {
        const expA = a.tokenExpiresAt ? new Date(a.tokenExpiresAt).getTime() : Number.MAX_SAFE_INTEGER;
        const expB = b.tokenExpiresAt ? new Date(b.tokenExpiresAt).getTime() : Number.MAX_SAFE_INTEGER;
        return expA - expB;
      }
      case "recent":
      default:
        return new Date(b.connectedAt).getTime() - new Date(a.connectedAt).getTime();
    }
  });
}

export interface IssueFilters {
  query?: string;
  providerId?: string | "all";
  severity?: IssueSeverity | "all";
  status?: IssueStatus | "all";
  sortBy?: "detected" | "severity" | "companies" | "updated";
}

export function filterIssues(
  issues: IntegrationIssue[],
  filters: IssueFilters
): IntegrationIssue[] {
  return issues.filter((iss) => {
    if (filters.query) {
      const q = filters.query.toLowerCase().trim();
      const matches =
        iss.title.toLowerCase().includes(q) ||
        iss.issueNumber.toLowerCase().includes(q) ||
        iss.summary.toLowerCase().includes(q) ||
        iss.providerId.toLowerCase().includes(q);
      if (!matches) return false;
    }

    if (filters.providerId && filters.providerId !== "all" && iss.providerId !== filters.providerId) {
      return false;
    }

    if (filters.severity && filters.severity !== "all" && iss.severity !== filters.severity) {
      return false;
    }

    if (filters.status && filters.status !== "all" && iss.status !== filters.status) {
      return false;
    }

    return true;
  }).sort((a, b) => {
    switch (filters.sortBy) {
      case "severity": {
        const order: Record<IssueSeverity, number> = { critical: 3, warning: 2, info: 1 };
        return order[b.severity] - order[a.severity];
      }
      case "companies":
        return b.affectedCompanyIds.length - a.affectedCompanyIds.length;
      case "updated":
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      case "detected":
      default:
        return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
    }
  });
}

export interface ActivityFilters {
  query?: string;
  providerId?: string | "all";
  companyId?: string | "all";
  result?: "success" | "warning" | "failure" | "info" | "all";
}

export function filterActivities(
  activities: IntegrationActivity[],
  filters: ActivityFilters
): IntegrationActivity[] {
  return activities.filter((act) => {
    if (filters.query) {
      const q = filters.query.toLowerCase().trim();
      const matches =
        act.description.toLowerCase().includes(q) ||
        act.actor.name.toLowerCase().includes(q) ||
        (act.companyName && act.companyName.toLowerCase().includes(q)) ||
        act.providerId.toLowerCase().includes(q);
      if (!matches) return false;
    }

    if (filters.providerId && filters.providerId !== "all" && act.providerId !== filters.providerId) {
      return false;
    }

    if (filters.companyId && filters.companyId !== "all" && act.companyId !== filters.companyId) {
      return false;
    }

    if (filters.result && filters.result !== "all" && act.result !== filters.result) {
      return false;
    }

    return true;
  });
}
