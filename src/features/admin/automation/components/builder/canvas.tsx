"use client";

import { useState } from "react";
import { AutomationNode } from "../../data/types";
import {
  Zap,
  Clock3,
  Bot,
  MoreVertical,
  Plus,
  Maximize2,
  Webhook,
  FileText,
  Users,
  Filter,
  GitBranch,
  Mail,
  CheckSquare,
  Database,
  UserPlus,
  Flag,
  Activity,
} from "lucide-react";
import { FaFacebookF, FaWhatsapp } from "react-icons/fa";

interface NodeStyle {
  icon: any;
  bg: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  badgeLabel: string;
  hexColor: string;
}

const NODE_STYLES: Record<string, NodeStyle> = {
  "Inbound Webhook": { icon: Webhook, bg: "bg-[#7C3AED]", color: "text-white", badgeBg: "bg-[#EDE9FE]", badgeText: "text-[#7C3AED]", badgeLabel: "TRIGGER", hexColor: "#7C3AED" },
  "Parse Data": { icon: () => <span className="text-[14px] font-bold font-mono">{"{ }"}</span>, bg: "bg-[#3B82F6]", color: "text-white", badgeBg: "bg-[#DBEAFE]", badgeText: "text-[#2563EB]", badgeLabel: "ACTION", hexColor: "#3B82F6" },
  "Filter Condition": { icon: Filter, bg: "bg-[#EF4444]", color: "text-white", badgeBg: "bg-[#FEE2E2]", badgeText: "text-[#EF4444]", badgeLabel: "CONDITION", hexColor: "#EF4444" },
  "WhatsApp Reply": { icon: FaWhatsapp, bg: "bg-[#25D366]", color: "text-white", badgeBg: "bg-[#DCFCE7]", badgeText: "text-[#16A34A]", badgeLabel: "ACTION", hexColor: "#25D366" },
  "Wait / Delay": { icon: Clock3, bg: "bg-[#F59E0B]", color: "text-white", badgeBg: "bg-[#FEF3C7]", badgeText: "text-[#D97706]", badgeLabel: "DELAY", hexColor: "#F59E0B" },
  "Assign User": { icon: UserPlus, bg: "bg-[#3B82F6]", color: "text-white", badgeBg: "bg-[#DBEAFE]", badgeText: "text-[#2563EB]", badgeLabel: "ACTION", hexColor: "#3B82F6" },
  "Update Record": { icon: Database, bg: "bg-[#7C3AED]", color: "text-white", badgeBg: "bg-[#EDE9FE]", badgeText: "text-[#7C3AED]", badgeLabel: "ACTION", hexColor: "#7C3AED" },
  "Send Email": { icon: Mail, bg: "bg-[#F97316]", color: "text-white", badgeBg: "bg-[#FFF7ED]", badgeText: "text-[#F97316]", badgeLabel: "ACTION", hexColor: "#F97316" },
  "Create Task": { icon: CheckSquare, bg: "bg-[#3B82F6]", color: "text-white", badgeBg: "bg-[#DBEAFE]", badgeText: "text-[#2563EB]", badgeLabel: "ACTION", hexColor: "#3B82F6" },
  "End Workflow": { icon: Flag, bg: "bg-[#EF4444]", color: "text-white", badgeBg: "bg-[#FEE2E2]", badgeText: "text-[#EF4444]", badgeLabel: "END", hexColor: "#EF4444" },
  "New Meta Lead": { icon: FaFacebookF, bg: "bg-[#1877F2]", color: "text-white", badgeBg: "bg-[#DBEAFE]", badgeText: "text-[#2563EB]", badgeLabel: "TRIGGER", hexColor: "#1877F2" },
  "Website Down": { icon: Activity, bg: "bg-[#3B82F6]", color: "text-white", badgeBg: "bg-[#DBEAFE]", badgeText: "text-[#2563EB]", badgeLabel: "TRIGGER", hexColor: "#3B82F6" },
  "Form Submission": { icon: FileText, bg: "bg-[#3B82F6]", color: "text-white", badgeBg: "bg-[#DBEAFE]", badgeText: "text-[#2563EB]", badgeLabel: "TRIGGER", hexColor: "#3B82F6" },
  "New Customer": { icon: Users, bg: "bg-[#3B82F6]", color: "text-white", badgeBg: "bg-[#DBEAFE]", badgeText: "text-[#2563EB]", badgeLabel: "TRIGGER", hexColor: "#3B82F6" },
  "Send WhatsApp": { icon: FaWhatsapp, bg: "bg-[#25D366]", color: "text-white", badgeBg: "bg-[#DCFCE7]", badgeText: "text-[#16A34A]", badgeLabel: "ACTION", hexColor: "#25D366" },
  "If / Else": { icon: GitBranch, bg: "bg-[#EF4444]", color: "text-white", badgeBg: "bg-[#FEE2E2]", badgeText: "text-[#EF4444]", badgeLabel: "CONDITION", hexColor: "#EF4444" },
};

function getNodeStyle(label: string, type: string): NodeStyle {
  if (NODE_STYLES[label]) return NODE_STYLES[label];
  if (type === "trigger") return { icon: Zap, bg: "bg-[#3B82F6]", color: "text-white", badgeBg: "bg-[#DBEAFE]", badgeText: "text-[#2563EB]", badgeLabel: "TRIGGER", hexColor: "#3B82F6" };
  if (type === "delay") return { icon: Clock3, bg: "bg-[#F59E0B]", color: "text-white", badgeBg: "bg-[#FEF3C7]", badgeText: "text-[#D97706]", badgeLabel: "DELAY", hexColor: "#F59E0B" };
  if (type === "condition") return { icon: Filter, bg: "bg-[#EF4444]", color: "text-white", badgeBg: "bg-[#FEE2E2]", badgeText: "text-[#EF4444]", badgeLabel: "CONDITION", hexColor: "#EF4444" };
  return { icon: Bot, bg: "bg-[#3B82F6]", color: "text-white", badgeBg: "bg-[#DBEAFE]", badgeText: "text-[#2563EB]", badgeLabel: "ACTION", hexColor: "#3B82F6" };
}

function NodeCard({
  node,
  stepNumber,
  isSelected,
  onSelect,
}: {
  node: AutomationNode;
  stepNumber: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const style = getNodeStyle(node.label, node.type);
  const Icon = style.icon;

  return (
    <div className="relative group shrink-0">
      {/* Step Number Badge */}
      <div
        className="absolute -top-3 -left-3 size-7 rounded-full flex items-center justify-center text-white font-bold text-[11px] shadow-sm z-20 border-2 border-white"
        style={{ backgroundColor: style.hexColor }}
      >
        {stepNumber}
      </div>

      <button
        type="button"
        onClick={onSelect}
        className={`
          group relative flex w-[270px] items-start gap-3 rounded-2xl p-4 transition-all duration-200 text-left cursor-pointer shrink-0 bg-white
          ${isSelected
            ? "shadow-lg ring-2 ring-[#2563EB] scale-[1.01]"
            : "shadow-sm shadow-slate-200/60 ring-1 ring-[#E2E8F0] hover:shadow-md hover:ring-[#CBD5E1] hover:-translate-y-0.5"
          }
        `}
      >
        <div className={`grid size-11 shrink-0 place-items-center rounded-xl ${style.bg} ${style.color} shadow-sm`}>
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-[13px] font-bold truncate ${isSelected ? "text-[#1E40AF]" : "text-[#111C3A]"}`}>{node.label}</p>
          <span className={`inline-block mt-1 text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md ${style.badgeBg} ${style.badgeText}`}>
            {style.badgeLabel}
          </span>
          {node.description && (
            <p className="text-[10.5px] text-[#6B7A94] mt-1.5 leading-snug line-clamp-2">{node.description}</p>
          )}
        </div>
        <div className="shrink-0 mt-0.5">
          <div className="grid size-6 place-items-center rounded-md hover:bg-slate-100 text-[#94A3B8] hover:text-[#64748B] transition-colors">
            <MoreVertical className="size-4" />
          </div>
        </div>
        {node.status === "configured" && (
          <div className="absolute -top-1 -right-1 size-3 rounded-full bg-emerald-500 ring-2 ring-white shadow-sm" />
        )}
      </button>
    </div>
  );
}

export function WorkflowCanvas({
  nodes,
  selectedNodeId,
  onSelectNode,
  onAddNode: _onAddNode,
}: {
  nodes: AutomationNode[];
  selectedNodeId: string | null;
  onSelectNode: (id: string) => void;
  onAddNode?: () => void;
}) {
  const [zoom, setZoom] = useState(100);

  // Ensure End Workflow node is present at the end
  const hasEndNode = nodes.some(n => n.label === "End Workflow");
  const displayNodes = hasEndNode
    ? nodes
    : [
        ...nodes,
        {
          id: "node_end",
          type: "action" as const,
          label: "End Workflow",
          description: "This is the end of your automation.",
          status: "configured" as const,
          config: {},
        },
      ];

  const CARD_W = 270;
  const COL_GAP = 110;
  const ROW_STEP = 160;
  const STAGGER_Y = 80;

  // Compute node positions & connectors
  const positions: Array<{ x: number; y: number; isLeft: boolean }> = [];
  displayNodes.forEach((_, i) => {
    const isLeft = i % 2 === 0;
    const rowIndex = Math.floor(i / 2);
    const x = isLeft ? 0 : CARD_W + COL_GAP;
    const y = isLeft ? rowIndex * ROW_STEP : rowIndex * ROW_STEP + STAGGER_Y;
    positions.push({ x, y, isLeft });
  });

  const connectors: Array<{ x1: number; y1: number; x2: number; y2: number; c1x: number; c1y: number; c2x: number; c2y: number; color: string }> = [];
  for (let i = 0; i < displayNodes.length - 1; i++) {
    const fromPos = positions[i];
    const toPos = positions[i + 1];
    const fromNode = displayNodes[i];
    if (!fromPos || !toPos || !fromNode) continue;

    const style = getNodeStyle(fromNode.label, fromNode.type);
    let x1 = 0;
    let y1 = 0;
    let x2 = 0;
    let y2 = 0;

    if (fromPos.isLeft) {
      // Left node -> Right node
      x1 = fromPos.x + CARD_W;
      y1 = fromPos.y + 45;
      x2 = toPos.x;
      y2 = toPos.y + 16;
    } else {
      // Right node -> Left node
      x1 = toPos.x + CARD_W;
      y1 = fromPos.y + 45;
      x2 = toPos.x + CARD_W;
      y2 = toPos.y + 16;
    }

    // Bezier control offset
    const dx = Math.abs(x2 - x1) * 0.5 + 40;
    const c1x = fromPos.isLeft ? x1 + dx : x1 + 50;
    const c1y = y1;
    const c2x = fromPos.isLeft ? x2 - 50 : x2 + dx;
    const c2y = y2;

    connectors.push({ x1, y1, x2, y2, c1x, c1y, c2x, c2y, color: style.hexColor });
  }

  const containerH = Math.ceil(displayNodes.length / 2) * ROW_STEP + STAGGER_Y + 80;

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex-1 overflow-auto relative">
        {/* Dot Grid Background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, #CBD5E1 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative z-10 flex flex-col items-center py-10 px-8 min-h-full">
          {displayNodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center mt-20">
              <div className="grid size-16 place-items-center rounded-2xl bg-white shadow-lg ring-1 ring-black/5 mb-5">
                <Zap className="size-7 text-[#3B82F6]" />
              </div>
              <h2 className="text-[15px] font-bold text-[#111C3A]">Build Your Automation</h2>
              <p className="mt-1.5 text-[12px] text-[#6B7A94] max-w-[240px] leading-relaxed">
                Select a trigger from the left panel to begin.
              </p>
            </div>
          ) : (
            <div
              className="relative my-auto"
              style={{ width: CARD_W * 2 + COL_GAP, height: containerH }}
            >
              {/* SVG Connector Lines Overlay */}
              <svg className="absolute inset-0 pointer-events-none w-full h-full z-10">
                {connectors.map((c, i) => (
                  <g key={i}>
                    <path
                      d={`M ${c.x1} ${c.y1} C ${c.c1x} ${c.c1y}, ${c.c2x} ${c.c2y}, ${c.x2} ${c.y2}`}
                      fill="none"
                      stroke={c.color}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <circle cx={c.x1} cy={c.y1} r="4" fill={c.color} stroke="#FFFFFF" strokeWidth="1.5" />
                    <circle cx={c.x2} cy={c.y2} r="4" fill={c.color} stroke="#FFFFFF" strokeWidth="1.5" />
                  </g>
                ))}
              </svg>

              {/* Node Cards */}
              {displayNodes.map((node, i) => {
                const pos = positions[i];
                if (!pos) return null;
                return (
                  <div
                    key={node.id}
                    className="absolute z-20"
                    style={{ left: pos.x, top: pos.y }}
                  >
                    <NodeCard
                      node={node}
                      stepNumber={i + 1}
                      isSelected={node.id === selectedNodeId}
                      onSelect={() => onSelectNode(node.id)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-4 left-6 flex items-center gap-1 bg-white border border-[#E2E8F0] rounded-xl shadow-lg px-2 py-1 z-20">
        <button
          type="button"
          onClick={() => setZoom(z => Math.max(50, z - 10))}
          className="size-7 grid place-items-center rounded-lg hover:bg-slate-100 text-[#64748B] transition-colors cursor-pointer"
        >
          <span className="text-sm font-medium">−</span>
        </button>
        <span className="text-[11px] font-semibold text-[#111C3A] w-10 text-center">{zoom}%</span>
        <button
          type="button"
          onClick={() => setZoom(z => Math.min(200, z + 10))}
          className="size-7 grid place-items-center rounded-lg hover:bg-slate-100 text-[#64748B] transition-colors cursor-pointer"
        >
          <Plus className="size-3.5" />
        </button>
        <div className="w-px h-4 bg-[#E2E8F0] mx-0.5" />
        <button
          type="button"
          className="size-7 grid place-items-center rounded-lg hover:bg-slate-100 text-[#64748B] transition-colors cursor-pointer"
        >
          <Maximize2 className="size-3.5" />
        </button>
      </div>

      {/* Minimap */}
      {displayNodes.length > 0 && (
        <div className="absolute bottom-4 right-6 w-36 h-24 bg-white border border-[#E2E8F0] rounded-xl shadow-lg p-2 z-20 overflow-hidden">
          <div className="relative w-full h-full">
            {displayNodes.map((node, i) => {
              const pos = positions[i];
              if (!pos) return null;
              const style = getNodeStyle(node.label, node.type);
              return (
                <div
                  key={node.id}
                  className={`absolute rounded-sm ${style.bg}`}
                  style={{
                    left: `${pos.isLeft ? 5 : 55}%`,
                    top: `${(pos.y / containerH) * 80 + 5}%`,
                    width: "40%",
                    height: "14%",
                  }}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
