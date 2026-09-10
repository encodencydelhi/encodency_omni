export type AdminClientscope = "all" | string;

export type AdminPermission =
  | "view_dashboard"
  | "view_analytics"
  | "publish_posts"
  | "manage_campaigns"
  | "manage_crm"
  | "manage_seo"
  | "manage_team"
  | "manage_integrations"
  | "manage_billing";

export interface Organization {
  id: string;
  name: string;
  timezone: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "Organization Owner" | "Organization Admin" | "Project Admin" | "Marketing Manager";
  initials: string;
  permissions: AdminPermission[];
}

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  website: string;
  status: "active" | "paused" | "archived";
  color: string;
}

export interface AdminProjectRecord extends Project {
  description: string;
  logoText: string;
  connectedChannels: string[];
  leads: number;
  seoScore: number;
  campaigns: number;
  websiteVisits: number;
  socialReach: number;
  lastActivity: string;
  createdAt: string;
  owner: string;
}

export type MetricKey = "Clients" | "leads" | "campaigns" | "reach" | "visits" | "seo";

export interface DashboardMetric {
  key: MetricKey;
  label: string;
  value: number;
  formattedValue: string;
  change: number;
  comparison: string;
}

export type AttentionSeverity = "critical" | "warning" | "info";

export interface AttentionItem {
  id: string;
  title: string;
  detail: string;
  severity: AttentionSeverity;
  actionLabel: string;
}

export interface TrendPoint {
  label: string;
  leads: number;
  visits: number;
}

export type ChannelStatus = "healthy" | "attention" | "disconnected";

export interface ChannelSummary {
  id: string;
  name: string;
  shortName: string;
  metric: string;
  metricLabel: string;
  change: number;
  status: ChannelStatus;
  color: string;
}

export interface RecentLead {
  id: string;
  name: string;
  source: string;
  campaign: string;
  stage: "New" | "Contacted" | "Qualified" | "Proposal";
  receivedAt: string;
}

export interface ScheduledContent {
  id: string;
  title: string;
  channel: string;
  scheduledFor: string;
  status: "scheduled" | "draft";
}

export interface ActivityItem {
  id: string;
  title: string;
  meta: string;
  occurredAt: string;
  kind: "publish" | "lead" | "seo" | "campaign";
}

export interface IntegrationHealth {
  connected: number;
  total: number;
  synced: number;
  attention: number;
}

export interface AdminDashboardSnapshot {
  scopeId: AdminClientscope;
  metrics: DashboardMetric[];
  attention: AttentionItem[];
  trend: TrendPoint[];
  channels: ChannelSummary[];
  recentLeads: RecentLead[];
  scheduledContent: ScheduledContent[];
  activity: ActivityItem[];
  integrationHealth: IntegrationHealth;
  updatedAt: string;
}

export interface ContentItem { id: string; title: string; channel: string; campaign: string; status: "Draft" | "Scheduled" | "Published" | "Failed"; scheduledAt: string; }
export interface Campaign { id: string; name: string; project: string; channels: string[]; status: "Active" | "Draft" | "Completed" | "Paused"; startDate: string; endDate: string; leads: number; spend: number; conversions: number; }
export interface WorkspaceModuleRecord { id: string; title: string; subtitle: string; status: string; metric: string; detail: string; }
