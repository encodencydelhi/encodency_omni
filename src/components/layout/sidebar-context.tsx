"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const COLLAPSE_STORAGE_KEY = "enc:sidebar-collapsed";

interface SidebarContextValue {
  isCollapsed: boolean;
  toggleCollapsed: () => void;
  isMobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

/**
 * Sidebar chrome state.
 *
 * The collapsed preference is a per-device convenience, so browser storage is
 * the right home for it — it never needs to reach the server. Reads are
 * guarded because storage can throw in restricted contexts.
 */
export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      setIsCollapsed(window.localStorage.getItem(COLLAPSE_STORAGE_KEY) === "true");
    } catch {
      // Storage unavailable — the default expanded state is correct.
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(COLLAPSE_STORAGE_KEY, String(next));
      } catch {
        // Preference is not persisted; the session still behaves correctly.
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ isCollapsed, toggleCollapsed, isMobileOpen, setMobileOpen }),
    [isCollapsed, isMobileOpen, toggleCollapsed],
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar(): SidebarContextValue {
  const context = useContext(SidebarContext);
  if (!context) throw new Error("useSidebar must be used inside a SidebarProvider");
  return context;
}
