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

/**
 * A Client id is only meaningful together with its Company: the backend rejects a
 * pair from two different Companies with 403 "Client access denied". Clearing it
 * explicitly (rather than passing "" to setStoredTenancy, which is ignored) is what
 * makes switching Company drop the stale Client of the previous one.
 */
export function clearStoredClientId(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY_CLIENT);
}
