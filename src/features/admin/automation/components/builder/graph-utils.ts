import type { AutomationEdge, AutomationNode } from "../../data/types";

export function linearEdges(nodes: AutomationNode[]): AutomationEdge[] {
  return nodes.slice(1).map((node, index) => ({ id: `e_${nodes[index]!.id}_${node.id}`, source: nodes[index]!.id, target: node.id }));
}

export function isLegacyLinearGraph(nodes: AutomationNode[], edges: AutomationEdge[]): boolean {
  if (nodes.length < 2 || nodes[0]?.type !== "trigger" || nodes.slice(1).some((node) => node.type === "trigger")) return false;
  if (nodes.some((node) => ["parallel", "merge", "loop", "approval", "sub_workflow"].includes(node.type) || node.actionId === "switch")) return false;
  const expected = linearEdges(nodes);
  return edges.length === expected.length && expected.every((edge) => edges.some((candidate) => candidate.source === edge.source && candidate.target === edge.target));
}

export function graphProblems(nodes: AutomationNode[], edges: AutomationEdge[]): Map<string, string> {
  const problems = new Map<string, string>();
  const ids = new Set(nodes.map((node) => node.id));
  if (ids.size !== nodes.length) for (const node of nodes) problems.set(node.id, "Node IDs must be unique");
  const edgeIds = new Set<string>();
  for (const edge of edges) {
    if (edgeIds.has(edge.id)) problems.set(edge.id, "Edge IDs must be unique"); edgeIds.add(edge.id);
    if (!ids.has(edge.source) || !ids.has(edge.target)) problems.set(edge.id, "Connection references a missing node");
    if (edge.source === edge.target) problems.set(edge.id, "A node cannot connect to itself");
  }
  for (const node of nodes) {
    if (node.type !== "trigger" && !edges.some((edge) => edge.target === node.id)) problems.set(node.id, "Node is not connected from the trigger path");
    if (node.type === "trigger" && edges.some((edge) => edge.target === node.id)) problems.set(node.id, "Trigger cannot have an incoming connection");
    const outgoing = edges.filter((edge) => edge.source === node.id);
    const incoming = edges.filter((edge) => edge.target === node.id);
    if (incoming.length > 1 && !["merge", "for_each", "loop"].includes(node.actionId ?? "")) problems.set(node.id, "Reconvergence requires an explicit Merge or bounded orchestration node");
    const route = (edge: AutomationEdge) => String(edge.sourceHandle ?? edge.label ?? "").toLowerCase();
    if (node.actionId === "if_else") for (const required of ["true", "false"]) if (outgoing.filter((edge) => route(edge) === required).length !== 1) problems.set(node.id, `If / Else requires exactly one ${required} connection`);
    if (node.actionId === "if_else" && outgoing.some((edge) => !["true", "false"].includes(route(edge)))) problems.set(node.id, "If / Else connections must use true or false handles");
    if (node.actionId === "filter_condition" && !outgoing.some((edge) => ["pass", "true"].includes(route(edge)))) problems.set(node.id, "Filter requires a pass connection");
    if (node.actionId === "switch") {
      const cases = Array.isArray(node.config?.cases) ? node.config.cases.map((item: { value?: string }) => String(item.value ?? "").toLowerCase()).filter(Boolean) : [];
      if (!cases.length) problems.set(node.id, "Switch requires at least one case");
      else if (cases.some((item: string) => !outgoing.some((edge) => route(edge) === item))) problems.set(node.id, "Every switch case requires a matching connection");
    }
    if (node.actionId === "parallel") {
      const handles = outgoing.map(route);
      if (outgoing.length < 2 || outgoing.length > 10) problems.set(node.id, "Parallel requires 2 to 10 outgoing branches");
      else if (handles.some((handle) => !handle) || new Set(handles).size !== handles.length) problems.set(node.id, "Each branch needs a unique named handle");
      else if (!nodes.some((candidate) => candidate.id === node.config?.joinNodeId && candidate.actionId === "merge")) problems.set(node.id, "Parallel requires its paired Merge node");
    } else if (node.actionId === "merge") {
      if (incoming.length < 2) problems.set(node.id, "Merge requires at least two incoming branches");
      else if (outgoing.length > 1) problems.set(node.id, "Merge supports one continuation only");
    } else if (["for_each", "loop"].includes(node.actionId ?? "")) {
      const body = node.actionId === "for_each" ? ["item", "body"] : ["continue", "body"];
      if (outgoing.length !== 2 || outgoing.filter((edge) => body.includes(route(edge))).length !== 1 || outgoing.filter((edge) => ["done", "exit"].includes(route(edge))).length !== 1) problems.set(node.id, `${node.actionId === "for_each" ? "For Each" : "Loop"} requires one body and one exit connection`);
    } else if (node.actionId === "approval") {
      for (const required of ["approved", "rejected", "expired"]) if (outgoing.filter((edge) => route(edge) === required).length !== 1) problems.set(node.id, `Approval requires exactly one ${required} connection`);
      if (outgoing.some((edge) => !["approved", "rejected", "expired"].includes(route(edge)))) problems.set(node.id, "Approval connections must use approved, rejected or expired handles");
    } else if (node.actionId === "sub_workflow") {
      for (const required of ["success", "failure"]) if (outgoing.filter((edge) => route(edge) === required).length !== 1) problems.set(node.id, `Sub-workflow requires exactly one ${required} connection`);
    } else if (node.actionId === "wait_until") {
      if (outgoing.length > 1) problems.set(node.id, "Wait Until supports one continuation only");
    } else if (!["if_else", "filter_condition", "switch"].includes(node.actionId ?? "") && outgoing.length > 1) problems.set(node.id, "This node cannot start parallel paths");
  }
  const visiting = new Set<string>(); const visited = new Set<string>();
  const visit = (id: string) => { if (visiting.has(id)) { const node = nodes.find((item) => item.id === id); if (!node || !["for_each", "loop"].includes(node.actionId ?? "")) problems.set(id, "Only explicit For Each and bounded Loop cycles are supported"); return; } if (visited.has(id)) return; visiting.add(id); for (const edge of edges.filter((item) => item.source === id)) visit(edge.target); visiting.delete(id); visited.add(id); };
  const trigger = nodes.find((node) => node.type === "trigger"); if (trigger) visit(trigger.id);
  for (const node of nodes) if (!visited.has(node.id)) problems.set(node.id, "Node is unreachable from the trigger");
  return problems;
}
