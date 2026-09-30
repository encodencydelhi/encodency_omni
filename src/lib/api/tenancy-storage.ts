const STORAGE_KEY_COMPANY = "omni_active_company_id";
const STORAGE_KEY_CLIENT = "omni_active_client_id";
const MEMORY_STORAGE = new Map<string, string>();

function createFallbackStorage(): Storage {
  return {
    get length() {
      return MEMORY_STORAGE.size;
    },
    clear() {
      MEMORY_STORAGE.clear();
    },
    getItem(key: string) {
      return MEMORY_STORAGE.has(key) ? MEMORY_STORAGE.get(key)! : null;
    },
    key(index: number) {
      return Array.from(MEMORY_STORAGE.keys())[index] ?? null;
    },
    removeItem(key: string) {
      MEMORY_STORAGE.delete(key);
    },
    setItem(key: string, value: string) {
      MEMORY_STORAGE.set(key, value);
    },
  };
}

if (typeof globalThis !== "undefined" && !("localStorage" in globalThis)) {
  Object.defineProperty(globalThis, "localStorage", {
    value: createFallbackStorage(),
    configurable: true,
    writable: true,
  });
}

function getStorage(): Storage | null {
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  if (typeof globalThis !== "undefined" && "localStorage" in globalThis && globalThis.localStorage) return globalThis.localStorage;
  return createFallbackStorage();
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

/**
 * `localStorage`'s own `storage` event only fires in *other* tabs, so every
 * `useTenancyContext()` instance in this tab keeps its own React state. Writing
 * the scope broadcasts this event so a change made by one component (e.g. the
 * sidebar Client switcher) is picked up by every mounted consumer immediately.
 */
export const TENANCY_CHANGE_EVENT = "omni:tenancy-changed";

function emitTenancyChange(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(TENANCY_CHANGE_EVENT));
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
  emitTenancyChange();
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
  emitTenancyChange();
}
