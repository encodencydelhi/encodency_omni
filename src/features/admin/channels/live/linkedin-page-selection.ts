"use client";

import { useSyncExternalStore } from "react";

/**
 * A Client may map several LinkedIn company pages; the LinkedIn screens show one at a time. The chosen page (its mapping
 * id) is remembered per Company + Client in this browser and sent as `x-linkedin-mapping-id` with every LinkedIn call.
 * The backend checks the page belongs to the Client.
 */
export const LINKEDIN_PAGE_HEADER = "x-linkedin-mapping-id";
const KEY = (companyId: string, clientId: string) => `m360.linkedin.page.${companyId}.${clientId}`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const listeners = new Set<() => void>();

export function selectedLinkedInPage(companyId: string, clientId: string): string {
  if (!companyId || !clientId || typeof window === "undefined") return "";
  try {
    const value = window.localStorage.getItem(KEY(companyId, clientId)) ?? "";
    return UUID.test(value) ? value : "";
  } catch { return ""; }
}

export function selectLinkedInPage(companyId: string, clientId: string, mappingId: string) {
  try {
    if (mappingId) window.localStorage.setItem(KEY(companyId, clientId), mappingId);
    else window.localStorage.removeItem(KEY(companyId, clientId));
  } catch { /* storage blocked: the choice lasts until reload */ }
  listeners.forEach((listener) => listener());
}

/** Header for LinkedIn calls (empty when no page is chosen: the backend then uses its default). */
export function linkedInPageHeader(companyId: string, clientId: string): Record<string, string> {
  const page = selectedLinkedInPage(companyId, clientId);
  return page ? { [LINKEDIN_PAGE_HEADER]: page } : {};
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => { if (event.key?.startsWith("m360.linkedin.page.")) listener(); };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(listener); window.removeEventListener("storage", onStorage); };
};

export function useSelectedLinkedInPage(companyId: string, clientId: string): string {
  return useSyncExternalStore(subscribe, () => selectedLinkedInPage(companyId, clientId), () => "");
}
