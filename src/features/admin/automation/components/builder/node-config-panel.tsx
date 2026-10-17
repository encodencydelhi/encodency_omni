"use client";

import { useState } from "react";
import { Bot, Check, Copy, Settings, Braces } from "lucide-react";
import { toast } from "sonner";
import type { AutomationNode } from "../../data/types";
import { automationApi, webhookEndpoint, webhookUrl } from "../../data/automation-api";
import { getStoredClientId } from "@/lib/api/tenancy-storage";
import { libraryItem } from "./node-library";

export interface BuilderResources {
  templates: Array<{ id: string; name: string; language: string; variables: string[]; status: string; providerStatus: string | null }>;
  templatesError: string | null;
  members: Array<{ id: string; name: string }>;
  websites: Array<{ id: string; name: string; url: string }>;
  owner: { available: boolean; count: number; maskedEmail: string | null };
}

const VARIABLES = [
  { token: "{{lead.firstName}}", label: "Lead / contact first name" },
  { token: "{{lead.lastName}}", label: "Last name" },
  { token: "{{lead.email}}", label: "Email" },
  { token: "{{lead.phone}}", label: "Phone (10 digits)" },
  { token: "{{lead.company}}", label: "Company" },
  { token: "{{lead.source}}", label: "Lead source" },
  { token: "{{lead.stage}}", label: "Lead stage" },
  { token: "{{lead.ownerName}}", label: "Owner name" },
  { token: "{{trigger.message}}", label: "Any field from the trigger payload, e.g. message" },
  { token: "{{website.url}}", label: "Monitored website URL" },
  { token: "{{website.name}}", label: "Monitored website name" },
  { token: "{{website.httpStatus}}", label: "Observed HTTP status" },
  { token: "{{website.errorMessage}}", label: "Monitoring error" },
  { token: "{{website.detectedAt}}", label: "Incident detection time" },
  { token: "{{website.region}}", label: "Monitoring region" },
  { token: "{{company.name}}", label: "Owning company name" },
  { token: "{{recipient.email}}", label: "Resolved notification recipient" },
];

const CONDITION_FIELDS = [
  { value: "lead.source", label: "Lead source" },
  { value: "lead.stage", label: "Lead stage" },
  { value: "lead.leadScore", label: "Lead score" },
  { value: "lead.priority", label: "Lead priority" },
  { value: "lead.phone", label: "Phone" },
  { value: "lead.email", label: "Email" },
  { value: "contact.status", label: "Contact status" },
  { value: "lead.tags", label: "Tags" },
];

const OPERATORS = [
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "does not equal" },
  { value: "contains", label: "contains" },
  { value: "not_contains", label: "does not contain" },
  { value: "greater_than", label: "is greater than" },
  { value: "less_than", label: "is less than" },
  { value: "is_not_empty", label: "is not empty" },
  { value: "is_empty", label: "is empty" },
];

const LEAD_STAGES = ["new", "contacted", "qualified", "proposal", "won", "lost"];
const CONTACT_STATUSES = ["active", "inactive", "lead", "customer", "prospect"];

/** Returns why a step can't run as configured, or null when it is ready. */
export function nodeProblem(node: AutomationNode): string | null {
  const c = node.config ?? {};
  switch (node.actionId) {
    case "website_down": return c.websiteId ? null : "Choose a monitored website";
    case "send_whatsapp": return c.templateId ? null : "Choose a WhatsApp template";
    case "send_email": return c.subject ? (c.recipientMode === "company_owner" && !c.ownerPolicy ? "Choose an owner policy" : null) : "Add a subject";
    case "assign_user": return c.userId ? null : "Choose a team member";
    case "update_record": return c.field ? (c.value ? null : "Set the new value") : "Choose a field to update";
    case "create_task": return c.title ? null : "Add a task title";
    case "filter_condition":
    case "if_else": return c.field ? (c.operator ? null : "Choose an operator") : "Choose a field to check";
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

const input = "h-9 w-full rounded-lg border border-[#E2E8F0] px-3 text-[11.5px] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]/20";
const label = "text-[11.5px] font-semibold text-[#111C3A]";

function Field({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className={label}>{title}</label>
      {children}
      {hint ? <p className="text-[10px] text-[#6B7A94]">{hint}</p> : null}
    </div>
  );
}

export function NodeConfigPanel({ node, workflowId, resources, onChange }: {
  node: AutomationNode;
  /** Saved workflow id; undefined while the workflow has never been saved. */
  workflowId?: string;
  resources: BuilderResources;
  onChange: (updates: Partial<AutomationNode>) => void;
}) {
  const [tab, setTab] = useState<"configure" | "variables">("configure");
  const [copied, setCopied] = useState(false);
  const item = libraryItem(node.actionId, node.label);
  const Icon = item?.icon ?? Bot;
  const config = node.config ?? {};
  const setConfig = (patch: Record<string, unknown>) => onChange({ config: { ...config, ...patch } });
  const problem = nodeProblem(node);

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied");
    window.setTimeout(() => setCopied(false), 1500);
  };

  const selectedTemplate = resources.templates.find((t) => t.id === config.templateId);
  // Tokens are never returned by read APIs: the plaintext is shown once, right after it is issued here.
  const [issuedToken, setIssuedToken] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);
  const endpoint = workflowId ? webhookEndpoint(workflowId) : null;
  const url = workflowId && issuedToken ? webhookUrl(workflowId, issuedToken) : null;
  const issueToken = async () => {
    const clientId = getStoredClientId();
    if (!workflowId || !clientId) return;
    setIssuing(true);
    try {
      const res = await automationApi.rotateWebhook(clientId, workflowId);
      setIssuedToken(res.token);
      toast.success("New webhook token issued. Copy it now; it will not be shown again.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not issue a webhook token.");
    } finally {
      setIssuing(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex border-b border-[#E2E8F0]">
        {([["configure", "Configure", Settings], ["variables", "Variables", Braces]] as const).map(([key, text, TabIcon]) => (
          <button key={key} type="button" onClick={() => setTab(key)} className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold transition-colors ${tab === key ? "border-b-2 border-[#2563EB] text-[#2563EB]" : "text-[#6B7A94] hover:bg-[#F8FAFC] hover:text-[#111C3A]"}`}>
            <TabIcon className="size-3.5" /> {text}
          </button>
        ))}
      </div>

      {tab === "variables" ? (
        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          <p className="text-[11px] text-[#6B7A94]">Use these in any text field. They are filled in from the lead/contact (or the trigger payload) when the run executes. <code>contact.*</code> works the same as <code>lead.*</code>.</p>
          {VARIABLES.map((v) => (
            <button key={v.token} type="button" onClick={() => void copy(v.token)} className="flex w-full items-center justify-between rounded-lg border border-[#E2E8F0] px-3 py-2 text-left hover:bg-[#F8FAFC]">
              <span><code className="text-[11px] font-semibold text-[#1D4ED8]">{v.token}</code><span className="block text-[10px] text-[#6B7A94]">{v.label}</span></span>
              <Copy className="size-3.5 text-[#94A3B8]" />
            </button>
          ))}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="border-b border-[#E2E8F0] p-4">
            <div className="mb-2 flex items-center gap-3">
              <div className={`grid size-10 shrink-0 place-items-center rounded-xl ${item?.iconBg ?? "bg-[#64748B]"} text-white`}><Icon className="size-5" /></div>
              <div>
                <h3 className="text-[13px] font-bold text-[#111C3A]">{item?.label ?? node.label}</h3>
                <p className="text-[10.5px] text-[#6B7A94]">{item?.description ?? node.description}</p>
              </div>
            </div>
            {problem ? <p className="rounded-md bg-[#FFFBEB] px-2.5 py-1.5 text-[10.5px] font-medium text-[#B45309]">{problem}</p> : <p className="flex items-center gap-1 text-[10.5px] font-medium text-[#047857]"><Check className="size-3" /> Ready to run</p>}
          </div>

          <div className="space-y-4 p-4">
            <Field title="Step name">
              <input className={input} value={node.label} maxLength={80} onChange={(e) => onChange({ label: e.target.value })} />
            </Field>

            {node.type === "trigger" && (node.actionId === "inbound_webhook" || node.actionId === "form_submission") ? (
              <>
                <Field title="Webhook URL" hint="POST JSON to this URL with the secret token in the x-automation-token header. Tokens are shown only once, when issued.">
                  {endpoint ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 min-w-0 flex-1 items-center truncate rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 font-mono text-[10.5px] text-[#475569]">{endpoint}</div>
                        <button type="button" aria-label="Copy webhook endpoint" onClick={() => void copy(endpoint)} className="grid size-9 place-items-center rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]">{copied ? <Check className="size-3.5 text-[#10B981]" /> : <Copy className="size-3.5" />}</button>
                      </div>
                      {issuedToken ? (
                        <div className="flex items-center gap-2">
                          <div className="flex h-9 min-w-0 flex-1 items-center truncate rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3 font-mono text-[10.5px] text-[#92400E]">{issuedToken}</div>
                          <button type="button" aria-label="Copy webhook token" onClick={() => void copy(issuedToken)} className="grid size-9 place-items-center rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]"><Copy className="size-3.5" /></button>
                        </div>
                      ) : null}
                      <button type="button" disabled={issuing} onClick={() => void issueToken()} className="rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-[11px] font-semibold text-[#334155] hover:bg-[#F8FAFC] disabled:opacity-50">
                        {issuing ? "Issuing…" : "Issue new token (replaces the current one)"}
                      </button>
                    </div>
                  ) : (
                    <p className="rounded-lg border border-dashed border-[#CBD5E1] px-3 py-2 text-[11px] text-[#64748B]">Save the workflow once to generate its URL.</p>
                  )}
                </Field>
                {endpoint ? (
                  <Field title="Example request">
                    <pre className="overflow-x-auto rounded-lg bg-[#0F172A] p-2.5 font-mono text-[10px] text-slate-200">{`curl -X POST "${url ?? endpoint}" \\\n  -H "Content-Type: application/json" \\\n  -H "x-automation-token: <your token>" \\\n  -H "Idempotency-Key: <unique id per event>" \\\n  -d '{"name":"Rahul Mehta","email":"rahul@example.com","phone":"9876543210","message":"Hi"}'`}</pre>
                  </Field>
                ) : null}
                {node.actionId === "form_submission" ? (
                  <label className="flex items-center gap-2 text-[11.5px] text-[#334155]">
                    <input type="checkbox" checked={config.createLead !== false} onChange={(e) => setConfig({ createLead: e.target.checked })} />
                    Create a CRM lead from the form fields (name, email, phone, message)
                  </label>
                ) : null}
                <p className="text-[10.5px] text-[#6B7A94]">The workflow must be <strong>Active</strong> to accept webhook calls.</p>
              </>
            ) : null}

            {node.actionId === "website_down" ? (
              <>
                <Field title="Infrastructure Website" hint="Stable website IDs are stored; choices are limited to this company and client.">
                  <select className={`${input} bg-white`} value={config.websiteId ?? ""} onChange={(e) => setConfig({ websiteId: e.target.value })}>
                    <option value="">Select a monitored website…</option>
                    <option value="*">All Authorized Monitored Websites</option>
                    {resources.websites.map((website) => <option key={website.id} value={website.id}>{website.name} · {website.url}</option>)}
                  </select>
                </Field>
                {!resources.websites.length ? <p className="rounded-md bg-amber-50 px-2.5 py-2 text-[10.5px] text-amber-800">No enabled website monitoring configuration exists for this client.</p> : null}
              </>
            ) : null}

            {node.type === "trigger" && node.actionId !== "website_down" && !["inbound_webhook", "form_submission"].includes(node.actionId ?? "") ? (
              <p className="rounded-lg bg-[#F8FAFC] px-3 py-2 text-[11px] text-[#475569]">{item?.description ?? "Choose a trigger from the left panel."} No extra settings are needed.</p>
            ) : null}

            {node.actionId === "send_whatsapp" ? (
              <>
                <Field title="WhatsApp template" hint={resources.templatesError ?? (resources.templates.length ? "Only enabled templates from WhatsApp → Templates are listed." : "No enabled templates. Sync them in WhatsApp → Templates first.")}>
                  <select className={`${input} bg-white`} value={config.templateId ?? ""} onChange={(e) => {
                    const tpl = resources.templates.find((t) => t.id === e.target.value);
                    const vars = Object.fromEntries((tpl?.variables ?? []).map((v) => [v, (config.variables ?? {})[v] ?? ""]));
                    setConfig({ templateId: e.target.value, templateName: tpl?.name ?? "", variables: vars });
                  }}>
                    <option value="">Select a template…</option>
                    {resources.templates.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.language}){t.providerStatus ? ` · ${t.providerStatus}` : ""}</option>)}
                  </select>
                </Field>
                <Field title="Recipient phone" hint="Leave as {{lead.phone}} to message the lead/contact. 10-digit numbers get +91 added.">
                  <input className={input} value={config.phone ?? "{{lead.phone}}"} onChange={(e) => setConfig({ phone: e.target.value })} />
                </Field>
                {selectedTemplate?.variables.length ? (
                  <div className="space-y-2 rounded-lg border border-[#E2E8F0] p-3">
                    <p className="text-[11px] font-semibold text-[#111C3A]">Template variables</p>
                    {selectedTemplate.variables.map((v) => (
                      <div key={v} className="space-y-1">
                        <span className="text-[10.5px] font-medium text-[#475569]">{v}</span>
                        <input className={input} placeholder="e.g. {{lead.firstName}}" value={(config.variables ?? {})[v] ?? ""} onChange={(e) => setConfig({ variables: { ...(config.variables ?? {}), [v]: e.target.value } })} />
                      </div>
                    ))}
                  </div>
                ) : null}
              </>
            ) : null}

            {node.actionId === "send_email" ? (
              <>
                <Field title="Recipient">
                  <select className={`${input} bg-white`} value={config.recipientMode ?? "custom"} onChange={(e) => setConfig({ recipientMode: e.target.value, ...(e.target.value === "company_owner" ? { ownerPolicy: config.ownerPolicy ?? "oldest_active" } : {}) })}>
                    <option value="custom">Custom Authorized Address</option>
                    <option value="record">Record Email</option>
                    <option value="company_owner">Company Owner (Automatic)</option>
                  </select>
                </Field>
                {config.recipientMode === "company_owner" ? (
                  <Field title="Multiple Owner Policy" hint={resources.owner.available ? `Resolved preview: ${resources.owner.maskedEmail}${resources.owner.count > 1 ? ` (${resources.owner.count} eligible owners)` : ""}` : "No active, verified company owner email is available."}>
                    <select className={`${input} bg-white`} value={config.ownerPolicy ?? ""} onChange={(e) => setConfig({ ownerPolicy: e.target.value })}>
                      <option value="">Select policy…</option>
                      <option value="require_single">Require Exactly One Owner</option>
                      <option value="oldest_active">Oldest Active Owner</option>
                    </select>
                  </Field>
                ) : config.recipientMode === "record" ? (
                  <p className="rounded-md bg-slate-50 px-3 py-2 text-[11px] text-slate-600">Uses the email on the CRM record that started the workflow.</p>
                ) : (
                  <Field title="To" hint="Only addresses authorized for this workflow should be entered.">
                    <input className={input} placeholder="team@company.com" value={config.to ?? ""} onChange={(e) => setConfig({ to: e.target.value })} />
                  </Field>
                )}
                <Field title="Subject">
                  <input className={input} maxLength={200} value={config.subject ?? ""} onChange={(e) => setConfig({ subject: e.target.value })} />
                </Field>
                <Field title="Message">
                  <textarea rows={6} className="w-full resize-none rounded-lg border border-[#E2E8F0] px-3 py-2 text-[11.5px] focus:border-[#2563EB] focus:outline-none" value={config.body ?? ""} onChange={(e) => setConfig({ body: e.target.value })} />
                </Field>
              </>
            ) : null}

            {node.actionId === "assign_user" ? (
              <Field title="Assign to" hint="Becomes the owner of the lead/contact that started the run.">
                <select className={`${input} bg-white`} value={config.userId ?? ""} onChange={(e) => setConfig({ userId: e.target.value, userName: e.target.value === "__routing__" ? "Routing rules" : resources.members.find((m) => m.id === e.target.value)?.name ?? "" })}>
                  <option value="">Select a team member…</option>
                  <option value="__routing__">Use routing rules (Settings → Ownership &amp; Routing)</option>
                  {resources.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </Field>
            ) : null}

            {node.actionId === "update_record" ? (
              <>
                <Field title="Field">
                  <select className={`${input} bg-white`} value={config.field ?? ""} onChange={(e) => setConfig({ field: e.target.value, value: "" })}>
                    <option value="">Select…</option>
                    <option value="stage">Lead stage</option>
                    <option value="status">Contact status</option>
                    <option value="priority">Priority</option>
                    <option value="tags_add">Add tags</option>
                    <option value="notes_append">Append to notes</option>
                  </select>
                </Field>
                {config.field ? (
                  <Field title="New value" hint={config.field === "tags_add" ? "Separate tags with commas." : undefined}>
                    {config.field === "stage" || config.field === "status" || config.field === "priority" ? (
                      <select className={`${input} bg-white`} value={config.value ?? ""} onChange={(e) => setConfig({ value: e.target.value })}>
                        <option value="">Select…</option>
                        {(config.field === "stage" ? LEAD_STAGES : config.field === "status" ? CONTACT_STATUSES : ["low", "medium", "high"]).map((v) => <option key={v} value={v}>{v}</option>)}
                      </select>
                    ) : (
                      <input className={input} value={config.value ?? ""} onChange={(e) => setConfig({ value: e.target.value })} />
                    )}
                  </Field>
                ) : null}
              </>
            ) : null}

            {node.actionId === "create_task" ? (
              <>
                <Field title="Task title"><input className={input} maxLength={200} value={config.title ?? ""} onChange={(e) => setConfig({ title: e.target.value })} /></Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field title="Due in (days)"><input type="number" min={0} max={365} className={input} value={config.dueInDays ?? 1} onChange={(e) => setConfig({ dueInDays: Math.max(0, Number(e.target.value) || 0) })} /></Field>
                  <Field title="Priority">
                    <select className={`${input} bg-white`} value={config.priority ?? "medium"} onChange={(e) => setConfig({ priority: e.target.value })}>
                      <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                    </select>
                  </Field>
                </div>
                <Field title="Assignee" hint="Defaults to the owner of the lead/contact.">
                  <select className={`${input} bg-white`} value={config.assigneeId ?? ""} onChange={(e) => setConfig({ assigneeId: e.target.value, assigneeName: resources.members.find((m) => m.id === e.target.value)?.name ?? "" })}>
                    <option value="">Record owner</option>
                    {resources.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </Field>
              </>
            ) : null}

            {node.actionId === "filter_condition" || node.actionId === "if_else" ? (
              <>
                <Field title="Field to check">
                  <select className={`${input} bg-white`} value={CONDITION_FIELDS.some((f) => f.value === config.field) || !config.field ? config.field ?? "" : "__custom"} onChange={(e) => setConfig({ field: e.target.value === "__custom" ? "trigger." : e.target.value })}>
                    <option value="">Select…</option>
                    {CONDITION_FIELDS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                    <option value="__custom">Custom field…</option>
                  </select>
                  {config.field && !CONDITION_FIELDS.some((f) => f.value === config.field) ? (
                    <input className={`${input} mt-1.5`} placeholder="e.g. trigger.city" value={config.field} onChange={(e) => setConfig({ field: e.target.value })} />
                  ) : null}
                </Field>
                <Field title="Operator">
                  <select className={`${input} bg-white`} value={config.operator ?? ""} onChange={(e) => setConfig({ operator: e.target.value })}>
                    <option value="">Select…</option>
                    {OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
                {config.operator && !["is_empty", "is_not_empty"].includes(config.operator) ? (
                  <Field title="Value"><input className={input} value={config.value ?? ""} onChange={(e) => setConfig({ value: e.target.value })} /></Field>
                ) : null}
                <p className="rounded-lg bg-[#F8FAFC] px-3 py-2 text-[10.5px] text-[#475569]">
                  {node.actionId === "filter_condition" ? "If the condition is false the run stops here (it is still recorded as successful)." : "If the condition is false the next step is skipped and the run continues after it."}
                </p>
              </>
            ) : null}

            {node.actionId === "switch" ? (
              <>
                <Field title="Field to switch on"><input className={input} placeholder="e.g. lead.status" value={config.field ?? ""} onChange={(e) => setConfig({ field: e.target.value })} /></Field>
                <Field title="Named cases" hint="Comma-separated values. Connect each matching handle; the final handle is Default."><input className={input} placeholder="new, qualified, won" value={Array.isArray(config.cases) ? config.cases.map((item: { value?: string }) => item.value).join(", ") : ""} onChange={(e) => setConfig({ cases: e.target.value.split(",").map((value) => value.trim()).filter(Boolean).map((value) => ({ value })) })} /></Field>
              </>
            ) : null}

            {node.actionId === "delay" ? (
              <Field title="Wait for" hint="The run pauses and resumes automatically (checked every 30 seconds).">
                <div className="flex gap-2">
                  <input type="number" min={1} max={90} className="h-9 w-20 rounded-lg border border-[#E2E8F0] px-3 text-[11.5px]" value={config.duration ?? 1} onChange={(e) => setConfig({ duration: Math.max(1, Number(e.target.value) || 1) })} />
                  <select className={`${input} flex-1 bg-white`} value={config.unit ?? "hours"} onChange={(e) => setConfig({ unit: e.target.value })}>
                    <option value="minutes">Minutes</option><option value="hours">Hours</option><option value="days">Days</option>
                  </select>
                </div>
              </Field>
            ) : null}

            {node.actionId === "wait_until" ? <>
              <Field title="Wait mode"><select className={`${input} bg-white`} value={config.mode ?? "relative"} onChange={(e) => setConfig({ mode: e.target.value })}><option value="relative">Relative duration</option><option value="absolute">Absolute date and time</option></select></Field>
              {config.mode === "absolute" ? <Field title="Resume at" hint="Stored as an ISO timestamp with timezone."><input type="datetime-local" className={input} value={config.until && Number.isFinite(Date.parse(String(config.until))) ? new Date(Date.parse(String(config.until)) - new Date(String(config.until)).getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : ""} onChange={(e) => setConfig({ until: e.target.value ? new Date(e.target.value).toISOString() : "" })} /></Field> : <Field title="Wait for"><div className="flex gap-2"><input type="number" min={1} className="h-9 w-20 rounded-lg border border-[#E2E8F0] px-3 text-[11.5px]" value={config.duration ?? 1} onChange={(e) => setConfig({ duration: Math.max(1, Number(e.target.value) || 1) })} /><select className={`${input} flex-1 bg-white`} value={config.unit ?? "hours"} onChange={(e) => setConfig({ unit: e.target.value })}><option value="minutes">Minutes</option><option value="hours">Hours</option><option value="days">Days</option></select></div></Field>}
            </> : null}

            {node.actionId === "approval" ? <>
              <Field title="Authorized approvers" hint="Only active members with this client can decide."><div className="space-y-2 rounded-lg border border-slate-200 p-2">{resources.members.map((member) => <label key={member.id} className="flex items-center gap-2 text-[11px] text-slate-700"><input type="checkbox" checked={Array.isArray(config.approverUserIds) && config.approverUserIds.includes(member.id)} onChange={(e) => setConfig({ approverUserIds: e.target.checked ? [...(Array.isArray(config.approverUserIds) ? config.approverUserIds : []), member.id] : (Array.isArray(config.approverUserIds) ? config.approverUserIds : []).filter((id: string) => id !== member.id) })} />{member.name}</label>)}</div></Field>
              <div className="grid grid-cols-2 gap-2"><Field title="Expiry minutes"><input type="number" min={1} max={43200} className={input} value={config.expiryMinutes ?? 1440} onChange={(e) => setConfig({ expiryMinutes: Math.max(1, Math.min(43200, Number(e.target.value) || 1)) })} /></Field><Field title="Remind before"><input type="number" min={0} max={43200} className={input} value={config.reminderMinutes ?? 60} onChange={(e) => setConfig({ reminderMinutes: Math.max(0, Math.min(43200, Number(e.target.value) || 0)) })} /></Field></div>
            </> : null}

            {node.actionId === "sub_workflow" ? <>
              <Field title="Published workflow ID" hint="The selected published version is pinned when the child starts."><input className={input} value={config.workflowId ?? ""} onChange={(e) => setConfig({ workflowId: e.target.value.trim() })} /></Field>
              <Field title="Version (optional)"><input type="number" min={1} className={input} value={config.version ?? ""} onChange={(e) => setConfig({ version: e.target.value ? Number(e.target.value) : undefined })} /></Field>
              <Field title="Timeout seconds"><input type="number" min={1} max={86400} className={input} value={config.timeoutSeconds ?? 3600} onChange={(e) => setConfig({ timeoutSeconds: Math.max(1, Math.min(86400, Number(e.target.value) || 1)) })} /></Field>
              <label className="flex items-center gap-2 text-[11px] text-slate-600"><input type="checkbox" checked={config.waitForCompletion !== false} onChange={(e) => setConfig({ waitForCompletion: e.target.checked })} />Wait for child completion</label>
            </> : null}

            {node.actionId === "parallel" ? <>
              <Field title="Branch identifiers" hint="Comma-separated unique handles used by outgoing connections."><input className={input} value={Array.isArray(config.branches) ? config.branches.join(", ") : ""} onChange={(e) => setConfig({ branches: e.target.value.split(",").map((value) => value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-")).filter(Boolean).slice(0, 10) })} /></Field>
              <Field title="Failure policy"><select className={`${input} bg-white`} value={config.failurePolicy ?? "fail"} onChange={(e) => setConfig({ failurePolicy: e.target.value })}><option value="fail">Fail the run</option><option value="continue">Continue with partial results</option></select></Field>
              <Field title="Timeout (seconds)"><input type="number" min={0} max={86400} className={input} value={config.timeoutSeconds ?? 300} onChange={(e) => setConfig({ timeoutSeconds: Math.max(0, Math.min(86400, Number(e.target.value) || 0)) })} /></Field>
              <label className="flex items-center gap-2 text-[11px] text-slate-600"><input type="checkbox" checked={config.cancelRemaining !== false} onChange={(e) => setConfig({ cancelRemaining: e.target.checked })} />Cancel remaining work after Wait-Any succeeds</label>
            </> : null}

            {node.actionId === "merge" ? <Field title="Join behavior"><select className={`${input} bg-white`} value={config.mode ?? "all"} onChange={(e) => setConfig({ mode: e.target.value })}><option value="all">Wait for all</option><option value="any">Wait for first success</option></select></Field> : null}

            {node.actionId === "for_each" ? <>
              <Field title="Array source" hint="Dot path resolving to an array, for example trigger.items."><input className={input} value={config.arraySource ?? ""} onChange={(e) => setConfig({ arraySource: e.target.value })} /></Field>
              <Field title="Item variable"><input className={input} value={config.itemVariable ?? "item"} onChange={(e) => setConfig({ itemVariable: e.target.value.replace(/[^A-Za-z0-9_]/g, "") })} /></Field>
              <div className="grid grid-cols-2 gap-2"><Field title="Concurrency"><input type="number" min={1} max={10} className={input} value={config.concurrency ?? 2} onChange={(e) => setConfig({ concurrency: Math.max(1, Math.min(10, Number(e.target.value) || 1)) })} /></Field><Field title="Maximum items"><input type="number" min={1} max={100} className={input} value={config.maxItems ?? 100} onChange={(e) => setConfig({ maxItems: Math.max(1, Math.min(100, Number(e.target.value) || 1)) })} /></Field></div>
              <Field title="Item failure policy"><select className={`${input} bg-white`} value={config.failurePolicy ?? "fail"} onChange={(e) => setConfig({ failurePolicy: e.target.value })}><option value="fail">Fail the run</option><option value="continue">Continue with partial results</option></select></Field>
            </> : null}

            {node.actionId === "loop" ? <>
              <div className="grid grid-cols-2 gap-2"><Field title="Maximum iterations"><input type="number" min={1} max={100} className={input} value={config.maxIterations ?? 10} onChange={(e) => setConfig({ maxIterations: Math.max(1, Math.min(100, Number(e.target.value) || 1)) })} /></Field><Field title="Maximum seconds"><input type="number" min={1} max={86400} className={input} value={config.maxDurationSeconds ?? 3600} onChange={(e) => setConfig({ maxDurationSeconds: Math.max(1, Math.min(86400, Number(e.target.value) || 1)) })} /></Field></div>
              <Field title="Stop condition field"><input className={input} placeholder="variables.done" value={config.stopCondition?.field ?? ""} onChange={(e) => setConfig({ stopCondition: { ...(config.stopCondition ?? {}), field: e.target.value } })} /></Field>
              <Field title="Stop operator"><select className={`${input} bg-white`} value={config.stopCondition?.operator ?? "equals"} onChange={(e) => setConfig({ stopCondition: { ...(config.stopCondition ?? {}), operator: e.target.value } })}>{OPERATORS.map((operator) => <option key={operator.value} value={operator.value}>{operator.label}</option>)}</select></Field>
              <Field title="Stop value"><input className={input} value={config.stopCondition?.value ?? ""} onChange={(e) => setConfig({ stopCondition: { ...(config.stopCondition ?? {}), value: e.target.value } })} /></Field>
            </> : null}
          </div>
        </div>
      )}
    </div>
  );
}
