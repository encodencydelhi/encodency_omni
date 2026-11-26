"use client";

import { useSyncExternalStore } from "react";

/**
 * Which of a Client's WhatsApp numbers this browser works on. Empty = the Client's primary number (the backend default).
 * Kept per Company + Client in localStorage (a convenience only: the backend checks every number id belongs to the Client).
 */
const KEY = (companyId: string, clientId: string) => `m360.whatsapp.number.${companyId}.${clientId}`;
const listeners = new Set<() => void>();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function selectedWhatsAppNumber(companyId: string, clientId: string): string {
  if (!companyId || !clientId) return "";
  try {
    const value = window.localStorage.getItem(KEY(companyId, clientId)) ?? "";
    return UUID.test(value) ? value : "";
  } catch { return ""; }
}

/** Pass "" to go back to the primary number. */
export function selectWhatsAppNumber(companyId: string, clientId: string, numberId: string) {
  try {
    if (numberId) window.localStorage.setItem(KEY(companyId, clientId), numberId);
    else window.localStorage.removeItem(KEY(companyId, clientId));
  } catch { /* storage blocked: selection lasts until reload */ }
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => { if (event.key?.startsWith("m360.whatsapp.number.")) listener(); };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(listener); window.removeEventListener("storage", onStorage); };
};

export function useSelectedWhatsAppNumber(companyId: string, clientId: string): string {
  return useSyncExternalStore(subscribe, () => selectedWhatsAppNumber(companyId, clientId), () => "");
}
