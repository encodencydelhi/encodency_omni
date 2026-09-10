import type { EntityRef, StatusRegistry } from "@/types/common";

export const USER_STATUS = {
  active: { label: "Active", tone: "success" },
  invited: { label: "Invited", tone: "info", description: "Invitation sent, not yet accepted" },
  suspended: { label: "Suspended", tone: "danger" },
  inactive: { label: "Inactive", tone: "neutral", description: "No sign-in for over 90 days" },
} as const satisfies StatusRegistry<string>;

export type UserStatus = keyof typeof USER_STATUS;

/** Roles held by users inside a customer organisation, not by EnCodency staff. */
export const ORGANISATION_ROLE = {
  owner: { label: "Organization Owner", tone: "brand" },
  admin: { label: "Organization Admin", tone: "info" },
  project_admin: { label: "Project Admin", tone: "info" },
  marketing_manager: { label: "Marketing Manager", tone: "neutral" },
  seo_manager: { label: "SEO Manager", tone: "neutral" },
  social_manager: { label: "Social Media Manager", tone: "neutral" },
  ads_manager: { label: "Ads Manager", tone: "neutral" },
  sales_agent: { label: "Sales Agent", tone: "neutral" },
  analyst: { label: "Analyst", tone: "neutral" },
  viewer: { label: "Viewer", tone: "neutral" },
} as const satisfies StatusRegistry<string>;

export type OrganisationRole = keyof typeof ORGANISATION_ROLE;

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  company: EntityRef;
  role: OrganisationRole;
  status: UserStatus;
  projectCount: number;
  lastLoginAt: string | null;
  createdAt: string;
  mfaEnabled: boolean;
}

export interface UserFilters {
  status: UserStatus;
  role: OrganisationRole;
  companyId: string;
}

export type UserSortField =
  | "name"
  | "company"
  | "role"
  | "status"
  | "lastLoginAt"
  | "createdAt";
