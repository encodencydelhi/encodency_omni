import type { StaffAccessReview, StaffAssignment, StaffInvitation, StaffKpis, StaffListQuery, StaffMember, InvitationKpis, CoverageKpi, AccessReviewKpis } from "./types";

export function filterStaff(staff: StaffMember[], query: StaffListQuery): StaffMember[] {
  let result = [...staff];
  if (query.search) {
    const q = query.search.toLowerCase();
    result = result.filter(
      (s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.id.toLowerCase().includes(q) || s.department.toLowerCase().includes(q) || s.role.toLowerCase().includes(q),
    );
  }
  if (query.role) result = result.filter((s) => s.role === query.role);
  if (query.status) result = result.filter((s) => s.status === query.status);
  if (query.department) result = result.filter((s) => s.department === query.department);
  if (query.mfaState) result = result.filter((s) => s.mfaState === query.mfaState);
  if (query.accessReviewStatus) result = result.filter((s) => s.accessReviewStatus === query.accessReviewStatus);
  return result;
}

export function sortStaff(staff: StaffMember[], sort?: string): StaffMember[] {
  if (!sort) return staff;
  const sorted = [...staff];
  switch (sort) {
    case "name":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "role":
      return sorted.sort((a, b) => a.role.localeCompare(b.role));
    case "assigned_companies":
      return sorted.sort((a, b) => b.assignments.filter((x) => x.status === "active").length - a.assignments.filter((x) => x.status === "active").length);
    case "join_date":
      return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    case "recently_active":
    default:
      return sorted.sort((a, b) => {
        if (!a.lastActiveAt) return 1;
        if (!b.lastActiveAt) return -1;
        return new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime();
      });
  }
}

export function paginateStaff(staff: StaffMember[], page: number, pageSize: number): StaffMember[] {
  const start = (page - 1) * pageSize;
  return staff.slice(start, start + pageSize);
}

export function computeStaffKpis(staff: StaffMember[], invitations: StaffInvitation[], companyCount: number): StaffKpis {
  const activeStaff = staff.filter((s) => s.status === "active").length;
  const pendingInvitations = invitations.filter((i) => i.status === "pending").length;
  const suspendedStaff = staff.filter((s) => s.status === "suspended").length;
  const mfaActionRequired = staff.filter((s) => s.status === "active" && s.mfaState !== "enrolled").length;
  const accessReviewsDue = staff.filter((s) => s.accessReviewStatus === "due" || s.accessReviewStatus === "overdue").length;
  const assignedCompanyIds = new Set<string>();
  const staffWithAssignments = new Set<string>();
  staff.forEach((s) => {
    s.assignments.filter((a) => a.status === "active").forEach((a) => {
      assignedCompanyIds.add(a.companyId);
      staffWithAssignments.add(s.id);
    });
  });
  return {
    totalStaff: staff.length,
    activeStaff,
    pendingInvitations,
    suspendedStaff,
    mfaActionRequired,
    accessReviewsDue,
    assignedCompanies: assignedCompanyIds.size,
    unassignedCompanies: Math.max(0, companyCount - assignedCompanyIds.size),
  };
}

export function computeInvitationKpis(invitations: StaffInvitation[]): InvitationKpis {
  return {
    pending: invitations.filter((i) => i.status === "pending").length,
    accepted: invitations.filter((i) => i.status === "accepted").length,
    expired: invitations.filter((i) => i.status === "expired").length,
    revoked: invitations.filter((i) => i.status === "revoked").length,
    expiringSoon: invitations.filter((i) => i.status === "pending" && new Date(i.expiresAt).getTime() - Date.now() < 7 * 86400000).length,
  };
}

export function computeCoverageKpi(staff: StaffMember[], companies: Array<{ id: string; name: string }>): CoverageKpi {
  const companyMap = new Map<string, StaffAssignment[]>();
  companies.forEach((c) => companyMap.set(c.id, []));
  staff.forEach((s) => {
    s.assignments.filter((a) => a.status === "active").forEach((a) => {
      const existing = companyMap.get(a.companyId);
      if (existing) existing.push(a);
    });
  });
  let companiesWithPrimary = 0;
  let companiesWithoutBackup = 0;
  let unassignedCompanies = 0;
  let assignmentsNeedingReassignment = 0;
  const staffWithAssignments = new Set<string>();
  companyMap.forEach((assignments) => {
    const primary = assignments.find((a) => a.responsibility === "primary_owner");
    const backup = assignments.find((a) => a.responsibility === "backup_owner");
    if (!primary) {
      if (assignments.length === 0) unassignedCompanies++;
      else companiesWithPrimary === 0 && unassignedCompanies++;
    } else {
      companiesWithPrimary++;
      staffWithAssignments.add(primary.staffId);
    }
    if (!backup && primary) companiesWithoutBackup++;
    assignments.forEach((a) => staffWithAssignments.add(a.staffId));
    const inactiveStaff = assignments.filter((a) => {
      const member = staff.find((s) => s.id === a.staffId);
      return member && member.status !== "active";
    });
    if (inactiveStaff.length > 0) assignmentsNeedingReassignment += inactiveStaff.length;
  });
  return {
    companiesRequiringCoverage: companies.length,
    companiesWithPrimaryOwner: companiesWithPrimary,
    unassignedCompanies,
    companiesWithoutBackup,
    staffWithAssignments: staffWithAssignments.size,
    assignmentsNeedingReassignment,
  };
}

export function computeAccessReviewKpis(staff: StaffMember[], reviews: StaffAccessReview[]): AccessReviewKpis {
  const activeStaff = staff.filter((s) => s.status === "active");
  return {
    reviewsDue: reviews.filter((r) => r.status === "due").length,
    overdueReviews: reviews.filter((r) => r.status === "overdue").length,
    privilegedStaff: activeStaff.filter((s) => s.privilegedAccess).length,
    mfaActionRequired: activeStaff.filter((s) => s.mfaState !== "enrolled").length,
    suspendedWithAssignments: staff.filter((s) => s.status === "suspended" && s.assignments.some((a) => a.status === "active")).length,
    tempAccessExpiring: 0,
  };
}

export function findStaffById(staff: StaffMember[], id: string): StaffMember | undefined {
  return staff.find((s) => s.id === id);
}

export function getActiveAssignments(assignments: StaffAssignment[]): StaffAssignment[] {
  return assignments.filter((a) => a.status === "active");
}

export function getUniqueAssignedCompanyIds(staff: StaffMember[]): Set<string> {
  const ids = new Set<string>();
  staff.forEach((s) => {
    s.assignments.filter((a) => a.status === "active").forEach((a) => ids.add(a.companyId));
  });
  return ids;
}
