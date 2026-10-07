import { superAdminUsersApi, type LiveFeedItem } from "@/features/users/live/super-admin-users-api";
import type { InternalRole } from "@/types/domain/team";
import {
  staffApi,
  type LiveStaff,
  type LiveStaffInvitation,
  type StaffPlatformRole,
  type StaffResponsibilityKey,
  type StaffReviewOutcomeKey,
} from "../live/staff-api";
import { getMfaState, getRolePermissions } from "./config";
import type { InternalTeamRepository } from "./repository";
import type {
  AssignmentResponsibility,
  StaffAccessReview,
  StaffActivity,
  StaffInvitation,
  StaffLifecycleEvent,
  StaffListQuery,
  StaffMember,
} from "./types";

/**
 * Real Internal Team data from `/super-admin/staff/*`. Nothing falls back to bundled demo data: a failed request surfaces
 * as an error so an empty or wrong list is never mistaken for the truth.
 */

const ROLE_FROM_API: Record<StaffPlatformRole, InternalRole> = { SUPER_ADMIN: "super_admin", SUPPORT: "support" };
const ROLE_TO_API: Partial<Record<InternalRole, StaffPlatformRole>> = { super_admin: "SUPER_ADMIN", support: "SUPPORT" };

const RESPONSIBILITY_FROM_API: Record<StaffResponsibilityKey, AssignmentResponsibility> = {
  PRIMARY_OWNER: "primary_owner",
  BACKUP_OWNER: "backup_owner",
  SUPPORT_OWNER: "support_owner",
  INTEGRATION_SUPPORT: "integration_support",
  BILLING_CONTACT: "billing_contact",
};
const RESPONSIBILITY_TO_API = Object.fromEntries(Object.entries(RESPONSIBILITY_FROM_API).map(([api, ui]) => [ui, api])) as Record<AssignmentResponsibility, StaffResponsibilityKey>;

const OUTCOME_TO_API: Record<"confirmed" | "role_change_recommended" | "access_removal_recommended", StaffReviewOutcomeKey> = {
  confirmed: "CONFIRMED",
  role_change_recommended: "ROLE_CHANGE_RECOMMENDED",
  access_removal_recommended: "ACCESS_REMOVAL_RECOMMENDED",
};

const SENSITIVE = ["settings:write", "flags:write", "users:write", "billing:write", "platform:write"];

const displayName = (name: string | null | undefined, email: string) => name?.trim() || email;

function toStaffMember(s: LiveStaff): StaffMember {
  const role = ROLE_FROM_API[s.platformRole];
  const permissions = [...getRolePermissions(role)] as string[];
  return {
    id: s.id,
    name: displayName(s.name, s.email),
    email: s.email,
    avatarUrl: s.avatarUrl,
    phone: s.phone,
    jobTitle: s.jobTitle ?? "",
    department: s.department ?? "",
    role,
    status: s.status === "ACTIVE" ? "active" : "suspended",
    mfaEnabled: s.mfaEnabled,
    mfaState: getMfaState(s.mfaEnabled),
    lastActiveAt: s.lastActiveAt,
    createdAt: s.createdAt,
    globalUserId: s.id,
    assignments: s.assignments.map((a) => ({
      id: a.id,
      staffId: s.id,
      companyId: a.companyId,
      companyName: a.companyName,
      responsibility: RESPONSIBILITY_FROM_API[a.responsibility],
      assignedAt: a.assignedAt,
      assignedBy: a.assignedBy ? displayName(a.assignedBy.name, a.assignedBy.email) : "",
      status: a.status === "PENDING_HANDOVER" ? ("pending_handover" as const) : a.status === "ACTIVE" ? ("active" as const) : ("inactive" as const),
    })),
    accessReviewStatus: s.review.status,
    nextReviewDate: s.review.nextReviewAt,
    privilegedAccess: s.platformRole === "SUPER_ADMIN",
    effectiveCapabilities: permissions,
    sensitiveCapabilities: permissions.filter((p) => SENSITIVE.includes(p)),
  };
}

function toInvitation(r: LiveStaffInvitation, acceptLink?: string): StaffInvitation {
  return {
    id: r.id,
    email: r.email,
    name: displayName(r.name, r.email),
    department: r.department ?? "",
    jobTitle: r.jobTitle ?? "",
    role: ROLE_FROM_API[r.platformRole],
    invitedBy: { id: r.invitedBy.id, name: displayName(r.invitedBy.name, r.invitedBy.email) },
    createdAt: r.createdAt,
    expiresAt: r.expiresAt,
    status: r.status,
    companyAssignments: r.plannedAssignments.map((p) => ({ companyId: p.companyId, companyName: p.companyName ?? "", responsibility: RESPONSIBILITY_FROM_API[p.responsibility] })),
    acceptedUserId: r.acceptedUserId,
    ...(acceptLink ? { acceptLink } : {}),
  };
}

const acceptLinkFor = (token: string) => `${typeof window === "undefined" ? "" : window.location.origin}/accept-staff-invitation?token=${encodeURIComponent(token)}`;

function listQuery(query: StaffListQuery) {
  return {
    page: query.page ?? 1,
    limit: Math.min(query.pageSize ?? 10, 100),
    search: query.search?.trim() || undefined,
    role: query.role ? ROLE_TO_API[query.role] : undefined,
    status: query.status === "active" ? "ACTIVE" : query.status === "suspended" ? "DEACTIVATED" : undefined,
    department: query.department,
    mfa: query.mfaState === "enrolled" ? "enabled" : query.mfaState === "setup_required" ? "disabled" : undefined,
    reviewStatus: query.accessReviewStatus,
    sort: query.sort,
  };
}

const feedName = (f: LiveFeedItem) => f.actor?.name?.trim() || f.actor?.email || "System";

const LIFECYCLE_TYPE: Record<string, StaffLifecycleEvent["eventType"]> = {
  "staff.invitation.accepted": "activated",
  "staff.role.changed": "role_changed",
  "staff.deactivated": "deactivated",
  "user.deactivated": "deactivated",
  "user.reactivated": "reactivated",
  "staff.assignment.added": "assignment_added",
  "staff.assignment.ended": "assignment_removed",
  "staff.assignment.reassigned": "assignment_removed",
  "staff.review.completed": "review_completed",
  "staff.review.scheduled": "review_scheduled",
  "staff.profile.updated": "profile_updated",
};

function describeFeed(f: LiveFeedItem): string {
  const d = f.details ?? {};
  if (f.action === "staff.role.changed") return `${f.label}: ${String(d.previousRole ?? "")} → ${String(d.newRole ?? "")}`;
  if (f.action.startsWith("staff.assignment") && f.companyName) return `${f.label} · ${f.companyName}${typeof d.responsibility === "string" ? ` (${d.responsibility.toLowerCase().replace(/_/g, " ")})` : ""}`;
  if (f.action === "staff.review.completed" && typeof d.outcome === "string") return `${f.label}: ${d.outcome.toLowerCase().replace(/_/g, " ")}`;
  return f.label;
}

async function loadMember(id: string): Promise<StaffMember> {
  return toStaffMember(await staffApi.get(id));
}

export const liveInternalTeamRepository: InternalTeamRepository = {
  async listStaff(query) {
    const [res, kpis] = await Promise.all([staffApi.list(listQuery(query)), staffApi.kpis()]);
    return {
      items: res.items.map(toStaffMember),
      total: res.total,
      page: res.page,
      pageSize: res.limit,
      pageCount: Math.max(1, Math.ceil(res.total / res.limit)),
      departments: res.departments,
      kpis: {
        totalStaff: kpis.totalStaff,
        activeStaff: kpis.activeStaff,
        pendingInvitations: kpis.pendingInvitations,
        suspendedStaff: kpis.suspendedStaff,
        mfaActionRequired: kpis.mfaActionRequired,
        accessReviewsDue: kpis.accessReviewsDue,
        assignedCompanies: kpis.assignedCompanies,
        unassignedCompanies: kpis.unassignedCompanies,
      },
    };
  },

  getStaff: loadMember,

  async getStaffKpis() {
    const k = await staffApi.kpis();
    return {
      totalStaff: k.totalStaff,
      activeStaff: k.activeStaff,
      pendingInvitations: k.pendingInvitations,
      suspendedStaff: k.suspendedStaff,
      mfaActionRequired: k.mfaActionRequired,
      accessReviewsDue: k.accessReviewsDue,
      assignedCompanies: k.assignedCompanies,
      unassignedCompanies: k.unassignedCompanies,
    };
  },

  async listInvitations(query) {
    const res = await staffApi.invitations({ search: query?.search?.trim() || undefined, status: query?.status || undefined });
    return res.items.map((r) => toInvitation(r));
  },

  async getInvitationKpis() {
    const { kpis } = await staffApi.invitations();
    return { pending: kpis.pending, accepted: kpis.accepted, expired: kpis.expired, revoked: kpis.revoked, expiringSoon: kpis.expiringSoon };
  },

  async createInvitation(input) {
    const role = ROLE_TO_API[input.role];
    if (!role) throw new Error("That role is not available for staff accounts.");
    const res = await staffApi.invite({
      email: input.email.trim(),
      name: input.name.trim() || undefined,
      jobTitle: input.jobTitle.trim() || undefined,
      department: input.department.trim() || undefined,
      platformRole: role,
      assignments: input.companyAssignments.map((a) => ({ companyId: a.companyId, responsibility: RESPONSIBILITY_TO_API[a.responsibility] })),
    });
    const list = await staffApi.invitations({ search: input.email.trim() });
    const row = list.items.find((i) => i.id === res.invitationId);
    if (row) return toInvitation(row, acceptLinkFor(res.token));
    return { id: res.invitationId, email: input.email, name: input.name || input.email, department: input.department, jobTitle: input.jobTitle, role: input.role, invitedBy: { id: "", name: "" }, createdAt: new Date().toISOString(), expiresAt: res.expiresAt, status: "pending", companyAssignments: input.companyAssignments, acceptedUserId: null, acceptLink: acceptLinkFor(res.token) };
  },

  async resendInvitation(id) {
    const res = await staffApi.resendInvitation(id);
    const list = await staffApi.invitations();
    const row = list.items.find((i) => i.id === res.invitationId);
    if (!row) throw new Error("The invitation was renewed but could not be reloaded.");
    return toInvitation(row, acceptLinkFor(res.token));
  },

  async revokeInvitation(id) {
    const before = await staffApi.invitations();
    const row = before.items.find((i) => i.id === id);
    await staffApi.revokeInvitation(id);
    if (!row) throw new Error("Invitation not found.");
    return { ...toInvitation(row), status: "revoked" };
  },

  async listAccessReviews(query) {
    const search = query?.search?.trim() || undefined;
    const rows: StaffAccessReview[] = [];
    if (query?.status !== "not_scheduled") {
      const res = await staffApi.reviews({ search, status: query?.status || undefined });
      for (const r of res.items) {
        rows.push({
          id: r.staffId,
          staffId: r.staffId,
          staffName: displayName(r.name, r.email),
          staffEmail: r.email,
          role: ROLE_FROM_API[r.platformRole],
          department: r.department ?? "",
          mfaState: getMfaState(r.mfaEnabled),
          lastReviewDate: r.review.lastReviewAt,
          nextReviewDate: r.review.nextReviewAt,
          status: r.review.status,
          reviewer: null,
          notes: null,
          outcome: null,
        });
      }
    }
    if (!query?.status || query.status === "not_scheduled") {
      const open = await staffApi.list({ limit: 100, status: "ACTIVE", reviewStatus: "not_scheduled", search });
      for (const s of open.items) {
        rows.push({
          id: s.id,
          staffId: s.id,
          staffName: displayName(s.name, s.email),
          staffEmail: s.email,
          role: ROLE_FROM_API[s.platformRole],
          department: s.department ?? "",
          mfaState: getMfaState(s.mfaEnabled),
          lastReviewDate: s.review.lastReviewAt,
          nextReviewDate: null,
          status: "not_scheduled",
          reviewer: null,
          notes: null,
          outcome: null,
        });
      }
    }
    return rows;
  },

  async getAccessReviewKpis() {
    const { kpis } = await staffApi.reviews();
    return {
      reviewsDue: kpis.reviewsDue,
      overdueReviews: kpis.overdueReviews,
      privilegedStaff: kpis.privilegedStaff,
      mfaActionRequired: kpis.mfaActionRequired,
      suspendedWithAssignments: kpis.suspendedWithAssignments,
      tempAccessExpiring: 0,
      notScheduled: kpis.notScheduled,
    };
  },

  async completeAccessReview(input) {
    // In live mode a review is identified by the person it belongs to (one open review per person).
    await staffApi.completeReview(input.reviewId, { outcome: OUTCOME_TO_API[input.outcome], notes: input.notes });
    const s = await staffApi.get(input.reviewId);
    return {
      id: s.id,
      staffId: s.id,
      staffName: displayName(s.name, s.email),
      staffEmail: s.email,
      role: ROLE_FROM_API[s.platformRole],
      department: s.department ?? "",
      mfaState: getMfaState(s.mfaEnabled),
      lastReviewDate: s.review.lastReviewAt,
      nextReviewDate: s.review.nextReviewAt,
      status: s.review.status,
      reviewer: null,
      notes: input.notes,
      outcome: input.outcome,
    };
  },

  async scheduleAccessReview(input) {
    await staffApi.scheduleReview(input.staffId, new Date(input.dueAt).toISOString());
  },

  async changeRole(input) {
    const platformRole = ROLE_TO_API[input.newRole];
    if (!platformRole) throw new Error("That role is not available for staff accounts.");
    return toStaffMember(await staffApi.changeRole(input.staffId, { platformRole, reason: input.reason }));
  },

  async updateStaffProfile(input) {
    const { staffId, ...body } = input;
    return toStaffMember(await staffApi.updateProfile(staffId, body));
  },

  async assignCompany(input) {
    await staffApi.assign(input.staffId, { companyId: input.companyId, responsibility: RESPONSIBILITY_TO_API[input.responsibility] });
    return loadMember(input.staffId);
  },

  async reassignCompany(input) {
    await staffApi.reassign(input.assignmentId, { newStaffId: input.newStaffId, reason: input.reason });
    return loadMember(input.newStaffId);
  },

  async endAssignment(assignmentId) {
    await staffApi.endAssignment(assignmentId);
  },

  async suspendStaff(input) {
    return toStaffMember(await staffApi.deactivate(input.staffId, { reason: input.reason }));
  },

  async deactivateStaff(input) {
    let reassignments = input.reassignments;
    if (!reassignments && input.reassignmentPlan.length) {
      const current = await staffApi.get(input.staffId);
      reassignments = input.reassignmentPlan.flatMap((p) => current.assignments.filter((a) => a.companyId === p.companyId).map((a) => ({ assignmentId: a.id, newStaffId: p.newOwnerId })));
    }
    return toStaffMember(await staffApi.deactivate(input.staffId, { reason: input.reason, reassignments }));
  },

  async reactivateStaff(input) {
    return toStaffMember(await staffApi.reactivate(input.staffId));
  },

  async getStaffActivity(staffId) {
    const res = await superAdminUsersApi.activity({ userId: staffId, limit: 50 });
    return res.items.map<StaffActivity>((f) => ({
      id: f.id,
      staffId,
      timestamp: f.at,
      eventType: f.label,
      actor: { id: f.actor?.userId ?? "", name: feedName(f) },
      details: describeFeed(f),
      companyId: f.companyId ?? undefined,
      companyName: f.companyName ?? undefined,
      result: f.outcome.toLowerCase().startsWith("fail") ? "failed" : "successful",
    }));
  },

  async getStaffLifecycleEvents(staffId) {
    const res = await superAdminUsersApi.lifecycle(staffId);
    return res.items.map<StaffLifecycleEvent>((f) => ({
      id: f.id,
      staffId,
      eventType: LIFECYCLE_TYPE[f.action] ?? "profile_updated",
      timestamp: f.at,
      actor: { id: f.actor?.userId ?? "", name: feedName(f) },
      details: describeFeed(f),
    }));
  },

  async listCoverage() {
    const res = await staffApi.coverage();
    const ref = (s: { id: string; name: string | null; email: string } | null) => (s ? { id: s.id, name: displayName(s.name, s.email) } : null);
    return {
      items: res.items.map((c) => ({
        companyId: c.companyId,
        companyName: c.companyName,
        primaryOwner: ref(c.primary),
        backupOwner: ref(c.backup),
        supportOwner: null,
        assignmentCount: c.assignmentCount,
        status: c.status,
      })),
      kpis: res.kpis,
    };
  },
};
