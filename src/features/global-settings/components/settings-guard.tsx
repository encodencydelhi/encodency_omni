"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useUnsavedGuard } from "@/features/companies/hooks/use-unsaved-guard";

interface GuardApi {
  /** A section reports whether it holds edits that have not been saved. */
  register: (id: string, dirty: boolean) => void;
  /** Navigate, asking first when there are unsaved edits and the destination is another page. */
  navigate: (href: string) => void;
}

const GuardContext = createContext<GuardApi>({ register: () => undefined, navigate: () => undefined });

export const useSettingsGuard = () => useContext(GuardContext);

/**
 * Protects unsaved edits across the whole module. Sections keep their own
 * drafts and report only whether they are dirty; this provider then covers the
 * ways a person can lose them: following any in-app link to another page or
 * section, the browser's Back button, and closing the tab.
 *
 * Switching tabs inside one section is a query-string change on the same path,
 * so it is deliberately not intercepted: that draft is kept.
 */
export function SettingsGuardProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [dirtyIds, setDirtyIds] = useState<ReadonlySet<string>>(new Set());
  const leaveTo = useRef<string | null>(null);
  const dirty = dirtyIds.size > 0;

  const register = useCallback((id: string, isDirty: boolean) => {
    setDirtyIds((current) => {
      if (current.has(id) === isDirty) return current;
      const next = new Set(current);
      if (isDirty) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const guard = useUnsavedGuard({
    dirty,
    onDiscard: () => {
      const target = leaveTo.current;
      leaveTo.current = null;
      if (target) {
        // Drop the unsaved state first so the destination does not prompt again.
        setDirtyIds(new Set());
        router.push(target);
      }
    },
    label: "this settings section",
  });
  const { requestClose } = guard;

  // `navigate` must keep one identity: sections register in an effect that depends on this API, so a changing
  // identity would re-register on every render and loop. The latest values are read from refs instead.
  const latest = useRef({ dirty, requestClose });
  useEffect(() => {
    latest.current = { dirty, requestClose };
  });

  useEffect(() => {
    if (!dirty) return;
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.origin !== window.location.origin) return;
      if (anchor.pathname === window.location.pathname) return;
      event.preventDefault();
      event.stopPropagation();
      leaveTo.current = anchor.pathname + anchor.search;
      requestClose();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [dirty, requestClose]);

  const navigate = useCallback(
    (href: string) => {
      const target = new URL(href, window.location.origin);
      if (latest.current.dirty && target.pathname !== window.location.pathname) {
        leaveTo.current = target.pathname + target.search + target.hash;
        latest.current.requestClose();
      } else {
        router.push(href);
      }
    },
    [router],
  );
  const api = useMemo(() => ({ register, navigate }), [register, navigate]);

  return (
    <GuardContext.Provider value={api}>
      {children}
      {guard.guardDialog}
    </GuardContext.Provider>
  );
}
