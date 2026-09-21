/**
 * Deterministic demo flags, changes and activity.
 *
 * Everything is derived from a fixed anchor and stable hashes, never from a random
 * number or the wall clock, so a reload shows the same data. Feature keys,
 * entitlements, providers and resources all refer to the shared catalogues, so a
 * flag can only point at something that exists elsewhere in the product.
 */
import { DEMO_CLOCK_ANCHOR } from "@/features/companies/data/config";
import { INTERNAL_TEAM } from "@/mocks/data/internal-team";
import type { IntegrationProvider } from "@/types/domain/integration";
import type { Permission } from "@/types/domain/team";
import { bucketFor } from "../evaluate";
import type {
  ConfigDiff,
  ConfigVersion,
  Environment,
  EnvironmentConfig,
  FeatureCategory,
  FeatureFlag,
  FlagActivity,
  FlagChange,
  FlagType,
  ImplementationStatus,
  LifecycleStatus,
  Protection,
  RolloutStrategy,
} from "../types";

const DAY_MS = 86_400_000;
const ENVS: Environment[] = ["development", "staging", "production"];
const at = (daysAgo: number, hour = 10) => {
  const base = new Date(DEMO_CLOCK_ANCHOR - daysAgo * DAY_MS);
  base.setUTCHours(hour, 20, 0, 0);
  return base.toISOString();
};
const staff = (index: number) => {
  const member = INTERNAL_TEAM[index % INTERNAL_TEAM.length];
  return { id: member?.id ?? "stf_001", name: member?.name ?? "Platform staff" };
};

interface Rollout {
  enabled: boolean;
  strategy: RolloutStrategy;
  percentage?: number;
  /** Number of companies to select, chosen by a stable hash. */
  selected?: number;
  emergency?: string;
}

interface Seed {
  key: string;
  name: string;
  description: string;
  category: FeatureCategory;
  ownerTeam: string;
  relatedModule: string;
  type?: FlagType;
  implementation: ImplementationStatus;
  lifecycle?: LifecycleStatus;
  protection?: Protection;
  entitlement?: string | null;
  capability?: Permission | null;
  integrations?: IntegrationProvider[];
  usage?: string | null;
  prerequisites?: string[];
  limitations?: string[];
  code?: FeatureFlag["codeReferences"];
  createdDaysAgo: number;
  updatedDaysAgo: number;
  dev: Rollout;
  staging: Rollout;
  prod: Rollout;
}

const ALL: Rollout = { enabled: true, strategy: "all" };
const OFF: Rollout = { enabled: false, strategy: "disabled" };

const SEEDS: readonly Seed[] = [
  { key: "content.ai_generator", name: "AI Content Generator", description: "Generate captions, blog drafts and post variations from a brief.", category: "AI & Content", ownerTeam: "Content Platform", relatedModule: "Content Studio", implementation: "ready", entitlement: "ai_assistant", capability: "companies:read", usage: "aiCredits", createdDaysAgo: 140, updatedDaysAgo: 6, dev: ALL, staging: ALL, prod: { enabled: true, strategy: "percentage", percentage: 60 } },
  { key: "automation.builder", name: "Automation Builder", description: "Visual workflow canvas for triggers, conditions and actions.", category: "Automation", ownerTeam: "Automation", relatedModule: "Campaigns", implementation: "ready", entitlement: "automation_engine", usage: "automationRuns", createdDaysAgo: 200, updatedDaysAgo: 30, dev: ALL, staging: ALL, prod: ALL },
  { key: "automation.campaign_ai", name: "AI Campaign Automation", description: "Let automations draft and schedule campaign content with AI.", category: "Automation", ownerTeam: "Automation", relatedModule: "Campaigns", implementation: "testing", entitlement: "automation_engine", usage: "aiCredits", prerequisites: ["content.ai_generator", "automation.builder"], limitations: ["Runs only on connected Meta and LinkedIn accounts", "English content only"], createdDaysAgo: 40, updatedDaysAgo: 3, dev: ALL, staging: { enabled: true, strategy: "percentage", percentage: 40 }, prod: OFF },
  { key: "seo.advanced_audit", name: "Advanced SEO Audit", description: "Deep technical audit with JavaScript rendering and priority scoring.", category: "Website & SEO", ownerTeam: "Growth & SEO", relatedModule: "SEO Audit", implementation: "ready", entitlement: "seo_audit", createdDaysAgo: 95, updatedDaysAgo: 9, dev: ALL, staging: ALL, prod: { enabled: true, strategy: "percentage", percentage: 25 } },
  { key: "seo.crawler_v2", name: "SEO Crawler v2", description: "Rebuilt crawler for large and JavaScript-heavy sites.", category: "Website & SEO", ownerTeam: "Growth & SEO", relatedModule: "SEO Audit", implementation: "testing", entitlement: "seo_audit", limitations: ["Crawl depth capped at 5 while in testing"], createdDaysAgo: 60, updatedDaysAgo: 12, dev: ALL, staging: ALL, prod: OFF },
  { key: "channels.youtube_publishing", name: "YouTube Publishing", description: "Upload and schedule videos to connected YouTube channels.", category: "Channels", ownerTeam: "Channels", relatedModule: "YouTube", implementation: "ready", entitlement: "channel_youtube", integrations: ["youtube"], createdDaysAgo: 170, updatedDaysAgo: 22, dev: ALL, staging: ALL, prod: ALL },
  { key: "channels.linkedin_publishing", name: "LinkedIn Publishing", description: "Publish and schedule posts to LinkedIn company pages.", category: "Channels", ownerTeam: "Channels", relatedModule: "LinkedIn", implementation: "ready", entitlement: "channel_linkedin", integrations: ["linkedin"], createdDaysAgo: 210, updatedDaysAgo: 41, dev: ALL, staging: ALL, prod: ALL },
  { key: "channels.whatsapp_broadcasts", name: "WhatsApp Broadcasts", description: "Template broadcasts with per-recipient delivery status.", category: "Channels", ownerTeam: "Channels", relatedModule: "WhatsApp", implementation: "ready", entitlement: "channel_whatsapp", integrations: ["whatsapp"], createdDaysAgo: 120, updatedDaysAgo: 5, dev: ALL, staging: ALL, prod: { enabled: true, strategy: "selected", selected: 4 } },
  { key: "channels.meta_reels", name: "Meta Reels Publishing", description: "Publish short videos as Instagram and Facebook Reels.", category: "Channels", ownerTeam: "Channels", relatedModule: "Meta / Instagram", implementation: "in_development", entitlement: "channel_meta", integrations: ["meta", "instagram"], limitations: ["Cover-image selection is not built"], createdDaysAgo: 25, updatedDaysAgo: 2, dev: { enabled: true, strategy: "selected", selected: 3 }, staging: OFF, prod: OFF },
  { key: "analytics.advanced_reporting", name: "Advanced Reporting", description: "Multi-source reports with scheduled exports.", category: "Analytics", ownerTeam: "Analytics", relatedModule: "Dashboard", implementation: "ready", entitlement: "ga4_reporting", integrations: ["website_analytics"], createdDaysAgo: 88, updatedDaysAgo: 1, dev: ALL, staging: ALL, prod: { enabled: true, strategy: "percentage", percentage: 50, emergency: "Scheduled export job was saturating the report queue." } },
  { key: "workspace.new_dashboard", name: "New Dashboard", description: "Redesigned company dashboard with configurable widgets.", category: "Workspace", ownerTeam: "Core Workspace", relatedModule: "Dashboard", implementation: "ready", createdDaysAgo: 75, updatedDaysAgo: 4, dev: ALL, staging: ALL, prod: { enabled: true, strategy: "percentage", percentage: 30 } },
  { key: "workspace.calendar_v2", name: "Calendar v2", description: "Drag-and-drop content calendar with team availability.", category: "Workspace", ownerTeam: "Core Workspace", relatedModule: "Calendar", implementation: "testing", createdDaysAgo: 50, updatedDaysAgo: 8, dev: ALL, staging: { enabled: true, strategy: "internal" }, prod: { enabled: true, strategy: "internal" } },
  { key: "content.approval_workflows_v2", name: "Approval Workflows v2", description: "Multi-step review chains with reviewer groups.", category: "AI & Content", ownerTeam: "Content Platform", relatedModule: "Content Studio", implementation: "ready", entitlement: "approval_workflows", createdDaysAgo: 110, updatedDaysAgo: 55, dev: ALL, staging: ALL, prod: ALL },
  { key: "media.smart_tagging", name: "Media Smart Tagging", description: "Automatic tags and search for uploaded media.", category: "Workspace", ownerTeam: "Core Workspace", relatedModule: "Media Library", implementation: "not_implemented", createdDaysAgo: 18, updatedDaysAgo: 18, dev: OFF, staging: OFF, prod: OFF },
  { key: "agency.client_portal", name: "Agency Client Portal", description: "Read-only reporting portal for an agency's clients.", category: "Agency", ownerTeam: "Agency Products", relatedModule: "Dashboard", implementation: "ready", entitlement: "multiple_clients", createdDaysAgo: 100, updatedDaysAgo: 14, dev: ALL, staging: ALL, prod: { enabled: true, strategy: "selected", selected: 3 } },
  { key: "platform.realtime_job_stream", name: "Realtime Job Stream", description: "Live job status updates in operational consoles.", category: "Platform", ownerTeam: "Platform Engineering", relatedModule: "Platform", type: "operational", implementation: "ready", createdDaysAgo: 150, updatedDaysAgo: 70, dev: ALL, staging: ALL, prod: OFF },
  { key: "ops.publishing_pipeline", name: "Publishing Pipeline", description: "The scheduled-publishing pipeline. An operational kill switch exists for incidents.", category: "Platform", ownerTeam: "Platform Engineering", relatedModule: "Platform", type: "operational", implementation: "ready", protection: "protected", createdDaysAgo: 400, updatedDaysAgo: 90, dev: ALL, staging: ALL, prod: ALL },
  { key: "security.saml_sso", name: "SAML Single Sign-On", description: "Enterprise identity provider federation for company sign-in.", category: "Security", ownerTeam: "Trust & Safety", relatedModule: "Platform", implementation: "ready", protection: "protected", createdDaysAgo: 130, updatedDaysAgo: 20, dev: ALL, staging: ALL, prod: { enabled: true, strategy: "selected", selected: 2 } },
  { key: "api.webhooks_v2", name: "Webhooks v2", description: "Signed webhook delivery with replay and per-endpoint retries.", category: "Platform", ownerTeam: "Platform Engineering", relatedModule: "Platform", implementation: "ready", entitlement: "webhooks", createdDaysAgo: 80, updatedDaysAgo: 7, dev: ALL, staging: ALL, prod: { enabled: true, strategy: "percentage", percentage: 20 } },
  { key: "billing.usage_overage", name: "Usage Overage Billing", description: "Bill metered usage beyond the plan allowance.", category: "Billing", ownerTeam: "Billing Systems", relatedModule: "Platform", implementation: "not_implemented", lifecycle: "draft", createdDaysAgo: 10, updatedDaysAgo: 10, dev: OFF, staging: OFF, prod: OFF },
  { key: "workspace.classic_dashboard", name: "Classic Dashboard", description: "The previous dashboard, kept while the new one rolls out.", category: "Workspace", ownerTeam: "Core Workspace", relatedModule: "Dashboard", type: "operational", implementation: "deprecated", lifecycle: "deprecated", code: "referenced", createdDaysAgo: 420, updatedDaysAgo: 80, dev: ALL, staging: ALL, prod: ALL },
];

function pick(companyIds: readonly string[], key: string, environment: Environment, count: number): string[] {
  return [...companyIds]
    .sort((a, b) => bucketFor(key, environment, a, "seed") - bucketFor(key, environment, b, "seed") || a.localeCompare(b))
    .slice(0, count);
}

function envConfig(seed: Seed, environment: Environment, rollout: Rollout, companyIds: readonly string[], actorName: string): EnvironmentConfig {
  const emergency = rollout.emergency;
  return {
    enabled: rollout.enabled,
    strategy: rollout.strategy,
    percentage: rollout.percentage ?? 0,
    selectedCompanyIds: rollout.strategy === "selected" ? pick(companyIds, seed.key, environment, rollout.selected ?? 0) : [],
    emergencyOff: Boolean(emergency),
    emergencyReason: emergency ?? null,
    emergencyAt: emergency ? at(1, 15) : null,
    emergencyBy: emergency ? staff(2).name : null,
    salt: "v1",
    version: rollout.strategy === "disabled" && !rollout.enabled ? 1 : 2,
    updatedAt: at(seed.updatedDaysAgo),
    updatedBy: actorName,
  };
}

export interface SeedState {
  flags: FeatureFlag[];
  changes: FlagChange[];
  activity: FlagActivity[];
  versions: ConfigVersion[];
  seq: number;
}

export const toDiff = (config: EnvironmentConfig, prerequisites: readonly string[]): ConfigDiff => ({
  enabled: config.enabled,
  strategy: config.strategy,
  percentage: config.percentage,
  selectedCompanyIds: [...config.selectedCompanyIds],
  emergencyOff: config.emergencyOff,
  prerequisites: [...prerequisites],
});

const DEFAULT_DIFF = (prerequisites: readonly string[]): ConfigDiff => ({ enabled: false, strategy: "disabled", percentage: 0, selectedCompanyIds: [], emergencyOff: false, prerequisites: [...prerequisites] });

export function buildSeed(companyIds: readonly string[]): SeedState {
  const flags: FeatureFlag[] = SEEDS.map((seed, index) => {
    const creator = staff(index);
    const editor = staff(index + 3);
    return {
      id: `flag_${seed.key.replace(/\./g, "_")}`,
      key: seed.key,
      name: seed.name,
      description: seed.description,
      category: seed.category,
      ownerTeam: seed.ownerTeam,
      relatedModule: seed.relatedModule,
      documentation: `https://docs.encodency.com/flags/${seed.key}`,
      type: seed.type ?? "release",
      lifecycle: seed.lifecycle ?? "active",
      protection: seed.protection ?? "standard",
      implementation: seed.implementation,
      knownLimitations: seed.limitations ?? [],
      entitlement: seed.entitlement ?? null,
      requiredCapability: seed.capability ?? null,
      integrations: seed.integrations ?? [],
      usageResource: seed.usage ?? null,
      prerequisites: seed.prerequisites ?? [],
      environments: {
        development: envConfig(seed, "development", seed.dev, companyIds, editor.name),
        staging: envConfig(seed, "staging", seed.staging, companyIds, editor.name),
        production: envConfig(seed, "production", seed.prod, companyIds, editor.name),
      },
      createdAt: at(seed.createdDaysAgo),
      createdBy: creator.name,
      updatedAt: at(seed.updatedDaysAgo),
      updatedBy: editor.name,
      deprecatedAt: seed.lifecycle === "deprecated" ? at(seed.updatedDaysAgo + 5) : null,
      archivedAt: null,
      codeReferences: seed.code ?? "unverified",
    } satisfies FeatureFlag;
  });

  let seq = 0;
  const changes: FlagChange[] = [];
  const activity: FlagActivity[] = [];
  const versions: ConfigVersion[] = [];

  flags.forEach((flag, index) => {
    const creator = staff(index);
    const editor = staff(index + 3);
    seq += 1;
    activity.push({ id: `fa_${String(seq).padStart(4, "0")}`, at: flag.createdAt, actor: creator.name, flagKey: flag.key, flagName: flag.name, environment: null, type: "flag_created", result: "applied", summary: `Created ${flag.name} (${flag.key})`, changeId: null });

    for (const environment of ENVS) {
      const config = flag.environments[environment];
      const base = DEFAULT_DIFF(flag.prerequisites);
      versions.push({ id: `${flag.id}_${environment}_v1`, flagId: flag.id, flagKey: flag.key, environment, version: 1, config: base, createdBy: creator.name, createdAt: flag.createdAt, reason: "Initial definition. Disabled in every environment.", changeId: null, current: config.version === 1 });
      if (config.version > 1) {
        seq += 1;
        const changeId = `chg_${String(seq).padStart(4, "0")}`;
        const type = config.strategy === "selected" ? "target_added" : config.strategy === "all" || config.strategy === "percentage" || config.strategy === "internal" ? "rollout_updated" : "state_changed";
        const change: FlagChange = {
          id: changeId,
          flagId: flag.id,
          flagKey: flag.key,
          flagName: flag.name,
          environment,
          type,
          status: "applied",
          before: base,
          after: toDiff({ ...config, emergencyOff: false }, flag.prerequisites),
          reason: environment === "production" ? "Progressive rollout after staging sign-off." : "Enabled for testing.",
          requestedBy: editor.name,
          requestedById: editor.id,
          requestedAt: config.updatedAt,
          effectiveAt: config.updatedAt,
          timezone: "UTC",
          approvalRequired: false,
          approvalNote: "Not required",
          impact: null,
          appliedAt: config.updatedAt,
          demo: true,
          versionNumber: 2,
          auditRef: `AUD-${30000 + seq}`,
        };
        changes.push(change);
        activity.push({ id: `fa_${String(++seq).padStart(4, "0")}`, at: config.updatedAt, actor: editor.name, flagKey: flag.key, flagName: flag.name, environment, type, result: "applied", summary: `${flag.name}: ${environment} rollout set to ${config.strategy}${config.strategy === "percentage" ? ` ${config.percentage}%` : ""}`, changeId });
        versions.push({ id: `${flag.id}_${environment}_v2`, flagId: flag.id, flagKey: flag.key, environment, version: 2, config: toDiff({ ...config, emergencyOff: false }, flag.prerequisites), createdBy: editor.name, createdAt: config.updatedAt, reason: change.reason, changeId, current: !config.emergencyOff });
        if (config.emergencyOff) {
          seq += 1;
          const emergencyId = `chg_${String(seq).padStart(4, "0")}`;
          changes.push({ ...change, id: emergencyId, type: "emergency_disabled", before: toDiff({ ...config, emergencyOff: false }, flag.prerequisites), after: toDiff(config, flag.prerequisites), reason: config.emergencyReason ?? "Emergency disable", requestedBy: config.emergencyBy ?? editor.name, requestedAt: config.emergencyAt ?? config.updatedAt, appliedAt: config.emergencyAt ?? config.updatedAt, effectiveAt: config.emergencyAt ?? config.updatedAt, versionNumber: 3, auditRef: `AUD-${30000 + seq}` });
          activity.push({ id: `fa_${String(++seq).padStart(4, "0")}`, at: config.emergencyAt ?? config.updatedAt, actor: config.emergencyBy ?? editor.name, flagKey: flag.key, flagName: flag.name, environment, type: "emergency_disabled", result: "applied", summary: `Emergency disable applied to ${flag.name} in ${environment}`, changeId: emergencyId });
          versions.push({ id: `${flag.id}_${environment}_v3`, flagId: flag.id, flagKey: flag.key, environment, version: 3, config: toDiff(config, flag.prerequisites), createdBy: config.emergencyBy ?? editor.name, createdAt: config.emergencyAt ?? config.updatedAt, reason: config.emergencyReason ?? "Emergency disable", changeId: emergencyId, current: true });
          config.version = 3;
        }
      }
    }
  });

  // Requests that are not part of the effective configuration.
  const requester = staff(4);
  const audit = flags.find((flag) => flag.key === "seo.advanced_audit");
  const dashboard = flags.find((flag) => flag.key === "workspace.new_dashboard");
  const saml = flags.find((flag) => flag.key === "security.saml_sso");
  const calendar = flags.find((flag) => flag.key === "workspace.calendar_v2");
  const request = (flag: FeatureFlag | undefined, patch: Partial<FlagChange> & Pick<FlagChange, "type" | "status" | "after" | "reason">): void => {
    if (!flag) return;
    seq += 1;
    const id = `chg_${String(seq).padStart(4, "0")}`;
    changes.push({
      id,
      flagId: flag.id,
      flagKey: flag.key,
      flagName: flag.name,
      environment: "production",
      before: toDiff(flag.environments.production, flag.prerequisites),
      requestedBy: requester.name,
      requestedById: requester.id,
      requestedAt: at(2, 13),
      effectiveAt: null,
      timezone: "UTC",
      approvalRequired: true,
      approvalNote: "Awaiting approval. Demo record: no approval service is connected in this frontend phase.",
      impact: null,
      appliedAt: null,
      demo: true,
      versionNumber: null,
      auditRef: null,
      ...patch,
    });
    activity.push({ id: `fa_${String(++seq).padStart(4, "0")}`, at: at(2, 13), actor: requester.name, flagKey: flag.key, flagName: flag.name, environment: "production", type: patch.type, result: patch.status === "scheduled" ? "scheduled" : "pending", summary: `${patch.status === "scheduled" ? "Scheduled" : "Requested"}: ${flag.name} production change`, changeId: id });
  };
  if (audit) request(audit, { type: "rollout_updated", status: "pending_approval", after: { ...toDiff(audit.environments.production, audit.prerequisites), percentage: 50 }, reason: "Raise the advanced audit rollout to 50% after two clean weeks." });
  if (saml) request(saml, { type: "target_added", status: "pending_approval", after: { ...toDiff(saml.environments.production, saml.prerequisites), selectedCompanyIds: [...saml.environments.production.selectedCompanyIds, ...pick(companyIds, "saml-extra", "production", 3).filter((id) => !saml.environments.production.selectedCompanyIds.includes(id)).slice(0, 1)] }, reason: "Onboard another enterprise customer to SSO." });
  if (dashboard) request(dashboard, { type: "rollout_updated", status: "scheduled", effectiveAt: new Date(DEMO_CLOCK_ANCHOR + 4 * DAY_MS).toISOString(), approvalRequired: false, approvalNote: "Planned. No scheduler runs in the demo, so it is not applied automatically.", after: { ...toDiff(dashboard.environments.production, dashboard.prerequisites), percentage: 60 }, reason: "Planned ramp to 60% after the marketing announcement." });
  if (calendar) request(calendar, { type: "rollout_updated", status: "draft", approvalRequired: false, approvalNote: "Draft. Not submitted.", after: { ...toDiff(calendar.environments.production, calendar.prerequisites), strategy: "selected", selectedCompanyIds: pick(companyIds, calendar.key, "production", 2) }, reason: "Draft: beta access for two design partners." });

  return { flags, changes, activity: activity.sort((a, b) => Date.parse(a.at) - Date.parse(b.at)), versions, seq };
}
