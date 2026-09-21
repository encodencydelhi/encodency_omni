import type {
  AssignCompanyInput,
  ChangeStaffRoleInput,
  CompleteAccessReviewInput,
  CreateStaffInvitationInput,
  DeactivateStaffInput,
  InvitationKpis,
  AccessReviewKpis,
  ReassignCompanyInput,
  ReactivateStaffInput,
  StaffAccessReview,
  StaffActivity,
  StaffInvitation,
  StaffKpis,
  StaffLifecycleEvent,
  StaffListQuery,
  StaffListResult,
  StaffMember,
  SuspendStaffInput,
} from "./types";
import { STAFF_MEMBERS, STAFF_INVITATIONS, STAFF_ACCESS_REVIEWS, STAFF_ACTIVITIES, STAFF_LIFECYCLE_EVENTS, COMPANY_POOL_EXPORT } from "./mock-data";
import { filterStaff, sortStaff, paginateStaff, computeStaffKpis, computeInvitationKpis, computeAccessReviewKpis } from "./selectors";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const staffStore: StaffMember[] = [...STAFF_MEMBERS];
const invitationStore: StaffInvitation[] = [...STAFF_INVITATIONS];
const reviewStore: StaffAccessReview[] = [...STAFF_ACCESS_REVIEWS];

export interface InternalTeamRepository {
  listStaff(query: StaffListQuery): Promise<StaffListResult>;
  getStaff(id: string): Promise<StaffMember | null>;
  getStaffKpis(): Promise<StaffKpis>;
  listInvitations(query?: { search?: string; status?: string }): Promise<StaffInvitation[]>;
  getInvitationKpis(): Promise<InvitationKpis>;
  createInvitation(input: CreateStaffInvitationInput): Promise<StaffInvitation>;
  revokeInvitation(id: string): Promise<StaffInvitation>;
  listAccessReviews(query?: { search?: string; status?: string }): Promise<StaffAccessReview[]>;
  getAccessReviewKpis(): Promise<AccessReviewKpis>;
  completeAccessReview(input: CompleteAccessReviewInput): Promise<StaffAccessReview>;
  changeRole(input: ChangeStaffRoleInput): Promise<StaffMember>;
  assignCompany(input: AssignCompanyInput): Promise<StaffMember>;
  reassignCompany(input: ReassignCompanyInput): Promise<StaffMember>;
  suspendStaff(input: SuspendStaffInput): Promise<StaffMember>;
  reactivateStaff(input: ReactivateStaffInput): Promise<StaffMember>;
  deactivateStaff(input: DeactivateStaffInput): Promise<StaffMember>;
  getStaffActivity(staffId: string): Promise<StaffActivity[]>;
  getStaffLifecycleEvents(staffId: string): Promise<StaffLifecycleEvent[]>;
}

function computeEffectiveCapabilities(role: string): string[] {
  const capabilityMap: Record<string, string[]> = {
    super_admin: ["dashboard:view", "companies:read", "companies:write", "users:read", "users:write", "clients:read", "internal_team:read", "internal_team:write", "plans:read", "plans:write", "billing:read", "billing:write", "usage:read", "integrations:read", "integrations:write", "system_health:read", "jobs:read", "api_monitoring:read", "webhooks:read", "feature_flags:read", "feature_flags:write", "audit_logs:read", "support:read", "support:write", "notifications:read", "settings:read", "settings:write"],
    technical_admin: ["dashboard:view", "companies:read", "users:read", "clients:read", "internal_team:read", "integrations:read", "integrations:write", "system_health:read", "jobs:read", "api_monitoring:read", "webhooks:read", "feature_flags:read", "feature_flags:write", "audit_logs:read"],
    support: ["dashboard:view", "companies:read", "users:read", "clients:read", "internal_team:read", "support:read", "support:write", "audit_logs:read"],
    finance: ["dashboard:view", "companies:read", "plans:read", "plans:write", "billing:read", "billing:write", "usage:read"],
    operations: ["dashboard:view", "companies:read", "companies:write", "users:read", "users:write", "clients:read", "internal_team:read"],
  };
  return capabilityMap[role] || [];
}

function computeSensitiveCapabilities(role: string): string[] {
  const sensitiveMap: Record<string, string[]> = {
    super_admin: ["settings:write", "feature_flags:write", "internal_team:write", "billing:write", "users:write"],
    technical_admin: ["feature_flags:write", "integrations:write"],
    support: ["support:write"],
    finance: ["billing:write", "plans:write"],
    operations: ["companies:write", "users:write"],
  };
  return sensitiveMap[role] || [];
}

function cloneStaffMember(original: StaffMember, overrides?: Partial<StaffMember>): StaffMember {
  const base: StaffMember = {
    id: original.id,
    name: original.name,
    email: original.email,
    avatarUrl: original.avatarUrl,
    jobTitle: original.jobTitle,
    department: original.department,
    role: original.role,
    status: original.status,
    mfaEnabled: original.mfaEnabled,
    mfaState: original.mfaState,
    lastActiveAt: original.lastActiveAt,
    createdAt: original.createdAt,
    globalUserId: original.globalUserId,
    assignments: [...original.assignments.map((a) => ({ ...a }))],
    accessReviewStatus: original.accessReviewStatus,
    nextReviewDate: original.nextReviewDate,
    privilegedAccess: original.privilegedAccess,
    effectiveCapabilities: [...original.effectiveCapabilities],
    sensitiveCapabilities: [...original.sensitiveCapabilities],
  };
  return overrides ? { ...base, ...overrides } : base;
}

export const internalTeamRepository: InternalTeamRepository = {
  async listStaff(query) {
    await sleep(150);
    const filtered = filterStaff(staffStore, query);
    const sorted = sortStaff(filtered, query.sort);
    const page = query.page || 1;
    const pageSize = query.pageSize || 10;
    const items = paginateStaff(sorted, page, pageSize);
    const kpis = computeStaffKpis(staffStore, invitationStore, COMPANY_POOL_EXPORT.length);
    return { items, total: sorted.length, page, pageSize, pageCount: Math.ceil(sorted.length / pageSize), kpis };
  },

  async getStaff(id) {
    await sleep(100);
    const found = staffStore.find((s) => s.id === id);
    return found ? cloneStaffMember(found) : null;
  },

  async getStaffKpis() {
    await sleep(80);
    return computeStaffKpis(staffStore, invitationStore, COMPANY_POOL_EXPORT.length);
  },

  async listInvitations(query) {
    await sleep(120);
    let result = [...invitationStore];
    if (query?.search) {
      const q = query.search.toLowerCase();
      result = result.filter((i) => i.name.toLowerCase().includes(q) || i.email.toLowerCase().includes(q));
    }
    if (query?.status) result = result.filter((i) => i.status === query.status);
    return result;
  },

  async getInvitationKpis() {
    await sleep(80);
    return computeInvitationKpis(invitationStore);
  },

  async createInvitation(input) {
    await sleep(200);
    const id = `inv_${String(invitationStore.length + 1).padStart(3, "0")}`;
    const newInvitation: StaffInvitation = {
      id,
      email: input.email,
      name: input.name,
      department: input.department,
      jobTitle: input.jobTitle,
      role: input.role,
      invitedBy: { id: "stf_001", name: "Aditya Raghunath" },
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(),
      status: "pending",
      companyAssignments: input.companyAssignments ?? [],
      acceptedUserId: null,
    };
    invitationStore.unshift(newInvitation);
    return newInvitation;
  },

  async revokeInvitation(id) {
    await sleep(150);
    const idx = invitationStore.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error("Invitation not found");
    const original = invitationStore[idx]!;
    const revoked: StaffInvitation = {
      id: original.id,
      email: original.email,
      name: original.name,
      department: original.department,
      jobTitle: original.jobTitle,
      role: original.role,
      invitedBy: original.invitedBy,
      createdAt: original.createdAt,
      expiresAt: original.expiresAt,
      status: "revoked",
      companyAssignments: original.companyAssignments,
      acceptedUserId: original.acceptedUserId,
    };
    invitationStore[idx] = revoked;
    return revoked;
  },

  async listAccessReviews(query) {
    await sleep(120);
    let result = [...reviewStore];
    if (query?.search) {
      const q = query.search.toLowerCase();
      result = result.filter((r) => r.staffName.toLowerCase().includes(q) || r.staffEmail.toLowerCase().includes(q));
    }
    if (query?.status) result = result.filter((r) => r.status === query.status);
    return result;
  },

  async getAccessReviewKpis() {
    await sleep(80);
    return computeAccessReviewKpis(staffStore, reviewStore);
  },

  async completeAccessReview(input) {
    await sleep(200);
    const idx = reviewStore.findIndex((r) => r.id === input.reviewId);
    if (idx === -1) throw new Error("Review not found");
    const original = reviewStore[idx]!;
    const updated: StaffAccessReview = {
      id: original.id,
      staffId: original.staffId,
      staffName: original.staffName,
      staffEmail: original.staffEmail,
      role: original.role,
      department: original.department,
      mfaState: original.mfaState,
      reviewer: original.reviewer,
      status: "completed",
      outcome: input.outcome,
      notes: input.notes,
      lastReviewDate: new Date().toISOString(),
      nextReviewDate: original.nextReviewDate,
    };
    reviewStore[idx] = updated;
    return updated;
  },

  async changeRole(input) {
    await sleep(200);
    const idx = staffStore.findIndex((s) => s.id === input.staffId);
    if (idx === -1) throw new Error("Staff member not found");
    const updated = cloneStaffMember(staffStore[idx]!, {
      role: input.newRole,
      effectiveCapabilities: computeEffectiveCapabilities(input.newRole),
      sensitiveCapabilities: computeSensitiveCapabilities(input.newRole),
      privilegedAccess: input.newRole === "super_admin" || input.newRole === "technical_admin",
    });
    staffStore[idx] = updated;
    return cloneStaffMember(updated);
  },

  async assignCompany(input) {
    await sleep(200);
    const idx = staffStore.findIndex((s) => s.id === input.staffId);
    if (idx === -1) throw new Error("Staff member not found");
    const original = staffStore[idx]!;
    const newAssignment = {
      id: `asgn_${input.staffId}_${Date.now()}`,
      staffId: input.staffId,
      companyId: input.companyId,
      companyName: input.companyName,
      responsibility: input.responsibility,
      assignedAt: new Date().toISOString(),
      assignedBy: "stf_001",
      status: "active" as const,
    };
    const updated = cloneStaffMember(original, {
      assignments: [...original.assignments, newAssignment],
    });
    staffStore[idx] = updated;
    return cloneStaffMember(updated);
  },

  async reassignCompany(input) {
    await sleep(200);
    const staffIdx = staffStore.findIndex((s) => s.assignments.some((a) => a.id === input.assignmentId));
    if (staffIdx === -1) throw new Error("Assignment not found");
    const original = staffStore[staffIdx]!;
    const assignment = original.assignments.find((a) => a.id === input.assignmentId);
    if (!assignment) throw new Error("Assignment not found");

    const updatedAssignments = original.assignments.map((a) =>
      a.id === input.assignmentId ? { ...a, status: "inactive" as const } : a,
    );
    const sourceUpdated = cloneStaffMember(original, { assignments: updatedAssignments });
    staffStore[staffIdx] = sourceUpdated;

    const targetIdx = staffStore.findIndex((s) => s.id === input.newStaffId);
    if (targetIdx !== -1) {
      const target = staffStore[targetIdx]!;
      const newAsgn = {
        id: `asgn_${input.newStaffId}_${Date.now()}`,
        staffId: input.newStaffId,
        companyId: assignment.companyId,
        companyName: assignment.companyName,
        responsibility: assignment.responsibility,
        assignedAt: new Date().toISOString(),
        assignedBy: "stf_001",
        status: "active" as const,
      };
      const targetUpdated = cloneStaffMember(target, {
        assignments: [...target.assignments, newAsgn],
      });
      staffStore[targetIdx] = targetUpdated;
      return cloneStaffMember(targetUpdated);
    }
    return cloneStaffMember(sourceUpdated);
  },

  async suspendStaff(input) {
    await sleep(200);
    const idx = staffStore.findIndex((s) => s.id === input.staffId);
    if (idx === -1) throw new Error("Staff member not found");
    const updated = cloneStaffMember(staffStore[idx]!, { status: "suspended" });
    staffStore[idx] = updated;
    return cloneStaffMember(updated);
  },

  async reactivateStaff(input) {
    await sleep(200);
    const idx = staffStore.findIndex((s) => s.id === input.staffId);
    if (idx === -1) throw new Error("Staff member not found");
    const updated = cloneStaffMember(staffStore[idx]!, {
      status: "active",
      lastActiveAt: new Date().toISOString(),
    });
    staffStore[idx] = updated;
    return cloneStaffMember(updated);
  },

  async deactivateStaff(input) {
    await sleep(250);
    const idx = staffStore.findIndex((s) => s.id === input.staffId);
    if (idx === -1) throw new Error("Staff member not found");
    const original = staffStore[idx]!;
    const reassignmentIds = new Set(input.reassignmentPlan.map((r) => r.companyId));
    const updatedAssignments = original.assignments.map((a) =>
      reassignmentIds.has(a.companyId) ? { ...a, status: "inactive" as const } : a,
    );
    const updated = cloneStaffMember(original, {
      status: "suspended",
      assignments: updatedAssignments,
    });
    staffStore[idx] = updated;
    return cloneStaffMember(updated);
  },

  async getStaffActivity(staffId) {
    await sleep(100);
    return STAFF_ACTIVITIES.filter((a) => a.staffId === staffId);
  },

  async getStaffLifecycleEvents(staffId) {
    await sleep(100);
    return STAFF_LIFECYCLE_EVENTS.filter((e) => e.staffId === staffId);
  },
};
