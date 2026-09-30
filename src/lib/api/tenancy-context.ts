"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/features/auth/components/auth-provider";
import { clientsApi } from "@/features/admin/projects/live/clients-api";

import {
  DEFAULT_FALLBACK_COMPANY_ID,
  DEFAULT_FALLBACK_CLIENT_ID,
  TENANCY_CHANGE_EVENT,
  clearStoredClientId,
  getStoredCompanyId,
  getStoredClientId,
  setStoredTenancy,
} from "./tenancy-storage";

export {
  DEFAULT_FALLBACK_COMPANY_ID,
  DEFAULT_FALLBACK_CLIENT_ID,
  TENANCY_CHANGE_EVENT,
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
    let attempts = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    // `isReady` only flips once the scope is actually known — either the real
    // Client id or a genuine "this Company has no Clients" — so pages never show
    // a premature "Select a Client" while the first list request is still open.
    const settle = () => {
      if (!cancelled) setIsReady(true);
    };

    const resolveClient = () => {
      clientsApi
        .list(resolvedCompany)
        .then((clients) => {
          if (cancelled) return;
          const ids = clients.map((client) => client.id);
          if (storedClient && ids.includes(storedClient)) {
            setClientState(storedClient);
          } else {
            const nextClientId = clients[0]?.id ?? "";
            setClientState(nextClientId);
            if (nextClientId) {
              setStoredTenancy(resolvedCompany, nextClientId);
            } else {
              clearStoredClientId();
            }
          }
          settle();
        })
        .catch(() => {
          // Listing failed (backend restarting, offline, transient error). A single
          // failure used to lock this tab into "no Client" until a full reload, which
          // blocks every Client-scoped action — so the resolution retries a few times
          // before finally falling back to the stored id.
          if (cancelled) return;
          attempts += 1;
          if (attempts <= 3) {
            retryTimer = setTimeout(resolveClient, 1000 * attempts);
            return;
          }
          setClientState(storedClient);
          settle();
        });
    };

    resolveClient();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [user]);

  // Scope writes are broadcast (same tab) by tenancy-storage so every mounted
  // consumer — WhatsApp, LinkedIn, the sidebar switcher — sees one shared scope.
  useEffect(() => {
    const sync = () => {
      setCompanyState(getStoredCompanyId());
      setClientState(getStoredClientId());
    };
    window.addEventListener(TENANCY_CHANGE_EVENT, sync);
    return () => window.removeEventListener(TENANCY_CHANGE_EVENT, sync);
  }, []);

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
