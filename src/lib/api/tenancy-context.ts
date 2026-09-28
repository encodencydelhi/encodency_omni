"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/features/auth/components/auth-provider";
import { clientsApi } from "@/features/admin/projects/live/clients-api";

import {
  DEFAULT_FALLBACK_COMPANY_ID,
  DEFAULT_FALLBACK_CLIENT_ID,
  clearStoredClientId,
  getStoredCompanyId,
  getStoredClientId,
  setStoredTenancy,
} from "./tenancy-storage";

export {
  DEFAULT_FALLBACK_COMPANY_ID,
  DEFAULT_FALLBACK_CLIENT_ID,
  clearStoredClientId,
  getStoredCompanyId,
  getStoredClientId,
  setStoredTenancy,
};

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
        setStoredTenancy(resolvedCompany);
      }
    }

    setCompanyState(resolvedCompany);

    const storedClient = getStoredClientId();

    if (!resolvedCompany) {
      setClientState(storedClient);
      setIsReady(true);
      return;
    }

    // A stored Client id only belongs to one Company: pairing it with a different one
    // makes every client-scoped route fail with 403 "Client access denied". So the
    // stored id is reconciled against this Company's real client list instead of being
    // trusted as-is (the previous behaviour kept a Client from the last Company).
    let cancelled = false;
    clientsApi
      .list(resolvedCompany)
      .then((clients) => {
        if (cancelled) return;
        const ids = clients.map((client) => client.id);
        if (storedClient && ids.includes(storedClient)) {
          setClientState(storedClient);
          return;
        }
        const nextClientId = clients[0]?.id ?? "";
        setClientState(nextClientId);
        if (nextClientId) {
          setStoredTenancy(resolvedCompany, nextClientId);
        } else {
          clearStoredClientId();
        }
      })
      .catch(() => {
        // Listing failed (offline, transient error): keep the stored Client rather
        // than dropping tenancy context for a page that could still work.
        if (!cancelled) setClientState(storedClient);
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
    setStoredTenancy(id);
    // The selected Client belonged to the previous Company — drop it so the next
    // resolution picks one that actually exists under the new Company.
    setClientState("");
    clearStoredClientId();
  }, []);

  const setClientId = useCallback((id: string) => {
    setClientState(id);
    setStoredTenancy(getStoredCompanyId(), id);
  }, []);

  return {
    companyId,
    clientId,
    setCompanyId,
    setClientId,
    isReady,
  };
}
