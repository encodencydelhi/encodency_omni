const STORAGE_KEY_COMPANY = "omni_active_company_id";
const STORAGE_KEY_CLIENT = "omni_active_client_id";

// Safe fallbacks for local/demo/harness environments when not logged into a specific tenant
export const DEFAULT_FALLBACK_COMPANY_ID = "development-company-id";
export const DEFAULT_FALLBACK_CLIENT_ID = "development-client-id";

export function getStoredCompanyId(): string {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(STORAGE_KEY_COMPANY);
    if (stored && stored.trim()) return stored.trim();
  }
  return DEFAULT_FALLBACK_COMPANY_ID;
}

export function getStoredClientId(): string {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(STORAGE_KEY_CLIENT);
    if (stored && stored.trim()) return stored.trim();
  }
  return DEFAULT_FALLBACK_CLIENT_ID;
}

export function setStoredTenancy(companyId: string, clientId?: string): void {
  if (typeof window === "undefined") return;
  if (companyId) {
    localStorage.setItem(STORAGE_KEY_COMPANY, companyId);
  }
  if (clientId) {
    localStorage.setItem(STORAGE_KEY_CLIENT, clientId);
  }
}
