"use client";

import { useQuery } from "@tanstack/react-query";
import { superAdminCompaniesApi } from "@/features/companies/live/super-admin-companies-api";
import { USERS_MOCK_MODE } from "./config";
import { fetchUsersDirectory } from "./live-provider";
import { getAllInvitations, getAllRawUsers } from "./mock/store";
import { usersRepository } from "./repository";
import type { UserAggregate, UserInvitation } from "./types";

/** What the dialogs need to know about other people. */
export type DirectoryUser = Pick<UserAggregate, "identity" | "memberships">;

const EMPTY_USERS: DirectoryUser[] = [];
const EMPTY_INVITATIONS: UserInvitation[] = [];

/** Every Company user, for dialogs that must reason about other people (last Owner, eligible new Owner...). */
export function useUsersDirectory(): DirectoryUser[] {
  const { data } = useQuery({
    queryKey: ["users-workspace", "directory"],
    queryFn: fetchUsersDirectory,
    enabled: !USERS_MOCK_MODE,
    staleTime: 30_000,
  });
  return USERS_MOCK_MODE ? getAllRawUsers() : (data ?? EMPTY_USERS);
}

/** Every invitation, used to warn about duplicates before sending another. */
export function useAllInvitations(): UserInvitation[] {
  const { data } = useQuery({
    queryKey: ["users-workspace", "all-invitations"],
    queryFn: () => usersRepository.listInvitations(),
    enabled: !USERS_MOCK_MODE,
    staleTime: 30_000,
  });
  return USERS_MOCK_MODE ? getAllInvitations() : (data ?? EMPTY_INVITATIONS);
}

/** The real Clients of one Company (live mode only). */
export function useCompanyClients(companyId: string | undefined) {
  return useQuery({
    queryKey: ["users-workspace", "company-clients", companyId],
    queryFn: async () => {
      const res = await superAdminCompaniesApi.listClients({ companyId, limit: 100 });
      return res.items.map((c) => ({ id: c.id, name: c.displayName?.trim() || c.name }));
    },
    enabled: !USERS_MOCK_MODE && Boolean(companyId),
    staleTime: 60_000,
  });
}
