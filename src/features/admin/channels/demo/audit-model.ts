import type { Message, Workflow, WorkflowNode } from "./mock-service";

export const SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;
export function serviceWindow(messages: Message[], contactId: string, now = Date.now()) {
  const latest = messages.filter(message => message.contactId === contactId && !message.outgoing && message.createdAt).map(message => Date.parse(message.createdAt!)).filter(time => Number.isFinite(time) && time <= now).sort((a, b) => b - a)[0];
  return { open: latest !== undefined && now - latest < SERVICE_WINDOW_MS, expiresAt: latest === undefined ? null : latest + SERVICE_WINDOW_MS };
}
export function workflowProblems(workflow: Workflow): string[] {
  const errors: string[] = [];
  const ids = new Set(workflow.nodes.map(node => node.id));
  if (!workflow.name.trim()) errors.push("Enter A Workflow Name.");
  if (workflow.nodes.filter(node => node.kind === "Trigger").length !== 1) errors.push("Use Exactly One Trigger.");
  if (ids.size !== workflow.nodes.length) errors.push("Node IDs Must Be Unique.");
  for (const node of workflow.nodes) {
    if (!node.label.trim() || !node.value.trim()) errors.push(`Complete ${node.label || "The Node"}.`);
    for (const target of [node.nextId, node.matchId, node.fallbackId]) if (target && !ids.has(target)) errors.push(`${node.label}: A Route Points To A Removed Node.`);
    if (node.kind === "Condition" && (!node.matchId || !node.fallbackId)) errors.push(`${node.label}: Configure Both Match And Fallback Routes.`);
  }
  const start = workflow.nodes.find(node => node.kind === "Trigger");
  const visiting = new Set<string>(), visited = new Set<string>();
  const visit = (id: string) => {
    if (visiting.has(id)) { errors.push("Cyclic Routes Are Not Supported In This Demo Builder."); return; }
    if (visited.has(id)) return;
    const node = workflow.nodes.find(node => node.id === id); if (!node) return;
    visiting.add(id);
    const index = workflow.nodes.indexOf(node);
    const targets = node.kind === "Condition" ? [node.matchId, node.fallbackId] : node.nextId ? [node.nextId] : node.kind === "Handoff" ? [] : [workflow.nodes[index + 1]?.id];
    targets.filter((value): value is string => Boolean(value)).forEach(visit);
    visiting.delete(id); visited.add(id);
  };
  if (start) visit(start.id);
  if (start && workflow.nodes.some(node => !visited.has(node.id))) errors.push("Some Nodes Are Unreachable From The Trigger.");
  return [...new Set(errors)];
}
export function testWorkflow(workflow: Workflow, input: string): string[] {
  const errors = workflowProblems(workflow); if (errors.length) return errors;
  const trace: string[] = [];
  let node: WorkflowNode | undefined = workflow.nodes.find(node => node.kind === "Trigger");
  for (let count = 0; node && count < 100; count++) {
    const current = node;
    const matches = current.operator === "Equals" ? input.toLowerCase() === current.value.toLowerCase() : current.operator === "Does Not Contain" ? !input.toLowerCase().includes(current.value.toLowerCase()) : input.toLowerCase().includes(current.value.toLowerCase());
    trace.push(current.kind === "Condition" ? `${current.label}: ${matches ? "Match" : "Fallback"}` : `${current.kind}: ${current.value}`);
    if (current.kind === "Trigger" && !matches) { trace.push("Trigger Did Not Match. No Action Taken."); break; }
    if (current.kind === "Handoff") { trace.push("Demo Human Handoff Prepared. No Real Assignment Was Sent."); break; }
    const target = current.kind === "Condition" ? matches ? current.matchId : current.fallbackId : current.nextId || workflow.nodes[workflow.nodes.indexOf(current) + 1]?.id;
    node = workflow.nodes.find(candidate => candidate.id === target);
  }
  return trace;
}
export function whatsappAccess(role: string | undefined, platformRole?: string | null, jobTitle?: string | null) {
  const agent = role === "MANAGER" && /agent/i.test(jobTitle || "");
  const canEdit = platformRole === "SUPER_ADMIN" || ["OWNER", "ADMIN", "MANAGER"].includes(role || "");
  return { canEdit, canManage: canEdit && !agent, label: platformRole === "SUPER_ADMIN" ? "Agency Admin" : role === "OWNER" || role === "ADMIN" ? "Client Admin" : agent ? "Agent" : role === "MANAGER" ? "Manager" : "Read-only" };
}
