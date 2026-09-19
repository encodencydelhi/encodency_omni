import { ROUTES } from "@/config/routes";
import type { StatusRegistry } from "@/types/common";
import { ORGANISATION_ROLE, type OrganisationRole } from "@/types/domain/user";
import type {
  GlobalUserStatus,
  InvitationStatus,
  MembershipStatus,
  SecurityPosture,
  TwoFactorStatus,
  UserAggregate,
} from "./types";

export const USERS_MOCK_MODE = true;

/** Shared reference time for mock data. Ensures consistency across selectors, store, and provider. */
export const MOCK_REFERENCE_TIME = new Date("2026-09-19T12:00:00Z").getTime();

export const SESSION_STORAGE_KEYS = {
  usersStore: "encodency_users_workspace_v2",
} as const;

export const GLOBAL_USER_STATUS = {
  active: { label: "Active", tone: "success", description: "Account is in good standing" },
  invited: { label: "Invited", tone: "info", description: "Invitation pending completion" },
  suspended: { label: "Suspended", tone: "danger", description: "Platform access revoked" },
  deactivated: { label: "Deactivated", tone: "neutral", description: "Account archived" },
} as const satisfies StatusRegistry<GlobalUserStatus>;

export const MEMBERSHIP_STATUS = {
  active: { label: "Active", tone: "success", description: "Member has active company access" },
  invited: { label: "Invited", tone: "info", description: "Pending onboarding" },
  suspended: { label: "Suspended", tone: "danger", description: "Company access temporarily disabled" },
} as const satisfies StatusRegistry<MembershipStatus>;

export const INVITATION_STATUS = {
  pending: { label: "Pending", tone: "info", description: "Awaiting recipient acceptance" },
  accepted: { label: "Accepted", tone: "success", description: "Successfully accepted and onboarded" },
  expired: { label: "Expired", tone: "warning", description: "Invitation passed validity window" },
  revoked: { label: "Revoked", tone: "neutral", description: "Cancelled by administrator" },
} as const satisfies StatusRegistry<InvitationStatus>;

export const TWO_FACTOR_STATUS = {
  enabled: { label: "2FA Enabled", tone: "success", description: "Multi-factor authentication configured and active" },
  not_enabled: { label: "Not Enabled", tone: "neutral", description: "Standard password only" },
  setup_pending: { label: "Setup Pending", tone: "info", description: "Enrollment initiated" },
  required_not_configured: {
    label: "Required · Not Configured",
    tone: "warning",
    description: "2FA is required by the user's organization policy, but enrollment has not been completed.",
  },
} as const satisfies StatusRegistry<TwoFactorStatus>;

export const SECURITY_POSTURE = {
  healthy: { label: "Healthy", tone: "success", description: "No critical security flags" },
  action_required: { label: "Action Required", tone: "warning", description: "Policy requirement or weak security" },
  locked: { label: "Locked", tone: "danger", description: "Locked due to repeated failed logins" },
  suspended: { label: "Suspended", tone: "danger", description: "Account administrative hold" },
  security_review: { label: "Security Review", tone: "warning", description: "Abnormal session or IP behavior" },
} as const satisfies StatusRegistry<SecurityPosture>;

export interface UsersSubNavTab {
  id: string;
  label: string;
  href: string;
  countKey?: "totalUsers" | "pendingInvites" | "securityAlerts" | "activityToday";
}

export const USERS_MODULE_NAV: UsersSubNavTab[] = [
  { id: "all", label: "All Users", href: ROUTES.superAdmin.users },
  { id: "invitations", label: "Invitations", href: ROUTES.superAdmin.userInvitations },
  { id: "security", label: "Access & Security", href: ROUTES.superAdmin.userSecurity },
  { id: "activity", label: "Activity", href: ROUTES.superAdmin.userActivity },
];

export const USER_DETAIL_TABS = [
  { id: "overview", label: "Overview" },
  { id: "company-access", label: "Company Access" },
  { id: "security", label: "Security" },
  { id: "activity", label: "Activity" },
] as const;

export type UserDetailTabId = (typeof USER_DETAIL_TABS)[number]["id"];

export const USER_SORT_OPTIONS = [
  { value: "recentlyActive", label: "Recently Active" },
  { value: "newest", label: "Newest Joined" },
  { value: "oldest", label: "Oldest Joined" },
  { value: "nameAsc", label: "Name A–Z" },
  { value: "mostCompanies", label: "Most Companies" },
] as const;

/** Permitted company roles that a platform admin can assign to a company member. */
export const ALLOWED_COMPANY_ROLES = (Object.keys(ORGANISATION_ROLE) as OrganisationRole[]).map((role) => ({
  value: role,
  label: ORGANISATION_ROLE[role].label,
  tone: ORGANISATION_ROLE[role].tone,
}));

/**
 * Generates and triggers download of a clean CSV export.
 * Excludes sensitive credentials, hashes, or platform tokens.
 */
export function exportUsersToCsv(users: UserAggregate[], filename = "omniplatform-users.csv") {
  const headers = [
    "User ID",
    "Full Name",
    "Email",
    "Global Status",
    "Companies Count",
    "Companies List",
    "Assigned Clients Count",
    "2FA Status",
    "Email Verified",
    "Last Login At",
    "Joined Date",
  ];

  const rows = users.map((u) => [
    `"${u.identity.id}"`,
    `"${u.identity.name.replace(/"/g, '""')}"`,
    `"${u.identity.email}"`,
    `"${GLOBAL_USER_STATUS[u.identity.globalStatus].label}"`,
    `"${u.memberships.length}"`,
    `"${u.memberships.map((m) => `${m.companyName} (${ORGANISATION_ROLE[m.role]?.label || m.role})`).join("; ")}"`,
    `"${u.totalClientsCount}"`,
    `"${TWO_FACTOR_STATUS[u.security.twoFactorStatus].label}"`,
    `"${u.identity.emailVerified ? "Yes" : "No"}"`,
    `"${u.identity.lastLoginAt || "Never"}"`,
    `"${u.identity.createdAt}"`,
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Generates and triggers download of a JSON export. */
export function exportUsersToJson(users: UserAggregate[], filename = "omniplatform-users.json") {
  const sanitized = users.map((u) => ({
    id: u.identity.id,
    name: u.identity.name,
    email: u.identity.email,
    phone: u.identity.phone,
    status: u.identity.globalStatus,
    emailVerified: u.identity.emailVerified,
    joinedAt: u.identity.createdAt,
    lastLoginAt: u.identity.lastLoginAt,
    memberships: u.memberships.map((m) => ({
      companyId: m.companyId,
      companyName: m.companyName,
      role: m.role,
      status: m.status,
      clientAccessScope: m.clientAccess.scope,
      clientCount: m.clientAccess.clients.length,
      isOwner: m.isOwner,
    })),
    security: {
      twoFactorStatus: u.security.twoFactorStatus,
      twoFactorRequired: u.security.twoFactorRequired,
      mfaEnabled: u.security.mfaEnabled,
      isLocked: u.security.isLocked,
      activeSessions: u.activeSessionsCount,
    },
  }));

  const jsonContent = JSON.stringify(sanitized, null, 2);
  const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const PLATFORM_COMPANY_OPTIONS = [
  { id: "cmp_namo-gange-trust", name: "Namo Gange Trust" },
  { id: "cmp_citycalls", name: "CityCalls Pvt Ltd" },
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
];
