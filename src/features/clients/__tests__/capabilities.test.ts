import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ROLE_PERMISSIONS, type InternalRole, type Permission } from "@/types/domain/team";
import { deriveClientCapabilities, type ClientCapabilityKey } from "../data/capabilities";

process.env.NEXT_PUBLIC_MOCK_LATENCY_MS = "0";

const forRole = (role: InternalRole) => {
  const granted = new Set<Permission>(ROLE_PERMISSIONS[role]);
  return deriveClientCapabilities((permission) => granted.has(permission));
};

const KEYS: ClientCapabilityKey[] = [
  "canViewAllClients",
  "canCreateClient",
  "canEditClient",
  "canManageClientTeam",
  "canViewClientConnections",
  "canViewClientWebsiteSeo",
  "canViewClientActivity",
  "canManageClientSettings",
  "canPauseClient",
  "canResumeClient",
  "canArchiveClient",
  "canExportClientData",
];

describe("client capabilities", () => {
  it("defines every capability the workspace asks for", () => {
    const capabilities = forRole("super_admin");
    for (const key of KEYS) assert.equal(typeof capabilities[key], "boolean", key);
    assert.deepEqual(Object.keys(capabilities).sort(), [...KEYS].sort());
  });

  it("grants nothing to someone without read access", () => {
    const none = deriveClientCapabilities(() => false);
    for (const key of KEYS) assert.equal(none[key], false, key);
  });

  it("lets read-only staff look but not change", () => {
    const readOnly = deriveClientCapabilities((permission) => permission === "Clients:read");
    assert.equal(readOnly.canViewAllClients, true);
    assert.equal(readOnly.canViewClientActivity, true);
    assert.equal(readOnly.canViewClientConnections, true);
    for (const key of ["canCreateClient", "canEditClient", "canManageClientTeam", "canManageClientSettings", "canPauseClient", "canResumeClient", "canArchiveClient"] as const) {
      assert.equal(readOnly[key], false, key);
    }
  });

  it("does not let write access alone reach clients", () => {
    const writeOnly = deriveClientCapabilities((permission) => permission === "companies:write");
    for (const key of KEYS) assert.equal(writeOnly[key], false, key);
  });

  it("requires user-management rights to manage a client's team, and settings rights to archive", () => {
    const editor = deriveClientCapabilities((permission) => permission === "Clients:read" || permission === "companies:write");
    assert.equal(editor.canEditClient, true);
    assert.equal(editor.canManageClientTeam, false, "team access needs users:write");
    assert.equal(editor.canArchiveClient, false, "archiving needs settings:write");
  });
});

describe("unavailable provider", () => {
  it("refuses every call instead of returning plausible data", async () => {
    const { unavailableClientsProvider } = await import("../data/unavailable-provider");
    const { ApiError } = await import("@/types/api");
    assert.equal(unavailableClientsProvider.mode, "unavailable");
    for (const call of [
      () => unavailableClientsProvider.listClients({}),
      () => unavailableClientsProvider.getPortfolio(),
      () => unavailableClientsProvider.getClient("prj_x"),
      () => unavailableClientsProvider.createClient({ companyId: "c", name: "n", industry: "i", timezone: "t", language: "l", memberIds: [] }, { id: "a", name: "A" }),
    ]) {
      await assert.rejects(call(), (error: unknown) => ApiError.isApiError(error) && error.code === "SERVICE_UNAVAILABLE");
    }
  });
});
