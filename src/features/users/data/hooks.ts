"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { usersRepository } from "./repository";
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
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create invitation.");
    },
  });

  const resendInvitation = useMutation({
    mutationFn: (id: string) => usersRepository.resendInvitation(id),
    onSuccess: (res) => {
      invalidateAll();
      toast.success(`Invitation resent to ${res.email}`);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to resend invitation.");
    },
  });

  const revokeInvitation = useMutation({
    mutationFn: (id: string) => usersRepository.revokeInvitation(id),
    onSuccess: (res) => {
      invalidateAll();
      toast.success(`Invitation for ${res.email} revoked.`);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to revoke invitation.");
    },
  });

  const addCompanyMembership = useMutation({
    mutationFn: (input: AddMembershipInput) => usersRepository.addCompanyMembership(input),
    onSuccess: (res) => {
      invalidateAll();
      toast.success(`Added ${res.identity.name} to company membership.`);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to add company membership.");
    },
  });

  const changeMembershipRole = useMutation({
    mutationFn: (input: ChangeRoleInput) => usersRepository.changeMembershipRole(input),
    onSuccess: (res) => {
      invalidateAll();
      toast.success(`Role updated successfully for ${res.identity.name}.`);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to change company role.");
    },
  });

  const updateClientAccess = useMutation({
    mutationFn: (input: UpdateClientAccessInput) => usersRepository.updateClientAccess(input),
    onSuccess: () => {
      invalidateAll();
      toast.success("Client access updated successfully.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update client access.");
    },
  });

  const suspendMembership = useMutation({
    mutationFn: ({ membershipId, reason }: { membershipId: string; reason?: string }) =>
      usersRepository.suspendMembership(membershipId, reason),
    onSuccess: () => {
      invalidateAll();
      toast.success("Company membership suspended.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to suspend membership.");
    },
  });

  const reactivateMembership = useMutation({
    mutationFn: (membershipId: string) => usersRepository.reactivateMembership(membershipId),
    onSuccess: () => {
      invalidateAll();
      toast.success("Company membership reactivated.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to reactivate membership.");
    },
  });

  const removeMembership = useMutation({
    mutationFn: (input: RemoveMembershipInput) => usersRepository.removeMembership(input),
    onSuccess: () => {
      invalidateAll();
      toast.success("Company membership removed and resources reassigned.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to remove membership.");
    },
  });

  const transferOwnership = useMutation({
    mutationFn: (input: TransferOwnershipInput) => usersRepository.transferCompanyOwnership(input),
    onSuccess: () => {
      invalidateAll();
      toast.success("Company ownership transferred successfully.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to transfer company ownership.");
    },
  });

  const suspendGlobalAccount = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      usersRepository.suspendGlobalAccount(userId, reason),
    onSuccess: (res) => {
      invalidateAll();
      toast.success(`Global account for ${res.identity.name} suspended.`);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to suspend global account.");
    },
  });

  const reactivateGlobalAccount = useMutation({
    mutationFn: (userId: string) => usersRepository.reactivateGlobalAccount(userId),
    onSuccess: (res) => {
      invalidateAll();
      toast.success(`Global account for ${res.identity.name} reactivated.`);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to reactivate global account.");
    },
  });

  const require2FA = useMutation({
    mutationFn: ({ userId, enforce }: { userId: string; enforce: boolean }) =>
      usersRepository.require2FA(userId, enforce),
    onSuccess: () => {
      invalidateAll();
      toast.success("2FA requirement policy updated.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update 2FA policy.");
    },
  });

  const requirePasswordReset = useMutation({
    mutationFn: (userId: string) => usersRepository.requirePasswordReset(userId),
    onSuccess: () => {
      invalidateAll();
      toast.success("Password reset demand recorded for next login.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to send password reset.");
    },
  });

  const revokeSession = useMutation({
    mutationFn: ({ userId, sessionId }: { userId: string; sessionId: string }) =>
      usersRepository.revokeSession(userId, sessionId),
    onSuccess: () => {
      invalidateAll();
      toast.success("Session revoked.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to revoke session.");
    },
  });

  const revokeAllSessions = useMutation({
    mutationFn: (userId: string) => usersRepository.revokeAllSessions(userId),
    onSuccess: () => {
      invalidateAll();
      toast.success("All active sessions revoked.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to revoke all sessions.");
    },
  });

  const unlockAccount = useMutation({
    mutationFn: (userId: string) => usersRepository.unlockAccount(userId),
    onSuccess: () => {
      invalidateAll();
      toast.success("Account unlocked successfully.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to unlock account.");
    },
  });

  const updateUserIdentity = useMutation({
    mutationFn: (input: UpdateUserIdentityInput) => usersRepository.updateUserIdentity(input),
    onSuccess: (res) => {
      invalidateAll();
      toast.success(`Identity profile updated for ${res.identity.name}.`);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update identity profile.");
    },
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
    onError: (err: Error) => {
      toast.error(err.message || "Bulk operation failed.");
    },
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
