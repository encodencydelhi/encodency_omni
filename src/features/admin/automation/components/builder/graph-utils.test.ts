import assert from "node:assert/strict";
import test from "node:test";
import { graphProblems, isLegacyLinearGraph, linearEdges } from "./graph-utils";
import type { AutomationNode } from "../../data/types";

const nodes: AutomationNode[] = [
  { id: "trigger", type: "trigger", actionId: "manual", label: "Manual", status: "configured", config: {} },
  { id: "task", type: "action", actionId: "create_task", label: "Task", status: "configured", config: {} },
];

test("recognizes the only graph shape currently safe to publish", () => {
  const edges = linearEdges(nodes);
  assert.equal(isLegacyLinearGraph(nodes, edges), true);
  assert.equal(isLegacyLinearGraph(nodes, [{ id: "reverse", source: "task", target: "trigger" }]), false);
});

test("flags disconnected nodes and unsafe trigger inputs", () => {
  assert.equal(graphProblems(nodes, []).get("task"), "Node is unreachable from the trigger");
  assert.equal(graphProblems(nodes, [{ id: "bad", source: "task", target: "trigger" }]).get("trigger"), "Trigger cannot have an incoming connection");
});

test("accepts explicit true and false branch handles", () => {
  const branchNodes: AutomationNode[] = [nodes[0]!, { id: "if", type: "condition", actionId: "if_else", label: "If", status: "configured", config: { field: "trigger.ok", operator: "equals", value: true } }, nodes[1]!, { ...nodes[1]!, id: "other" }];
  const edges = [{ id: "start", source: "trigger", target: "if" }, { id: "yes", source: "if", sourceHandle: "true", target: "task" }, { id: "no", source: "if", sourceHandle: "false", target: "other" }];
  assert.equal(graphProblems(branchNodes, edges).size, 0);
});

test("accepts explicit For Each and bounded Loop routes", () => {
  const orchestrationNodes: AutomationNode[] = [
    nodes[0]!,
    { id: "each", type: "loop", actionId: "for_each", label: "For Each", status: "configured", config: { arraySource: "trigger.items", concurrency: 2, maxItems: 20 } },
    { ...nodes[1]!, id: "item" },
    { id: "loop", type: "loop", actionId: "loop", label: "Loop", status: "configured", config: { maxIterations: 5, maxDurationSeconds: 60, stopCondition: { field: "variables.done", operator: "equals", value: true } } },
    { ...nodes[1]!, id: "body" },
    { ...nodes[1]!, id: "done" },
  ];
  const edges = [
    { id: "start", source: "trigger", target: "each" },
    { id: "each-item", source: "each", sourceHandle: "item", target: "item" },
    { id: "item-each", source: "item", target: "each" },
    { id: "each-done", source: "each", sourceHandle: "done", target: "loop" },
    { id: "loop-body", source: "loop", sourceHandle: "continue", target: "body" },
    { id: "body-loop", source: "body", target: "loop" },
    { id: "loop-exit", source: "loop", sourceHandle: "exit", target: "done" },
  ];
  assert.equal(graphProblems(orchestrationNodes, edges).size, 0);
});

test("accepts explicit approval, wait and sub-workflow routes", () => {
  const humanNodes: AutomationNode[] = [
    nodes[0]!,
    { id: "approval", type: "approval", actionId: "approval", label: "Approval", status: "configured", config: { approverUserIds: ["user-1"], expiryMinutes: 60 } },
    { id: "wait", type: "delay", actionId: "wait_until", label: "Wait Until", status: "configured", config: { mode: "relative", duration: 1, unit: "hours" } },
    { ...nodes[1]!, id: "rejected" }, { ...nodes[1]!, id: "expired" },
    { id: "child", type: "sub_workflow", actionId: "sub_workflow", label: "Child", status: "configured", config: { workflowId: "workflow-2", timeoutSeconds: 60 } },
    { ...nodes[1]!, id: "success" }, { ...nodes[1]!, id: "failure" },
  ];
  const edges = [
    { id: "ta", source: "trigger", target: "approval" },
    { id: "approved", source: "approval", sourceHandle: "approved", target: "wait" },
    { id: "rejected", source: "approval", sourceHandle: "rejected", target: "rejected" },
    { id: "expired", source: "approval", sourceHandle: "expired", target: "expired" },
    { id: "wc", source: "wait", target: "child" },
    { id: "success", source: "child", sourceHandle: "success", target: "success" },
    { id: "failure", source: "child", sourceHandle: "failure", target: "failure" },
  ];
  assert.equal(graphProblems(humanNodes, edges).size, 0);
});
