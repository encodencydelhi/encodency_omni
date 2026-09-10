import { ApiError } from "@/types/api";
import type { ChangeCompanyPlanInput, Company, CompanyStatusChangeInput } from "@/types/domain/company";
import type { PlatformUser } from "@/types/domain/user";
import type { Project } from "@/types/domain/project";
import { buildCompanyActivity } from "../data/dashboard";
import { SUBSCRIPTIONS } from "../data/commerce";
import { AUDIT_LOG } from "../data/control";
import { getPlanByTier } from "../data/plans";
import {
  COMPANIES,
  COMPANY_REFS,
  findCompany,
  getCompanyIntegrations,
  getCompanyClients,
  getCompanyUsers,
  PLATFORM_USERS,
  Clients,
} from "../data/tenants";
import { getCompanyUsage } from "../data/usage";
import { compare, dateAtOrAfter, dateAtOrBefore, equals, queryCollection } from "../lib/collection";
import type { MockRoutes } from "../lib/router";

/**
 * Mutable overlays.
 *
 * Write operations record their effect here so the UI reflects an action after
 * a cache invalidation, exactly as it will against a real database.
 */
const companyOverrides = new Map<string, Partial<Company>>();
const userOverrides = new Map<string, Partial<PlatformUser>>();

function resolveCompany(company: Company): Company {
  const override = companyOverrides.get(company.id);
  return override ? { ...company, ...override } : company;
}

function resolveUser(user: PlatformUser): PlatformUser {
  const override = userOverrides.get(user.id);
  return override ? { ...user, ...override } : user;
}

function allCompanies(): Company[] {
  return COMPANIES.map(resolveCompany);
}

function allUsers(): PlatformUser[] {
  return PLATFORM_USERS.map(resolveUser);
}

function requireCompany(id: string): Company {
  const company = findCompany(id);
  if (!company) {
    throw new ApiError({ code: "NOT_FOUND", status: 404, message: `Company ${id} was not found.` });
  }
  return resolveCompany(company);
}

const companyQueryConfig = {
  searchable: (company: Company) => [company.name, company.slug, company.primaryContact.email, company.industry],
  filters: {
    status: equals<Company>((company) => company.status),
    planTier: equals<Company>((company) => company.planTier),
    createdFrom: dateAtOrAfter<Company>((company) => company.createdAt),
    createdTo: dateAtOrBefore<Company>((company) => company.createdAt),
  },
  sorters: {
    name: compare.text<Company>((company) => company.name),
    status: compare.text<Company>((company) => company.status),
    planTier: compare.text<Company>((company) => company.planTier),
    Clients: compare.number<Company>((company) => company.counts.Clients),
    users: compare.number<Company>((company) => company.counts.users),
    usagePercent: compare.number<Company>((company) => company.usagePercent),
    createdAt: compare.date<Company>((company) => company.createdAt),
    lastActivityAt: compare.date<Company>((company) => company.lastActivityAt),
  },
  defaultSort: { field: "lastActivityAt", direction: "desc" as const },
};

const userQueryConfig = {
  searchable: (user: PlatformUser) => [user.name, user.email, user.company.name],
  filters: {
    status: equals<PlatformUser>((user) => user.status),
    role: equals<PlatformUser>((user) => user.role),
    companyId: equals<PlatformUser>((user) => user.company.id),
  },
  sorters: {
    name: compare.text<PlatformUser>((user) => user.name),
    company: compare.text<PlatformUser>((user) => user.company.name),
    role: compare.text<PlatformUser>((user) => user.role),
    status: compare.text<PlatformUser>((user) => user.status),
    lastLoginAt: compare.date<PlatformUser>((user) => user.lastLoginAt),
    createdAt: compare.date<PlatformUser>((user) => user.createdAt),
  },
  defaultSort: { field: "createdAt", direction: "desc" as const },
};

const projectQueryConfig = {
  searchable: (project: Project) => [project.name, project.company.name, project.websiteUrl],
  filters: {
    status: equals<Project>((project) => project.status),
    seoHealth: equals<Project>((project) => project.seoHealth),
    companyId: equals<Project>((project) => project.company.id),
    hasIntegrationIssue: (project: Project, value: string) =>
      value === "true" ? project.disconnectedChannels.length > 0 : project.disconnectedChannels.length === 0,
  },
  sorters: {
    name: compare.text<Project>((project) => project.name),
    company: compare.text<Project>((project) => project.company.name),
    status: compare.text<Project>((project) => project.status),
    leadsLast30Days: compare.number<Project>((project) => project.leadsLast30Days),
    seoScore: compare.number<Project>((project) => project.seoScore),
    lastActivityAt: compare.date<Project>((project) => project.lastActivityAt),
    createdAt: compare.date<Project>((project) => project.createdAt),
  },
  defaultSort: { field: "lastActivityAt", direction: "desc" as const },
};

export const tenantRoutes: MockRoutes = {
  /* Literal paths are registered before parameterised ones so they win. */
  "GET /companies/refs": () => COMPANY_REFS,

  "GET /companies": ({ query }) => queryCollection(allCompanies(), query, companyQueryConfig),

  "GET /companies/:id": ({ params }) => requireCompany(params.id ?? ""),

  "GET /companies/:id/overview": ({ params }) => {
    const company = requireCompany(params.id ?? "");
    const subscription = SUBSCRIPTIONS.find((item) => item.company.id === company.id);
    const plan = getPlanByTier(company.planTier);

    return {
      company,
      Clients: getCompanyClients(company.id).map((project) => ({ id: project.id, name: project.name })),
      recentActivity: buildCompanyActivity(company.id).slice(0, 6),
      subscriptionSummary: {
        planName: plan.name,
        billingCycle: subscription?.billingCycle ?? "monthly",
        renewsAt: subscription?.renewsAt ?? company.createdAt,
        amountMinor: subscription?.amountMinor ?? plan.monthlyPriceMinor,
        currency: plan.currency,
      },
    };
  },

  "GET /companies/:id/Clients": ({ params, query }) =>
    queryCollection(getCompanyClients(params.id ?? ""), query, projectQueryConfig),

  "GET /companies/:id/users": ({ params, query }) =>
    queryCollection(getCompanyUsers(params.id ?? "").map(resolveUser), query, userQueryConfig),

  "GET /companies/:id/integrations": ({ params }) => getCompanyIntegrations(params.id ?? ""),

  "GET /companies/:id/subscription": ({ params }) => {
    const subscription = SUBSCRIPTIONS.find((item) => item.company.id === params.id);
    if (!subscription) {
      throw new ApiError({ code: "NOT_FOUND", status: 404, message: "No subscription for this company." });
    }
    return subscription;
  },

  "GET /companies/:id/usage": ({ params }) => getCompanyUsage(params.id ?? ""),

  "GET /companies/:id/activity": ({ params }) => buildCompanyActivity(params.id ?? ""),

  "GET /companies/:id/audit-logs": ({ params, query }) =>
    queryCollection(
      AUDIT_LOG.filter((entry) => entry.company?.id === params.id),
      query,
      {
        searchable: (entry) => [entry.action, entry.actor.name, entry.resource.label],
        sorters: { createdAt: compare.date((entry) => entry.createdAt) },
        defaultSort: { field: "createdAt", direction: "desc" },
      },
    ),

  "PATCH /companies/:id/status": ({ params, body }) => {
    const company = requireCompany(params.id ?? "");
    const { status } = (body ?? {}) as CompanyStatusChangeInput;

    companyOverrides.set(company.id, { ...companyOverrides.get(company.id), status });
    return { ...company, status };
  },

  "PATCH /companies/:id/plan": ({ params, body }) => {
    const company = requireCompany(params.id ?? "");
    const { planTier } = (body ?? {}) as ChangeCompanyPlanInput;
    const plan = getPlanByTier(planTier);

    const next = { planTier, mrrMinor: plan.monthlyPriceMinor };
    companyOverrides.set(company.id, { ...companyOverrides.get(company.id), ...next });
    return { ...company, ...next };
  },

  "GET /users": ({ query }) => queryCollection(allUsers(), query, userQueryConfig),

  "GET /users/:id": ({ params }) => {
    const user = allUsers().find((item) => item.id === params.id);
    if (!user) {
      throw new ApiError({ code: "NOT_FOUND", status: 404, message: "User not found." });
    }
    return user;
  },

  "PATCH /users/:id/status": ({ params, body }) => {
    const id = params.id ?? "";
    const { status } = (body ?? {}) as { status: PlatformUser["status"] };
    const user = allUsers().find((item) => item.id === id);

    if (!user) {
      throw new ApiError({ code: "NOT_FOUND", status: 404, message: "User not found." });
    }

    userOverrides.set(id, { ...userOverrides.get(id), status });
    return { ...user, status };
  },

  "GET /Clients": ({ query }) => queryCollection(Clients, query, projectQueryConfig),
};
