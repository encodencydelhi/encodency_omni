import type { OrganisationRole } from "@/types/domain/user";
import {
  superAdminUsersApi,
  type LiveAttentionItem,
  type LiveFeedItem,
  type LiveInvitationRow,
  type SuperAdminUserDetail,
  type SuperAdminUserMembershipRef,
  type SuperAdminUserSummary,
  type SystemRole,
} from "../live/super-admin-users-api";
import { exportUsersToCsv } from "./config";
import type {
  CompanyMembership,
  GlobalUserStatus,
  UserAccountLifecycleEvent,
  UserActivity,
  UserAggregate,
  UserAttentionItem,
  UserInvitation,
  UserKpis,
  UserListQuery,
  UserListResult,
  UserSecurityEvent,
  UserSession,
} from "./types";
import type { UsersRepository } from "./repository";

/**
 * Real Super Admin Users data. Everything here comes from `/super-admin/*`; where the platform has no such concept
 * (forced 2FA policy, lockout counters, owned workflows) the repository says so honestly instead of inventing values.
 */

const ROLE_TO_SYSTEM: Record<string, SystemRole> = {
  owner: "OWNER",
  admin: "ADMIN",
  marketing_manager: "MANAGER",
  viewer: "VIEWER",
};

export function systemRoleOf(role: OrganisationRole): SystemRole {
  return ROLE_TO_SYSTEM[role] ?? "VIEWER";
}

export function organisationRoleOf(role: SystemRole): OrganisationRole {
  return role === "OWNER" ? "owner" : role === "ADMIN" ? "admin" : role === "MANAGER" ? "marketing_manager" : "viewer";
}

/** Owners and Admins reach every Client of their Company; Managers and Viewers only the Clients they were granted. */
const hasAllClients = (role: SystemRole) => role === "OWNER" || role === "ADMIN";

function membershipFromRef(userId: string, ref: SuperAdminUserMembershipRef, extra?: { createdAt: string; clients: Array<{ id: string; name: string }> }): CompanyMembership {
  const clients = extra?.clients ?? [];
  return {
    id: ref.membershipId,
    userId,
    companyId: ref.companyId,
    companyName: ref.companyName,
    companySlug: ref.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    role: organisationRoleOf(ref.systemRole),
    status: ref.suspended ? "suspended" : "active",
    clientAccess: {
      scope: hasAllClients(ref.systemRole) ? "all" : "selected",
      clientIds: clients.map((c) => c.id),
      clients,
    },
    joinedAt: extra?.createdAt ?? "",
    updatedAt: extra?.createdAt ?? "",
    isOwner: ref.systemRole === "OWNER",
  };
}

function sessionOf(userId: string, s: { id: string; lastSeenAt: string; ipAddress: string | null; device?: unknown; browser?: unknown }): UserSession {
  return {
    id: s.id,
    userId,
    device: typeof s.device === "string" ? s.device : "Unknown",
    browser: typeof s.browser === "string" ? s.browser : "Unknown",
    location: "",
    ip: s.ipAddress ?? "",
    lastActiveAt: s.lastSeenAt,
    status: "active",
    current: false,
  };
}

export interface UserAggregateExtras {
  detail?: SuperAdminUserDetail;
  sessions?: UserSession[];
  activity?: UserActivity[];
}

export function toAggregate(u: SuperAdminUserSummary, extras: UserAggregateExtras = {}): UserAggregate {
  const detail = extras.detail;
  const memberships: CompanyMembership[] = detail
    ? detail.memberships.map((m) =>
        membershipFromRef(
          u.id,
          { membershipId: m.membershipId, companyId: m.company.id, companyName: m.company.name, companyStatus: m.company.status, systemRole: m.systemRole, suspended: m.suspended, clientAccess: m.clientAccess },
          { createdAt: m.createdAt, clients: m.clientAccess },
        ),
      )
    : u.companies.map((c) => membershipFromRef(u.id, c, { createdAt: u.createdAt, clients: c.clientAccess }));

  const deactivated = u.status === "DEACTIVATED";
  const globalStatus: GlobalUserStatus = deactivated ? "suspended" : "active";
  const sessions = extras.sessions ?? [];
  const hasSuspendedMembership = memberships.some((m) => m.status === "suspended");
  const warnings: string[] = [];
  if (!u.mfaEnabled && !deactivated) warnings.push("Two-factor authentication is not enabled for this account.");
  if (hasSuspendedMembership) warnings.push("Access to at least one Company is suspended.");

  return {
    identity: {
      id: u.id,
      name: u.name?.trim() || u.email,
      email: u.email,
      phone: detail?.phone ?? null,
      avatarUrl: u.avatarUrl,
      globalStatus,
      emailVerified: true,
      createdAt: u.createdAt,
      lastLoginAt: u.lastActiveAt,
    },
    memberships,
    security: {
      mfaEnabled: u.mfaEnabled,
      twoFactorRequired: false,
      twoFactorStatus: u.mfaEnabled ? "enabled" : "not_enabled",
      passwordLastChanged: "",
      lastSuccessfulLogin: u.lastActiveAt,
      failedLoginAttempts: 0,
      isLocked: false,
      sessions,
      securityWarnings: warnings,
    },
    ownedResources: [],
    recentActivity: extras.activity ?? [],
    // Owners and Admins reach every Client of their Company, so only explicit grants are counted.
    totalClientsCount: memberships.reduce((acc, m) => acc + (m.clientAccess.scope === "selected" ? m.clientAccess.clientIds.length : 0), 0),
    activeSessionsCount: extras.sessions ? sessions.length : 0,
    hasOwnerAccess: memberships.some((m) => m.isOwner),
    hasAdminAccess: memberships.some((m) => m.isOwner || m.role === "admin"),
    securityPosture: deactivated || hasSuspendedMembership ? "suspended" : !u.mfaEnabled ? "action_required" : "healthy",
  };
}

function activityOf(f: LiveFeedItem): UserActivity {
  const previous = typeof f.details?.previousRole === "string" ? String(f.details.previousRole) : null;
  const next = typeof f.details?.newRole === "string" ? String(f.details.newRole) : typeof f.details?.systemRole === "string" ? String(f.details.systemRole) : null;
  const name = f.actor?.name?.trim() || f.actor?.email || "System";
  return {
    id: f.id,
    timestamp: f.at,
    userId: f.actor?.userId ?? "",
    userName: name,
    userEmail: f.actor?.email ?? "",
    action: f.label,
    companyId: f.companyId ?? "",
    companyName: f.companyName ?? "Platform",
    clientId: f.clientId,
    clientName: f.clientName,
    module: f.module,
    entity: f.resourceLabel,
    result: f.outcome.toLowerCase().startsWith("fail") || f.outcome.toLowerCase() === "denied" ? "failed" : "successful",
    actor: { id: f.actor?.userId ?? "", name },
    summary: f.label,
    previousValue: previous,
    newValue: next,
    relatedAuditId: f.id,
  };
}

const LIFECYCLE_TYPE: Record<string, UserAccountLifecycleEvent["eventType"]> = {
  "user.deactivated": "deactivated",
  "user.reactivated": "reactivated",
  "user.sessions.revoked": "sessions_revoked",
  "user.password_reset.triggered": "password_reset",
  "user.password_reset.completed": "password_reset",
  "user.profile.updated": "profile_updated",
  "team.member.added": "membership_added",
  "team.member.removed": "membership_removed",
  "team.member.suspended": "suspended",
  "team.member.reactivated": "reactivated",
  "team.member.role.updated": "membership_role_changed",
  "team.member.client_access.updated": "membership_access_changed",
  "company.ownership.transferred": "ownership_transferred",
  "invitation.accepted": "created",
};

function lifecycleOf(userId: string | undefined, f: LiveFeedItem): UserAccountLifecycleEvent {
  const name = f.actor?.name?.trim() || f.actor?.email || "System";
  return {
    id: f.id,
    userId: userId ?? (f.resourceType === "USER" ? (f.resourceId ?? "") : (f.actor?.userId ?? "")),
    eventType: LIFECYCLE_TYPE[f.action] ?? "other",
    timestamp: f.at,
    actor: { id: f.actor?.userId ?? "", name },
    companyId: f.companyId ?? undefined,
    companyName: f.companyName ?? undefined,
    details: f.label,
    previousValue: typeof f.details?.previousRole === "string" ? String(f.details.previousRole) : undefined,
    newValue: typeof f.details?.newRole === "string" ? String(f.details.newRole) : typeof f.details?.systemRole === "string" ? String(f.details.systemRole) : undefined,
  };
}

function securityEventOf(f: LiveFeedItem): UserSecurityEvent {
  const subject = f.resourceType === "USER" ? (f.resourceId ?? "") : (f.actor?.userId ?? "");
  const failed = f.outcome.toLowerCase().startsWith("fail");
  return {
    id: f.id,
    userId: subject,
    eventType: f.label,
    timestamp: f.at,
    result: failed ? "failed" : f.action.includes("deactivated") || f.action.includes("suspended") ? "warning" : "success",
    companyId: f.companyId,
    companyName: f.companyName,
    device: null,
    ip: null,
    actor: f.actor?.name?.trim() || f.actor?.email || "System",
    summary: f.label,
    relatedAuditId: f.id,
  };
}

function attentionOf(a: LiveAttentionItem): UserAttentionItem {
  const who = a.userName?.trim() || a.userEmail || "";
  const base = { id: a.id, userId: a.userId ?? "", userName: who || a.companyName || "", userEmail: a.userEmail ?? "", companyId: a.companyId, companyName: a.companyName, severity: a.severity, timestamp: a.at };
  switch (a.kind) {
    case "no_mfa":
      return { ...base, issue: "Two-factor authentication is not enabled.", actionType: "review_security", actionLabel: "Review security" };
    case "no_active_owner":
      return { ...base, issue: `${a.companyName ?? "This Company"} has no active Owner.`, actionType: a.userId ? "transfer_ownership" : "open_user", actionLabel: "Assign an Owner" };
    case "invitation_expired":
      return { ...base, userName: a.userEmail ?? "", issue: `Invitation to ${a.companyName ?? "a Company"} expired without being accepted.`, actionType: "resend_invite", actionLabel: "Resend invitation" };
    default:
      return { ...base, userName: a.userEmail ?? "", issue: `Invitation to ${a.companyName ?? "a Company"} expires within 24 hours.`, actionType: "resend_invite", actionLabel: "Resend invitation" };
  }
}

function invitationOf(r: LiveInvitationRow): UserInvitation {
  return {
    id: r.id,
    email: r.email,
    name: r.email,
    companyId: r.company.id,
    companyName: r.company.name,
    role: organisationRoleOf(r.systemRole),
    clientAccessScope: r.clientCount > 0 ? "selected" : "all",
    clientAccessIds: [],
    clientAccessCount: r.clientCount,
    invitedBy: { id: r.invitedBy.userId, name: r.invitedBy.name?.trim() || r.invitedBy.email, email: r.invitedBy.email },
    sentAt: r.createdAt,
    expiresAt: r.expiresAt,
    status: r.status,
    requires2fa: false,
    note: null,
    acceptedUserId: null,
  };
}

function listParams(query: UserListQuery) {
  const f = query.filters ?? {};
  const lastActive = f.lastActive;
  return {
    page: query.page ?? 1,
    limit: Math.min(query.pageSize ?? 20, 100),
    search: f.search?.trim() || undefined,
    platformRole: "USER" as const,
    companyId: f.companyId,
    systemRole: f.role ? systemRoleOf(f.role) : undefined,
    status: f.status === "suspended" || f.status === "deactivated" ? ("DEACTIVATED" as const) : f.status === "active" ? ("ACTIVE" as const) : undefined,
    mfa: f.twoFactor === "enabled" ? ("enabled" as const) : f.twoFactor === "not_enabled" ? ("disabled" as const) : undefined,
    activeWithinDays: lastActive === "7d" ? 7 : lastActive === "30d" ? 30 : undefined,
    inactiveDays: lastActive === "inactive30d" ? 30 : undefined,
    neverActive: lastActive === "never" ? true : undefined,
    multiCompany: f.multiCompanyOnly,
    ownerOnly: f.ownerOnly,
    adminOnly: f.adminOnly,
    noMembership: f.noActiveMembership,
    accessIssues: f.accessIssues,
    sort: query.sort,
  };
}

async function loadAggregate(userId: string): Promise<UserAggregate> {
  const [detail, sessions, activity] = await Promise.all([
    superAdminUsersApi.get(userId),
    superAdminUsersApi.sessions(userId).catch(() => ({ items: [] })),
    superAdminUsersApi.activity({ userId, limit: 20 }).catch(() => ({ items: [] as LiveFeedItem[] })),
  ]);
  return toAggregate(detail, {
    detail,
    sessions: sessions.items.map((s) => sessionOf(userId, s)),
    activity: activity.items.map(activityOf),
  });
}

/** Every Company user, for the dialogs that need to reason about other people (last Owner, who can receive ownership...). */
export async function fetchUsersDirectory(): Promise<UserAggregate[]> {
  const out: UserAggregate[] = [];
  for (let page = 1; page <= 20; page += 1) {
    const res = await superAdminUsersApi.list({ platformRole: "USER", page, limit: 100 });
    out.push(...res.items.map((u) => toAggregate(u)));
    if (out.length >= res.total || res.items.length === 0) break;
  }
  return out;
}

async function membershipOf(userId: string, companyId: string): Promise<CompanyMembership> {
  const aggregate = await loadAggregate(userId);
  const found = aggregate.memberships.find((m) => m.companyId === companyId);
  if (!found) throw new Error("This person is no longer a member of that Company.");
  return found;
}

async function userIdAfter(result: unknown, fallbackUserId?: string): Promise<string> {
  const id = (result as { userId?: string } | null)?.userId ?? fallbackUserId;
  if (!id) throw new Error("The change was saved, but the account could not be reloaded.");
  return id;
}

export const liveUsersProvider: UsersRepository = {
  async listUsers(query: UserListQuery = {}): Promise<UserListResult> {
    const [res, kpis] = await Promise.all([superAdminUsersApi.list(listParams(query)), this.getKpis()]);
    return {
      items: res.items.map((u) => toAggregate(u)),
      total: res.total,
      page: res.page,
      pageSize: res.limit,
      pageCount: Math.max(1, Math.ceil(res.total / res.limit)),
      kpis,
    };
  },

  getUser: loadAggregate,

  async getKpis(): Promise<UserKpis> {
    const k = await superAdminUsersApi.kpis();
    return {
      totalUsers: k.totalUsers,
      activeUsers: k.activeUsers,
      pendingInvites: k.pendingInvitations,
      suspendedUsers: k.deactivatedUsers,
      twoFactorEnabled: k.mfaEnabled,
      twoFactorTotal: k.activeUsers,
      inactive30PlusDays: k.inactive30PlusDays,
      multiCompanyUsers: k.multiCompanyUsers,
      needsAttentionCount: k.needsAttention,
    };
  },

  async listInvitations(query) {
    const status = query?.status && query.status !== "all" ? query.status : undefined;
    const res = await superAdminUsersApi.listInvitations({ status, search: query?.search?.trim() || undefined, limit: 100 });
    return res.items.map(invitationOf);
  },

  async createInvitation(input) {
    await superAdminUsersApi.invite(input.companyId, {
      email: input.email.trim(),
      systemRole: systemRoleOf(input.role),
      clientRestrictions: input.clientAccessScope === "selected" ? input.clientAccessIds : undefined,
    });
    const res = await superAdminUsersApi.listInvitations({ companyId: input.companyId, search: input.email.trim(), limit: 5 });
    const row = res.items.find((i) => i.email.toLowerCase() === input.email.trim().toLowerCase());
    if (row) return invitationOf(row);
    return { ...input, id: "", name: input.email, companyName: "", invitedBy: { id: "", name: "", email: "" }, sentAt: new Date().toISOString(), expiresAt: "", status: "pending", requires2fa: false, note: null, acceptedUserId: null };
  },

  async resendInvitation(id) {
    await superAdminUsersApi.resendInvitation(id);
    const res = await superAdminUsersApi.listInvitations({ limit: 100 });
    const row = res.items.find((i) => i.id === id);
    if (!row) throw new Error("Invitation not found.");
    return invitationOf(row);
  },

  async revokeInvitation(id) {
    const before = await superAdminUsersApi.listInvitations({ limit: 100 });
    const row = before.items.find((i) => i.id === id);
    await superAdminUsersApi.revokeInvitation(id);
    if (!row) throw new Error("Invitation not found.");
    return { ...invitationOf(row), status: "revoked" };
  },

  async addCompanyMembership(input) {
    const res = await superAdminUsersApi.addMembership(input.userId, {
      companyId: input.companyId,
      systemRole: systemRoleOf(input.role),
      clientIds: input.clientAccessScope === "selected" ? input.clientAccessIds : undefined,
    });
    return loadAggregate(await userIdAfter(res, input.userId));
  },

  async changeMembershipRole(input) {
    const res = await superAdminUsersApi.changeRole(input.membershipId, systemRoleOf(input.newRole));
    return loadAggregate(await userIdAfter(res));
  },

  async updateClientAccess(input) {
    const res = await superAdminUsersApi.setClientAccess(input.membershipId, input.clientAccessIds);
    return loadAggregate(await userIdAfter(res));
  },

  async suspendMembership(membershipId, reason) {
    const res = await superAdminUsersApi.suspendMembership(membershipId, reason);
    return loadAggregate(await userIdAfter(res));
  },

  async reactivateMembership(membershipId) {
    const res = await superAdminUsersApi.reactivateMembership(membershipId);
    return loadAggregate(await userIdAfter(res));
  },

  async removeMembership(input) {
    const res = await superAdminUsersApi.removeMembership(input.membershipId);
    return loadAggregate(await userIdAfter(res));
  },

  async transferCompanyOwnership(input) {
    const [from, to] = await Promise.all([membershipOf(input.currentOwnerUserId, input.companyId), membershipOf(input.newOwnerUserId, input.companyId)]);
    await superAdminUsersApi.transferOwnership(input.companyId, { fromMembershipId: from.id, toMembershipId: to.id, reason: input.reason });
  },

  async suspendGlobalAccount(userId) {
    await superAdminUsersApi.setStatus(userId, "DEACTIVATED");
    return loadAggregate(userId);
  },

  async reactivateGlobalAccount(userId) {
    await superAdminUsersApi.setStatus(userId, "ACTIVE");
    return loadAggregate(userId);
  },

  async require2FA() {
    throw new Error("Enforcing two-factor authentication per account is not supported yet.");
  },

  async requirePasswordReset(userId) {
    await superAdminUsersApi.passwordReset(userId);
  },

  async revokeSession(userId, sessionId) {
    await superAdminUsersApi.revokeSession(userId, sessionId);
    return loadAggregate(userId);
  },

  async revokeAllSessions(userId) {
    await superAdminUsersApi.revokeSessions(userId);
    return loadAggregate(userId);
  },

  async unlockAccount() {
    throw new Error("Accounts are not locked by failed sign-ins on this platform.");
  },

  async updateUserIdentity(input) {
    await superAdminUsersApi.updateProfile(input.userId, { name: input.name.trim(), phone: input.phone?.trim() ? input.phone.trim() : null });
    return loadAggregate(input.userId);
  },

  async listSecurityUsers(query) {
    const res = await superAdminUsersApi.list({
      platformRole: "USER",
      limit: 100,
      search: query?.search?.trim() || undefined,
      companyId: query?.companyId && query.companyId !== "all" ? query.companyId : undefined,
      status: query?.status === "suspended" || query?.status === "deactivated" ? "DEACTIVATED" : query?.status === "active" ? "ACTIVE" : undefined,
      mfa: query?.twoFactor === "enabled" ? "enabled" : query?.twoFactor === "not_enabled" ? "disabled" : undefined,
    });
    return res.items.map((u) => toAggregate(u));
  },

  async listSecurityEvents() {
    const res = await superAdminUsersApi.securityEvents();
    return res.items.map(securityEventOf);
  },

  async listAttentionItems() {
    const res = await superAdminUsersApi.attention();
    return res.items.map(attentionOf);
  },

  async listActivities(query) {
    const res = await superAdminUsersApi.activity({ userId: query?.userId, companyId: query?.companyId && query.companyId !== "all" ? query.companyId : undefined, search: query?.search?.trim() || undefined, limit: 100 });
    return res.items.map(activityOf);
  },

  async listLifecycleEvents(userId) {
    const res = await superAdminUsersApi.lifecycle(userId);
    return res.items.map((f) => lifecycleOf(userId, f));
  },

  async bulkAction(action, userIds, params) {
    if (action === "export") {
      const users = await Promise.all(userIds.map((id) => loadAggregate(id)));
      exportUsersToCsv(users);
      return { affectedCount: users.length, message: `Exported ${users.length} user${users.length === 1 ? "" : "s"}.` };
    }
    if (action === "suspend") {
      const results = await Promise.allSettled(userIds.map((id) => superAdminUsersApi.setStatus(id, "DEACTIVATED")));
      const done = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - done;
      if (done === 0) {
        const first = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
        throw first?.reason instanceof Error ? first.reason : new Error("No account could be suspended.");
      }
      return { affectedCount: done, message: failed ? `Suspended ${done}; ${failed} could not be suspended (for example the last active Owner of a Company).` : `Suspended ${done} account${done === 1 ? "" : "s"}.` };
    }
    if (action === "notify") {
      const res = await superAdminUsersApi.notify({ userIds, title: params?.title?.trim() || "Message from the platform team", message: params?.message?.trim() || params?.reason?.trim() || "" });
      return { affectedCount: res.delivered, message: `Notified ${res.delivered} user${res.delivered === 1 ? "" : "s"}${res.skipped ? `; ${res.skipped} skipped (deactivated)` : ""}.` };
    }
    throw new Error("Enforcing two-factor authentication per account is not supported yet.");
  },
};
