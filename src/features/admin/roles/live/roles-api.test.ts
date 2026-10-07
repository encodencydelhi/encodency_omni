import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toAdminRoles, type ApiRolesResponse } from "./roles-api";

const catalogue = [
  { capability: "campaigns:read", domain: "campaigns", action: "read" },
  { capability: "campaigns:write", domain: "campaigns", action: "write" },
  { capability: "content:read", domain: "content", action: "read" },
  { capability: "content:write", domain: "content", action: "write" },
  { capability: "content:publish", domain: "content", action: "publish" },
  { capability: "team:manage", domain: "team", action: "manage" },
];

const response: ApiRolesResponse = {
  catalogue,
  roles: [
    { key: "ADMIN", name: "Admin", description: "d", capabilities: catalogue.map((c) => c.capability), memberCount: 1, members: [{ membershipId: "m1", name: null, email: "a@x.test", jobTitle: null, joinedAt: "2026-10-01T00:00:00Z" }] },
    { key: "MANAGER", name: "Manager", description: "d", capabilities: ["campaigns:read", "campaigns:write", "content:read", "content:write"], memberCount: 0, members: [] },
    { key: "VIEWER", name: "Viewer", description: "d", capabilities: ["campaigns:read", "content:read"], memberCount: 0, members: [] },
  ],
};

describe("roles mapper", () => {
  const { roles } = toAdminRoles(response);
  const level = (slug: string, module: string) => roles.find((r) => r.slug === slug)!.moduleAccess.find((m) => m.module === module)!.level;

  it("derives access levels from the real capabilities", () => {
    assert.equal(level("admin", "Content"), "full");
    assert.equal(level("manager", "Content"), "manage");
    assert.equal(level("viewer", "Content"), "view");
    assert.equal(level("viewer", "Team"), "none");
    assert.equal(level("manager", "Campaigns"), "full");
  });

  it("marks only granted capabilities as allowed", () => {
    const manager = roles.find((r) => r.slug === "manager")!;
    assert.equal(manager.permissions.find((p) => p.key === "content:publish")!.allowed, false);
    assert.equal(manager.permissions.find((p) => p.key === "content:write")!.label, "Create and edit content");
  });

  it("keeps role metadata honest and falls back to the email for unnamed members", () => {
    const admin = roles.find((r) => r.slug === "admin")!;
    assert.equal(admin.isProtected, true);
    assert.equal(admin.assignedMemberCount, 1);
    assert.equal(admin.members[0]!.name, "a@x.test");
    assert.deepEqual(admin.members[0]!.clients, []);
    assert.equal(roles.find((r) => r.slug === "viewer")!.scope, "read_only");
    assert.equal(admin.lastUpdated, "");
  });
});
