"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { StaffCapabilities } from "./types";

const StaffCapabilitiesContext = createContext<StaffCapabilities | null>(null);

export function useStaffCapabilities(): StaffCapabilities {
  const ctx = useContext(StaffCapabilitiesContext);
  if (!ctx) throw new Error("useStaffCapabilities must be used within StaffCapabilitiesProvider");
  return ctx;
}

const DEFAULT_CAPABILITIES: StaffCapabilities = {
  canViewStaff: true,
  canInviteStaff: true,
  canEditStaffProfile: true,
  canChangePlatformRole: true,
  canAssignCompanies: true,
  canSuspendStaff: true,
  canReactivateStaff: true,
  canDeactivateStaff: true,
  canConductAccessReviews: true,
  canExportStaff: true,
  canViewActivity: true,
  canManageLifecycle: true,
};

export function StaffCapabilitiesProvider({ children }: { children: ReactNode }) {
  return (
    <StaffCapabilitiesContext.Provider value={DEFAULT_CAPABILITIES}>
      {children}
    </StaffCapabilitiesContext.Provider>
  );
}
