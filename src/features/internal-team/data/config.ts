import { ROUTES } from "@/config/routes";
import type { StatusRegistry } from "@/types/common";
import type { TeamMemberStatus } from "@/types/domain/team";
import type { AccessReviewStatus, AssignmentResponsibility, InvitationStatus, MfaState } from "./types";

export const COMPANY_POOL_EXPORT = [
  { id: "cmp_namo-gange-trust", name: "Namo Gange Trust" },
  { id: "cmp_CityInida", name: "CityInida Pvt Ltd" },
  { id: "cmp_meridian-digital", name: "Meridian Digital" },
  { id: "cmp_bharat-organic-foods", name: "Bharat Organic Foods" },
  { id: "cmp_sattva-wellness", name: "Sattva Wellness Group" },
  { id: "cmp_craftline-interiors", name: "Craftline Interiors" },
  { id: "cmp_blue-harbour-logistics", name: "Blue Harbour Logistics" },
  { id: "cmp_auric-jewels", name: "Auric Jewels" },
  { id: "cmp_nordwind-studios", name: "Nordwind Studios" },
  { id: "cmp_peak-and-pine", name: "Peak & Pine Outdoors" },
  { id: "cmp_lumen-health", name: "Lumen Health Systems" },
  { id: "cmp_amberline-cosmetics", name: "Amberline Cosmetics" },
] as const;

export const TEAM_MOCK_MODE = true;
export const MOCK_REFERENCE_TIME = new Date("2026-09-19T12:00:00Z").getTime();
export const SESSION_STORAGE_KEYS = { internalTeamStore: "encodency_internal_team_v1" } as const;

export const TEAM_MEMBER_STATUS_CONFIG = {
  active: { label: "Active", tone: "success", description: "Active platform staff member" },
  invited: { label: "Invited", tone: "info", description: "Invitation pending acceptance" },
  suspended: { label: "Suspended", tone: "danger", description: "Platform access temporarily revoked" },
} as const satisfies StatusRegistry<TeamMemberStatus>;

export const ACCESS_REVIEW_STATUS = {
  not_scheduled: { label: "Not Scheduled", tone: "neutral", description: "No review scheduled" },
  upcoming: { label: "Upcoming", tone: "info", description: "Review scheduled in the future" },
  due: { label: "Due", tone: "warning", description: "Review is due now" },
  overdue: { label: "Overdue", tone: "danger", description: "Review is past due" },
  completed: { label: "Completed", tone: "success", description: "Review completed" },
} as const satisfies StatusRegistry<AccessReviewStatus>;

export const MFA_STATE_CONFIG = {
  enrolled: { label: "Enrolled", tone: "success", description: "MFA configured and active" },
  setup_required: { label: "Setup Required", tone: "warning", description: "MFA enrollment needed" },
  review_required: { label: "Review Required", tone: "info", description: "MFA status needs verification" },
  unknown: { label: "Unknown", tone: "neutral", description: "MFA status not verified" },
} as const satisfies StatusRegistry<MfaState>;

export const INVITATION_STATUS_CONFIG = {
  pending: { label: "Pending", tone: "info", description: "Awaiting acceptance" },
  accepted: { label: "Accepted", tone: "success", description: "Successfully onboarded" },
  expired: { label: "Expired", tone: "warning", description: "Passed validity window" },
  revoked: { label: "Revoked", tone: "neutral", description: "Cancelled by administrator" },
} as const satisfies StatusRegistry<InvitationStatus>;

export const COVERAGE_STATUS = {
  complete: { label: "Complete", tone: "success" },
  missing_primary: { label: "Missing Primary", tone: "warning" },
  missing_backup: { label: "Missing Backup", tone: "info" },
  staff_inactive: { label: "Staff Inactive", tone: "danger" },
  needs_reassignment: { label: "Needs Reassignment", tone: "warning" },
} as const;

export const ASSIGNMENT_RESPONSIBILITIES: Array<{ value: AssignmentResponsibility; label: string; description: string }> = [
  { value: "primary_owner", label: "Primary Account Owner", description: "Main operational responsibility" },
  { value: "backup_owner", label: "Backup Account Owner", description: "Secondary coverage" },
  { value: "support_owner", label: "Support Owner", description: "Handles support escalations" },
  { value: "integration_support", label: "Integration Support", description: "Technical integration assistance" },
  { value: "billing_contact", label: "Billing Contact", description: "Billing and subscription operations" },
];

export interface TeamSubNavTab {
  id: string;
  label: string;
  href: string;
}

export const TEAM_MODULE_NAV: TeamSubNavTab[] = [
  { id: "directory", label: "Overview & Directory", href: ROUTES.superAdmin.team },
  { id: "invitations", label: "Invitations", href: `${ROUTES.superAdmin.team}/invitations` },
  { id: "roles", label: "Roles & Access", href: `${ROUTES.superAdmin.team}/roles` },
  { id: "assignments", label: "Assignments & Coverage", href: `${ROUTES.superAdmin.team}/assignments` },
  { id: "reviews", label: "Access Reviews", href: `${ROUTES.superAdmin.team}/reviews` },
];

export const TEAM_SORT_OPTIONS = [
  { value: "recently_active", label: "Recently Active" },
  { value: "name", label: "Name A-Z" },
  { value: "role", label: "Platform Role" },
  { value: "assigned_companies", label: "Most Assigned" },
  { value: "join_date", label: "Joining Date" },
] as const;

export const DEPARTMENTS = [
  "Platform Engineering", "Trust & Safety", "Support", "Finance",
  "Revenue Operations", "Customer Success", "Operations", "Product",
] as const;

export function getMfaState(mfaEnabled: boolean): MfaState {
  return mfaEnabled ? "enrolled" : "setup_required";
}

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700", "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700", "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700", "bg-cyan-100 text-cyan-700",
];

export function getStaffAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!;
}

type StaffForExport = {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  status: string;
  mfaEnabled: boolean;
  lastActiveAt: string | null;
  assignments: Array<{ status: string }>;
};

export function exportStaffToCsv(staff: StaffForExport[], filename = "internal-team-export.csv") {
  const headers = ["Staff ID", "Name", "Email", "Department", "Role", "Status", "MFA", "Companies", "Last Active"];
  const rows = staff.map((s) => [
    s.id, s.name, s.email, s.department, s.role, s.status,
    s.mfaEnabled ? "Enrolled" : "Not Enrolled",
    String(s.assignments.filter((a) => a.status === "active").length),
    s.lastActiveAt || "Never",
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
