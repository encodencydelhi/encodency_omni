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
/** Pending invitation tokens for demo accept flow (token → email). */
const pendingInvitations = new Map<string, { email: string; companyId: string; expiresAt: number }>();

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

  "GET /companies/:id/projects": ({ params, query }) =>
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

  "GET /projects": ({ query }) => queryCollection(Clients, query, projectQueryConfig),

  "POST /companies/:companyId/invitations": ({ params, body }) => {
    const companyId = params.companyId ?? "";
    const { email, systemRole, clientRestrictions } = (body ?? {}) as {
      email: string;
      systemRole: string;
      clientRestrictions?: string[];
    };
    if (!email || !email.includes("@")) {
      throw new ApiError({ code: "BAD_REQUEST", status: 400, message: "Valid email is required." });
    }
    const token = `mock_inv_token_${Math.random().toString(36).substring(2)}`;
    const expiresAt = Date.now() + 48 * 60 * 60 * 1000;
    pendingInvitations.set(token, { email, companyId, expiresAt });
    return {
      invitationId: `inv_${Date.now().toString(36)}`,
      status: "pending",
      expiresAt: new Date(expiresAt).toISOString(),
      token,
    };
  },

  "POST /super-admin/companies": ({ headers, body }) => {
    const idempotencyKey = headers?.["idempotency-key"];
    if (!idempotencyKey) {
      throw new ApiError({
        code: "BAD_REQUEST",
        status: 400,
        message: "idempotency_key_required",
      });
    }
    const { name, ownerEmail } = (body ?? {}) as { name?: string; ownerEmail?: string };
    if (!name || name.trim().length < 2 || !ownerEmail || !ownerEmail.includes("@")) {
      throw new ApiError({
        code: "BAD_REQUEST",
        status: 400,
        message: "name and ownerEmail are required",
      });
    }
    const id = `cmp_${Date.now().toString(36)}`;
    const expiresAt = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
    return {
      id,
      name: name.trim(),
      status: "ACTIVE",
      archivedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      memberCount: 0,
      clientCount: 0,
      ownerEmail: null,
      ownerOnboarding: {
        state: "invited",
        ownerEmail: ownerEmail.trim().toLowerCase(),
        invitationExpiresAt: expiresAt,
        emailQueued: true,
      },
      logo: null,
    };
  },

  "POST /super-admin/companies/:companyId/owner-invitation/resend": ({ params, body }) => {
    const { ownerEmail } = (body ?? {}) as { ownerEmail?: string };
    const expiresAt = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
    return {
      id: params.companyId,
      name: "Acme Media",
      status: "ACTIVE",
      archivedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      memberCount: 0,
      clientCount: 0,
      ownerEmail: null,
      ownerOnboarding: {
        state: "invited",
        ownerEmail: ownerEmail?.trim().toLowerCase() ?? "owner@example.com",
        invitationExpiresAt: expiresAt,
        emailQueued: true,
      },
      logo: null,
    };
  },

  "POST /invitations/accept": ({ body }) => {
    const { token, password } = (body ?? {}) as { token?: string; password?: string };
    if (!token || typeof password !== "string" || password.length < 8) {
      throw new ApiError({ code: "BAD_REQUEST", status: 400, message: "Token and an 8+ character password are required." });
    }
    const pending = pendingInvitations.get(token);
    if (!pending || pending.expiresAt < Date.now()) {
      throw new ApiError({ code: "FORBIDDEN", status: 403, message: "Invalid or expired invitation" });
    }
    pendingInvitations.delete(token);
    return { status: "accepted", membershipId: `mship_${Date.now().toString(36)}` };
  },

  "POST /invitations/validate": ({ body }) => {
    const { token } = (body ?? {}) as { token?: string };
    if (!token) {
      throw new ApiError({ code: "BAD_REQUEST", status: 400, message: "token is required" });
    }
    const pending = pendingInvitations.get(token);
    return {
      valid: true,
      email: pending?.email ?? "invitee@example.com",
      companyName: "Acme Media",
      systemRole: "OWNER",
      expiresAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      accountExists: false,
    };
  },

  "POST /invitations/finalize": ({ body }) => {
    const { token } = (body ?? {}) as { token?: string };
    if (!token) {
      throw new ApiError({ code: "BAD_REQUEST", status: 400, message: "token is required" });
    }
    return {
      status: "accepted",
      membershipId: `mship_${Date.now().toString(36)}`,
      companyId: "cmp_demo_1",
    };
  },

  "GET /settings/organization": () => {
    return {
      id: "cmp_demo_1",
      name: "Acme Media",
      displayName: "Acme Media",
      legalName: "Acme Media Global Inc.",
      industry: "Marketing",
      website: "https://acme.test",
      contactEmail: "contact@acme.test",
      contactPhone: "+919876543210",
      description: "Full service growth agency.",
      address: {
        street: "123 MG Road",
        city: "Bengaluru",
        state: "Karnataka",
        country: "IN",
        postalCode: "560001",
      },
      taxId: "GSTIN29AAACA0000A1Z5",
      timezone: "Asia/Kolkata",
      currency: "INR",
      revision: 1,
      updatedAt: new Date().toISOString(),
    };
  },

  "PATCH /settings/organization": ({ body }) => {
    const payload = (body ?? {}) as any;
    return {
      id: "cmp_demo_1",
      name: payload.displayName || "Acme Media",
      displayName: payload.displayName || "Acme Media",
      legalName: payload.legalName ?? null,
      industry: payload.industry ?? null,
      website: payload.website ?? null,
      contactEmail: payload.contactEmail ?? null,
      contactPhone: payload.contactPhone ?? null,
      description: payload.description ?? null,
      address: payload.address ?? null,
      taxId: payload.taxId ?? null,
      timezone: payload.timezone ?? "Asia/Kolkata",
      currency: payload.currency ?? "INR",
      revision: (payload.expectedRevision ?? 1) + 1,
      updatedAt: new Date().toISOString(),
    };
  },

  "PATCH /users/me": ({ body }) => {
    const payload = (body ?? {}) as { name?: string; phone?: string | null };
    return {
      id: "usr_me",
      email: "user@example.com",
      name: payload.name ?? "Current User",
      phone: payload.phone ?? null,
      avatarUrl: null,
      systemRole: "OWNER",
      memberships: [],
    };
  },

  "PATCH /team/members/:membershipId/profile": ({ params, body }) => {
    const payload = (body ?? {}) as { jobTitle?: string | null; department?: string | null };
    return {
      id: params.membershipId,
      systemRole: "MEMBER",
      jobTitle: payload.jobTitle ?? null,
      department: payload.department ?? null,
      createdAt: new Date().toISOString(),
      user: {
        id: `usr_${params.membershipId}`,
        email: "member@example.com",
        name: "Team Member",
        avatarUrl: null,
      },
    };
  },

  "GET /super-admin/clients": ({ query }) => {
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.max(1, Number(query?.limit) || 25);
    const search = typeof query?.search === "string" ? query.search.toLowerCase() : "";
    const companyId = typeof query?.companyId === "string" ? query.companyId : undefined;

    const filtered = Clients.filter((c) => {
      if (companyId && c.company.id !== companyId) return false;
      if (search && !c.name.toLowerCase().includes(search)) return false;
      return true;
    });

    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit).map((c) => ({
      id: c.id,
      name: c.name,
      displayName: c.name,
      companyId: c.company.id,
      companyName: c.company.name,
      industry: "Retail",
      website: c.websiteUrl,
      timezone: "Asia/Kolkata",
      language: "en",
      lead: null,
      logo: null,
      revision: 1,
      createdAt: c.createdAt,
      updatedAt: c.createdAt,
    }));

    return {
      items,
      total: filtered.length,
      page,
      limit,
    };
  },

  "PUT /clients/:id/lead": ({ params, body }) => {
    const payload = (body ?? {}) as { leadMembershipId?: string | null };
    return {
      id: params.id,
      companyId: "cmp_demo_1",
      name: "Updated Client",
      displayName: "Updated Client",
      industry: "Retail",
      website: "https://example.com",
      targetAudience: null,
      contactEmail: null,
      contactPhone: null,
      description: null,
      timezone: "Asia/Kolkata",
      language: "en",
      revision: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      logo: null,
      lead: payload.leadMembershipId
        ? {
            membershipId: payload.leadMembershipId,
            userId: `usr_${payload.leadMembershipId}`,
            name: "Assigned Lead",
            email: "lead@example.com",
            avatarUrl: null,
          }
        : null,
    };
  },

  "GET /clients/:id/members": () => {
    return [];
  },

  "POST /clients/:id/members": () => {
    return [];
  },

  "DELETE /clients/:id/members/:membershipId": () => {
    return { removed: true };
  },

  "PUT /team/members/:membershipId/role": ({ params, body }) => {
    const { systemRole } = (body ?? {}) as { systemRole: string };
    return {
      id: params.membershipId,
      systemRole,
      updatedAt: new Date().toISOString(),
    };
  },
};
