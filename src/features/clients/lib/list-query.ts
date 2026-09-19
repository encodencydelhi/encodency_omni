import { SESSION_STORAGE_KEYS } from "../data/config";

/**
 * The list's URL query is remembered for the session so "Back to Clients" from a
 * client returns to the same filters, sort and page. Storage can be unavailable
 * (private windows, blocked site data), so every access is guarded.
 */
export function rememberListQuery(search: string): void {
  try {
    window.sessionStorage.setItem(SESSION_STORAGE_KEYS.lastListQuery, search);
  } catch {
    /* remembering is a convenience only */
  }
}

export function recallListQuery(): string {
  try {
    return window.sessionStorage.getItem(SESSION_STORAGE_KEYS.lastListQuery) ?? "";
  } catch {
    return "";
  }
}
