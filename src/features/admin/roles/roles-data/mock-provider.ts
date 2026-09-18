import { MODULES, PERMISSION_LABELS } from "./config";
import type { AccessLevel, AdminRole, RoleMember } from "./types";

const members: RoleMember[] = [
  { id: "mem-1", name: "Manish Sirohi", email: "manishsirohi@encodency.com", clients: ["Moksha Sewa", "CityCalls"], status: "active", lastActiveAt: "2026-09-18T08:15:00.000Z" },
  { id: "mem-2", name: "Priya Sharma", email: "priya@namogange.org", clients: ["Moksha Sewa"], status: "active", lastActiveAt: "2026-09-17T13:20:00.000Z" },
  { id: "mem-3", name: "Amit Singh", email: "amit@namogange.org", clients: ["Moksha Sewa"], status: "active", lastActiveAt: "2026-09-16T11:10:00.000Z" },
  { id: "mem-4", name: "Neha Verma", email: "neha@namogange.org", clients: ["Moksha Sewa", "EnCodency"], status: "invited", lastActiveAt: null },
  { id: "mem-5", name: "Rahul Mehta", email: "rahul@encodency.com", clients: ["EnCodency"], status: "active", lastActiveAt: "2026-09-15T15:45:00.000Z" },
  { id: "mem-6", name: "Sarita Chauhan", email: "sarita@namogange.org", clients: ["Moksha Sewa"], status: "active", lastActiveAt: "2026-09-18T06:30:00.000Z" },
  { id: "mem-7", name: "Aditya Rao", email: "aditya@encodency.com", clients: ["CityCalls"], status: "active", lastActiveAt: "2026-09-14T10:00:00.000Z" },
  { id: "mem-8", name: "Kavya Nair", email: "kavya@encodency.com", clients: ["Moksha Sewa"], status: "active", lastActiveAt: "2026-09-13T12:40:00.000Z" },
  { id: "mem-9", name: "Rina Devi", email: "rina@namogange.org", clients: ["Moksha Sewa", "CityCalls", "EnCodency"], status: "active", lastActiveAt: "2026-09-12T08:00:00.000Z" },
  { id: "mem-10", name: "Arjun Kapoor", email: "arjun@encodency.com", clients: ["CityCalls"], status: "suspended", lastActiveAt: "2026-09-03T08:00:00.000Z" },
];

function moduleAccess(levels: Partial<Record<(typeof MODULES)[number], AccessLevel>>) {
  return MODULES.map((module) => {
    const level = levels[module] ?? "none";
    const all = PERMISSION_LABELS[module] ?? [];
    const count = level === "full" ? all.length : level === "manage" ? Math.max(1, all.length - 1) : level === "view" ? 1 : 0;
    return { module, level, allowedPermissions: all.slice(0, count) };
  });
}

function permissions(access: ReturnType<typeof moduleAccess>) {
  return access.flatMap((item) => (PERMISSION_LABELS[item.module] ?? []).map((label) => ({
    key: `${item.module.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    label,
    module: item.module,
    allowed: item.allowedPermissions.includes(label),
  })));
}

function role(input: Omit<AdminRole, "id" | "assignedMemberCount" | "permissions" | "moduleAccess" | "lastUpdated" | "members"> & { memberIds: string[]; levels: Partial<Record<(typeof MODULES)[number], AccessLevel>> }): AdminRole {
  const access = moduleAccess(input.levels);
  const roleMembers = members.filter((member) => input.memberIds.includes(member.id));
  return {
    id: input.slug,
    slug: input.slug,
    name: input.name,
    description: input.description,
    type: input.type,
    scope: input.scope,
    isProtected: input.isProtected,
    managedBy: input.managedBy,
    members: roleMembers,
    assignedMemberCount: roleMembers.length,
    moduleAccess: access,
    permissions: permissions(access),
    lastUpdated: "2026-09-12T10:00:00.000Z",
  };
}

export function getMockRoles(): AdminRole[] {
  const fullLevels = Object.fromEntries(MODULES.map((m) => [m, "full" as AccessLevel]));
  const adminLevels = Object.fromEntries(MODULES.map((m) => [m, (m === "Billing" ? "view" : "full") as AccessLevel]));
  return [
    role({ slug: "organization-owner", name: "Organization Owner", type: "organization", scope: "organization_wide", isProtected: true, managedBy: "Platform", memberIds: ["mem-1"], description: "Highest organization-level access with full visibility and ownership controls.", levels: fullLevels }),
    role({ slug: "organization-admin", name: "Organization Admin", type: "organization", scope: "organization_wide", isProtected: true, managedBy: "Platform", memberIds: ["mem-2"], description: "Broad organization administration access managed at platform level.", levels: adminLevels }),
    role({ slug: "project-admin", name: "Project Admin", type: "functional", scope: "client_scoped", isProtected: false, managedBy: "Platform", memberIds: [], description: "Coordinate client work, approvals, assignments and operational delivery.", levels: { CRM: "manage", Campaigns: "manage", Content: "manage", Automation: "manage", Analytics: "view", Reports: "manage", Team: "view" } }),
    role({ slug: "marketing-manager", name: "Marketing Manager", type: "functional", scope: "client_scoped", isProtected: false, managedBy: "Platform", memberIds: ["mem-3", "mem-6", "mem-8", "mem-9"], description: "Manage campaigns, publishing, analytics and client marketing operations.", levels: { Campaigns: "full", Content: "full", "Meta & Instagram": "manage", LinkedIn: "manage", "Google Business": "manage", Analytics: "manage", Reports: "manage" } }),
    role({ slug: "social-media-manager", name: "Social Media Manager", type: "functional", scope: "client_scoped", isProtected: false, managedBy: "Platform", memberIds: ["mem-4"], description: "Create, schedule, publish and review social content across connected channels.", levels: { Content: "manage", "Meta & Instagram": "full", LinkedIn: "manage", "Google Business": "manage", WhatsApp: "view", YouTube: "manage", X: "manage", Analytics: "view" } }),
    role({ slug: "seo-manager", name: "SEO Manager", type: "functional", scope: "client_scoped", isProtected: false, managedBy: "Platform", memberIds: ["mem-5"], description: "Run SEO audits, manage issues and improve website search visibility.", levels: { Website: "manage", SEO: "full", Analytics: "manage", Reports: "manage", Content: "view" } }),
    role({ slug: "ads-manager", name: "Ads Manager", type: "functional", scope: "client_scoped", isProtected: false, managedBy: "Platform", memberIds: [], description: "Manage advertising workflows, campaign budgets and performance reporting.", levels: { Campaigns: "manage", "Meta & Instagram": "full", Analytics: "manage", Reports: "manage", Automation: "view" } }),
    role({ slug: "sales-agent", name: "Sales Agent", type: "functional", scope: "client_scoped", isProtected: false, managedBy: "Platform", memberIds: ["mem-7"], description: "Work CRM leads, contacts, pipeline movement and sales follow-up tasks.", levels: { CRM: "manage", Reports: "view", Analytics: "view", WhatsApp: "manage" } }),
    role({ slug: "content-writer", name: "Content Writer", type: "functional", scope: "client_scoped", isProtected: false, managedBy: "Platform", memberIds: [], description: "Draft content and collaborate on publishing workflows without admin controls.", levels: { Content: "manage", Website: "view", SEO: "view", "Meta & Instagram": "view", LinkedIn: "view" } }),
    role({ slug: "analyst", name: "Analyst", type: "functional", scope: "client_scoped", isProtected: false, managedBy: "Platform", memberIds: [], description: "Review analytics, reports and performance data across assigned clients.", levels: { Analytics: "full", Reports: "full", Campaigns: "view", SEO: "view", CRM: "view" } }),
    role({ slug: "viewer", name: "Viewer", type: "viewer", scope: "read_only", isProtected: false, managedBy: "Platform", memberIds: ["mem-10"], description: "Read-only visibility for assigned clients and selected reporting surfaces.", levels: { CRM: "view", Campaigns: "view", Content: "view", Analytics: "view", Reports: "view", Website: "view", SEO: "view" } }),
  ];
}
