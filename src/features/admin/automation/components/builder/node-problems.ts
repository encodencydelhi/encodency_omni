/* eslint-disable @typescript-eslint/no-explicit-any -- step configs are open JSON contracts */
import type { AutomationNode } from "../../data/types";

/** Pure validation of one step's configuration (no React): why it cannot run as configured, or null when it is ready. */
export function conditionProblem(c: Record<string, any>): string | null {
  if (Array.isArray(c.conditions)) {
    if (!c.conditions.length) return "Add at least one condition";
    return c.conditions.every((row: Record<string, any>) => row?.field && row?.operator) ? null : "Complete every condition row";
  }
  return c.field ? (c.operator ? null : "Choose an operator") : "Choose a field to check";
}

export function scheduleProblem(c: Record<string, any>): string | null {
  const frequency = c.frequency ?? "daily";
  if (frequency === "interval") return Number.isInteger(Number(c.everyMinutes)) && Number(c.everyMinutes) >= 5 && Number(c.everyMinutes) <= 1440 ? null : "Run every 5 to 1440 minutes";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(c.time ?? ""))) return "Set the time of day";
  if (frequency === "weekly" && !(Array.isArray(c.weekdays) && c.weekdays.length)) return "Choose at least one weekday";
  if (frequency === "monthly" && !(Number(c.dayOfMonth) >= 1 && Number(c.dayOfMonth) <= 31)) return "Choose a day of the month (1 to 31)";
  return null;
}

/** Returns why a step can't run as configured, or null when it is ready. */
export function nodeProblem(node: AutomationNode): string | null {
  const c = node.config ?? {};
  switch (node.actionId) {
    case "website_down": return c.websiteId ? null : "Choose a monitored website";
    case "website_ssl_expiring": return c.websiteId ? (c.daysBefore === "" || c.daysBefore === undefined || (Number(c.daysBefore) >= 1 && Number(c.daysBefore) <= 90) ? null : "Days before expiry must be 1 to 90") : "Choose a monitored website";
    case "lead_stage_changed":
    case "deal_stage_changed":
    case "new_deal":
    case "task_completed":
    case "payment_failed":
    case "invoice_paid":
    case "whatsapp_failed": return null;
    case "schedule": return scheduleProblem(c);
    case "http_request": return !String(c.url ?? "").trim() ? "Enter the request URL" : !/^(\{\{|https?:\/\/)/i.test(String(c.url).trim()) ? "The URL must start with http:// or https://" : null;
    case "notify_user": return !String(c.title ?? "").trim() ? "Add a notification title" : c.audience === "users" && !(Array.isArray(c.userIds) && c.userIds.length) ? "Select at least one team member" : null;
    case "send_whatsapp": return !c.templateId && !c.templateName ? "Choose a WhatsApp template" : c.phone !== undefined && !String(c.phone).trim() ? "Enter the recipient phone number" : null;
    case "ai_generate": return !String(c.prompt ?? "").trim() ? "Write what the AI should do" : String(c.prompt).length > 4000 ? "The prompt is longer than 4000 characters" : c.saveAs && !/^[a-z][a-zA-Z0-9_]{0,29}$/.test(String(c.saveAs)) ? "Result name: letters and digits, starting with a lower-case letter" : null;
    case "send_email": return c.subject ? (c.recipientMode === "company_owner" && !c.ownerPolicy ? "Choose an owner policy" : null) : "Add a subject";
    case "assign_user": return c.userId ? null : "Choose a team member";
    case "update_record": return c.field ? (c.value ? null : "Set the new value") : "Choose a field to update";
    case "create_task": return c.title ? null : "Add a task title";
    case "filter_condition":
    case "if_else": return conditionProblem(c);
    case "slack_message": return !String(c.text ?? "").trim() ? "Write the message" : !/^(\{\{\s*secret\.|https:\/\/)/i.test(String(c.webhookUrl ?? "").trim()) ? "Use a {{secret.name}} (or https URL) for the Slack webhook" : null;
    case "task_overdue": return c.graceMinutes === "" || c.graceMinutes === undefined || (Number(c.graceMinutes) >= 0 && Number(c.graceMinutes) <= 10080) ? null : "Grace period must be 0 to 10,080 minutes";
    case "lead_inactive": return Number(c.inactiveDays) >= 1 && Number(c.inactiveDays) <= 365 ? null : "Inactive days must be 1 to 365";
    case "switch": return c.field ? (Array.isArray(c.cases) && c.cases.length ? null : "Add at least one switch case") : "Choose a field to switch on";
    case "delay": return Number(c.duration) > 0 ? null : "Set how long to wait";
    case "wait_until": return c.mode === "absolute" ? (c.until ? null : "Choose a future date and time") : Number(c.duration) > 0 ? null : "Set how long to wait";
    case "approval": return Array.isArray(c.approverUserIds) && c.approverUserIds.length ? (Number(c.expiryMinutes) >= 1 && Number(c.expiryMinutes) <= 43200 ? null : "Expiry must be 1 to 43,200 minutes") : "Select at least one approver";
    case "sub_workflow": return c.workflowId ? (Number(c.timeoutSeconds) >= 1 && Number(c.timeoutSeconds) <= 86400 ? null : "Timeout must be 1 to 86,400 seconds") : "Enter a published workflow ID";
    case "parallel": return Array.isArray(c.branches) && c.branches.length >= 2 && c.branches.length <= 10 ? (c.joinNodeId ? null : "Add a Merge node after this split") : "Add 2 to 10 unique branches";
    case "merge": return ["all", "any"].includes(c.mode) ? null : "Choose a join mode";
    case "for_each": return c.arraySource ? (Number(c.concurrency) >= 1 && Number(c.concurrency) <= 10 ? (Number(c.maxItems) >= 1 && Number(c.maxItems) <= 100 ? null : "Maximum items must be 1 to 100") : "Concurrency must be 1 to 10") : "Add an array source";
    case "loop": return Number(c.maxIterations) >= 1 && Number(c.maxIterations) <= 100 ? (c.stopCondition?.field && c.stopCondition?.operator ? null : "Add a stop condition") : "Maximum iterations must be 1 to 100";
    default:
      if (node.type === "trigger") return node.actionId ? null : "Pick a trigger type";
      return node.actionId ? null : "Pick an action type for this step";
  }
}
