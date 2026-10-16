"use client";

import { useEffect, useMemo } from "react";
import dagre from "@dagrejs/dagre";
import { Background, BackgroundVariant, Controls, Handle, MarkerType, MiniMap, Position, ReactFlow, ReactFlowProvider, useReactFlow, type Edge, type Node, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Bot } from "lucide-react";
import { libraryItem } from "../builder/node-library";

/** One node as the read-only canvas needs it. The caller decides what state means (execution, simulation, ...). */
export interface FlowNodeInput {
  id: string; label: string; actionId: string; type: string; position: { x: number; y: number } | null;
  tone: { label: string; border: string; bg: string; dot: string; text: string; hex: string };
  badges: string[]; dimmed: boolean; sourceHandles: string[];
}
export interface FlowEdgeInput {
  id: string; source: string; target: string; sourceHandle: string | null; label: string | null;
  visual: { stroke: string; width: number; dashed: boolean; opacity: number; animated: boolean };
}

type NodeData = { input: FlowNodeInput; selected: boolean };

function DebugNode({ data }: NodeProps<Node<NodeData>>) {
  const { input, selected } = data;
  const item = libraryItem(input.actionId, input.label);
  const Icon = item?.icon ?? Bot;
  const handles = input.sourceHandles.length ? input.sourceHandles : [""];
  return (
    <div className={`relative w-56 rounded-md border-2 ${input.tone.border} ${input.tone.bg} px-2.5 py-2 shadow-sm transition ${selected ? "ring-2 ring-blue-300" : ""} ${input.dimmed ? "opacity-35" : ""}`} data-node-id={input.id} data-state={input.tone.label}>
      {input.type !== "trigger" ? <Handle type="target" position={Position.Top} isConnectable={false} className="!size-2 !border-0 !bg-slate-400" /> : null}
      <div className="flex items-start gap-2">
        <div className={`grid size-7 shrink-0 place-items-center rounded ${item?.iconBg ?? "bg-slate-500"} text-white`}><Icon className="size-3.5" /></div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-semibold text-slate-900">{input.label}</p>
          <p className={`mt-0.5 flex items-center gap-1 text-[10px] font-semibold ${input.tone.text}`}><span className={`size-1.5 rounded-full ${input.tone.dot}`} />{input.tone.label}</p>
        </div>
      </div>
      {input.badges.length ? <div className="mt-1.5 flex flex-wrap gap-1">{input.badges.map((badge) => <span key={badge} className="rounded bg-white/80 px-1.5 py-0.5 text-[9px] font-medium text-slate-600 ring-1 ring-slate-200">{badge}</span>)}</div> : null}
      {handles.map((handle, index) => (
        <Handle key={handle || "default"} id={handle || undefined} type="source" position={Position.Bottom} isConnectable={false} style={{ left: `${((index + 1) / (handles.length + 1)) * 100}%` }} className="!size-2 !border-0 !bg-slate-400" />
      ))}
    </div>
  );
}

const nodeTypes = { debug: DebugNode };

function layout(nodes: FlowNodeInput[], edges: FlowEdgeInput[]): Map<string, { x: number; y: number }> {
  // Saved editor positions are used when every node has one, so the debugger looks like the builder the author saw.
  if (nodes.length && nodes.every((node) => node.position)) return new Map(nodes.map((node) => [node.id, node.position!]));
  const graph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: "TB", ranksep: 70, nodesep: 40, marginx: 24, marginy: 24 });
  nodes.forEach((node) => graph.setNode(node.id, { width: 224, height: 78 }));
  edges.forEach((edge) => { if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) graph.setEdge(edge.source, edge.target); });
  dagre.layout(graph);
  return new Map(nodes.map((node) => { const point = graph.node(node.id); return [node.id, { x: point.x - 112, y: point.y - 39 }]; }));
}

function Focus({ nodeId, token }: { nodeId: string | null; token: number }) {
  const flow = useReactFlow();
  useEffect(() => {
    if (!nodeId || token === 0) return;
    void flow.fitView({ nodes: [{ id: nodeId }], duration: 300, maxZoom: 1.2, padding: 0.6 });
  }, [flow, nodeId, token]);
  return null;
}

function Inner({ nodes, edges, selectedId, onSelect, focusToken }: { nodes: FlowNodeInput[]; edges: FlowEdgeInput[]; selectedId: string | null; onSelect: (id: string | null) => void; focusToken: number }) {
  const positions = useMemo(() => layout(nodes, edges), [nodes, edges]);
  const flowNodes = useMemo<Node<NodeData>[]>(() => nodes.map((input) => ({
    id: input.id, type: "debug", position: positions.get(input.id) ?? { x: 0, y: 0 }, data: { input, selected: input.id === selectedId }, selected: input.id === selectedId,
    draggable: false, connectable: false, deletable: false,
  })), [nodes, positions, selectedId]);
  const flowEdges = useMemo<Edge[]>(() => edges.map((edge) => ({
    id: edge.id, source: edge.source, target: edge.target, sourceHandle: edge.sourceHandle ?? undefined, type: "smoothstep", animated: edge.visual.animated,
    label: edge.label ?? undefined, labelStyle: { fontSize: 10, fill: "#475569" }, labelBgStyle: { fill: "#fff", fillOpacity: 0.9 }, labelBgPadding: [4, 2] as [number, number],
    markerEnd: { type: MarkerType.ArrowClosed, color: edge.visual.stroke },
    style: { stroke: edge.visual.stroke, strokeWidth: edge.visual.width, strokeDasharray: edge.visual.dashed ? "6 4" : undefined, opacity: edge.visual.opacity },
    selectable: false, deletable: false,
  })), [edges]);
  return (
    <ReactFlow
      nodes={flowNodes} edges={flowEdges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.2 }} minZoom={0.1} maxZoom={2}
      nodesDraggable={false} nodesConnectable={false} edgesFocusable={false} elementsSelectable deleteKeyCode={null} proOptions={{ hideAttribution: true }}
      onNodeClick={(_, node) => onSelect(node.id)} onPaneClick={() => onSelect(null)}
    >
      <Background variant={BackgroundVariant.Dots} gap={22} size={1.1} color="#cbd5e1" />
      <MiniMap pannable zoomable maskColor="rgba(248,250,252,.75)" nodeColor={(node) => (node.data as NodeData).input.tone.hex} />
      <Controls showInteractive={false} />
      <Focus nodeId={selectedId} token={focusToken} />
    </ReactFlow>
  );
}

/** Read-only React Flow surface: pan, zoom, minimap, fit-view and node selection only. Editing handlers are not wired. */
export function FlowCanvas(props: { nodes: FlowNodeInput[]; edges: FlowEdgeInput[]; selectedId: string | null; onSelect: (id: string | null) => void; focusToken: number }) {
  return <ReactFlowProvider><Inner {...props} /></ReactFlowProvider>;
}
