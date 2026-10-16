"use client";

import { useCallback, useEffect, useMemo } from "react";
import dagre from "@dagrejs/dagre";
import {
  Background, BackgroundVariant, Controls, Handle, MarkerType, MiniMap, Position, ReactFlow, ReactFlowProvider,
  addEdge, applyEdgeChanges, applyNodeChanges, useReactFlow, type Connection, type Edge, type EdgeChange, type Node, type NodeChange, type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AlertCircle, Bot, LayoutDashboard, LockKeyhole, Redo2, Trash2, Undo2 } from "lucide-react";
import type { AutomationEdge, AutomationNode } from "../../data/types";
import { graphProblems } from "./graph-utils";
import { LIBRARY, NODE_DRAG_TYPE, libraryItem, type LibraryItem } from "./node-library";

type FlowData = { automation: AutomationNode; problem?: string; selected: boolean; readOnly: boolean; onDelete: (id: string) => void };

function WorkflowNode({ id, data }: NodeProps<Node<FlowData>>) {
  const item = libraryItem(data.automation.actionId, data.automation.label);
  const Icon = item?.icon ?? Bot;
  const isTrigger = data.automation.type === "trigger";
  const action = data.automation.actionId;
  const switchCases = action === "switch" && Array.isArray(data.automation.config?.cases) ? data.automation.config.cases as Array<{ value?: string }> : [];
  const parallelBranches = action === "parallel" && Array.isArray(data.automation.config?.branches) ? data.automation.config.branches.map(String) : [];
  return (
    <div className={`relative w-64 rounded-xl border bg-white shadow-sm transition ${data.selected ? "border-blue-500 ring-2 ring-blue-200" : data.problem ? "border-amber-400" : "border-slate-200"}`}>
      {!isTrigger ? <Handle type="target" position={Position.Top} className="!size-3 !border-2 !border-white !bg-slate-400" /> : null}
      <div className="flex items-start gap-3 p-3.5">
        <div className={`grid size-10 shrink-0 place-items-center rounded-lg ${item?.iconBg ?? "bg-blue-500"} text-white`}><Icon className="size-4" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><p className="truncate text-xs font-bold text-slate-900">{data.automation.label}</p>{item?.supported === false ? <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[8px] font-bold uppercase text-slate-500">Coming Soon</span> : null}</div>
          <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">{data.automation.type.replace("_", " ")}</p>
          {data.problem ? <p className="mt-2 flex items-center gap-1 text-[10px] font-medium text-amber-700"><AlertCircle className="size-3" />{data.problem}</p> : <p className="mt-1.5 line-clamp-2 text-[10px] text-slate-500">{data.automation.description}</p>}
        </div>
        {!data.readOnly ? <button type="button" aria-label={`Delete ${data.automation.label}`} onClick={(event) => { event.stopPropagation(); data.onDelete(id); }} className="rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-500"><Trash2 className="size-3.5" /></button> : null}
      </div>
      {action === "approval" ? <><Handle id="approved" type="source" position={Position.Bottom} style={{ left: "22%" }} className="!size-3 !border-2 !border-white !bg-emerald-500" /><Handle id="rejected" type="source" position={Position.Bottom} style={{ left: "50%" }} className="!size-3 !border-2 !border-white !bg-red-500" /><Handle id="expired" type="source" position={Position.Bottom} style={{ left: "78%" }} className="!size-3 !border-2 !border-white !bg-amber-500" /></> : action === "sub_workflow" ? <><Handle id="success" type="source" position={Position.Bottom} style={{ left: "32%" }} className="!size-3 !border-2 !border-white !bg-emerald-500" /><Handle id="failure" type="source" position={Position.Bottom} style={{ left: "68%" }} className="!size-3 !border-2 !border-white !bg-red-500" /></> : action === "if_else" ? <><Handle id="true" type="source" position={Position.Bottom} style={{ left: "32%" }} className="!size-3 !border-2 !border-white !bg-emerald-500" /><span className="absolute -bottom-5 left-[22%] text-[9px] font-bold text-emerald-700">TRUE</span><Handle id="false" type="source" position={Position.Bottom} style={{ left: "68%" }} className="!size-3 !border-2 !border-white !bg-red-500" /><span className="absolute -bottom-5 right-[18%] text-[9px] font-bold text-red-700">FALSE</span></> : action === "filter_condition" ? <><Handle id="pass" type="source" position={Position.Bottom} style={{ left: "32%" }} className="!size-3 !border-2 !border-white !bg-emerald-500" /><span className="absolute -bottom-5 left-[22%] text-[9px] font-bold text-emerald-700">PASS</span><Handle id="reject" type="source" position={Position.Bottom} style={{ left: "68%" }} className="!size-3 !border-2 !border-white !bg-slate-400" /><span className="absolute -bottom-5 right-[15%] text-[9px] font-bold text-slate-500">REJECT</span></> : action === "switch" ? <>{switchCases.map((item, index) => <Handle key={item.value ?? index} id={String(item.value ?? index).toLowerCase()} type="source" position={Position.Bottom} style={{ left: `${((index + 1) / (switchCases.length + 2)) * 100}%` }} className="!size-3 !border-2 !border-white !bg-rose-500" />)}<Handle id="default" type="source" position={Position.Bottom} style={{ left: `${((switchCases.length + 1) / (switchCases.length + 2)) * 100}%` }} className="!size-3 !border-2 !border-white !bg-slate-400" /></> : action === "parallel" ? <>{parallelBranches.map((branch, index) => <Handle key={branch} id={branch} type="source" position={Position.Bottom} style={{ left: `${((index + 1) / (parallelBranches.length + 1)) * 100}%` }} className="!size-3 !border-2 !border-white !bg-indigo-500" />)}</> : action === "for_each" ? <><Handle id="item" type="source" position={Position.Bottom} style={{ left: "32%" }} className="!size-3 !border-2 !border-white !bg-violet-600" /><span className="absolute -bottom-5 left-[22%] text-[9px] font-bold text-violet-700">ITEM</span><Handle id="done" type="source" position={Position.Bottom} style={{ left: "68%" }} className="!size-3 !border-2 !border-white !bg-emerald-500" /><span className="absolute -bottom-5 right-[18%] text-[9px] font-bold text-emerald-700">DONE</span></> : action === "loop" ? <><Handle id="continue" type="source" position={Position.Bottom} style={{ left: "32%" }} className="!size-3 !border-2 !border-white !bg-violet-600" /><span className="absolute -bottom-5 left-[14%] text-[9px] font-bold text-violet-700">CONTINUE</span><Handle id="exit" type="source" position={Position.Bottom} style={{ left: "68%" }} className="!size-3 !border-2 !border-white !bg-emerald-500" /><span className="absolute -bottom-5 right-[20%] text-[9px] font-bold text-emerald-700">EXIT</span></> : <Handle type="source" position={Position.Bottom} className="!size-3 !border-2 !border-white !bg-blue-500" />}
    </div>
  );
}

const nodeTypes = { workflow: WorkflowNode };

function layout(nodes: AutomationNode[], edges: AutomationEdge[]): AutomationNode[] {
  const graph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: "TB", ranksep: 75, nodesep: 45, marginx: 30, marginy: 30 });
  nodes.forEach((node) => graph.setNode(node.id, { width: 256, height: 100 }));
  edges.forEach((edge) => graph.setEdge(edge.source, edge.target));
  dagre.layout(graph);
  return nodes.map((node) => { const point = graph.node(node.id); return { ...node, position: { x: point.x - 128, y: point.y - 50 } }; });
}

function CanvasInner({ nodes, edges, selectedNodeId, readOnly, canUndo, canRedo, onSelectNode, onGraphChange, onDropNode, onUndo, onRedo }: {
  nodes: AutomationNode[]; edges: AutomationEdge[]; selectedNodeId: string | null; readOnly?: boolean; canUndo: boolean; canRedo: boolean;
  onSelectNode: (id: string | null) => void; onGraphChange: (nodes: AutomationNode[], edges: AutomationEdge[]) => void;
  onDropNode: (item: LibraryItem, position: { x: number; y: number }) => void; onUndo: () => void; onRedo: () => void;
}) {
  const reactFlow = useReactFlow();
  const problems = useMemo(() => graphProblems(nodes, edges), [nodes, edges]);
  const removeNode = useCallback((id: string) => onGraphChange(nodes.filter((node) => node.id !== id), edges.filter((edge) => edge.source !== id && edge.target !== id)), [edges, nodes, onGraphChange]);
  const flowNodes = useMemo<Node<FlowData>[]>(() => nodes.map((node, index) => ({
    id: node.id, type: "workflow", position: node.position ?? { x: 120, y: index * 150 + 40 }, selected: node.id === selectedNodeId,
    data: { automation: node, problem: problems.get(node.id), selected: node.id === selectedNodeId, readOnly: Boolean(readOnly), onDelete: removeNode },
  })), [nodes, problems, readOnly, removeNode, selectedNodeId]);
  const flowEdges = useMemo<Edge[]>(() => edges.map((edge) => ({ ...edge, type: "smoothstep", animated: false, markerEnd: { type: MarkerType.ArrowClosed }, style: problems.has(edge.id) ? { stroke: "#d97706", strokeWidth: 2 } : { stroke: "#94a3b8", strokeWidth: 2 }, label: problems.get(edge.id) ?? edge.label })), [edges, problems]);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() === "z") { event.preventDefault(); if (event.shiftKey) onRedo(); else onUndo(); }
      if (event.key.toLowerCase() === "y") { event.preventDefault(); onRedo(); }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [onRedo, onUndo]);

  const changeNodes = (changes: NodeChange<Node<FlowData>>[]) => {
    if (readOnly) return;
    const changed = applyNodeChanges(changes, flowNodes);
    const byId = new Map(changed.map((node) => [node.id, node.position]));
    onGraphChange(nodes.filter((node) => changed.some((candidate) => candidate.id === node.id)).map((node) => ({ ...node, position: byId.get(node.id) ?? node.position })), edges);
  };
  const changeEdges = (changes: EdgeChange<Edge>[]) => {
    if (readOnly) return;
    const changed = applyEdgeChanges(changes, flowEdges);
    onGraphChange(nodes, changed.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target, label: typeof edge.label === "string" ? edge.label : undefined, sourceHandle: edge.sourceHandle, targetHandle: edge.targetHandle })));
  };
  const connect = (connection: Connection) => {
    if (readOnly || !connection.source || !connection.target || connection.source === connection.target) return;
    const changed = addEdge({ ...connection, label: connection.sourceHandle ?? undefined, id: `e_${connection.source}_${connection.sourceHandle ?? "next"}_${connection.target}_${Date.now()}` }, flowEdges);
    onGraphChange(nodes, changed.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target, sourceHandle: edge.sourceHandle, targetHandle: edge.targetHandle })));
  };

  return <div className="relative h-full" onDragOver={(event) => { if (!readOnly) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; } }} onDrop={(event) => {
    if (readOnly) return; event.preventDefault(); const id = event.dataTransfer.getData(NODE_DRAG_TYPE); const item = LIBRARY.find((candidate) => candidate.id === id); if (item && item.supported !== false) onDropNode(item, reactFlow.screenToFlowPosition({ x: event.clientX, y: event.clientY }));
  }}>
    <ReactFlow nodes={flowNodes} edges={flowEdges} nodeTypes={nodeTypes} onNodesChange={changeNodes} onEdgesChange={changeEdges} onConnect={connect} onNodeClick={(_, node) => onSelectNode(node.id)} onPaneClick={() => onSelectNode(null)} nodesDraggable={!readOnly} nodesConnectable={!readOnly} elementsSelectable fitView minZoom={0.25} maxZoom={1.8} deleteKeyCode={readOnly ? null : ["Backspace", "Delete"]} onNodesDelete={(deleted) => deleted.forEach((node) => removeNode(node.id))}>
      <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="#cbd5e1" /><MiniMap pannable zoomable nodeColor={(node) => libraryItem((node.data as FlowData).automation.actionId)?.hexColor ?? "#3b82f6"} maskColor="rgba(248,250,252,.75)" /><Controls showInteractive={false} />
    </ReactFlow>
    <div className="absolute left-4 top-4 z-10 flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
      <button type="button" disabled={readOnly || !canUndo} onClick={onUndo} title="Undo (Ctrl+Z)" className="rounded p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-30"><Undo2 className="size-4" /></button>
      <button type="button" disabled={readOnly || !canRedo} onClick={onRedo} title="Redo (Ctrl+Y)" className="rounded p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-30"><Redo2 className="size-4" /></button>
      <button type="button" disabled={readOnly || nodes.length === 0} onClick={() => onGraphChange(layout(nodes, edges), edges)} title="Auto-layout" className="rounded p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-30"><LayoutDashboard className="size-4" /></button>
      {readOnly ? <span className="flex items-center gap-1 px-2 text-[10px] font-bold uppercase text-slate-500"><LockKeyhole className="size-3" />Read only</span> : null}
    </div>
  </div>;
}

export function WorkflowCanvas(props: Parameters<typeof CanvasInner>[0]) {
  return <ReactFlowProvider><CanvasInner {...props} /></ReactFlowProvider>;
}
