"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { adminOrganization, adminClients } from "@/mocks/admin/admin-dashboard.mock";
import type { AdminClientscope } from "@/types/admin";

interface AdminContextValue {
  organization: typeof adminOrganization;
  Clients: typeof adminClients;
  selectedProjectId: AdminClientscope;
  setSelectedProjectId: (id: AdminClientscope) => void;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  isMobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [selectedProjectId, setSelectedProjectId] = useState<AdminClientscope>("moksha-sewa");
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileNavOpen, setMobileNavOpen] = useState(false);
  const toggleSidebar = useCallback(() => setSidebarCollapsed((value) => !value), []);
  const value = useMemo(() => ({
    organization: adminOrganization, Clients: adminClients, selectedProjectId,
    setSelectedProjectId, isSidebarCollapsed, toggleSidebar, isMobileNavOpen, setMobileNavOpen,
  }), [isMobileNavOpen, isSidebarCollapsed, selectedProjectId, toggleSidebar]);
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdminContext() {
  const context = useContext(AdminContext);
  if (!context) throw new Error("useAdminContext must be used inside AdminProvider");
  return context;
}
