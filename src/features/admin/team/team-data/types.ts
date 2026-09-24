export type ISODate = string;
export type Maybe<T> = T | null;

export type MemberStatus = "active" | "invited" | "suspended" | "deactivated";
export type WorkloadStatus = "available" | "normal" | "busy" | "overloaded";
export type AccessLevel = "full" | "module_restricted" | "read_only";

export type RoleId = string;
export type ClientId = string;
export type GroupId = string;
export type MemberId = string;
export type InviteId = string;

export interface ClientAccess {
  clientId: ClientId;
  clientName: string;
  accessLevel: AccessLevel;
  roleOverride?: RoleId;
  modules?: string[]; // e.g., ["crm", "seo", "campaigns"]
  grantedAt: ISODate;
}

export interface TeamGroup {
  id: GroupId;
  name: string;
  description: string;
  leadId: MemberId;
  leadName: string;
  memberCount: number;
  clientCount: number;
  activeTasks: number;
  updatedAt: ISODate;
  memberIds?: MemberId[];
  clients?: { id: ClientId; name: string }[];
  archived?: boolean;
}

export interface MemberWorkload {
  status: WorkloadStatus;
  openTasks: number;
  overdueTasks: number;
  pendingApprovals: number;
  campaigns: number;
  workflows: number;
}

export interface OwnedResource {
  type: "task" | "campaign" | "workflow" | "scheduled_post" | "report";
  count: number;
}

export interface MemberSecurity {
  has2FA: boolean;
  lastLogin: Maybe<ISODate>;
  passwordLastChanged: Maybe<ISODate>;
  activeSessions: number;
  inviteAcceptedAt: Maybe<ISODate>;
}

export interface Member {
  id: MemberId;
  name: string;
  email: string;
  jobTitle?: string;
  avatarUrl: Maybe<string>;
  roleId: RoleId; // Base role
  roleName: string;
  status: MemberStatus;
  joinedAt: ISODate;
  lastActiveAt: Maybe<ISODate>;
  groups: { id: GroupId; name: string }[];
  clientAccess: ClientAccess[];
  workload: MemberWorkload;
  ownedResources: OwnedResource[];
  security: MemberSecurity;
  isOrgAdmin?: boolean;
}

export interface Invitation {
  id: InviteId;
  email: string;
  name: string;
  jobTitle?: string;
  roleId: RoleId;
  roleName: string;
  clients: { id: ClientId; name: string }[];
  accessLevel: AccessLevel;
  groups: { id: GroupId; name: string }[];
  invitedBy: { id: MemberId; name: string };
  sentAt: ISODate;
  expiresAt: ISODate;
  status: "pending" | "accepted" | "expired" | "cancelled";
  token?: string;
}

export interface MemberActivity {
  id: string;
  memberId: MemberId;
  memberName: string;
  action: string; // e.g., "Published Post", "Approved campaign"
  entityName: string; // e.g., "World Environment Day"
  module: string; // e.g., "X", "SEO", "Campaigns"
  clientId?: ClientId;
  clientName?: string;
  timestamp: ISODate;
}
