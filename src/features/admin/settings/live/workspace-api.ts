import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";

export type LandingPage = "dashboard" | "clients" | "content-studio" | "calendar" | "crm" | "website" | "competitor-analyzer";

/** Company defaults applied right after sign-in (Settings → Workspace). */
export interface WorkspaceSettings {
  primaryClientId: string | null;
  /** "last": reopen the client used last time; "primary": always start on the primary client. */
  clientOnLogin: "last" | "primary";
  landingPage: LandingPage;
}

export const LANDING_PAGES: { value: LandingPage; label: string; path: string }[] = [
  { value: "dashboard", label: "Dashboard", path: "/admin" },
  { value: "clients", label: "Clients", path: "/admin/clients" },
  { value: "content-studio", label: "Content Studio", path: "/admin/content" },
  { value: "calendar", label: "Calendar", path: "/admin/calendar" },
  { value: "crm", label: "CRM Leads", path: "/admin/crm/leads" },
  { value: "website", label: "Website", path: "/admin/website" },
  { value: "competitor-analyzer", label: "Competitor Analyzer", path: "/admin/competitor-analyzer" },
];

/** Set by the sign-in page; the admin shell applies the workspace defaults once and clears it. */
export const FRESH_LOGIN_KEY = "omni:fresh-login";

export function markFreshLogin() {
  try {
    window.sessionStorage.setItem(FRESH_LOGIN_KEY, "1");
  } catch {
    // Storage blocked: the defaults are simply not applied for this sign-in.
  }
}

/** True once per sign-in: reading it clears it. */
export function takeFreshLogin(): boolean {
  try {
    const fresh = window.sessionStorage.getItem(FRESH_LOGIN_KEY) === "1";
    if (fresh) window.sessionStorage.removeItem(FRESH_LOGIN_KEY);
    return fresh;
  } catch {
    return false;
  }
}

export const workspaceApi = {
  get: (companyId: string) => apiClient.request<{ settings: WorkspaceSettings; stored: boolean }>({ method: "GET", path: "/settings/workspace", headers: companyScopeHeaders(companyId) }),
  save: (companyId: string, body: Partial<WorkspaceSettings>) =>
    apiClient.request<{ settings: WorkspaceSettings; stored: boolean }>({ method: "PATCH", path: "/settings/workspace", headers: companyScopeHeaders(companyId), body }),
};

export const dangerZoneApi = {
  /** Owner only: the new Owner takes over in one step, the current Owner stays as Admin. */
  transferOwnership: (companyId: string, toMembershipId: string) =>
    apiClient.request<{ newOwnerMembershipId: string }>({ method: "POST", path: "/settings/danger/transfer-ownership", headers: companyScopeHeaders(companyId), body: { toMembershipId } }),
  /** Owner only: asks the platform team, through a support ticket, to deactivate or delete the organization. */
  request: (companyId: string, kind: "deactivate" | "delete", reason?: string) =>
    apiClient.request<{ ticket: { id: string; number?: number } }>({ method: "POST", path: "/settings/danger/request", headers: companyScopeHeaders(companyId), body: { kind, ...(reason ? { reason } : {}) } }),
};
