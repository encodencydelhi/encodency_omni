"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/features/auth/components/auth-provider";
import { clientsApi } from "@/features/admin/projects/live/clients-api";

const STORAGE_KEY_COMPANY = "omni_active_company_id";
const STORAGE_KEY_CLIENT = "omni_active_client_id";

// Safe fallbacks for local/demo/harness environments when not logged into a specific tenant
export const DEFAULT_FALLBACK_COMPANY_ID = "development-company-id";
export const DEFAULT_FALLBACK_CLIENT_ID = "development-client-id";

export function getStoredCompanyId(): string {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(STORAGE_KEY_COMPANY);
    if (stored && stored.trim()) return stored.trim();
  }
  return DEFAULT_FALLBACK_COMPANY_ID;
}

export function getStoredClientId(): string {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(STORAGE_KEY_CLIENT);
    if (stored && stored.trim()) return stored.trim();
  }
  return DEFAULT_FALLBACK_CLIENT_ID;
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

export interface TenancyContextState {
  companyId: string;
  clientId: string;
  setCompanyId: (id: string) => void;
  setClientId: (id: string) => void;
  isReady: boolean;
}

export function useTenancyContext(): TenancyContextState {
  const { user } = useAuth();
  const [companyId, setCompanyState] = useState<string>(getStoredCompanyId);
  const [clientId, setClientState] = useState<string>(getStoredClientId);
  const [isReady, setIsReady] = useState<boolean>(false);

  useEffect(() => {
    let resolvedCompany = getStoredCompanyId();

    // If authenticated user has memberships, prefer their verified membership company
    if (user?.memberships && user.memberships.length > 0) {
      const activeMembership = user.memberships.find((m) => m.companyId === resolvedCompany) ?? user.memberships[0];
      if (activeMembership) {
        resolvedCompany = activeMembership.companyId;
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY_COMPANY, resolvedCompany);
        }
      }
    }

    setCompanyState(resolvedCompany);

    // Resolve client ID: if localStorage has it, keep it. Otherwise, try listing clients.
    let resolvedClient = getStoredClientId();
    if (resolvedClient && resolvedClient !== DEFAULT_FALLBACK_CLIENT_ID) {
      setClientState(resolvedClient);
      setIsReady(true);
      return;
    }

    // Try fetching available clients for this company
    let cancelled = false;
    clientsApi
      .list(resolvedCompany)
      .then((clients) => {
        if (cancelled) return;
        if (clients.length > 0 && clients[0]) {
          const firstClientId = clients[0].id;
          setClientState(firstClientId);
          if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEY_CLIENT, firstClientId);
          }
        }
      })
      .catch(() => {
        // Keep fallback if unable to list
      })
      .finally(() => {
        if (!cancelled) setIsReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const setCompanyId = useCallback((id: string) => {
    setCompanyState(id);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_COMPANY, id);
    }
  }, []);

  const setClientId = useCallback((id: string) => {
    setClientState(id);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_CLIENT, id);
    }
  }, []);

  return {
    companyId,
    clientId,
    setCompanyId,
    setClientId,
    isReady,
  };
}
