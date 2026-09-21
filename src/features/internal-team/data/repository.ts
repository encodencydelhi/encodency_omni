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

let staffStore: StaffMember[] = [...STAFF_MEMBERS];
let invitationStore: StaffInvitation[] = [...STAFF_INVITATIONS];
let reviewStore: StaffAccessReview[] = [...STAFF_ACCESS_REVIEWS];

function resetStores() {
  staffStore = [...STAFF_MEMBERS];
  invitationStore = [...STAFF_INVITATIONS];
  reviewStore = [...STAFF_ACCESS_REVIEWS];
}

export interface InternalTeamRepository {
  listStaff(query: StaffListQuery): Promise<StaffListResult>;
  getStaff(id: string): Promise<StaffMember | null>;
  getStaffKpis(): Promise<StaffKpis>;
  listInvitations(query?: { search?: string; status?: string }): Promise<StaffInvitation[]>;
  getInvitationKpis(): Promise<InvitationKpis>;
  createInvitation(input: CreateStaffInvitationInput): Promise<StaffInvitation>;
  revokeInvitation(id: string): Promise<StaffInvitation>;
  listAccessReviews(query?: { search?: string; status?: AccessReviewStatus }): Promise<StaffAccessReview[]>;
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
    const newInvitation: StaffInvitation = {
      id: `inv_${String(invitationStore.length + 1).padStart(3, "0")}`,
      ...input,
      invitedBy: { id: "stf_001", name: "Aditya Raghunath" },
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(),
      status: "pending",
      acceptedUserId: null,
    };
    invitationStore = [newInvitation, ...invitationStore];
    return newInvitation;
  },

  async revokeInvitation(id) {
    await sleep(150);
    const idx = invitationStore.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error("Invitation not found");
    invitationStore[idx] = { ...invitationStore[idx], status: "revoked" };
    return invitationStore[idx];
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
    reviewStore[idx] = { ...reviewStore[idx], status: "completed" as AccessReviewStatus, outcome: input.outcome, notes: input.notes, lastReviewDate: new Date().toISOString() };
    return reviewStore[idx];
  },

  async changeRole(input) {
    await sleep(200);
    const idx = staffStore.findIndex((s) => s.id === input.staffId);
    if (idx === -1) throw new Error("Staff member not found");
    staffStore[idx] = {
      ...staffStore[idx],
      role: input.newRole,
      effectiveCapabilities: computeEffectiveCapabilities(input.newRole),
      sensitiveCapabilities: computeSensitiveCapabilities(input.newRole),
      privilegedAccess: input.newRole === "super_admin" || input.newRole === "technical_admin",
    };
    return staffStore[idx];
  },

  async assignCompany(input) {
    await sleep(200);
    const idx = staffStore.findIndex((s) => s.id === input.staffId);
    if (idx === -1) throw new Error("Staff member not found");
    const newAssignment = {
      id: `asgn_${input.staffId}_${Date.now()}`,
      ...input,
      assignedAt: new Date().toISOString(),
      assignedBy: "stf_001",
      status: "active" as const,
    };
    staffStore[idx] = { ...staffStore[idx], assignments: [...staffStore[idx].assignments, newAssignment] };
    return staffStore[idx];
  },

  async reassignCompany(input) {
    await sleep(200);
    const staffIdx = staffStore.findIndex((s) => s.assignments.some((a) => a.id === input.assignmentId));
    if (staffIdx === -1) throw new Error("Assignment not found");
    const assignment = staffStore[staffIdx].assignments.find((a) => a.id === input.assignmentId);
    if (!assignment) throw new Error("Assignment not found");
    staffStore[staffIdx] = {
      ...staffStore[staffIdx],
      assignments: staffStore[staffIdx].assignments.map((a) =>
        a.id === input.assignmentId ? { ...a, status: "inactive" as const } : a,
      ),
    };
    const targetIdx = staffStore.findIndex((s) => s.id === input.newStaffId);
    if (targetIdx !== -1) {
      const newAsgn = { ...assignment, id: `asgn_${input.newStaffId}_${Date.now()}`, staffId: input.newStaffId, assignedAt: new Date().toISOString() };
      staffStore[targetIdx] = { ...staffStore[targetIdx], assignments: [...staffStore[targetIdx].assignments, newAsgn] };
      return staffStore[targetIdx];
    }
    return staffStore[staffIdx];
  },

  async suspendStaff(input) {
    await sleep(200);
    const idx = staffStore.findIndex((s) => s.id === input.staffId);
    if (idx === -1) throw new Error("Staff member not found");
    staffStore[idx] = { ...staffStore[idx], status: "suspended" };
    return staffStore[idx];
  },

  async reactivateStaff(input) {
    await sleep(200);
    const idx = staffStore.findIndex((s) => s.id === input.staffId);
    if (idx === -1) throw new Error("Staff member not found");
    staffStore[idx] = { ...staffStore[idx], status: "active", lastActiveAt: new Date().toISOString() };
    return staffStore[idx];
  },

  async deactivateStaff(input) {
    await sleep(250);
    const idx = staffStore.findIndex((s) => s.id === input.staffId);
    if (idx === -1) throw new Error("Staff member not found");
    input.reassignmentPlan.forEach((plan) => {
      const asgnIdx = staffStore[idx].assignments.findIndex((a) => a.companyId === plan.companyId && a.status === "active");
      if (asgnIdx !== -1) {
        staffStore[idx].assignments[asgnIdx] = { ...staffStore[idx].assignments[asgnIdx], status: "inactive" };
      }
    });
    staffStore[idx] = { ...staffStore[idx], status: "suspended" };
    return staffStore[idx];
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
