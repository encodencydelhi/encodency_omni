const STORAGE_KEY_COMPANY = "omni_active_company_id";
const STORAGE_KEY_CLIENT = "omni_active_client_id";

// Never silently select a fake/default tenant in production or live requests
export const DEFAULT_FALLBACK_COMPANY_ID = "";
export const DEFAULT_FALLBACK_CLIENT_ID = "";

export function getStoredCompanyId(): string {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(STORAGE_KEY_COMPANY);
    if (stored && stored.trim() && stored.trim() !== "development-company-id") {
      return stored.trim();
    }
  }
  return "";
}

export function getStoredClientId(): string {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(STORAGE_KEY_CLIENT);
    if (stored && stored.trim() && stored.trim() !== "development-client-id") {
      return stored.trim();
    }
  }
  return "";
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
