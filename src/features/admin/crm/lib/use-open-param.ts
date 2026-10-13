"use client";

import { useEffect, useRef } from "react";

/** Deep link into another CRM page's detail panel, e.g. `/admin/crm/contacts?open=<id>`. */
export function crmLink(kind: "leads" | "contacts" | "pipeline" | "tasks", id: string): string {
  return `/admin/crm/${kind}?open=${encodeURIComponent(id)}`;
}

/**
 * Reads `?open=<id>` once the page's data is ready, hands the id to `onOpen`
 * and strips the param so a refresh does not reopen the panel.
 */
export function useOpenParam(ready: boolean, onOpen: (id: string) => void) {
  const handled = useRef(false);
  useEffect(() => {
    if (!ready || handled.current) return;
    handled.current = true;
    const url = new URL(window.location.href);
    const id = url.searchParams.get("open");
    if (!id) return;
    url.searchParams.delete("open");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    onOpen(id);
  }, [ready, onOpen]);
}
