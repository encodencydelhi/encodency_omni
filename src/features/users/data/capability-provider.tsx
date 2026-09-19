"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useAuth } from "@/features/auth/components/auth-provider";
import type { UserCapabilities } from "./types";

const defaultCapabilities: UserCapabilities = {
  canViewUsers: true,
  canInviteUsers: true,
  canEditUserIdentity: true,
  canManageMemberships: true,
  canChangeMembershipRole: true,
  canManageClientAccess: true,
  canSuspendMembership: true,
  canSuspendGlobalAccount: true,
  canRequire2FA: true,
  canRequirePasswordReset: true,
  canRevokeSessions: true,
  canTransferOwnership: true,
  canExportUsers: true,
  canViewSecurityEvents: true,
  canViewUserActivity: true,
};

const UserCapabilitiesContext = createContext<UserCapabilities>(defaultCapabilities);

export function UserCapabilitiesProvider({ children }: { children: ReactNode }) {
  const { can } = useAuth();
  const canRead = can("users:read");
  const canWrite = can("users:write");

  const capabilities = useMemo<UserCapabilities>(() => {
    return {
      canViewUsers: canRead,
      canInviteUsers: canWrite,
      canEditUserIdentity: canWrite,
      canManageMemberships: canWrite,
      canChangeMembershipRole: canWrite,
      canManageClientAccess: canWrite,
      canSuspendMembership: canWrite,
      canSuspendGlobalAccount: canWrite,
      canRequire2FA: canWrite,
      canRequirePasswordReset: canWrite,
      canRevokeSessions: canWrite,
      canTransferOwnership: canWrite,
      canExportUsers: canRead,
      canViewSecurityEvents: canRead,
      canViewUserActivity: canRead,
    };
  }, [canRead, canWrite]);

  return (
    <UserCapabilitiesContext.Provider value={capabilities}>
      {children}
    </UserCapabilitiesContext.Provider>
  );
}

export function useUserCapabilities(): UserCapabilities {
  return useContext(UserCapabilitiesContext);
}
