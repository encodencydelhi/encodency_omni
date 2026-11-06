import assert from "node:assert/strict";
import test from "node:test";
import { AI_AREAS, AI_TASKS, applyAIProposal, buildAIContext, createDemoAIResult, demoAIAdapter, type AIRequest, type AITask } from "./ai-model";
import { seedWorkspace } from "./mock-service";

function request(task: AITask): AIRequest {
  const data = seedWorkspace("ai-test");
  return { scope: "current-company:current-client", task, prompt: AI_TASKS[task].prompt, tone: "Professional", language: "English", targetContactId: data.contacts[0]!.id, context: buildAIContext(data, data.contacts[0]!.id, data.templates[0]) };
}
test("every WhatsApp module has a planned AI task and all suggestions are explicitly demo output", () => {
  assert.equal(Object.keys(AI_AREAS).length, 12);
  for (const area of Object.values(AI_AREAS)) assert.ok(area.length);
  for (const task of Object.keys(AI_TASKS) as AITask[]) {
    const input = request(task);
    const result = createDemoAIResult(input);
    assert.equal(result.provider, "demo");
    assert.equal(result.scope, input.scope);
    assert.equal(result.task, task);
  }
});
test("optional AI context omits contact-directory phone fields, account settings and media", () => {
  const data = seedWorkspace("context");
  data.settings.description = "private-settings-marker";
  data.media[0]!.url = "blob:private-media-marker";
  const context = buildAIContext(data, data.contacts[0]!.id, data.templates[0]);
  const encoded = JSON.stringify(context);
  assert.ok(!encoded.includes(data.settings.phone));
  assert.ok(!encoded.includes(data.settings.email));
  assert.ok(!encoded.includes("private-settings-marker"));
  assert.ok(!encoded.includes("private-media-marker"));
  assert.equal(context.conversation?.length, 2);
  assert.equal(context.optedInCount, data.contacts.filter(contact => contact.consent).length);
});
test("applying a template suggestion creates an editable draft and preserves approved templates", () => {
  const data = seedWorkspace("template");
  const before = structuredClone(data);
  const proposal = createDemoAIResult(request("template_draft")).proposal;
  const next = applyAIProposal(data, proposal);
  assert.equal(next.templates.length, data.templates.length + 1);
  assert.equal(next.templates[0]?.status, "Draft");
  assert.deepEqual(next.templates.slice(1), data.templates);
  assert.deepEqual(data, before);
  assert.equal(next.messages, data.messages);
});
test("reply suggestions only populate a composer draft and cannot send or target an unknown conversation", () => {
  const data = seedWorkspace("reply");
  const contactId = data.contacts[0]!.id;
  const next = applyAIProposal(data, { kind: "reply", contactId, text: "A reviewed reply" });
  assert.equal(next.replyDrafts?.[contactId], "A reviewed reply");
  assert.equal(next.messages, data.messages);
  assert.equal(next.contacts, data.contacts);
  assert.throws(() => applyAIProposal(data, { kind: "reply", contactId: "other-client-conversation", text: "Do not insert" }), /Current Client/);
});
test("campaign and builder suggestions remain inactive drafts with consent-aware audiences", () => {
  const data = seedWorkspace("campaign");
  const campaign = applyAIProposal(data, { kind: "campaign", name: "VIP Launch", goal: "Launch", audienceTag: "VIP", approach: "Review before sending" }).campaigns[0]!;
  assert.equal(campaign.status, "Draft");
  assert.equal(campaign.scheduledAt, "");
  assert.equal(campaign.sent, 0);
  assert.ok(campaign.audience.every(id => data.contacts.some(contact => contact.id === id && contact.consent && contact.tags.includes("VIP"))));
  const workflowData = applyAIProposal(data, createDemoAIResult(request("workflow_draft")).proposal);
  assert.equal(workflowData.workflows.length, data.workflows.length + 1);
  assert.deepEqual(workflowData.workflows.slice(1), data.workflows);
  const flowData = applyAIProposal(data, createDemoAIResult(request("flow_draft")).proposal);
  assert.equal(flowData.flows[0]?.screens.length, 2);
  const ids = flowData.flows[0]!.screens.flatMap(screen => [screen.id, ...screen.fields.map(field => field.id)]);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(flowData.settings, data.settings);
});
test("request validation and template improvement need explicit draft context", () => {
  assert.throws(() => createDemoAIResult({ ...request("template_draft"), prompt: "short" }), /8–2,000/);
  assert.throws(() => createDemoAIResult({ ...request("template_draft"), scope: "" }), /8–2,000/);
  assert.throws(() => createDemoAIResult({ ...request("template_improve"), context: undefined }), /Current Template Context/);
  const improved = createDemoAIResult(request("template_improve")).proposal;
  assert.equal(improved.kind, "template");
  if (improved.kind === "template") assert.ok(improved.body.includes("{{1}}"));
});
test("the mock adapter makes no network request and honours cancellation", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("Network Is Not Allowed In The UI Preview"); };
  try {
    const result = await demoAIAdapter.generate(request("analytics_summary"));
    assert.equal(result.provider, "demo");
    const controller = new AbortController();
    const pending = demoAIAdapter.generate(request("template_draft"), controller.signal);
    controller.abort();
    await assert.rejects(pending, error => error instanceof DOMException && error.name === "AbortError");
  } finally { globalThis.fetch = originalFetch; }
});
