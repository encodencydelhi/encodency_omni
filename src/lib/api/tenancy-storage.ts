const STORAGE_KEY_COMPANY = "omni_active_company_id";
const STORAGE_KEY_CLIENT = "omni_active_client_id";

function getStorage(): Storage | null {
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  if (typeof globalThis !== "undefined" && "localStorage" in globalThis && globalThis.localStorage) return globalThis.localStorage;
  return null;
}

// Never silently select a fake/default tenant in production or live requests
export const DEFAULT_FALLBACK_COMPANY_ID = "";
export const DEFAULT_FALLBACK_CLIENT_ID = "";

export function getStoredCompanyId(): string {
  const storage = getStorage();
  if (!storage) return "";

  const stored = storage.getItem(STORAGE_KEY_COMPANY);
  if (stored && stored.trim() && stored.trim() !== "development-company-id") {
    return stored.trim();
  }
  return "";
}

export function getStoredClientId(): string {
  const storage = getStorage();
  if (!storage) return "";

  const stored = storage.getItem(STORAGE_KEY_CLIENT);
  if (stored && stored.trim() && stored.trim() !== "development-client-id") {
    return stored.trim();
  }
  return "";
}

export function setStoredTenancy(companyId: string, clientId?: string): void {
  const storage = getStorage();
  if (!storage) return;
  if (companyId) {
    storage.setItem(STORAGE_KEY_COMPANY, companyId);
  }
  if (clientId) {
    storage.setItem(STORAGE_KEY_CLIENT, clientId);
  }
}

/**
 * A Client id is only meaningful together with its Company: the backend rejects a
 * pair from two different Companies with 403 "Client access denied". Clearing it
 * explicitly (rather than passing "" to setStoredTenancy, which is ignored) is what
 * makes switching Company drop the stale Client of the previous one.
 */
export function clearStoredClientId(): void {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(STORAGE_KEY_CLIENT);
}
