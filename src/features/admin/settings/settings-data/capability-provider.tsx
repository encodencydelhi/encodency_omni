"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { SettingsCapabilities } from "./types";
import { DEFAULT_CAPABILITIES, ADMIN_LIMITED_CAPABILITIES } from "./mock-provider";
import { SETTINGS_CAPABILITY_ROLE_KEY } from "./config";

interface CapabilityContextType {
  capabilities: SettingsCapabilities;
  currentRole: "Organization Owner" | "Organization Admin";
  switchRole: (role: "Organization Owner" | "Organization Admin") => void;
}

const CapabilityContext = createContext<CapabilityContextType>({
  capabilities: DEFAULT_CAPABILITIES,
  currentRole: "Organization Owner",
  switchRole: () => {},
});

export function CapabilityProvider({ children }: { children: React.ReactNode }) {
  const [currentRole, setCurrentRole] = useState<"Organization Owner" | "Organization Admin">("Organization Owner");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_CAPABILITY_ROLE_KEY);
      if (stored === "Organization Admin" || stored === "Organization Owner") {
        setCurrentRole(stored);
      }
    } catch {
      // ignore
    }
  }, []);

  const switchRole = (role: "Organization Owner" | "Organization Admin") => {
    setCurrentRole(role);
    try {
      localStorage.setItem(SETTINGS_CAPABILITY_ROLE_KEY, role);
    } catch {
      // ignore
    }
  };

  const capabilities = currentRole === "Organization Owner" ? DEFAULT_CAPABILITIES : ADMIN_LIMITED_CAPABILITIES;

  return (
    <CapabilityContext.Provider value={{ capabilities, currentRole, switchRole }}>
      {children}
    </CapabilityContext.Provider>
  );
}

export function useSettingsCapability() {
  return useContext(CapabilityContext);
}
