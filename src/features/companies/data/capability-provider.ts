"use client";

import { useMemo } from "react";
import { useAuth } from "@/features/auth/components/auth-provider";
import { deriveCapabilities, type CompanyCapabilities } from "./capabilities";

export type { CompanyCapabilities, CompanyCapabilityKey } from "./capabilities";
export { deriveCapabilities } from "./capabilities";

export function useCompanyCapabilities(): CompanyCapabilities {
  const { can } = useAuth();
  return useMemo(() => deriveCapabilities(can), [can]);
}

export function useCurrentStaff(): { id: string; name: string } {
  const { user } = useAuth();
  return useMemo(
    () => ({ id: user?.id ?? "unknown", name: user?.name ?? "Platform staff" }),
    [user],
  );
}
