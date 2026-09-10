import type { EntityRef } from "@/types/common";
import type { Company, CompanyStatus } from "@/types/domain/company";
import {
  INTEGRATION_PROVIDER,
  type CompanyIntegration,
  type IntegrationProvider,
  type IntegrationStatus,
} from "@/types/domain/integration";
import type { Project, Clientstatus, SeoHealthBand } from "@/types/domain/project";
import { ORGANISATION_ROLE, type OrganisationRole, type PlatformUser, type UserStatus } from "@/types/domain/user";
import { createRng, daysAgo, daysAhead, type Rng } from "../lib/random";
import { COMPANY_SEEDS, FIRST_NAMES, LAST_NAMES, type CompanySeed } from "./catalog";
import { getPlanByTier } from "./plans";

const ALL_PROVIDERS = Object.keys(INTEGRATION_PROVIDER) as IntegrationProvider[];

/** How many days of inactivity each lifecycle state implies. */
const INACTIVITY_DAYS: Record<CompanyStatus, [number, number]> = {
  active: [0, 3],
  trial: [0, 5],
  past_due: [1, 9],
  suspended: [14, 45],
  churned: [70, 190],
};

const AGE_DAYS: Record<CompanyStatus, [number, number]> = {
  active: [120, 900],
  trial: [2, 13],
  past_due: [200, 700],
  suspended: [180, 800],
  churned: [400, 1100],
};

function slugToEmailDomain(seed: CompanySeed): string {
  return seed.websiteDomain;
}

function buildPersonName(rng: Rng): string {
  return `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
}

function toEmail(name: string, domain: string): string {
  const [first = "user", last = ""] = name.toLowerCase().split(" ");
  return `${first}.${last}`.replace(/[^a-z.]/g, "") + `@${domain}`;
}

/** Channel mix for a project: a connected set plus, sometimes, a broken one. */
function buildChannelMix(
  rng: Rng,
  tier: string,
  companyStatus: CompanyStatus,
): { connected: IntegrationProvider[]; disconnected: IntegrationProvider[] } {
  const breadth = tier === "starter" ? rng.int(2, 4) : tier === "growth" ? rng.int(4, 6) : rng.int(6, 8);
  const selected = rng.pickMany(ALL_PROVIDERS, breadth);

  // Suspended and churned tenants have stopped maintaining their connections.
  const failureChance = companyStatus === "active" ? 0.16 : companyStatus === "trial" ? 0.1 : 0.55;
  const disconnected = rng.bool(failureChance) && selected.length > 1 ? selected.slice(-1) : [];

  return {
    connected: selected.filter((provider) => !disconnected.includes(provider)),
    disconnected,
  };
}

function resolveSeoHealth(score: number | null): SeoHealthBand {
  if (score === null) return "not_crawled";
  if (score >= 78) return "good";
  if (score >= 58) return "fair";
  return "poor";
}

function resolveClientstatus(rng: Rng, companyStatus: CompanyStatus): Clientstatus {
  if (companyStatus === "churned") return "archived";
  if (companyStatus === "suspended") return "paused";
  if (companyStatus === "trial") return rng.bool(0.6) ? "onboarding" : "active";
  return rng.weighted({ active: 82, onboarding: 10, paused: 6, archived: 2 } satisfies Record<Clientstatus, number>);
}

function resolveUserStatus(rng: Rng, companyStatus: CompanyStatus): UserStatus {
  if (companyStatus === "suspended") return rng.bool(0.7) ? "suspended" : "inactive";
  if (companyStatus === "churned") return "inactive";
  return rng.weighted({ active: 78, invited: 10, inactive: 8, suspended: 4 } satisfies Record<UserStatus, number>);
}

const NON_OWNER_ROLES = (Object.keys(ORGANISATION_ROLE) as OrganisationRole[]).filter(
  (role) => role !== "owner",
);

function resolveIntegrationStatus(
  rng: Rng,
  isDisconnected: boolean,
  companyStatus: CompanyStatus,
): IntegrationStatus {
  if (isDisconnected) return "disconnected";
  if (companyStatus === "churned" || companyStatus === "suspended") return "disconnected";
  return rng.weighted({
    healthy: 80,
    degraded: 7,
    token_expiring: 8,
    permission_issue: 5,
    disconnected: 0,
  } satisfies Record<IntegrationStatus, number>);
}

interface TenantDataset {
  companies: Company[];
  Clients: Project[];
  users: PlatformUser[];
  integrationsByCompany: Map<string, CompanyIntegration[]>;
}

function buildTenants(): TenantDataset {
  const companies: Company[] = [];
  const Clients: Project[] = [];
  const users: PlatformUser[] = [];
  const integrationsByCompany = new Map<string, CompanyIntegration[]>();

  COMPANY_SEEDS.forEach((seed, companyIndex) => {
    const rng = createRng(1000 + companyIndex * 37);
    const companyId = `cmp_${seed.slug}`;
    const plan = getPlanByTier(seed.tier);
    const domain = slugToEmailDomain(seed);

    const [ageMin, ageMax] = AGE_DAYS[seed.status];
    const createdAt = daysAgo(rng.int(ageMin, ageMax));
    const [idleMin, idleMax] = INACTIVITY_DAYS[seed.status];
    const lastActivityAt = daysAgo(rng.float(idleMin, idleMax, 2));

    const companyRef: EntityRef = { id: companyId, name: seed.name };
    const companyIntegrations: CompanyIntegration[] = [];
    const channelTotals = { connected: 0, degraded: 0, disconnected: 0 };

    // --- Clients -------------------------------------------------------
    seed.Clients.forEach((projectName, projectIndex) => {
      const projectId = `prj_${seed.slug}_${projectIndex + 1}`;
      const status = resolveClientstatus(rng, seed.status);
      const { connected, disconnected } = buildChannelMix(rng, seed.tier, seed.status);
      const seoScore = status === "onboarding" || status === "archived" ? null : rng.int(41, 96);

      Clients.push({
        id: projectId,
        name: projectName,
        company: companyRef,
        status,
        websiteUrl: `https://${domain}`,
        connectedChannels: connected,
        disconnectedChannels: disconnected,
        leadsLast30Days: status === "active" ? rng.int(12, 940) : rng.int(0, 25),
        seoScore,
        seoHealth: resolveSeoHealth(seoScore),
        openSeoIssues: seoScore === null ? 0 : Math.max(0, Math.round((100 - seoScore) * rng.float(0.4, 1.6))),
        scheduledPosts: status === "active" ? rng.int(0, 34) : 0,
        failedPosts: rng.bool(0.28) ? rng.int(1, 9) : 0,
        lastActivityAt: daysAgo(rng.float(idleMin, idleMax + 2, 2)),
        createdAt: daysAgo(rng.int(10, Math.max(20, ageMin))),
      });

      // --- Integrations (one row per project channel) --------------------
      for (const provider of [...connected, ...disconnected]) {
        const isDisconnected = disconnected.includes(provider);
        const integrationStatus = resolveIntegrationStatus(rng, isDisconnected, seed.status);

        if (integrationStatus === "disconnected") channelTotals.disconnected += 1;
        else if (integrationStatus === "healthy") channelTotals.connected += 1;
        else channelTotals.degraded += 1;

        companyIntegrations.push({
          id: `int_${projectId}_${provider}`,
          provider,
          status: integrationStatus,
          accountName:
            provider === "whatsapp"
              ? `+91 ${rng.int(70000, 99999)} ${rng.int(10000, 99999)}`
              : `${projectName} Official`,
          projectName,
          scopes: rng.pickMany(
            ["read_insights", "pages_manage_posts", "content_publish", "leads_retrieval", "reviews_manage"],
            rng.int(2, 4),
          ),
          tokenExpiresAt: integrationStatus === "disconnected" ? null : daysAhead(rng.int(3, 180)),
          lastSyncAt:
            integrationStatus === "disconnected"
              ? daysAgo(rng.int(4, 40))
              : daysAgo(rng.float(0.01, 0.6, 3)),
        });
      }
    });

    integrationsByCompany.set(companyId, companyIntegrations);

    // --- Users ----------------------------------------------------------
    const seatTarget = plan.limits.users ?? 60;
    const userCount = Math.max(2, Math.min(seatTarget, rng.int(2, seed.tier === "starter" ? 4 : seed.tier === "growth" ? 11 : 24)));

    for (let index = 0; index < userCount; index += 1) {
      const name = buildPersonName(rng);
      const status = index === 0 ? (seed.status === "churned" ? "inactive" : "active") : resolveUserStatus(rng, seed.status);

      users.push({
        id: `usr_${seed.slug}_${index + 1}`,
        name,
        email: toEmail(name, domain),
        avatarUrl: null,
        company: companyRef,
        role: index === 0 ? "owner" : rng.pick(NON_OWNER_ROLES),
        status,
        projectCount: rng.int(1, seed.Clients.length),
        lastLoginAt: status === "invited" ? null : daysAgo(rng.float(idleMin, idleMax + 30, 2)),
        createdAt: daysAgo(rng.int(5, Math.max(15, ageMin))),
        mfaEnabled: rng.bool(seed.tier === "enterprise" ? 0.85 : 0.35),
      });
    }

    const companyUsers = users.filter((user) => user.company.id === companyId);
    const companyClients = Clients.filter((project) => project.company.id === companyId);
    const owner = companyUsers[0];

    // --- Commercials ----------------------------------------------------
    const isAnnual = rng.bool(0.35);
    const mrrMinor =
      seed.status === "churned"
        ? 0
        : isAnnual
          ? Math.round(plan.annualPriceMinor / 12)
          : plan.monthlyPriceMinor;

    companies.push({
      id: companyId,
      name: seed.name,
      slug: seed.slug,
      logoUrl: null,
      status: seed.status,
      planTier: seed.tier,
      industry: seed.industry,
      country: seed.country,
      timezone: seed.timezone,
      website: `https://${domain}`,
      primaryContact: {
        name: owner?.name ?? buildPersonName(rng),
        email: owner?.email ?? toEmail("contact", domain),
        phone: `+${rng.int(1, 91)} ${rng.int(700, 999)} ${rng.int(100000, 999999)}`,
      },
      counts: {
        Clients: companyClients.length,
        users: companyUsers.length,
      },
      channels: channelTotals,
      usagePercent:
        seed.status === "churned"
          ? 0
          : rng.int(seed.status === "trial" ? 4 : 18, seed.status === "active" ? 104 : 70),
      mrrMinor,
      currency: plan.currency,
      createdAt,
      lastActivityAt,
    });
  });

  return { companies, Clients, users, integrationsByCompany };
}

const dataset = buildTenants();

export const COMPANIES: readonly Company[] = dataset.companies;
export const Clients: readonly Project[] = dataset.Clients;
export const PLATFORM_USERS: readonly PlatformUser[] = dataset.users;

export function findCompany(id: string): Company | undefined {
  return COMPANIES.find((company) => company.id === id);
}

export function getCompanyIntegrations(companyId: string): CompanyIntegration[] {
  return dataset.integrationsByCompany.get(companyId) ?? [];
}

export function getCompanyClients(companyId: string): Project[] {
  return Clients.filter((project) => project.company.id === companyId);
}

export function getCompanyUsers(companyId: string): PlatformUser[] {
  return PLATFORM_USERS.filter((user) => user.company.id === companyId);
}

/** Company references for filter dropdowns, alphabetised. */
export const COMPANY_REFS: EntityRef[] = COMPANIES.map(({ id, name }) => ({ id, name })).sort((a, b) =>
  a.name.localeCompare(b.name),
);

export const ALL_COMPANY_INTEGRATIONS: CompanyIntegration[] = COMPANIES.flatMap((company) =>
  getCompanyIntegrations(company.id),
);
