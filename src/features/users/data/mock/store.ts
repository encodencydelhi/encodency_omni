import { SESSION_STORAGE_KEYS } from "../config";
import type {
  SecurityPosture,
  TwoFactorStatus,
  UserAggregate,
  UserAttentionItem,
  UserInvitation,
  UserKpis,
  UserSecurityEvent,
  UserActivity,
} from "../types";
import { buildInitialUsersDataset, type UserDataset, type UserRawRecord } from "./dataset";

interface UsersStoreState {
  users: Map<string, UserRawRecord>;
  invitations: UserInvitation[];
  activities: UserActivity[];
  attentionItems: UserAttentionItem[];
  securityEvents: UserSecurityEvent[];
  dirty: boolean;
}

let storeInstance: UsersStoreState | null = null;

function resolveTwoFactorStatus(mfaEnabled: boolean, required: boolean): TwoFactorStatus {
  if (mfaEnabled) return "enabled";
  if (required) return "required_not_configured";
  return "not_enabled";
}

function resolveSecurityPosture(record: UserRawRecord): SecurityPosture {
  if (record.identity.globalStatus === "suspended") return "suspended";
  if (record.security.isLocked) return "locked";
  if (record.security.twoFactorRequired && !record.security.mfaEnabled) return "action_required";
  if (record.security.failedLoginAttempts > 2) return "security_review";
  return "healthy";
}

export function toUserAggregate(record: UserRawRecord): UserAggregate {
  const activeMemberships = record.memberships.filter((m) => m.status === "active");
  const hasOwner = activeMemberships.some((m) => m.isOwner || m.role === "owner");
  const hasAdmin = activeMemberships.some((m) => m.role === "owner" || m.role === "admin" || m.role === "project_admin");

  const totalClients = record.memberships.reduce((sum, m) => sum + m.clientAccess.clients.length, 0);
  const activeSessions = record.security.sessions.filter((s) => s.status === "active").length;

  const twoFactorStatus = resolveTwoFactorStatus(record.security.mfaEnabled, record.security.twoFactorRequired);
  const securityPosture = resolveSecurityPosture(record);

  return {
    identity: record.identity,
    memberships: record.memberships,
    security: {
      ...record.security,
      twoFactorStatus,
    },
    ownedResources: record.ownedResources,
    recentActivity: record.recentActivity,
    totalClientsCount: totalClients,
    activeSessionsCount: activeSessions,
    hasOwnerAccess: hasOwner,
    hasAdminAccess: hasAdmin,
    securityPosture,
  };
}

function readSessionStorage(): UserDataset | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEYS.usersStore);
    if (!raw) return null;
    return JSON.parse(raw) as UserDataset;
  } catch {
    return null;
  }
}

function writeSessionStorage(state: UsersStoreState): void {
  if (typeof window === "undefined") return;
  try {
    const payload: UserDataset = {
      users: Array.from(state.users.values()),
      invitations: state.invitations,
      activities: state.activities,
      attentionItems: state.attentionItems,
      securityEvents: state.securityEvents,
    };
    window.sessionStorage.setItem(SESSION_STORAGE_KEYS.usersStore, JSON.stringify(payload));
  } catch {
    // Ignore storage quota issues in demo mode
  }
}

function getStore(): UsersStoreState {
  if (storeInstance) return storeInstance;

  const dataset = readSessionStorage() || buildInitialUsersDataset();
  const map = new Map<string, UserRawRecord>();
  for (const user of dataset.users) {
    map.set(user.identity.id, user);
  }

  storeInstance = {
    users: map,
    invitations: dataset.invitations,
    activities: dataset.activities,
    attentionItems: dataset.attentionItems,
    securityEvents: dataset.securityEvents,
    dirty: false,
  };

  return storeInstance;
}

export function commitStore(): void {
  if (!storeInstance) return;
  storeInstance.dirty = true;
  writeSessionStorage(storeInstance);
}

export function getAllRawUsers(): UserRawRecord[] {
  return Array.from(getStore().users.values());
}

export function getRawUser(id: string): UserRawRecord | undefined {
  return getStore().users.get(id);
}

export function setRawUser(record: UserRawRecord): void {
  getStore().users.set(record.identity.id, record);
  commitStore();
}

export function getAllInvitations(): UserInvitation[] {
  return [...getStore().invitations];
}

export function setInvitations(invitations: UserInvitation[]): void {
  getStore().invitations = invitations;
  commitStore();
}

export function addInvitation(inv: UserInvitation): void {
  const store = getStore();
  store.invitations = [inv, ...store.invitations];
  commitStore();
}

export function getAllActivities(): UserActivity[] {
  return [...getStore().activities];
}

export function recordActivity(activity: UserActivity): void {
  const store = getStore();
  store.activities = [activity, ...store.activities];

  // Also append to specific user's activity feed if user exists
  const user = store.users.get(activity.userId);
  if (user) {
    user.recentActivity = [activity, ...user.recentActivity];
  }

  commitStore();
}

export function getAllAttentionItems(): UserAttentionItem[] {
  return [...getStore().attentionItems];
}

export function setAttentionItems(items: UserAttentionItem[]): void {
  getStore().attentionItems = items;
  commitStore();
}

export function getAllSecurityEvents(): UserSecurityEvent[] {
  return [...getStore().securityEvents];
}

export function recordSecurityEvent(event: UserSecurityEvent): void {
  const store = getStore();
  store.securityEvents = [event, ...store.securityEvents];
  commitStore();
}

export function computeUserKpis(): UserKpis {
  const all = getAllRawUsers();
  const invitations = getAllInvitations();
  const attention = getAllAttentionItems();

  const now = new Date("2026-09-19T12:00:00Z").getTime();
  const thirtyDaysMs = 30 * 86400 * 1000;

  const totalUsers = all.length;
  const activeUsers = all.filter((u) => u.identity.globalStatus === "active").length;
  const pendingInvites = invitations.filter((i) => i.status === "pending").length;
  const suspendedUsers = all.filter((u) => u.identity.globalStatus === "suspended").length;

  const twoFactorEnabled = all.filter((u) => u.security.mfaEnabled).length;
  const twoFactorTotal = totalUsers;

  const inactive30PlusDays = all.filter((u) => {
    if (!u.identity.lastLoginAt) return true;
    const loginTime = new Date(u.identity.lastLoginAt).getTime();
    return now - loginTime > thirtyDaysMs;
  }).length;

  const multiCompanyUsers = all.filter((u) => u.memberships.length > 1).length;
  const needsAttentionCount = attention.length;

  return {
    totalUsers,
    activeUsers,
    pendingInvites,
    suspendedUsers,
    twoFactorEnabled,
    twoFactorTotal,
    inactive30PlusDays,
    multiCompanyUsers,
    needsAttentionCount,
  };
}

export function resetDemoStore(): void {
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEYS.usersStore);
  }
  storeInstance = null;
}
