import assert from "node:assert/strict";
import test from "node:test";
import type { AutomationNode } from "../../data/types";
import { conditionProblem, nodeProblem, scheduleProblem } from "./node-problems";

const node = (actionId: string, config: Record<string, unknown> = {}, type: AutomationNode["type"] = "action"): AutomationNode => ({ id: "n", type, actionId, label: actionId, status: "idle", config });

test("schedule: every frequency needs its own fields", () => {
  assert.equal(scheduleProblem({ frequency: "interval", everyMinutes: 15 }), null);
  assert.match(String(scheduleProblem({ frequency: "interval", everyMinutes: 2 })), /5 to 1440/);
  assert.equal(scheduleProblem({ frequency: "daily", time: "09:30" }), null);
  assert.match(String(scheduleProblem({ frequency: "daily", time: "" })), /time of day/);
  assert.match(String(scheduleProblem({ frequency: "weekly", time: "09:00", weekdays: [] })), /weekday/);
  assert.equal(scheduleProblem({ frequency: "weekly", time: "09:00", weekdays: ["monday"] }), null);
  assert.match(String(scheduleProblem({ frequency: "monthly", time: "09:00", dayOfMonth: 40 })), /1 to 31/);
});

test("conditions: single and multi-condition forms", () => {
  assert.match(String(conditionProblem({})), /field/);
  assert.match(String(conditionProblem({ field: "lead.source" })), /operator/);
  assert.equal(conditionProblem({ field: "lead.source", operator: "equals" }), null);
  assert.match(String(conditionProblem({ conditions: [] })), /at least one/);
  assert.match(String(conditionProblem({ conditions: [{ field: "a", operator: "equals" }, { field: "", operator: "" }] })), /every condition/);
  assert.equal(conditionProblem({ combinator: "any", conditions: [{ field: "a", operator: "equals" }, { field: "b", operator: "exists" }] }), null);
});

test("http_request needs a real URL; templated URLs are accepted", () => {
  assert.match(String(nodeProblem(node("http_request", { url: "" }))), /URL/);
  assert.match(String(nodeProblem(node("http_request", { url: "ftp://x" }))), /http/);
  assert.equal(nodeProblem(node("http_request", { url: "https://hooks.example.com/x" })), null);
  assert.equal(nodeProblem(node("http_request", { url: "{{secret.hook_url}}" })), null);
});

test("slack_message needs text and a secret or https webhook", () => {
  assert.match(String(nodeProblem(node("slack_message", { text: "", webhookUrl: "{{secret.s}}" }))), /message/i);
  assert.match(String(nodeProblem(node("slack_message", { text: "hi", webhookUrl: "http://x" }))), /secret/);
  assert.equal(nodeProblem(node("slack_message", { text: "hi", webhookUrl: "{{secret.slack_webhook}}" })), null);
  assert.equal(nodeProblem(node("slack_message", { text: "hi", webhookUrl: "https://hooks.slack.com/services/T/B/x" })), null);
});

test("send_whatsapp needs a template and, when a recipient is set to blank, a phone number", () => {
  assert.match(String(nodeProblem(node("send_whatsapp", { templateId: "" }))), /template/);
  assert.equal(nodeProblem(node("send_whatsapp", { templateId: "t1", phone: "{{lead.phone}}" })), null);
  assert.equal(nodeProblem(node("send_whatsapp", { templateId: "t1" })), null);
  assert.match(String(nodeProblem(node("send_whatsapp", { templateId: "t1", phone: "  " }))), /phone/);
});

test("notify_user, scan triggers and event triggers", () => {
  assert.match(String(nodeProblem(node("notify_user", { title: "" }))), /title/);
  assert.match(String(nodeProblem(node("notify_user", { title: "Hi", audience: "users", userIds: [] }))), /team member/);
  assert.equal(nodeProblem(node("notify_user", { title: "Hi", audience: "client_team" })), null);
  assert.match(String(nodeProblem(node("lead_inactive", {}, "trigger"))), /1 to 365/);
  assert.equal(nodeProblem(node("lead_inactive", { inactiveDays: 3 }, "trigger")), null);
  assert.match(String(nodeProblem(node("task_overdue", { graceMinutes: -5 }, "trigger"))), /0 to 10,080/);
  for (const trigger of ["payment_failed", "invoice_paid", "whatsapp_failed", "lead_stage_changed"]) assert.equal(nodeProblem(node(trigger, {}, "trigger")), null);
  assert.match(String(nodeProblem(node("website_ssl_expiring", { websiteId: "" }, "trigger"))), /website/);
});

test("a step without an action asks for one", () => {
  assert.match(String(nodeProblem({ id: "n", type: "action", label: "x", status: "idle", config: {} })), /action/);
  assert.match(String(nodeProblem({ id: "n", type: "trigger", label: "x", status: "idle", config: {} })), /trigger/);
});

test("ai_generate needs a prompt (max 4000) and a valid result name; WhatsApp accepts a template NAME instead of an id", () => {
  assert.match(String(nodeProblem(node("ai_generate", { prompt: "" }))), /what the AI/i);
  assert.match(String(nodeProblem(node("ai_generate", { prompt: "x".repeat(4001) }))), /4000/);
  assert.match(String(nodeProblem(node("ai_generate", { prompt: "hi", saveAs: "Bad Name" }))), /Result name/);
  assert.equal(nodeProblem(node("ai_generate", { prompt: "hi", saveAs: "ai" })), null);
  assert.equal(nodeProblem(node("send_whatsapp", { templateName: "omni_lead_welcome", phone: "{{lead.phone}}" })), null);
  assert.match(String(nodeProblem(node("send_whatsapp", {}))), /template/);
});

