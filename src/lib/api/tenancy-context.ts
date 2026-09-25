"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/features/auth/components/auth-provider";
import { clientsApi } from "@/features/admin/projects/live/clients-api";

import {
  DEFAULT_FALLBACK_COMPANY_ID,
  DEFAULT_FALLBACK_CLIENT_ID,
  getStoredCompanyId,
  getStoredClientId,
  setStoredTenancy,
} from "./tenancy-storage";

export {
  DEFAULT_FALLBACK_COMPANY_ID,
  DEFAULT_FALLBACK_CLIENT_ID,
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
          setStoredTenancy(getStoredCompanyId(), firstClientId);
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
    setStoredTenancy(id);
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
