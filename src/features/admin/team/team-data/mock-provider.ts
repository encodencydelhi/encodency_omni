import { ISODate, Invitation, Member, MemberActivity, TeamGroup } from "./types";



const NOW = new Date();

function iso(date: Date): ISODate {
  return date.toISOString();
}

function subDays(date: Date, days: number): Date {
  return new Date(date.getTime() - days * 24 * 60 * 60 * 1000);
}

function subHours(date: Date, hours: number): Date {
  return new Date(date.getTime() - hours * 60 * 60 * 1000);
}

export const MOCK_GROUPS: TeamGroup[] = [
  {
    id: "grp-1",
    name: "Marketing",
    description: "Core marketing team spanning social, email, and campaigns.",
    leadId: "mem-1",
    leadName: "Manish Sirohi",
    memberCount: 8,
    clientCount: 4,
    activeTasks: 24,
    updatedAt: iso(subDays(NOW, 2)),
  },
  {
    id: "grp-2",
    name: "Social Media",
    description: "Handles daily publishing and community management across platforms.",
    leadId: "mem-2",
    leadName: "Priya Sharma",
    memberCount: 5,
    clientCount: 4,
    activeTasks: 12,
    updatedAt: iso(subDays(NOW, 1)),
  },
  {
    id: "grp-3",
    name: "SEO Team",
    description: "Technical and content SEO optimization.",
    leadId: "mem-3",
    leadName: "Amit Singh",
    memberCount: 3,
    clientCount: 2,
    activeTasks: 18,
    updatedAt: iso(subDays(NOW, 5)),
  }
];

export const MOCK_MEMBERS: Member[] = [
  {
    id: "mem-1",
    name: "Manish Sirohi",
    email: "manishsirohi@encodency.com",
    jobTitle: "Head of Marketing",
    avatarUrl: null,
    roleId: "org-admin",
    roleName: "Organization Admin",
    status: "active",
    joinedAt: iso(subDays(NOW, 365)),
    lastActiveAt: iso(subHours(NOW, 1)),
    groups: [{ id: "grp-1", name: "Marketing" }],
    clientAccess: [
      { clientId: "c-1", clientName: "Moksha Sewa", accessLevel: "full", grantedAt: iso(subDays(NOW, 300)) },
      { clientId: "c-2", clientName: "CityInida", accessLevel: "full", grantedAt: iso(subDays(NOW, 300)) },
    ],
    workload: { status: "normal", openTasks: 5, overdueTasks: 0, pendingApprovals: 3, campaigns: 2, workflows: 1 },
    ownedResources: [{ type: "campaign", count: 2 }, { type: "workflow", count: 1 }],
    security: { has2FA: true, lastLogin: iso(subHours(NOW, 2)), passwordLastChanged: iso(subDays(NOW, 60)), activeSessions: 2, inviteAcceptedAt: iso(subDays(NOW, 365)) },
    isOrgAdmin: true,
  },
  {
    id: "mem-2",
    name: "Priya Sharma",
    email: "priya@encodency.com",
    jobTitle: "Social Media Manager",
    avatarUrl: null,
    roleId: "social-manager",
    roleName: "Social Media Manager",
    status: "active",
    joinedAt: iso(subDays(NOW, 200)),
    lastActiveAt: iso(subHours(NOW, 4)),
    groups: [{ id: "grp-1", name: "Marketing" }, { id: "grp-2", name: "Social Media" }],
    clientAccess: [
      { clientId: "c-1", clientName: "Moksha Sewa", accessLevel: "module_restricted", modules: ["x", "meta", "instagram"], grantedAt: iso(subDays(NOW, 200)) },
    ],
    workload: { status: "busy", openTasks: 12, overdueTasks: 2, pendingApprovals: 0, campaigns: 4, workflows: 0 },
    ownedResources: [{ type: "scheduled_post", count: 18 }, { type: "task", count: 12 }],
    security: { has2FA: true, lastLogin: iso(subHours(NOW, 4)), passwordLastChanged: iso(subDays(NOW, 180)), activeSessions: 1, inviteAcceptedAt: iso(subDays(NOW, 200)) },
  },
  {
    id: "mem-3",
    name: "Amit Singh",
    email: "amit@encodency.com",
    jobTitle: "SEO Specialist",
    avatarUrl: null,
    roleId: "seo-manager",
    roleName: "SEO Manager",
    status: "active",
    joinedAt: iso(subDays(NOW, 150)),
    lastActiveAt: iso(subDays(NOW, 1)),
    groups: [{ id: "grp-3", name: "SEO Team" }],
    clientAccess: [
      { clientId: "c-1", clientName: "Moksha Sewa", accessLevel: "full", grantedAt: iso(subDays(NOW, 150)) },
      { clientId: "c-2", clientName: "CityInida", accessLevel: "full", grantedAt: iso(subDays(NOW, 150)) },
    ],
    workload: { status: "overloaded", openTasks: 28, overdueTasks: 5, pendingApprovals: 0, campaigns: 0, workflows: 0 },
    ownedResources: [{ type: "task", count: 28 }],
    security: { has2FA: false, lastLogin: iso(subDays(NOW, 1)), passwordLastChanged: iso(subDays(NOW, 150)), activeSessions: 1, inviteAcceptedAt: iso(subDays(NOW, 150)) },
  },
  {
    id: "mem-4",
    name: "Neha Gupta",
    email: "neha@encodency.com",
    jobTitle: "Content Writer",
    avatarUrl: null,
    roleId: "contributor",
    roleName: "Contributor",
    status: "invited",
    joinedAt: iso(subDays(NOW, 2)),
    lastActiveAt: null,
    groups: [{ id: "grp-1", name: "Marketing" }],
    clientAccess: [
      { clientId: "c-1", clientName: "Moksha Sewa", accessLevel: "full", grantedAt: iso(subDays(NOW, 2)) },
    ],
    workload: { status: "available", openTasks: 0, overdueTasks: 0, pendingApprovals: 0, campaigns: 0, workflows: 0 },
    ownedResources: [],
    security: { has2FA: false, lastLogin: null, passwordLastChanged: null, activeSessions: 0, inviteAcceptedAt: null },
  },
  {
    id: "mem-5",
    name: "Rahul Verma",
    email: "rahul@encodency.com",
    jobTitle: "Designer",
    avatarUrl: null,
    roleId: "contributor",
    roleName: "Contributor",
    status: "suspended",
    joinedAt: iso(subDays(NOW, 400)),
    lastActiveAt: iso(subDays(NOW, 30)),
    groups: [],
    clientAccess: [],
    workload: { status: "available", openTasks: 0, overdueTasks: 0, pendingApprovals: 0, campaigns: 0, workflows: 0 },
    ownedResources: [{ type: "task", count: 3 }],
    security: { has2FA: true, lastLogin: iso(subDays(NOW, 30)), passwordLastChanged: iso(subDays(NOW, 100)), activeSessions: 0, inviteAcceptedAt: iso(subDays(NOW, 400)) },
  }
];

export const MOCK_INVITATIONS: Invitation[] = [
  {
    id: "inv-1",
    email: "neha@encodency.com",
    name: "Neha Gupta",
    jobTitle: "Content Writer",
    roleId: "contributor",
    roleName: "Contributor",
    clients: [{ id: "c-1", name: "Moksha Sewa" }],
    accessLevel: "full",
    groups: [{ id: "grp-1", name: "Marketing" }],
    invitedBy: { id: "mem-1", name: "Manish Sirohi" },
    sentAt: iso(subDays(NOW, 2)),
    expiresAt: iso(new Date(NOW.getTime() + 5 * 24 * 60 * 60 * 1000)),
    status: "pending",
  },
  {
    id: "inv-2",
    email: "sanjay@encodency.com",
    name: "Sanjay Kumar",
    roleId: "analyst",
    roleName: "Analyst",
    clients: [{ id: "c-1", name: "Moksha Sewa" }, { id: "c-2", name: "CityInida" }],
    accessLevel: "read_only",
    groups: [],
    invitedBy: { id: "mem-1", name: "Manish Sirohi" },
    sentAt: iso(subDays(NOW, 15)),
    expiresAt: iso(subDays(NOW, 1)),
    status: "expired",
  }
];

export const MOCK_ACTIVITY: MemberActivity[] = [
  { id: "act-1", memberId: "mem-2", memberName: "Priya Sharma", action: "Published Post", entityName: "Summer Sale Announcement", module: "X", clientId: "c-1", clientName: "Moksha Sewa", timestamp: iso(subHours(NOW, 1)) },
  { id: "act-2", memberId: "mem-1", memberName: "Manish Sirohi", action: "Approved Campaign", entityName: "Diwali Special", module: "Campaigns", clientId: "c-1", clientName: "Moksha Sewa", timestamp: iso(subHours(NOW, 2)) },
  { id: "act-3", memberId: "mem-3", memberName: "Amit Singh", action: "Resolved SEO Issue", entityName: "Missing Meta Descriptions", module: "SEO", clientId: "c-2", clientName: "CityInida", timestamp: iso(subHours(NOW, 5)) },
  { id: "act-4", memberId: "mem-1", memberName: "Manish Sirohi", action: "Invited Member", entityName: "neha@encodency.com", module: "Team", timestamp: iso(subDays(NOW, 2)) },
  { id: "act-5", memberId: "mem-2", memberName: "Priya Sharma", action: "Scheduled Post", entityName: "Weekly Tips", module: "LinkedIn", clientId: "c-1", clientName: "Moksha Sewa", timestamp: iso(subDays(NOW, 2)) },
];
