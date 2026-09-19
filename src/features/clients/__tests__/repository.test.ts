/**
 * Behaviour of the Clients repository through the demo provider: what a mutation
 * does, what it refuses to do, and that Companies and Clients read one dataset.
 */
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

// The provider simulates latency; the tests do not need to wait for it.
process.env.NEXT_PUBLIC_MOCK_LATENCY_MS = "0";
const { clientsRepository: repo } = await import("../data/repository");
const { companiesRepository: companies } = await import("@/features/companies/data/repository");
const { ApiError } = await import("@/types/api");

const actor = { id: "stf_001", name: "Aditya Raghunath" };
const ALL = { pageSize: 500 };

async function rejects(promise: Promise<unknown>, code: string) {
  await assert.rejects(promise, (error: unknown) => ApiError.isApiError(error) && error.code === code, `expected ${code}`);
}

beforeEach(async () => {
  await repo.resetDemoData?.();
});

async function everyClient() {
  return (await repo.listClients(ALL)).data;
}

/** An active company that can take a new client and has members to assign. */
async function eligibleCompany() {
  const list = await repo.listCreationCompanies();
  const found = list.find((company) => company.eligibility.ok && company.eligibleMembers >= 2);
  assert.ok(found, "the dataset must contain an eligible company");
  return found;
}

async function activeClientWithTeam() {
  for (const summary of await everyClient()) {
    if (summary.workspace !== "active" || summary.counts.activeMembers < 2 || summary.company.accountStatus !== "active") continue;
    return summary;
  }
  throw new Error("no active client with two active members");
}

describe("mode", () => {
  it("resolves to the demo provider while mock mode is on", () => {
    assert.equal(repo.mode, "mock");
  });
});

describe("portfolio and list agree", () => {
  it("derives every KPI from the same records the table shows", async () => {
    const portfolio = await repo.getPortfolio();
    const rows = await everyClient();

    assert.equal(portfolio.total, rows.length);
    assert.equal(portfolio.workspace.active + portfolio.workspace.paused + portfolio.workspace.archived, portfolio.total);
    assert.equal(portfolio.companies, new Set(rows.map((row) => row.company.id)).size);
    assert.equal(portfolio.connectedAccounts, rows.reduce((sum, row) => sum + row.counts.connections, 0), "counts accounts, not providers");
    assert.equal(portfolio.healthyAccounts + portfolio.attentionAccounts, portfolio.connectedAccounts);

    const pending = await repo.listClients({ onboarding: "pending", ...ALL });
    assert.equal(portfolio.onboardingPending, pending.data.length);
    const atRisk = await repo.listClients({ health: "at_risk", ...ALL });
    assert.equal(portfolio.needsAttention, atRisk.data.length);
    const paused = await repo.listClients({ workspace: "paused", ...ALL });
    assert.equal(portfolio.workspace.paused, paused.data.length);
  });

  it("gives every client a unique CL-#### id", async () => {
    const ids = (await everyClient()).map((row) => row.displayId);
    assert.ok(ids.every((id) => /^CL-\d{4}$/.test(id)));
    assert.equal(new Set(ids).size, ids.length);
  });

  it("is stable between calls", async () => {
    assert.deepEqual(await repo.getPortfolio(), await repo.getPortfolio());
  });
});

describe("tenant isolation", () => {
  it("keeps every client, website and connection inside its own company", async () => {
    const directory = new Set((await companies.getDirectory()).map((entry) => entry.id));
    for (const row of await everyClient()) {
      assert.ok(directory.has(row.company.id), `${row.client.id} points at an unknown company`);
      assert.equal(row.client.companyId, row.company.id);
      for (const site of row.websites) {
        assert.equal(site.companyId, row.company.id);
        assert.equal(site.clientId, row.client.id);
      }
    }
    const sample = (await everyClient()).filter((row) => row.counts.connections > 0).slice(0, 12);
    for (const row of sample) {
      const overview = await repo.getOverview(row.client.id);
      for (const connection of overview.connections) {
        assert.equal(connection.companyId, row.company.id);
        assert.equal(connection.clientId, row.client.id);
      }
    }
  });

  it("assigns only members of the client's own company", async () => {
    const row = await activeClientWithTeam();
    const team = await repo.getTeam(row.client.id);
    const users = await companies.getUsers(row.company.id);
    const memberIds = new Set(users.users.map((user) => user.id));
    for (const assignment of team.assignments) assert.ok(memberIds.has(assignment.membershipId));
    for (const member of team.eligibleMembers) assert.ok(memberIds.has(member.membershipId));
  });

  it("reports an unknown client as not found", async () => {
    await rejects(repo.getClient("prj_does_not_exist"), "NOT_FOUND");
    await rejects(repo.getTeam("prj_does_not_exist"), "NOT_FOUND");
    await rejects(repo.getSettings("prj_does_not_exist"), "NOT_FOUND");
  });
});

describe("filters", () => {
  it("narrows by company, workspace, provider, website and text", async () => {
    const rows = await everyClient();
    const company = rows[0]!.company.id;
    const byCompany = await repo.listClients({ company, ...ALL });
    assert.ok(byCompany.data.length > 0 && byCompany.data.every((row) => row.company.id === company));

    const archived = await repo.listClients({ workspace: "archived", ...ALL });
    assert.ok(archived.data.every((row) => row.workspace === "archived"));

    const withProvider = rows.find((row) => row.connectedProviders.length > 0)!;
    const provider = withProvider.connectedProviders[0]!;
    const byProvider = await repo.listClients({ provider, ...ALL });
    assert.ok(byProvider.data.every((row) => row.connectedProviders.includes(provider)));

    const noSite = await repo.listClients({ website: "none", ...ALL });
    assert.ok(noSite.data.length > 0 && noSite.data.every((row) => row.primaryWebsite === null));

    const domain = rows.find((row) => row.primaryWebsite)!.primaryWebsite!.domain;
    const bySearch = await repo.listClients({ search: domain, ...ALL });
    assert.ok(bySearch.data.some((row) => row.primaryWebsite?.domain === domain));
    const byId = await repo.listClients({ search: rows[0]!.displayId, ...ALL });
    assert.equal(byId.data[0]?.client.id, rows[0]!.client.id);
  });

  it("sorts and paginates without losing or repeating rows", async () => {
    const first = await repo.listClients({ pageSize: 10, page: 1, sort: { field: "name", direction: "asc" } });
    const second = await repo.listClients({ pageSize: 10, page: 2, sort: { field: "name", direction: "asc" } });
    const ids = new Set([...first.data, ...second.data].map((row) => row.client.id));
    assert.equal(ids.size, 20);
    assert.equal(first.pagination.total, (await everyClient()).length);
    const names = first.data.map((row) => row.client.name);
    assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)));
  });
});

describe("health never contradicts incidents", () => {
  it("is not healthy while a website is down or posts are failing", async () => {
    for (const row of await everyClient()) {
      if (row.workspace !== "active") {
        assert.equal(row.health.status, "not_enough_data", `${row.client.id} is ${row.workspace}`);
        continue;
      }
      const down = row.primaryWebsite?.availability === "down";
      const failing = row.operations.failedPosts >= 2;
      if (down || failing) assert.equal(row.health.status, "critical", `${row.client.id} has an incident but reads ${row.health.status}`);
      if (row.attention.some((item) => item.severity === "critical")) assert.equal(row.health.status, "critical");
      assert.ok(row.health.reason.length > 0);
    }
  });
});

describe("create client", () => {
  it("appears everywhere: list, KPIs, company counts and activity", async () => {
    const company = await eligibleCompany();
    const before = await repo.getPortfolio();
    const companyBefore = await companies.getCompany(company.id);
    const members = await repo.listEligibleMembers(company.id);
    const [lead] = members;

    const created = await repo.createClient(
      { companyId: company.id, name: "Harbour Kitchen", industry: "FMCG", website: "harbourkitchen.test.in", timezone: "Asia/Kolkata", language: "English", memberIds: members.slice(0, 2).map((m) => m.membershipId), leadUserId: lead!.membershipId },
      actor,
    );

    assert.equal(created.workspace, "active");
    assert.equal(created.company.id, company.id);
    assert.equal(created.onboarding.status, "in_progress", "starts onboarding; a fresh client is never Completed");
    assert.equal(created.counts.connections, 0, "no fabricated connections");
    assert.equal(created.lead?.membershipId, lead!.membershipId);

    const after = await repo.getPortfolio();
    assert.equal(after.total, before.total + 1);
    assert.equal(after.workspace.active, before.workspace.active + 1);
    assert.equal(after.newThisMonth, before.newThisMonth + 1);

    const companyAfter = await companies.getCompany(company.id);
    assert.equal(companyAfter.counts.clients, companyBefore.counts.clients + 1, "the company's client count follows");

    const inCompany = await companies.getClients(company.id);
    assert.ok(inCompany.clients.some((client) => client.id === created.client.id), "the Companies Clients tab sees it");

    const activity = await repo.getActivity(created.client.id, {});
    assert.ok(activity.entries.some((entry) => entry.action === "client.created"));
  });

  it("rejects a missing name, a bad website, a bad email and foreign or inactive members", async () => {
    const company = await eligibleCompany();
    const base = { companyId: company.id, industry: "Retail", timezone: "Asia/Kolkata", language: "English", memberIds: [] as string[] };

    await assert.rejects(repo.createClient({ ...base, name: "  " }, actor), (error: unknown) => ApiError.isApiError(error) && Boolean(error.fieldErrors?.name));
    await assert.rejects(repo.createClient({ ...base, name: "A", website: "not a url" }, actor), (error: unknown) => ApiError.isApiError(error) && Boolean(error.fieldErrors?.website));
    await assert.rejects(repo.createClient({ ...base, name: "A", contactEmail: "nope" }, actor), (error: unknown) => ApiError.isApiError(error) && Boolean(error.fieldErrors?.contactEmail));

    const other = (await repo.listCreationCompanies()).find((item) => item.id !== company.id && item.eligibleMembers > 0)!;
    const foreign = (await repo.listEligibleMembers(other.id))[0]!;
    await assert.rejects(repo.createClient({ ...base, name: "Foreign", memberIds: [foreign.membershipId] }, actor), (error: unknown) => ApiError.isApiError(error) && Boolean(error.fieldErrors?.members));
  });

  it("refuses companies that are not active or are at their client limit, without raising the limit", async () => {
    const blocked = (await repo.listCreationCompanies()).filter((item) => !item.eligibility.ok);
    assert.ok(blocked.length > 0, "the dataset must contain a blocked company");
    for (const company of blocked) {
      await rejects(repo.createClient({ companyId: company.id, name: "Blocked", industry: "Retail", timezone: "Asia/Kolkata", language: "English", memberIds: [] }, actor), "CONFLICT");
      const after = (await repo.listCreationCompanies()).find((item) => item.id === company.id)!;
      assert.equal(after.clientLimit, company.clientLimit, "limits are never raised silently");
      assert.equal(after.clientsUsed, company.clientsUsed);
    }
  });

  it("fills the last slot and then blocks the next client", async () => {
    const list = await repo.listCreationCompanies();
    const tight = list.find((item) => item.eligibility.ok && item.availableSlots === 1);
    if (!tight) return; // the seed has no company with exactly one slot left
    const base = { companyId: tight.id, industry: "Retail", timezone: "Asia/Kolkata", language: "English", memberIds: [] as string[] };
    await repo.createClient({ ...base, name: "Last slot" }, actor);
    await rejects(repo.createClient({ ...base, name: "One too many" }, actor), "CONFLICT");
  });
});

describe("edit client", () => {
  it("updates identity everywhere and keeps the parent company", async () => {
    const row = await activeClientWithTeam();
    const updated = await repo.updateClient(
      row.client.id,
      {
        name: "Renamed Client",
        displayName: "Renamed",
        industry: "Media",
        description: "New description",
        contactEmail: "hello@renamed.test.in",
        contactPhone: null,
        logoDataUrl: null,
        timezone: "Europe/London",
        language: "French",
        reportingPeriod: "90d",
        leadUserId: null,
        primaryWebsite: "renamed.test.in",
      },
      actor,
    );
    assert.equal(updated.client.name, "Renamed Client");
    assert.equal(updated.company.id, row.company.id);
    assert.equal(updated.profile.timezone, "Europe/London");
    assert.equal(updated.primaryWebsite?.domain, "renamed.test.in");
    assert.equal(updated.lead, null);

    const inList = (await repo.listClients({ search: "Renamed Client", ...ALL })).data;
    assert.equal(inList[0]?.client.id, row.client.id);
    const inCompany = await companies.getClients(row.company.id);
    assert.equal(inCompany.clients.find((client) => client.id === row.client.id)?.name, "Renamed Client");

    const activity = await repo.getActivity(row.client.id, {});
    assert.ok(activity.entries.length > 0);
  });

  it("validates name, contact and lead", async () => {
    const row = await activeClientWithTeam();
    const base = {
      name: row.client.name,
      displayName: row.profile.displayName,
      industry: row.profile.industry,
      description: "",
      contactEmail: null,
      contactPhone: null,
      logoDataUrl: null,
      timezone: row.profile.timezone,
      language: row.profile.language,
      reportingPeriod: row.profile.reportingPeriod,
      leadUserId: null,
      primaryWebsite: null,
    };
    await rejects(repo.updateClient(row.client.id, { ...base, name: "" }, actor), "VALIDATION_FAILED");
    await rejects(repo.updateClient(row.client.id, { ...base, contactEmail: "bad" }, actor), "VALIDATION_FAILED");
    await rejects(repo.updateClient(row.client.id, { ...base, leadUserId: "usr_not_here" }, actor), "VALIDATION_FAILED");
  });
});

describe("lifecycle", () => {
  it("pauses and resumes, updating status, KPIs, company view and history", async () => {
    const row = await activeClientWithTeam();
    const before = await repo.getPortfolio();

    const paused = await repo.changeLifecycle([row.client.id], { kind: "pause", reason: "billing", note: "Invoice dispute" }, actor);
    assert.deepEqual(paused.updated, [row.client.id]);
    const afterPause = await repo.getClient(row.client.id);
    assert.equal(afterPause.workspace, "paused");
    assert.equal(afterPause.pause?.reason, "billing");
    assert.equal(afterPause.health.status, "not_enough_data");
    const portfolio = await repo.getPortfolio();
    assert.equal(portfolio.workspace.paused, before.workspace.paused + 1);
    assert.equal(portfolio.workspace.active, before.workspace.active - 1);
    const inCompany = await companies.getClients(row.company.id);
    assert.equal(inCompany.clients.find((client) => client.id === row.client.id)?.status, "paused");

    const settings = await repo.getSettings(row.client.id);
    assert.ok(settings.lifecycle.events.some((event) => event.type === "paused"));

    await repo.changeLifecycle([row.client.id], { kind: "resume", note: "" }, actor);
    const resumed = await repo.getClient(row.client.id);
    assert.equal(resumed.workspace, "active");
    assert.equal(resumed.pause, null);
  });

  it("archives without deleting, blocks further edits, and keeps the client slot", async () => {
    const row = await activeClientWithTeam();
    const usedBefore = (await repo.listCreationCompanies()).find((item) => item.id === row.company.id)!.clientsUsed;
    const before = await repo.getPortfolio();

    await repo.changeLifecycle([row.client.id], { kind: "archive", note: "" }, actor);
    const archived = await repo.getClient(row.client.id);
    assert.equal(archived.workspace, "archived");
    assert.equal((await repo.getPortfolio()).total, before.total, "archiving never removes a client");

    const usedAfter = (await repo.listCreationCompanies()).find((item) => item.id === row.company.id)!.clientsUsed;
    assert.equal(usedAfter, usedBefore, "one policy: an archived client still counts towards the limit");

    await rejects(repo.setLead(row.client.id, null, actor), "CONFLICT");
    await rejects(repo.addWebsite(row.client.id, { url: "late.test.in", makePrimary: false }, actor), "CONFLICT");
    const skipped = await repo.changeLifecycle([row.client.id], { kind: "pause", reason: "other", note: "x" }, actor);
    assert.equal(skipped.updated.length, 0);
    assert.equal(skipped.skipped.length, 1);
  });

  it("reports what a bulk action skipped and why", async () => {
    const rows = await everyClient();
    const active = rows.find((row) => row.workspace === "active")!;
    const paused = rows.find((row) => row.workspace === "paused")!;
    const result = await repo.changeLifecycle([active.client.id, paused.client.id], { kind: "pause", reason: "operational", note: "" }, actor);
    assert.deepEqual(result.updated, [active.client.id]);
    assert.equal(result.skipped[0]?.id, paused.client.id);
    assert.ok(result.skipped[0]!.reason.length > 0);
  });
});

describe("team access", () => {
  it("assigns, changes and removes access for one client only", async () => {
    const row = await activeClientWithTeam();
    const team = await repo.getTeam(row.client.id);
    const candidate = team.eligibleMembers.find((member) => !member.alreadyAssigned);
    assert.ok(candidate, "the company has a member who is not yet assigned");

    const otherClients = (await everyClient()).filter((item) => item.company.id === row.company.id && item.client.id !== row.client.id);
    const others = await Promise.all(otherClients.map(async (item) => (await repo.getTeam(item.client.id)).assignments.length));

    const assigned = await repo.assignMember(row.client.id, { membershipId: candidate.membershipId, level: "viewer" }, actor);
    assert.equal(assigned.counts.assigned, team.assignments.length + 1);
    await rejects(repo.assignMember(row.client.id, { membershipId: candidate.membershipId, level: "viewer" }, actor), "CONFLICT");

    await repo.changeAccess(row.client.id, { membershipId: candidate.membershipId, level: "admin" }, actor);
    const changed = (await repo.getTeam(row.client.id)).assignments.find((item) => item.membershipId === candidate.membershipId);
    assert.equal(changed?.level, "admin");
    await rejects(repo.changeAccess(row.client.id, { membershipId: candidate.membershipId, level: "admin" }, actor), "VALIDATION_FAILED");

    await repo.removeAccess(row.client.id, { membershipId: candidate.membershipId, note: "" }, actor);
    const after = await repo.getTeam(row.client.id);
    assert.ok(!after.assignments.some((item) => item.membershipId === candidate.membershipId));

    // The person still belongs to the company and every other client keeps its own team.
    const users = await companies.getUsers(row.company.id);
    assert.ok(users.users.some((user) => user.id === candidate.membershipId), "the user and membership are never deleted");
    const othersAfter = await Promise.all(otherClients.map(async (item) => (await repo.getTeam(item.client.id)).assignments.length));
    assert.deepEqual(othersAfter, others);
  });

  it("refuses members of another company and members who are not active", async () => {
    const row = await activeClientWithTeam();
    const otherCompany = (await repo.listCreationCompanies()).find((item) => item.id !== row.company.id && item.eligibleMembers > 0)!;
    const foreign = (await repo.listEligibleMembers(otherCompany.id))[0]!;
    await rejects(repo.assignMember(row.client.id, { membershipId: foreign.membershipId, level: "viewer" }, actor), "NOT_FOUND");

    const users = await companies.getUsers(row.company.id);
    const inactive = users.users.find((user) => user.status !== "active" && !user.clientAccessIds.includes(row.client.id));
    if (inactive) await rejects(repo.assignMember(row.client.id, { membershipId: inactive.id, level: "viewer" }, actor), "CONFLICT");
  });

  it("moves the lead when the lead loses access, and refuses a replacement who is not assigned", async () => {
    for (const row of await everyClient()) {
      if (row.workspace !== "active" || !row.lead) continue;
      const team = await repo.getTeam(row.client.id);
      const replacement = team.assignments.find((item) => item.membershipId !== row.lead!.membershipId && item.membershipStatus === "active");
      if (!replacement) continue;

      await rejects(repo.removeAccess(row.client.id, { membershipId: row.lead.membershipId, newLeadId: "usr_nobody", note: "" }, actor), "CONFLICT");
      const after = await repo.removeAccess(row.client.id, { membershipId: row.lead.membershipId, newLeadId: replacement.membershipId, note: "" }, actor);
      assert.equal(after.lead?.membershipId, replacement.membershipId);
      return;
    }
    assert.fail("no client with a lead and a second active member");
  });
});

describe("websites", () => {
  it("adds, promotes and removes websites, and refuses duplicates", async () => {
    const row = await activeClientWithTeam();
    const start = row.websites.length;

    const added = await repo.addWebsite(row.client.id, { url: "https://extra.test.in", makePrimary: true }, actor);
    assert.equal(added.websites.length, start + 1);
    assert.equal(added.primaryWebsite?.domain, "extra.test.in");
    await assert.rejects(repo.addWebsite(row.client.id, { url: "extra.test.in", makePrimary: false }, actor), (error: unknown) => ApiError.isApiError(error) && Boolean(error.fieldErrors?.url));
    await rejects(repo.addWebsite(row.client.id, { url: "nonsense", makePrimary: false }, actor), "VALIDATION_FAILED");

    if (row.primaryWebsite) {
      const back = await repo.setPrimaryWebsite(row.client.id, row.primaryWebsite.id, actor);
      assert.equal(back.primaryWebsite?.id, row.primaryWebsite.id);
      await rejects(repo.setPrimaryWebsite(row.client.id, row.primaryWebsite.id, actor), "CONFLICT");
    }

    const extra = (await repo.getWebsiteSeo(row.client.id)).websites.find((site) => site.domain === "extra.test.in")!;
    const removed = await repo.removeWebsite(row.client.id, extra.id, actor);
    assert.equal(removed.websites.length, start);
    assert.ok(removed.primaryWebsite === null || removed.primaryWebsite.domain !== "extra.test.in");
  });

  it("keeps a client without a website valid, and never counts a measurement id as a connection", async () => {
    const none = (await everyClient()).find((row) => row.primaryWebsite === null);
    assert.ok(none, "some clients have no website");
    const seo = await repo.getWebsiteSeo(none.client.id);
    assert.equal(seo.websites.length, 0);

    for (const row of (await everyClient()).filter((item) => item.primaryWebsite).slice(0, 25)) {
      const { search } = await repo.getWebsiteSeo(row.client.id);
      if (search.ga4State === "connected") assert.ok(row.connectedProviders.includes("website_analytics"));
      if (search.gscState === "connected") assert.ok(row.connectedProviders.includes("search_console"));
    }
  });
});

describe("governance", () => {
  it("lets required onboarding steps change the status, and never blocks on optional ones", async () => {
    const row = (await everyClient()).find((item) => item.workspace === "active" && item.onboarding.status === "in_progress")!;
    const settings = await repo.getSettings(row.client.id);
    const relaxed = Object.fromEntries(Object.keys(settings.onboarding.required).map((key) => [key, false])) as typeof settings.onboarding.required;
    relaxed.identity = true;
    const updated = await repo.setOnboardingRequirements(row.client.id, relaxed, actor);
    assert.equal(updated.onboarding.requiredTotal, 1);
    await rejects(repo.setOnboardingRequirements(row.client.id, relaxed, actor), "VALIDATION_FAILED");
  });

  it("records a reconnection request as a request, never as a refreshed connection", async () => {
    const row = (await everyClient()).find((item) => item.counts.attentionConnections > 0)!;
    const overview = await repo.getOverview(row.client.id);
    const broken = overview.connections.find((connection) => connection.state !== "healthy")!;
    await repo.requestReconnection(row.client.id, broken.id, actor);
    const after = (await repo.getOverview(row.client.id)).connections.find((connection) => connection.id === broken.id)!;
    assert.equal(after.state, broken.state, "no silent reconnect");
    const activity = await repo.getActivity(row.client.id, { module: "channels" });
    assert.ok(activity.entries.some((entry) => entry.action === "channel.reconnection_requested" && /nothing was sent/i.test(entry.summary)));
    await rejects(repo.requestReconnection(row.client.id, "int_not_mine", actor), "NOT_FOUND");
  });

  it("only assigns platform reviewers who are active internal staff", async () => {
    const row = (await everyClient())[0]!;
    await rejects(repo.setPlatformReviewer(row.client.id, "stf_nobody", actor), "VALIDATION_FAILED");
  });
});

describe("activity", () => {
  it("filters by module, result, actor and text, newest first", async () => {
    const row = (await everyClient()).find((item) => item.counts.connections > 0)!;
    const all = await repo.getActivity(row.client.id, {});
    const times = all.entries.map((entry) => Date.parse(entry.at));
    assert.deepEqual(times, [...times].sort((a, b) => b - a));
    assert.equal(all.total, all.entries.length);

    const channels = await repo.getActivity(row.client.id, { module: "channels" });
    assert.ok(channels.entries.every((entry) => entry.module === "channels"));
    assert.equal(channels.total, all.total, "total is the unfiltered count");

    const actor0 = all.actors[0]!;
    const byActor = await repo.getActivity(row.client.id, { actor: actor0 });
    assert.ok(byActor.entries.every((entry) => entry.actor.name === actor0));

    const nothing = await repo.getActivity(row.client.id, { search: "zzzz-no-such-text" });
    assert.equal(nothing.entries.length, 0);
    for (const entry of all.entries) {
      assert.equal(entry.clientId, row.client.id);
      assert.equal(entry.companyId, row.company.id);
    }
  });
});

describe("exports", () => {
  it("exports exactly the filtered or selected clients", async () => {
    const filtered = await repo.exportClients({ query: { workspace: "paused" } });
    assert.ok(filtered.length > 0 && filtered.every((row) => row.workspace === "paused"));
    const picked = (await everyClient()).slice(0, 3).map((row) => row.client.id);
    const selected = await repo.exportClients({ ids: picked });
    assert.deepEqual(selected.map((row) => row.client.id).sort(), [...picked].sort());
  });
});
