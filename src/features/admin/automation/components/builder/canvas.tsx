"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Bot, Flag, Maximize2, Minus, MoreVertical, Plus, Trash2, AlertCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { AutomationNode } from "../../data/types";
import { libraryItem } from "./node-library";
import { nodeProblem } from "./node-config-panel";

const BADGE: Record<string, { bg: string; text: string; label: string }> = {
  trigger: { bg: "bg-[#DBEAFE]", text: "text-[#2563EB]", label: "TRIGGER" },
  action: { bg: "bg-[#E0F2FE]", text: "text-[#0369A1]", label: "ACTION" },
  condition: { bg: "bg-[#FEE2E2]", text: "text-[#DC2626]", label: "CONDITION" },
  delay: { bg: "bg-[#FEF3C7]", text: "text-[#B45309]", label: "DELAY" },
};

function NodeCard({ node, step, total, selected, onSelect, onMove, onDelete }: {
  node: AutomationNode; step: number; total: number; selected: boolean;
  onSelect: () => void; onMove: (dir: -1 | 1) => void; onDelete: () => void;
}) {
  const item = libraryItem(node.actionId, node.label);
  const Icon = item?.icon ?? Bot;
  const badge = BADGE[node.type] ?? BADGE.action!;
  const problem = nodeProblem(node);
  const isTrigger = node.type === "trigger";

  return (
    <div className="relative">
      <div className="absolute -left-3 -top-3 z-20 grid size-7 place-items-center rounded-full border-2 border-white text-[11px] font-bold text-white shadow-sm" style={{ backgroundColor: item?.hexColor ?? "#3B82F6" }}>{step}</div>
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => { if (e.key === "Enter") onSelect(); }}
        className={`relative flex w-[320px] cursor-pointer items-start gap-3 rounded-2xl bg-white p-4 text-left transition-all ${selected ? "scale-[1.01] shadow-lg ring-2 ring-[#2563EB]" : "shadow-sm ring-1 ring-[#E2E8F0] hover:-translate-y-0.5 hover:shadow-md"}`}
      >
        <div className={`grid size-11 shrink-0 place-items-center rounded-xl ${item?.iconBg ?? "bg-[#3B82F6]"} text-white shadow-sm`}><Icon className="size-5" /></div>
        <div className="min-w-0 flex-1">
          <p className={`truncate text-[13px] font-bold ${selected ? "text-[#1E40AF]" : "text-[#111C3A]"}`}>{node.label}</p>
          <span className={`mt-1 inline-block rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${badge.bg} ${badge.text}`}>{badge.label}</span>
          {problem ? (
            <p className="mt-1.5 flex items-center gap-1 text-[10.5px] font-medium text-[#B45309]"><AlertCircle className="size-3" /> {problem}</p>
          ) : node.description ? (
            <p className="mt-1.5 line-clamp-2 text-[10.5px] leading-snug text-[#6B7A94]">{node.description}</p>
          ) : null}
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label={`Options for ${node.label}`} className="grid size-6 place-items-center rounded-md text-[#94A3B8] hover:bg-slate-100 hover:text-[#64748B]"><MoreVertical className="size-4" /></button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled={isTrigger || step <= 2} onClick={() => onMove(-1)}><ArrowUp /> Move up</DropdownMenuItem>
              <DropdownMenuItem disabled={isTrigger || step >= total} onClick={() => onMove(1)}><ArrowDown /> Move down</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onDelete}><Trash2 /> Delete step</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {!problem && !isTrigger ? <span className="absolute -right-1 -top-1 size-3 rounded-full bg-emerald-500 ring-2 ring-white" title="Configured" /> : null}
        {problem ? <span className="absolute -right-1 -top-1 size-3 rounded-full bg-amber-500 ring-2 ring-white" title="Needs configuration" /> : null}
      </div>
    </div>
  );
}

function Connector() {
  return <div className="flex h-10 flex-col items-center"><div className="w-0.5 flex-1 bg-[#CBD5E1]" /><ArrowDown className="-mt-1 size-3.5 text-[#94A3B8]" /></div>;
}

export function WorkflowCanvas({ nodes, selectedNodeId, onSelectNode, onMoveNode, onDeleteNode }: {
  nodes: AutomationNode[];
  selectedNodeId: string | null;
  onSelectNode: (id: string) => void;
  onMoveNode: (id: string, dir: -1 | 1) => void;
  onDeleteNode: (id: string) => void;
}) {
  const [zoom, setZoom] = useState(100);

  return (
    <div className="relative flex h-full flex-col">
      <div className="custom-scrollbar relative flex-1 overflow-auto">
        <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: "radial-gradient(circle, #CBD5E1 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="relative z-10 flex min-h-full justify-center px-8 py-10">
          {nodes.length === 0 ? (
            <div className="mt-20 flex flex-col items-center text-center">
              <div className="mb-5 grid size-16 place-items-center rounded-2xl bg-white shadow-lg ring-1 ring-black/5"><Plus className="size-7 text-[#3B82F6]" /></div>
              <h2 className="text-[15px] font-bold text-[#111C3A]">Build your automation</h2>
              <p className="mt-1.5 max-w-[260px] text-[12px] leading-relaxed text-[#6B7A94]">Pick a trigger from the left panel, then add the steps that should run.</p>
            </div>
          ) : (
            <div className="flex origin-top flex-col items-center" style={{ transform: `scale(${zoom / 100})` }}>
              {nodes.map((node, i) => (
                <div key={node.id} className="flex flex-col items-center">
                  <NodeCard
                    node={node}
                    step={i + 1}
                    total={nodes.length}
                    selected={node.id === selectedNodeId}
                    onSelect={() => onSelectNode(node.id)}
                    onMove={(dir) => onMoveNode(node.id, dir)}
                    onDelete={() => onDeleteNode(node.id)}
                  />
                  <Connector />
                </div>
              ))}
              <div className="flex items-center gap-2 rounded-full border border-dashed border-[#CBD5E1] bg-white px-4 py-2 text-[11px] font-semibold text-[#64748B] shadow-2xs">
                <Flag className="size-3.5 text-[#EF4444]" /> End of workflow — add steps from the left panel
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-4 left-6 z-20 flex items-center gap-1 rounded-xl border border-[#E2E8F0] bg-white px-2 py-1 shadow-lg">
        <button type="button" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(50, z - 10))} className="grid size-7 place-items-center rounded-lg text-[#64748B] hover:bg-slate-100"><Minus className="size-3.5" /></button>
        <span className="w-10 text-center text-[11px] font-semibold text-[#111C3A]">{zoom}%</span>
        <button type="button" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(150, z + 10))} className="grid size-7 place-items-center rounded-lg text-[#64748B] hover:bg-slate-100"><Plus className="size-3.5" /></button>
        <div className="mx-0.5 h-4 w-px bg-[#E2E8F0]" />
        <button type="button" aria-label="Reset zoom" onClick={() => setZoom(100)} className="grid size-7 place-items-center rounded-lg text-[#64748B] hover:bg-slate-100"><Maximize2 className="size-3.5" /></button>
      </div>
    </div>
  );
}
