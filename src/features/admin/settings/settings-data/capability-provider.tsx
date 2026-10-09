"use client";

import React, { createContext, useContext, useMemo } from "react";
import { useAuth } from "@/features/auth/components/auth-provider";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import type { SettingsCapabilities } from "./types";
import { ADMIN_LIMITED_CAPABILITIES, DEFAULT_CAPABILITIES, VIEWER_CAPABILITIES } from "./mock-provider";

interface CapabilityContextType {
  capabilities: SettingsCapabilities;
  currentRole: SettingsCapabilities["role"];
}

/** Outside the provider nothing is editable. */
const CapabilityContext = createContext<CapabilityContextType>({
  capabilities: VIEWER_CAPABILITIES,
  currentRole: "Viewer",
});

/**
 * What the person may do on this page comes from their REAL role in the Company they are working in (Owner, Admin, or read-only
 * for everyone else). There is no role switcher: a Viewer can no longer look like an Owner. The server enforces the same
 * rules on every save, so this only decides which controls are enabled.
 */
export function CapabilityProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { companyId } = useTenancyContext();

  const value = useMemo<CapabilityContextType>(() => {
    const membership = user?.memberships.find((item) => item.companyId === companyId) ?? user?.memberships[0];
    const role = membership?.systemRole;
    const capabilities = role === "OWNER" ? DEFAULT_CAPABILITIES : role === "ADMIN" ? ADMIN_LIMITED_CAPABILITIES : VIEWER_CAPABILITIES;
    return { capabilities, currentRole: capabilities.role };
  }, [user, companyId]);

  return <CapabilityContext.Provider value={value}>{children}</CapabilityContext.Provider>;
}

export function useSettingsCapability() {
  return useContext(CapabilityContext);
}
