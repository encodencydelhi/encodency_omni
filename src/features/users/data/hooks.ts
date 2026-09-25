"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/types/api";
import { usersRepository } from "./repository";

function notifyMutationError(fallback: string, err: unknown) {
  if (ApiError.isApiError(err)) {
    const details = err.reason || (err.status ? `Status HTTP ${err.status}` : undefined);
    toast.error(err.message || fallback, { description: details, duration: 6000 });
  } else if (err instanceof Error) {
    toast.error(err.message || fallback, { duration: 6000 });
  } else {
    toast.error(fallback, { duration: 6000 });
  }
}
import type {
  AddMembershipInput,
  ChangeRoleInput,
  CreateInvitationInput,
  RemoveMembershipInput,
  TransferOwnershipInput,
  UpdateClientAccessInput,
  UpdateUserIdentityInput,
  UserListQuery,
} from "./types";

const ROOT = ["users-workspace"] as const;

export const userKeys = {
  all: ROOT,
  list: (query: UserListQuery) => [...ROOT, "list", query] as const,
  detail: (id: string) => [...ROOT, "user", id] as const,
  kpis: [...ROOT, "kpis"] as const,
  invitations: (query?: { search?: string; status?: string }) => [...ROOT, "invitations", query ?? {}] as const,
  security: (query?: { search?: string; companyId?: string; status?: string; twoFactor?: string }) =>
    [...ROOT, "security-users", query ?? {}] as const,
  securityEvents: [...ROOT, "security-events"] as const,
  attention: [...ROOT, "attention-items"] as const,
  activities: (query?: { userId?: string; companyId?: string; search?: string }) =>
    [...ROOT, "activities", query ?? {}] as const,
};

export function useUsersList(query: UserListQuery) {
  return useQuery({
    queryKey: userKeys.list(query),
    queryFn: () => usersRepository.listUsers(query),
    placeholderData: keepPreviousData,
  });
}

export function useUser(userId: string) {
  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: () => usersRepository.getUser(userId),
    enabled: Boolean(userId),
  });
}

export function useUserKpis() {
  return useQuery({
    queryKey: userKeys.kpis,
    queryFn: () => usersRepository.getKpis(),
  });
}

export function useInvitations(query?: { search?: string; status?: string }) {
  return useQuery({
    queryKey: userKeys.invitations(query),
    queryFn: () => usersRepository.listInvitations(query),
  });
}

export function useSecurityUsers(query?: { search?: string; companyId?: string; status?: string; twoFactor?: string }) {
  return useQuery({
    queryKey: userKeys.security(query),
    queryFn: () => usersRepository.listSecurityUsers(query),
  });
}

export function useSecurityEvents() {
  return useQuery({
    queryKey: userKeys.securityEvents,
    queryFn: () => usersRepository.listSecurityEvents(),
  });
}

export function useAttentionItems() {
  return useQuery({
    queryKey: userKeys.attention,
    queryFn: () => usersRepository.listAttentionItems(),
  });
}

export function useUserActivities(query?: { userId?: string; companyId?: string; search?: string }) {
  return useQuery({
    queryKey: userKeys.activities(query),
    queryFn: () => usersRepository.listActivities(query),
  });
}

export function useLifecycleEvents(userId?: string) {
  return useQuery({
    queryKey: [...userKeys.all, "lifecycle", userId ?? "all"] as const,
    queryFn: () => usersRepository.listLifecycleEvents(userId),
  });
}

/** Mutations */
export function useUserMutations() {
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: userKeys.all });
  };

  const createInvitation = useMutation({
    mutationFn: (input: CreateInvitationInput) => usersRepository.createInvitation(input),
    onSuccess: (res) => {
      invalidateAll();
      toast.success(`Demo invitation created for ${res.name} (${res.email})`);
    },
    onError: (err: unknown) => notifyMutationError("Failed to create invitation.", err),
  });

  const resendInvitation = useMutation({
    mutationFn: (id: string) => usersRepository.resendInvitation(id),
    onSuccess: (res) => {
      invalidateAll();
      toast.success(`Invitation resent to ${res.email}`);
    },
    onError: (err: unknown) => notifyMutationError("Failed to resend invitation.", err),
  });

  const revokeInvitation = useMutation({
    mutationFn: (id: string) => usersRepository.revokeInvitation(id),
    onSuccess: (res) => {
      invalidateAll();
      toast.success(`Invitation for ${res.email} revoked.`);
    },
    onError: (err: unknown) => notifyMutationError("Failed to revoke invitation.", err),
  });

  const addCompanyMembership = useMutation({
    mutationFn: (input: AddMembershipInput) => usersRepository.addCompanyMembership(input),
    onSuccess: (res) => {
      invalidateAll();
      toast.success(`Added ${res.identity.name} to company membership.`);
    },
    onError: (err: unknown) => notifyMutationError("Failed to add company membership.", err),
  });

  const changeMembershipRole = useMutation({
    mutationFn: (input: ChangeRoleInput) => usersRepository.changeMembershipRole(input),
    onSuccess: (res) => {
      invalidateAll();
      toast.success(`Role updated successfully for ${res.identity.name}.`);
    },
    onError: (err: unknown) => notifyMutationError("Failed to change company role.", err),
  });

  const updateClientAccess = useMutation({
    mutationFn: (input: UpdateClientAccessInput) => usersRepository.updateClientAccess(input),
    onSuccess: () => {
      invalidateAll();
      toast.success("Client access updated successfully.");
    },
    onError: (err: unknown) => notifyMutationError("Failed to update client access.", err),
  });

  const suspendMembership = useMutation({
    mutationFn: ({ membershipId, reason }: { membershipId: string; reason?: string }) =>
      usersRepository.suspendMembership(membershipId, reason),
    onSuccess: () => {
      invalidateAll();
      toast.success("Company membership suspended.");
    },
    onError: (err: unknown) => notifyMutationError("Failed to suspend membership.", err),
  });

  const reactivateMembership = useMutation({
    mutationFn: (membershipId: string) => usersRepository.reactivateMembership(membershipId),
    onSuccess: () => {
      invalidateAll();
      toast.success("Company membership reactivated.");
    },
    onError: (err: unknown) => notifyMutationError("Failed to reactivate membership.", err),
  });

  const removeMembership = useMutation({
    mutationFn: (input: RemoveMembershipInput) => usersRepository.removeMembership(input),
    onSuccess: () => {
      invalidateAll();
      toast.success("Company membership removed and resources reassigned.");
    },
    onError: (err: unknown) => notifyMutationError("Failed to remove membership.", err),
  });

  const transferOwnership = useMutation({
    mutationFn: (input: TransferOwnershipInput) => usersRepository.transferCompanyOwnership(input),
    onSuccess: () => {
      invalidateAll();
      toast.success("Company ownership transferred successfully.");
    },
    onError: (err: unknown) => notifyMutationError("Failed to transfer company ownership.", err),
  });

  const suspendGlobalAccount = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      usersRepository.suspendGlobalAccount(userId, reason),
    onSuccess: (res) => {
      invalidateAll();
      toast.success(`Global account for ${res.identity.name} suspended.`);
    },
    onError: (err: unknown) => notifyMutationError("Failed to suspend global account.", err),
  });

  const reactivateGlobalAccount = useMutation({
    mutationFn: (userId: string) => usersRepository.reactivateGlobalAccount(userId),
    onSuccess: (res) => {
      invalidateAll();
      toast.success(`Global account for ${res.identity.name} reactivated.`);
    },
    onError: (err: unknown) => notifyMutationError("Failed to reactivate global account.", err),
  });

  const require2FA = useMutation({
    mutationFn: ({ userId, enforce }: { userId: string; enforce: boolean }) =>
      usersRepository.require2FA(userId, enforce),
    onSuccess: () => {
      invalidateAll();
      toast.success("2FA requirement policy updated.");
    },
    onError: (err: unknown) => notifyMutationError("Failed to update 2FA policy.", err),
  });

  const requirePasswordReset = useMutation({
    mutationFn: (userId: string) => usersRepository.requirePasswordReset(userId),
    onSuccess: () => {
      invalidateAll();
      toast.success("Password reset demand recorded for next login.");
    },
    onError: (err: unknown) => notifyMutationError("Failed to send password reset.", err),
  });

  const revokeSession = useMutation({
    mutationFn: ({ userId, sessionId }: { userId: string; sessionId: string }) =>
      usersRepository.revokeSession(userId, sessionId),
    onSuccess: () => {
      invalidateAll();
      toast.success("Session revoked.");
    },
    onError: (err: unknown) => notifyMutationError("Failed to revoke session.", err),
  });

  const revokeAllSessions = useMutation({
    mutationFn: (userId: string) => usersRepository.revokeAllSessions(userId),
    onSuccess: () => {
      invalidateAll();
      toast.success("All active sessions revoked.");
    },
    onError: (err: unknown) => notifyMutationError("Failed to revoke all sessions.", err),
  });

  const unlockAccount = useMutation({
    mutationFn: (userId: string) => usersRepository.unlockAccount(userId),
    onSuccess: () => {
      invalidateAll();
      toast.success("Account unlocked successfully.");
    },
    onError: (err: unknown) => notifyMutationError("Failed to unlock account.", err),
  });

  const updateUserIdentity = useMutation({
    mutationFn: (input: UpdateUserIdentityInput) => usersRepository.updateUserIdentity(input),
    onSuccess: (res) => {
      invalidateAll();
      toast.success(`Identity profile updated for ${res.identity.name}.`);
    },
    onError: (err: unknown) => notifyMutationError("Failed to update identity profile.", err),
  });

  const bulkAction = useMutation({
    mutationFn: ({
      action,
      userIds,
      params,
    }: {
      action: "export" | "require_2fa" | "notify" | "suspend";
      userIds: string[];
      params?: { reason?: string };
    }) => usersRepository.bulkAction(action, userIds, params),
    onSuccess: (res) => {
      invalidateAll();
      toast.success(res.message);
    },
    onError: (err: unknown) => notifyMutationError("Bulk operation failed.", err),
  });

  return {
    createInvitation,
    resendInvitation,
    revokeInvitation,
    addCompanyMembership,
    changeMembershipRole,
    updateClientAccess,
    suspendMembership,
    reactivateMembership,
    removeMembership,
    transferOwnership,
    suspendGlobalAccount,
    reactivateGlobalAccount,
    require2FA,
    requirePasswordReset,
    revokeSession,
    revokeAllSessions,
    unlockAccount,
    updateUserIdentity,
    bulkAction,
  };
}
