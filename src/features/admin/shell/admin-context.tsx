"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { adminOrganization, adminClients } from "@/mocks/admin/admin-dashboard.mock";
import { clientsApi, type ClientRecord } from "@/features/admin/projects/live/clients-api";
import { organizationApi, type OrganizationRecord } from "@/features/admin/settings/live/organization-api";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import type { AdminClientscope, Organization, Project } from "@/types/admin";

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
  selectedProjectId: AdminClientscope;
  setSelectedProjectId: (id: AdminClientscope) => void;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  isMobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const { companyId, isReady } = useTenancyContext();
  const [organization, setOrganization] = useState<Organization>(adminOrganization);
  const [Clients, setClients] = useState<Project[]>(adminClients);
  const [selectedProjectId, setSelectedProjectId] = useState<AdminClientscope>("moksha-sewa");
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileNavOpen, setMobileNavOpen] = useState(false);
  const toggleSidebar = useCallback(() => setSidebarCollapsed((value) => !value), []);

  useEffect(() => {
    if (!isReady || !companyId) return;
    let cancelled = false;

    Promise.allSettled([clientsApi.list(companyId), organizationApi.get(companyId)]).then(([clientsResult, orgResult]) => {
      if (cancelled) return;

      if (clientsResult.status === "fulfilled" && clientsResult.value.length > 0) {
        const liveClients = clientsResult.value.map(toProject);
        setClients(liveClients);
        setSelectedProjectId((current) => (liveClients.some((client) => client.id === current) ? current : liveClients[0]!.id));
      }

      if (orgResult.status === "fulfilled") {
        const record: OrganizationRecord = orgResult.value;
        setOrganization({
          id: record.id,
          name: record.displayName || record.name,
          timezone: record.timezone || "Asia/Kolkata",
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isReady, companyId]);

  const value = useMemo(() => ({
    organization, Clients, selectedProjectId,
    setSelectedProjectId, isSidebarCollapsed, toggleSidebar, isMobileNavOpen, setMobileNavOpen,
  }), [Clients, isMobileNavOpen, isSidebarCollapsed, organization, selectedProjectId, toggleSidebar]);
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdminContext() {
  const context = useContext(AdminContext);
  if (!context) throw new Error("useAdminContext must be used inside AdminProvider");
  return context;
}
