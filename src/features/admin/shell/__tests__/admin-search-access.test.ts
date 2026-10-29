/**
 * Admin search must only offer what the person is allowed to open: pages and shortcuts are checked against the person's own capabilities
 * (fail closed until they are known), saved recents/pins are re-checked on every open, and saved lists never cross people or Companies.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { CAPABILITY_BY_ID, CAPABILITY_BY_KIND, CHIP_CAPABILITY, isAllowed, requiredCapability, splitScope, storageKey } from "../admin-search-access";

// Mirrors backend SYSTEM_ROLE_CAPABILITIES for the roles under test.
const viewer = new Set(["campaigns:read", "billing:read", "clients:read", "integrations:read", "content:read", "branding:read", "organization:read", "support:read", "automation:read"]);
const manager = new Set([...viewer, "campaigns:write", "clients:write", "content:write", "support:write", "automation:write"]);
const admin = new Set([...manager, "team:manage", "billing:write", "integrations:write", "content:publish", "organization:write", "branding:write"]);
const nothing = new Set<string>();

const page = (id: string, kind = "page") => ({ id, kind });

describe("pages and shortcuts follow the person's capabilities", () => {
  it("fails closed: until capabilities are known only items open to every member are offered", () => {
    assert.equal(isAllowed(page("page-dashboard"), nothing), true);
    assert.equal(isAllowed(page("cmd-ai-assistant", "command"), nothing), true);
    for (const id of ["page-billing", "page-team", "page-clients", "page-support", "page-settings", "cmd-add-client"]) {
      assert.equal(isAllowed(page(id), nothing), false, id);
    }
  });

  it("a Viewer cannot be offered Team, Roles, or any create/connect/invite shortcut", () => {
    for (const id of ["page-team", "page-roles", "cmd-create-post", "cmd-add-lead", "cmd-new-campaign", "cmd-add-client", "cmd-run-audit", "cmd-invite-team", "cmd-connect-channel"]) {
      assert.equal(isAllowed(page(id), viewer), false, id);
    }
    for (const id of ["page-billing", "page-support", "page-clients", "page-campaigns", "page-settings"]) {
      assert.equal(isAllowed(page(id), viewer), true, id);
    }
  });

  it("a Manager can create but not manage the team or connect channels", () => {
    assert.equal(isAllowed(page("cmd-create-post"), manager), true);
    assert.equal(isAllowed(page("cmd-add-client"), manager), true);
    assert.equal(isAllowed(page("page-team"), manager), false);
    assert.equal(isAllowed(page("cmd-invite-team"), manager), false);
    assert.equal(isAllowed(page("cmd-connect-channel"), manager), false);
  });

  it("an Admin is offered everything that has a rule", () => {
    for (const id of Object.keys(CAPABILITY_BY_ID)) assert.equal(isAllowed(page(id), admin), true, id);
  });

  it("every page and shortcut in the search box has a decision: a capability, or explicitly open to all", () => {
    const source = readFileSync(new URL("../admin-search.tsx", import.meta.url), "utf8");
    const ids = Array.from(source.matchAll(/\bid: "((?:page|cmd)-[a-z0-9-]+)"/g), (match) => match[1]!);
    assert.ok(ids.length >= 35, `expected the page and command lists, found ${ids.length}`);
    const openToAll = new Set(["page-dashboard", "cmd-ai-assistant"]);
    const undecided = ids.filter((id) => !CAPABILITY_BY_ID[id] && !openToAll.has(id));
    assert.deepEqual(undecided, [], "add these to CAPABILITY_BY_ID (or to openToAll here, on purpose)");
  });
});

describe("records from the server and saved recents/pins are re-checked", () => {
  it("a saved record of a kind the person can no longer open is dropped", () => {
    assert.equal(isAllowed({ id: "member-1", kind: "member" }, viewer), false);
    assert.equal(isAllowed({ id: "member-1", kind: "member" }, admin), true);
    assert.equal(isAllowed({ id: "ticket-1", kind: "ticket" }, nothing), false);
    assert.equal(isAllowed({ id: "invoice-1", kind: "invoice" }, new Set(["support:read"])), false);
    assert.equal(isAllowed({ id: "invoice-1", kind: "invoice" }, new Set(["billing:read"])), true);
  });

  it("every record kind the server can return needs a capability", () => {
    for (const kind of ["client", "campaign", "draft", "crm", "ticket", "member", "invoice", "workflow", "study"]) {
      assert.ok(CAPABILITY_BY_KIND[kind], kind);
      assert.equal(requiredCapability({ id: `${kind}-x`, kind }), CAPABILITY_BY_KIND[kind]);
    }
  });

  it("suggestion chips that lead to gated areas are hidden for people without access", () => {
    assert.equal(CHIP_CAPABILITY.team, "team:manage");
    assert.equal(CHIP_CAPABILITY.billing, "billing:read");
  });
});

describe("prefix search and saved lists", () => {
  it("a kind word and a colon limits the search; anything else is plain text", () => {
    assert.deepEqual(splitScope("leads: anita"), { scoped: true, text: "anita" });
    assert.deepEqual(splitScope("Tickets:1042"), { scoped: true, text: "1042" });
    assert.deepEqual(splitScope("re: acme"), { scoped: false, text: "re: acme" });
    assert.deepEqual(splitScope("  acme corp "), { scoped: false, text: "acme corp" });
  });

  it("recents and pins are stored per person and per Company", () => {
    const a = storageKey("admin-global-search-recents", "user-1", "company-1");
    assert.notEqual(a, storageKey("admin-global-search-recents", "user-2", "company-1"));
    assert.notEqual(a, storageKey("admin-global-search-recents", "user-1", "company-2"));
    assert.equal(a, storageKey("admin-global-search-recents", "user-1", "company-1"));
    assert.ok(storageKey("k", undefined, "company-1").includes("anonymous"));
  });
});
