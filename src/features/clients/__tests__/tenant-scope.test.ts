/**
 * Admin (company) pages are tenant-scoped. Reading a client there must only ever use the company endpoint
 * (GET /clients/:id/workspace, which the backend guards with clients:read and an x-client-id match); the /super-admin endpoints belong to
 * /super-admin pages and are never a fallback. These tests pin that, including the 403s the Admin Clients pages used to produce.
 *
 * `node --test` runs each file in its own process, so the globals set here cannot leak into other suites.
 */
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";

process.env.NEXT_PUBLIC_DATA_SOURCE = "api";
const COMPANY = "11111111-1111-4111-8111-111111111111";
const CLIENT = "22222222-2222-4222-8222-222222222222";
const setPath = (pathname: string) => { (globalThis as any).window = { location: { pathname } }; };

const { apiClient } = await import("@/lib/api/client");
const { ApiError } = await import("@/types/api");
const { createApiClientsProvider } = await import("../data/api-provider");
const { unavailableClientsProvider } = await import("../data/unavailable-provider");

const workspace = { summary: { company: { id: COMPANY } }, overview: { kind: "overview" }, team: { kind: "team" }, channels: { kind: "channels" }, websiteSeo: { kind: "seo" }, activity: { entries: [] }, settings: { staff: [] as unknown[] } };
const provider = createApiClientsProvider(unavailableClientsProvider);

beforeEach(() => { (globalThis as any).localStorage.setItem("omni_active_company_id", COMPANY); setPath("/admin/clients"); });
afterEach(() => mock.restoreAll());

const paths = (request: ReturnType<typeof mock.method>) => request.mock.calls.map((call) => String((call.arguments[0] as { path: string }).path));

describe("Admin pages read clients through the company endpoint only", () => {
  it("every client read uses /clients/:id/workspace and never a /super-admin path", async () => {
    const request = mock.method(apiClient, "request", async () => structuredClone(workspace) as never);
    await provider.getClient(CLIENT);
    await provider.getOverview(CLIENT);
    await provider.getTeam(CLIENT);
    await provider.getChannels(CLIENT);
    await provider.getWebsiteSeo(CLIENT);
    await provider.getActivity(CLIENT, {} as never);
    await provider.getSettings(CLIENT);
    const used = paths(request);
    assert.equal(used.length, 7);
    for (const path of used) assert.equal(path, `/clients/${CLIENT}/workspace`);
  });

  it("does not ask for the platform staff list: company users cannot read it", async () => {
    const request = mock.method(apiClient, "request", async () => structuredClone(workspace) as never);
    await provider.getSettings(CLIENT);
    assert.ok(!paths(request).some((path) => path.startsWith("/super-admin")));
  });

  it("shows the real company error (403) instead of retrying on a super-admin endpoint", async () => {
    const forbidden = new ApiError({ code: "FORBIDDEN", message: "You do not have access to this client.", status: 403 });
    const request = mock.method(apiClient, "request", async () => { throw forbidden; });
    await assert.rejects(provider.getClient(CLIENT), (error) => error === forbidden);
    assert.equal(request.mock.callCount(), 1);
  });

  it("an empty or malformed client id makes no request at all", async () => {
    const request = mock.method(apiClient, "request", async () => structuredClone(workspace) as never);
    for (const id of ["", "not-a-uuid"]) {
      await assert.rejects(provider.getClient(id), (error: any) => error?.code === "NO_CLIENT_SELECTED" && error.status === 400);
    }
    assert.equal(request.mock.callCount(), 0);
  });

  it("without a selected company the Admin side makes no request either", async () => {
    (globalThis as any).localStorage.removeItem("omni_active_company_id");
    const request = mock.method(apiClient, "request", async () => structuredClone(workspace) as never);
    await assert.rejects(provider.getOverview(CLIENT), (error: any) => error?.code === "NO_COMPANY_SELECTED" && error.status === 400);
    assert.equal(request.mock.callCount(), 0);
  });
});

describe("Super Admin pages keep their own endpoints", () => {
  it("reads through /super-admin/clients/:id/workspace and may list platform staff", async () => {
    setPath("/super-admin/clients");
    const request = mock.method(apiClient, "request", async (spec: { path: string }) => (spec.path === "/super-admin/staff" ? [{ id: "s1", name: "Asha" }] : structuredClone(workspace)) as never);
    const settings = await provider.getSettings(CLIENT);
    assert.deepEqual(paths(request), [`/super-admin/clients/${CLIENT}/workspace`, "/super-admin/staff"]);
    assert.equal((settings.staff as unknown[]).length, 1);
  });
});
