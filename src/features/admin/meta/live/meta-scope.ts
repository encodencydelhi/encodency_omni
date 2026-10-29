"use client";

import { useSyncExternalStore } from "react";
import { companyScopeHeaders } from "@/lib/api/company-scope";
import { getStoredCompanyId, getStoredClientId, TENANCY_CHANGE_EVENT } from "@/lib/api/tenancy-storage";

const viewKey = () => `omni.meta.view.${getStoredCompanyId()}`;
export function metaCompanyView(): boolean {
  try { return window.localStorage.getItem(viewKey()) === "company"; } catch { return false; }
}
export function metaScopeKey(): string { return metaCompanyView() ? "company" : `client:${getStoredClientId()}`; }
export function setMetaCompanyView(company: boolean): void {
  window.localStorage.setItem(viewKey(), company ? "company" : "client");
  window.dispatchEvent(new Event(TENANCY_CHANGE_EVENT));
}
export function metaScopeHeaders(companyId: string): Record<string, string> {
  const client = getStoredClientId();
  return companyScopeHeaders(companyId, !metaCompanyView() && client ? { "x-client-id": client } : {});
}
function subscribe(callback: () => void) { window.addEventListener(TENANCY_CHANGE_EVENT, callback); return () => window.removeEventListener(TENANCY_CHANGE_EVENT, callback); }
export function useMetaScopeKey(): string { return useSyncExternalStore(subscribe, metaScopeKey, () => "client:"); }
