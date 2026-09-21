import type {
  AccessReviewStatus,
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

function buildStaffMember(overrides: Partial<StaffMember> & Pick<StaffMember, "id" | "name" | "email" | "role">): StaffMember {
  const role = overrides.role;
  const defaults: Omit<StaffMember, "id" | "name" | "email" | "role"> = {
    avatarUrl: null,
    jobTitle: "Staff",
    department: "Operations",
    status: "active",
    mfaState: "enrolled",
    lastActiveAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    assignments: [],
    effectiveCapabilities: computeEffectiveCapabilities(role),
    sensitiveCapabilities: computeSensitiveCapabilities(role),
    privilegedAccess: role === "super_admin" || role === "technical_admin",
    nextReviewDate: new Date(Date.now() + 90 * 86400000).toISOString(),
    accessReviewStatus: "approved",
    lastReviewDate: new Date(Date.now() - 30 * 86400000).toISOString(),
  };
  return { ...defaults, ...overrides };
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
    return staffStore.find((s) => s.id === id) || null;
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
      staffRole: original.staffRole,
      reviewer: original.reviewer,
      status: "completed" as AccessReviewStatus,
      outcome: input.outcome,
      notes: input.notes,
      privilegedAccess: original.privilegedAccess,
      sensitiveCapabilities: original.sensitiveCapabilities,
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
    const original = staffStore[idx]!;
    const updated: StaffMember = {
      id: original.id,
      name: original.name,
      email: original.email,
      role: input.newRole,
      avatarUrl: original.avatarUrl,
      jobTitle: original.jobTitle,
      department: original.department,
      status: original.status,
      mfaState: original.mfaState,
      lastActiveAt: original.lastActiveAt,
      createdAt: original.createdAt,
      updatedAt: new Date().toISOString(),
      assignments: original.assignments,
      effectiveCapabilities: computeEffectiveCapabilities(input.newRole),
      sensitiveCapabilities: computeSensitiveCapabilities(input.newRole),
      privilegedAccess: input.newRole === "super_admin" || input.newRole === "technical_admin",
      nextReviewDate: original.nextReviewDate,
      accessReviewStatus: original.accessReviewStatus,
      lastReviewDate: original.lastReviewDate,
    };
    staffStore[idx] = updated;
    return updated;
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
    const updated: StaffMember = {
      id: original.id,
      name: original.name,
      email: original.email,
      role: original.role,
      avatarUrl: original.avatarUrl,
      jobTitle: original.jobTitle,
      department: original.department,
      status: original.status,
      mfaState: original.mfaState,
      lastActiveAt: original.lastActiveAt,
      createdAt: original.createdAt,
      updatedAt: new Date().toISOString(),
      assignments: [...original.assignments, newAssignment],
      effectiveCapabilities: original.effectiveCapabilities,
      sensitiveCapabilities: original.sensitiveCapabilities,
      privilegedAccess: original.privilegedAccess,
      nextReviewDate: original.nextReviewDate,
      accessReviewStatus: original.accessReviewStatus,
      lastReviewDate: original.lastReviewDate,
    };
    staffStore[idx] = updated;
    return updated;
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
    const sourceUpdated: StaffMember = {
      id: original.id,
      name: original.name,
      email: original.email,
      role: original.role,
      avatarUrl: original.avatarUrl,
      jobTitle: original.jobTitle,
      department: original.department,
      status: original.status,
      mfaState: original.mfaState,
      lastActiveAt: original.lastActiveAt,
      createdAt: original.createdAt,
      updatedAt: new Date().toISOString(),
      assignments: updatedAssignments,
      effectiveCapabilities: original.effectiveCapabilities,
      sensitiveCapabilities: original.sensitiveCapabilities,
      privilegedAccess: original.privilegedAccess,
      nextReviewDate: original.nextReviewDate,
      accessReviewStatus: original.accessReviewStatus,
      lastReviewDate: original.lastReviewDate,
    };
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
      const targetUpdated: StaffMember = {
        id: target.id,
        name: target.name,
        email: target.email,
        role: target.role,
        avatarUrl: target.avatarUrl,
        jobTitle: target.jobTitle,
        department: target.department,
        status: target.status,
        mfaState: target.mfaState,
        lastActiveAt: target.lastActiveAt,
        createdAt: target.createdAt,
        updatedAt: new Date().toISOString(),
        assignments: [...target.assignments, newAsgn],
        effectiveCapabilities: target.effectiveCapabilities,
        sensitiveCapabilities: target.sensitiveCapabilities,
        privilegedAccess: target.privilegedAccess,
        nextReviewDate: target.nextReviewDate,
        accessReviewStatus: target.accessReviewStatus,
        lastReviewDate: target.lastReviewDate,
      };
      staffStore[targetIdx] = targetUpdated;
      return targetUpdated;
    }
    return sourceUpdated;
  },

  async suspendStaff(input) {
    await sleep(200);
    const idx = staffStore.findIndex((s) => s.id === input.staffId);
    if (idx === -1) throw new Error("Staff member not found");
    const original = staffStore[idx]!;
    const updated: StaffMember = {
      id: original.id,
      name: original.name,
      email: original.email,
      role: original.role,
      avatarUrl: original.avatarUrl,
      jobTitle: original.jobTitle,
      department: original.department,
      status: "suspended",
      mfaState: original.mfaState,
      lastActiveAt: original.lastActiveAt,
      createdAt: original.createdAt,
      updatedAt: new Date().toISOString(),
      assignments: original.assignments,
      effectiveCapabilities: original.effectiveCapabilities,
      sensitiveCapabilities: original.sensitiveCapabilities,
      privilegedAccess: original.privilegedAccess,
      nextReviewDate: original.nextReviewDate,
      accessReviewStatus: original.accessReviewStatus,
      lastReviewDate: original.lastReviewDate,
    };
    staffStore[idx] = updated;
    return updated;
  },

  async reactivateStaff(input) {
    await sleep(200);
    const idx = staffStore.findIndex((s) => s.id === input.staffId);
    if (idx === -1) throw new Error("Staff member not found");
    const original = staffStore[idx]!;
    const updated: StaffMember = {
      id: original.id,
      name: original.name,
      email: original.email,
      role: original.role,
      avatarUrl: original.avatarUrl,
      jobTitle: original.jobTitle,
      department: original.department,
      status: "active",
      mfaState: original.mfaState,
      lastActiveAt: new Date().toISOString(),
      createdAt: original.createdAt,
      updatedAt: new Date().toISOString(),
      assignments: original.assignments,
      effectiveCapabilities: original.effectiveCapabilities,
      sensitiveCapabilities: original.sensitiveCapabilities,
      privilegedAccess: original.privilegedAccess,
      nextReviewDate: original.nextReviewDate,
      accessReviewStatus: original.accessReviewStatus,
      lastReviewDate: original.lastReviewDate,
    };
    staffStore[idx] = updated;
    return updated;
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
    const updated: StaffMember = {
      id: original.id,
      name: original.name,
      email: original.email,
      role: original.role,
      avatarUrl: original.avatarUrl,
      jobTitle: original.jobTitle,
      department: original.department,
      status: "suspended",
      mfaState: original.mfaState,
      lastActiveAt: original.lastActiveAt,
      createdAt: original.createdAt,
      updatedAt: new Date().toISOString(),
      assignments: updatedAssignments,
      effectiveCapabilities: original.effectiveCapabilities,
      sensitiveCapabilities: original.sensitiveCapabilities,
      privilegedAccess: original.privilegedAccess,
      nextReviewDate: original.nextReviewDate,
      accessReviewStatus: original.accessReviewStatus,
      lastReviewDate: original.lastReviewDate,
    };
    staffStore[idx] = updated;
    return updated;
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
