import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ROLE_PERMISSIONS, type InternalRole, type Permission } from "@/types/domain/team";
import { deriveCapabilities, type CompanyCapabilityKey } from "../data/capabilities";

const forRole = (role: InternalRole) => {
  const granted = new Set<Permission>(ROLE_PERMISSIONS[role]);
  return deriveCapabilities((permission) => granted.has(permission));
};

const KEYS: CompanyCapabilityKey[] = [
  "canViewCompanies",
  "canCreateCompany",
  "canEditCompany",
  "canSuspendCompany",
  "canReactivateCompany",
  "canArchiveCompany",
  "canManageSubscription",
  "canManageBilling",
  "canApplyUsageOverride",
  "canViewCompanySecurity",
  "canManageCompanySecurity",
  "canTransferOwnership",
  "canManageInternalNotes",
  "canExportCompanyData",
  "canPreviewCompanyWorkspace",
];

describe("company capabilities", () => {
  it("defines every capability the workspace asks for", () => {
    assert.deepEqual(Object.keys(forRole("super_admin")).sort(), [...KEYS].sort());
  });

  it("lets a Super Admin do everything except preview a workspace, which needs secure impersonation infrastructure", () => {
    const caps = forRole("super_admin");
    for (const key of KEYS.filter((item) => item !== "canPreviewCompanyWorkspace")) assert.equal(caps[key], true, key);
    assert.equal(caps.canPreviewCompanyWorkspace, false);
  });

  it("makes support staff read-only for lifecycle, billing and subscriptions", () => {
    const caps = forRole("support");
    assert.equal(caps.canViewCompanies, true);
    assert.equal(caps.canManageInternalNotes, true);
    for (const key of ["canCreateCompany", "canEditCompany", "canSuspendCompany", "canArchiveCompany", "canManageSubscription", "canManageBilling", "canTransferOwnership"] as const) {
      assert.equal(caps[key], false, key);
    }
  });

  it("keeps billing and plan powers with finance, and lifecycle powers with operations", () => {
    const finance = forRole("finance");
    assert.equal(finance.canManageBilling, true);
    assert.equal(finance.canManageSubscription, true);
    assert.equal(finance.canSuspendCompany, false);

    const operations = forRole("operations");
    assert.equal(operations.canSuspendCompany, true);
    assert.equal(operations.canManageSubscription, false);
  });

  it("reserves archiving for staff who also hold settings authority", () => {
    assert.equal(forRole("operations").canArchiveCompany, false, "companies:write alone is not enough");
    assert.equal(forRole("super_admin").canArchiveCompany, true);
  });

  it("grants nothing to someone with no permissions", () => {
    const caps = deriveCapabilities(() => false);
    assert.ok(KEYS.every((key) => caps[key] === false));
  });
});
