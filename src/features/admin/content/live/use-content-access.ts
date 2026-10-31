"use client";
import { useAuth } from "@/features/auth/components/auth-provider";
import { useTenancyContext } from "@/lib/api/tenancy-context";
/** Presentation only; each API endpoint enforces its capability again. */
export function useContentAccess() {
  const {user} = useAuth();
  const {companyId} = useTenancyContext();
  const membership = user?.memberships.find(item => item.companyId === companyId && item.companyStatus === "ACTIVE" && !item.suspended);
  const role = membership?.systemRole;
  return {canWrite: role === "OWNER" || role === "ADMIN" || role === "MANAGER", canPublish: role === "OWNER" || role === "ADMIN"};
}
