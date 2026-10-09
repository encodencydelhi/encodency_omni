"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { adminOrganization, adminClients } from "@/mocks/admin/admin-dashboard.mock";
import { clientsApi, type ClientRecord } from "@/features/admin/projects/live/clients-api";
import { organizationApi, type OrganizationRecord } from "@/features/admin/settings/live/organization-api";
import { brandingApi } from "@/features/admin/settings/live/branding-api";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { TENANCY_CHANGE_EVENT, getStoredClientId } from "@/lib/api/tenancy-storage";
import type { AdminClientscope, Organization, Project } from "@/types/admin";

export const BRANDING_CHANGE_EVENT = "omni:branding-changed";

const PROJECT_COLORS = ["#D6474F", "#4F7697", "#43846B", "#8B5CF3", "#F59E0B", "#0EA5E9"];

function toProject(record: ClientRecord, index: number): Project {
  return {
    id: record.id,
    organizationId: record.companyId,
    name: record.displayName || record.name,
    website: record.website ?? "",
    status: "active",
    color: PROJECT_COLORS[index % PROJECT_COLORS.length] ?? "#3B82F6",
  };
}

interface AdminContextValue {
  organization: Organization;
  Clients: Project[];
  /** False while the bundled placeholder org/client list is still on screen. */
  isPlaceholderData: boolean;
  selectedProjectId: AdminClientscope;
  setSelectedProjectId: (id: AdminClientscope) => void;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  isMobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const { companyId, isReady, setClientId } = useTenancyContext();
  const [organization, setOrganization] = useState<Organization>(adminOrganization);
  const [Clients, setClients] = useState<Project[]>(adminClients);
  const [selectedProjectId, setSelectedProjectId] = useState<AdminClientscope>("moksha-sewa");
  const [hasLiveClients, setHasLiveClients] = useState(false);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileNavOpen, setMobileNavOpen] = useState(false);
  const toggleSidebar = useCallback(() => setSidebarCollapsed((value) => !value), []);

  useEffect(() => {
    if (!isReady || !companyId) return;
    let cancelled = false;

    Promise.allSettled([
      clientsApi.list(companyId),
      organizationApi.get(companyId),
      brandingApi.get(companyId),
    ]).then(([clientsResult, orgResult, brandingResult]) => {
      if (cancelled) return;

      if (clientsResult.status === "fulfilled" && clientsResult.value.length > 0) {
        const liveClients = clientsResult.value.map(toProject);
        const storedClientId = getStoredClientId();
        setClients(liveClients);
        setHasLiveClients(true);
        // Keep the switcher on the Client the shared scope already resolved to,
        // falling back to the first live Client — never to the bundled placeholder.
        setSelectedProjectId((current) =>
          liveClients.some((client) => client.id === current)
            ? current
            : storedClientId && liveClients.some((client) => client.id === storedClientId)
              ? storedClientId
              : liveClients[0]!.id,
        );
      }

      const logoUrl =
        brandingResult.status === "fulfilled" && brandingResult.value.logo?.url
          ? brandingResult.value.logo.url
          : null;

      if (orgResult.status === "fulfilled") {
        const record: OrganizationRecord = orgResult.value;
        setOrganization({
          id: record.id,
          name: record.displayName || record.name,
          timezone: record.timezone || "Asia/Kolkata",
          logo: logoUrl,
        });
      } else if (logoUrl) {
        setOrganization((prev) => ({
          ...prev,
          logo: logoUrl,
        }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isReady, companyId]);

  // Real-time synchronization when branding/logo is uploaded or removed in Settings
  useEffect(() => {
    const handleBrandingChanged = (e: Event) => {
      const custom = e as CustomEvent<{ logo?: string | null }>;
      if (custom.detail && "logo" in custom.detail) {
        setOrganization((prev) => ({
          ...prev,
          logo: custom.detail.logo || null,
        }));
      } else if (companyId) {
        brandingApi
          .get(companyId)
          .then((res) => {
            setOrganization((prev) => ({
              ...prev,
              logo: res.logo?.url || null,
            }));
          })
          .catch(() => {});
      }
    };

    window.addEventListener(BRANDING_CHANGE_EVENT, handleBrandingChanged);
    return () => window.removeEventListener(BRANDING_CHANGE_EVENT, handleBrandingChanged);
  }, [companyId]);

  // The sidebar Client switcher used to write only this local state, so every
  // channel page (WhatsApp, LinkedIn, Meta) kept asking for a Client while the
  // switcher claimed one was selected. The selection is bridged both ways:
  //   sidebar click   -> shared tenancy scope (what the channel pages read)
  //   tenancy scope   -> sidebar state (a page's own Client picker)
  // Only real Client ids are ever involved — the bundled placeholder list is not.
  const clientsRef = useRef(Clients);
  const liveRef = useRef(hasLiveClients);
  useEffect(() => {
    clientsRef.current = Clients;
  }, [Clients]);
  useEffect(() => {
    liveRef.current = hasLiveClients;
  }, [hasLiveClients]);

  const selectClient = useCallback(
    (id: AdminClientscope) => {
      setSelectedProjectId(id);
      if (!liveRef.current) return;
      if (!clientsRef.current.some((client) => client.id === id)) return;
      setClientId(id);
    },
    [setClientId],
  );

  useEffect(() => {
    // `localStorage`'s own `storage` event never fires in the writing tab, so
    // tenancy-storage broadcasts TENANCY_CHANGE_EVENT instead; this is the
    // sidebar's subscription to that external change.
    const syncFromTenancy = () => {
      const storedClientId = getStoredClientId();
      if (!storedClientId || !liveRef.current) return;
      if (!clientsRef.current.some((client) => client.id === storedClientId)) return;
      setSelectedProjectId((current) => (current === storedClientId ? current : storedClientId));
    };
    window.addEventListener(TENANCY_CHANGE_EVENT, syncFromTenancy);
    return () => window.removeEventListener(TENANCY_CHANGE_EVENT, syncFromTenancy);
  }, []);

  const value = useMemo(() => ({
    organization, Clients, isPlaceholderData: !hasLiveClients, selectedProjectId,
    setSelectedProjectId: selectClient, isSidebarCollapsed, toggleSidebar, isMobileNavOpen, setMobileNavOpen,
  }), [Clients, hasLiveClients, isMobileNavOpen, isSidebarCollapsed, organization, selectedProjectId, selectClient, toggleSidebar, setMobileNavOpen]);
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdminContext() {
  const context = useContext(AdminContext);
  if (!context) throw new Error("useAdminContext must be used inside AdminProvider");
  return context;
}
