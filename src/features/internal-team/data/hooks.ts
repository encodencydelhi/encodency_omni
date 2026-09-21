"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { internalTeamRepository } from "./repository";
import type {
  AssignCompanyInput,
  ChangeStaffRoleInput,
  CompleteAccessReviewInput,
  CreateStaffInvitationInput,
  DeactivateStaffInput,
  ReassignCompanyInput,
  ReactivateStaffInput,
  StaffListQuery,
  SuspendStaffInput,
} from "./types";

const ROOT = ["internal-team"] as const;

export const teamKeys = {
  all: ROOT,
  list: (query: StaffListQuery) => [...ROOT, "list", query] as const,
  detail: (id: string) => [...ROOT, "staff", id] as const,
  kpis: [...ROOT, "kpis"] as const,
  invitations: (query?: { search?: string; status?: string }) => [...ROOT, "invitations", query ?? {}] as const,
  invitationKpis: [...ROOT, "invitation-kpis"] as const,
  accessReviews: (query?: { search?: string; status?: string }) => [...ROOT, "access-reviews", query ?? {}] as const,
  accessReviewKpis: [...ROOT, "access-review-kpis"] as const,
  activity: (staffId: string) => [...ROOT, "activity", staffId] as const,
  lifecycle: (staffId: string) => [...ROOT, "lifecycle", staffId] as const,
};

export function useStaffList(query: StaffListQuery) {
  return useQuery({
    queryKey: teamKeys.list(query),
    queryFn: () => internalTeamRepository.listStaff(query),
    placeholderData: keepPreviousData,
  });
}

export function useStaff(id: string) {
  return useQuery({
    queryKey: teamKeys.detail(id),
    queryFn: () => internalTeamRepository.getStaff(id),
    enabled: Boolean(id),
  });
}

export function useStaffKpis() {
  return useQuery({
    queryKey: teamKeys.kpis,
    queryFn: () => internalTeamRepository.getStaffKpis(),
  });
}

export function useStaffInvitations(query?: { search?: string; status?: string }) {
  return useQuery({
    queryKey: teamKeys.invitations(query),
    queryFn: () => internalTeamRepository.listInvitations(query),
  });
}

export function useInvitationKpis() {
  return useQuery({
    queryKey: teamKeys.invitationKpis,
    queryFn: () => internalTeamRepository.getInvitationKpis(),
  });
}

export function useAccessReviews(query?: { search?: string; status?: string }) {
  return useQuery({
    queryKey: teamKeys.accessReviews(query),
    queryFn: () => internalTeamRepository.listAccessReviews(query),
  });
}

export function useAccessReviewKpis() {
  return useQuery({
    queryKey: teamKeys.accessReviewKpis,
    queryFn: () => internalTeamRepository.getAccessReviewKpis(),
  });
}

export function useStaffActivity(staffId: string) {
  return useQuery({
    queryKey: teamKeys.activity(staffId),
    queryFn: () => internalTeamRepository.getStaffActivity(staffId),
    enabled: Boolean(staffId),
  });
}

export function useStaffLifecycle(staffId: string) {
  return useQuery({
    queryKey: teamKeys.lifecycle(staffId),
    queryFn: () => internalTeamRepository.getStaffLifecycleEvents(staffId),
    enabled: Boolean(staffId),
  });
}

export function useTeamMutations() {
  const qc = useQueryClient();
  const invalidate = () => void qc.invalidateQueries({ queryKey: teamKeys.all });

  const createInvitation = useMutation({
    mutationFn: (input: CreateStaffInvitationInput) => internalTeamRepository.createInvitation(input),
    onSuccess: (res) => { invalidate(); toast.success(`Invitation created for ${res.name}`); },
    onError: (err: Error) => { toast.error(err.message || "Failed to create invitation."); },
  });

  const revokeInvitation = useMutation({
    mutationFn: (id: string) => internalTeamRepository.revokeInvitation(id),
    onSuccess: () => { invalidate(); toast.success("Invitation revoked."); },
    onError: (err: Error) => { toast.error(err.message || "Failed to revoke invitation."); },
  });

  const changeRole = useMutation({
    mutationFn: (input: ChangeStaffRoleInput) => internalTeamRepository.changeRole(input),
    onSuccess: (res) => { invalidate(); toast.success(`Role changed to ${res.role} for ${res.name}`); },
    onError: (err: Error) => { toast.error(err.message || "Failed to change role."); },
  });

  const assignCompany = useMutation({
    mutationFn: (input: AssignCompanyInput) => internalTeamRepository.assignCompany(input),
    onSuccess: () => { invalidate(); toast.success("Company assigned successfully."); },
    onError: (err: Error) => { toast.error(err.message || "Failed to assign company."); },
  });

  const reassignCompany = useMutation({
    mutationFn: (input: ReassignCompanyInput) => internalTeamRepository.reassignCompany(input),
    onSuccess: () => { invalidate(); toast.success("Assignment transferred."); },
    onError: (err: Error) => { toast.error(err.message || "Failed to reassign."); },
  });

  const completeAccessReview = useMutation({
    mutationFn: (input: CompleteAccessReviewInput) => internalTeamRepository.completeAccessReview(input),
    onSuccess: () => { invalidate(); toast.success("Access review completed."); },
    onError: (err: Error) => { toast.error(err.message || "Failed to complete review."); },
  });

  const suspendStaff = useMutation({
    mutationFn: (input: SuspendStaffInput) => internalTeamRepository.suspendStaff(input),
    onSuccess: (res) => { invalidate(); toast.success(`${res.name} suspended.`); },
    onError: (err: Error) => { toast.error(err.message || "Failed to suspend staff."); },
  });

  const reactivateStaff = useMutation({
    mutationFn: (input: ReactivateStaffInput) => internalTeamRepository.reactivateStaff(input),
    onSuccess: (res) => { invalidate(); toast.success(`${res.name} reactivated.`); },
    onError: (err: Error) => { toast.error(err.message || "Failed to reactivate staff."); },
  });

  const deactivateStaff = useMutation({
    mutationFn: (input: DeactivateStaffInput) => internalTeamRepository.deactivateStaff(input),
    onSuccess: (res) => { invalidate(); toast.success(`${res.name} deactivated.`); },
    onError: (err: Error) => { toast.error(err.message || "Failed to deactivate staff."); },
  });

  return {
    createInvitation, revokeInvitation, changeRole, assignCompany,
    reassignCompany, completeAccessReview, suspendStaff, reactivateStaff, deactivateStaff,
  };
}
