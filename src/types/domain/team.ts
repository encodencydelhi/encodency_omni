import type { StatusRegistry } from "@/types/common";
export const INTERNAL_ROLE = {
  super_admin: {
    label: "Super Admin",
    tone: "brand",
    description: "Unrestricted access to every module",
  },
  technical_admin: {
    label: "Technical Admin",
    tone: "info",
    description: "Platform infrastructure, jobs, integrations and feature flags",
  },
  support: {
    label: "Support",
    tone: "neutral",
    description: "Tickets and company look-ups, read-only elsewhere",
  },
  finance: {
    label: "Finance",
    tone: "neutral",
    description: "Plans, subscriptions, billing and revenue reporting",
  },
  operations: {
    label: "Operations",
    tone: "neutral",
    description: "Company lifecycle, onboarding and usage oversight",
  },
} as const satisfies StatusRegistry<string>;

export type InternalRole = keyof typeof INTERNAL_ROLE;
export const PERMISSIONS = [
  "companies:read",
  "companies:write",
  "users:read",
  "users:write",
  "Clients:read",
  "billing:read",
  "billing:write",
  "plans:write",
  "platform:read",
  "platform:write",
  "flags:write",
  "audit:read",
  "support:write",
  "settings:write",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<InternalRole, readonly Permission[]> = {
  super_admin: PERMISSIONS,
  technical_admin: [
    "companies:read",
    "users:read",
    "Clients:read",
    "platform:read",
    "platform:write",
    "flags:write",
    "audit:read",
  ],
  support: ["companies:read", "users:read", "Clients:read", "support:write", "audit:read"],
  finance: ["companies:read", "billing:read", "billing:write", "plans:write"],
  operations: [
    "companies:read",
    "companies:write",
    "users:read",
    "users:write",
    "Clients:read",
  ],
};

export const TEAM_MEMBER_STATUS = {
  active: { label: "Active", tone: "success" },
  invited: { label: "Invited", tone: "info" },
  suspended: { label: "Suspended", tone: "danger" },
} as const satisfies StatusRegistry<string>;

export type TeamMemberStatus = keyof typeof TEAM_MEMBER_STATUS;

export interface InternalTeamMember {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: InternalRole;
  status: TeamMemberStatus;
  department: string;
  lastActiveAt: string | null;
  mfaEnabled: boolean;
  createdAt: string;
}
