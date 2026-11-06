import assert from "node:assert/strict";
import test from "node:test";
import { SERVICE_WINDOW_MS, serviceWindow, testWorkflow, workflowProblems, whatsappAccess } from "./audit-model";
import { seedWorkspace, type Workflow } from "./mock-service";
import { draftStorageKey, readDevelopmentDraft, writeDevelopmentDraft } from "./draft-storage";

test("reply window uses inbound timestamps and closes at exactly 24 hours", () => {
  const now = Date.now(), message = { ...seedWorkspace("audit").messages[0]!, contactId: "a", outgoing: false };
  assert.equal(serviceWindow([{ ...message, createdAt: new Date(now - SERVICE_WINDOW_MS + 1).toISOString() }], "a", now).open, true);
  assert.equal(serviceWindow([{ ...message, createdAt: new Date(now - SERVICE_WINDOW_MS).toISOString() }], "a", now).open, false);
  assert.equal(serviceWindow([{ ...message, outgoing: true, createdAt: new Date(now).toISOString() }], "a", now).open, false);
  for (const createdAt of [undefined, "invalid", new Date(now + 1).toISOString()]) assert.equal(serviceWindow([{ ...message, createdAt }], "a", now).open, false);
});
const graph: Workflow = { id: "w", name: "Branch", nodes: [
  { id: "t", kind: "Trigger", label: "Start", value: "hello", nextId: "c" },
  { id: "c", kind: "Condition", label: "Interest", value: "product", matchId: "m", fallbackId: "h" },
  { id: "m", kind: "Message", label: "Reply", value: "Details", nextId: "h" },
  { id: "h", kind: "Handoff", label: "Agent", value: "Support Team" },
] };
test("automation branches, fallback and human handoff are deterministic", () => {
  assert.deepEqual(workflowProblems(graph), []);
  assert.ok(testWorkflow(graph, "hello product").some(line => line === "Interest: Match"));
  assert.ok(testWorkflow(graph, "hello other").some(line => line === "Interest: Fallback"));
  assert.ok(testWorkflow(graph, "hello other").at(-1)?.includes("No Real Assignment"));
  assert.ok(testWorkflow(graph, "bye").at(-1)?.includes("Did Not Match"));
});
test("automation rejects cycles, missing fallback and unreachable nodes", () => {
  const copy = structuredClone(graph); copy.nodes[1]!.fallbackId = "missing";
  assert.ok(workflowProblems(copy).some(line => line.includes("Removed Node")));
  copy.nodes[1]!.fallbackId = undefined;
  assert.ok(workflowProblems(copy).some(line => line.includes("Both Match And Fallback")));
  copy.nodes[1]!.fallbackId = "h"; copy.nodes[2]!.nextId = "c";
  assert.ok(workflowProblems(copy).some(line => line.includes("Cyclic")));
  copy.nodes.push({ id: "extra", kind: "Handoff", label: "Unreachable", value: "Team" });
  assert.ok(workflowProblems(copy).some(line => line.includes("Unreachable")));
});
test("role presentation fails closed and limits agents to conversations", () => {
  assert.equal(whatsappAccess("VIEWER").canEdit, false);
  assert.equal(whatsappAccess(undefined).canManage, false);
  assert.deepEqual(whatsappAccess("MANAGER", null, "Support Agent"), { canEdit: true, canManage: false, label: "Agent" });
  assert.equal(whatsappAccess("ADMIN").canManage, true);
  assert.equal(whatsappAccess(undefined, "SUPER_ADMIN").label, "Agency Admin");
});
test("draft recovery is development-only, scoped, expiring and strips media URLs", () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) || null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
  const data = seedWorkspace("audit"); const now = Date.now();
  data.templates[0]!.mediaPreview = "blob:sensitive";
  assert.equal(writeDevelopmentDraft(storage, "tenant-a:user-a", data, false, now), false);
  assert.equal(writeDevelopmentDraft(storage, "tenant-a:user-a", data, true, now), true);
  assert.equal(readDevelopmentDraft(storage, "tenant-a:user-a", false, now), null);
  assert.equal(readDevelopmentDraft(storage, "tenant-b:user-a", true, now), null);
  assert.equal(readDevelopmentDraft(storage, "tenant-a:user-b", true, now), null);
  assert.equal(readDevelopmentDraft(storage, "tenant-a:user-a", true, now)?.templates[0]?.mediaPreview, undefined);
  assert.equal(values.get(draftStorageKey("tenant-a:user-a"))?.includes("blob:sensitive"), false);
  assert.equal(readDevelopmentDraft(storage, "tenant-a:user-a", true, now + 13 * 3600000), null);
  storage.setItem(draftStorageKey("bad"), "invalid json");
  assert.equal(readDevelopmentDraft(storage, "bad", true), null);
  assert.equal(writeDevelopmentDraft({ setItem: () => { throw new Error("quota"); } }, "a", data, true), false);
});
