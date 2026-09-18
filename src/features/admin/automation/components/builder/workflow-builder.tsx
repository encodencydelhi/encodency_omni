"use client";

import { useState } from "react";
import { AutomationNode, AutomationWorkflow } from "../../data/types";
import { ArrowLeft, Play, Send, Pencil } from "lucide-react";
import { NodeLibrary } from "./node-library";
import { WorkflowCanvas } from "./canvas";
import { NodeConfigPanel } from "./node-config-panel";

export function WorkflowBuilder({ workflow, onBack }: { workflow: AutomationWorkflow; onBack: () => void }) {
  const [nodes, setNodes] = useState<AutomationNode[]>(workflow.nodes || []);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [workflowName] = useState(workflow.name);
  const [editingName, setEditingName] = useState(false);

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || null;

  const handleAddNode = (type: string, label: string, actionId?: string) => {
    const descriptions: Record<string, string> = {
      "New Meta Lead": "Triggers when a lead form is submitted on Facebook/Instagram.",
      "Website Down": "Triggers when website monitoring detects downtime.",
      "Inbound Webhook": "Triggers when data is received via a webhook URL.",
      "Form Submission": "Triggers when a form is submitted on your website.",
      "New Customer": "Triggers when a new customer is added to the system.",
      "Send WhatsApp": "Send a template message via AiSensy.",
      "WhatsApp Reply": "Send a template message to the user via WhatsApp.",
      "Send Email": "Send an email to the user or team.",
      "Assign User": "Assign the entity to a team member.",
      "Update Record": "Update lead information in the database.",
      "Create Task": "Create a follow-up task for the assigned user.",
      "Filter Condition": "Check if the data meets the required criteria.",
      "If / Else": "Branch workflow based on conditions.",
      "Wait / Delay": "Wait for a specific time before next step.",
    };
    const newNode: AutomationNode = {
      id: `node_${Date.now()}`,
      type: type as any,
      actionId,
      label,
      description: descriptions[label] || "",
      status: "idle",
      config: {},
    };
    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
  };

  const handleUpdateNode = (id: string, updates: Partial<AutomationNode>) => {
    setNodes(prev => prev.map(n => (n.id === id ? { ...n, ...updates, status: "configured" } : n)));
  };

  const handleCanvasAddNode = () => {
    // When clicking the + button on canvas, open the node library (already visible)
    // No-op since the library is always visible
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#F8FAFC]">
      {/* Topbar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#E2E8F0] bg-white px-5 z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-1.5 hover:bg-[#F1F5F9] rounded-lg transition-colors text-[#64748B]"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <h1 className="text-[14px] font-bold text-[#111C3A]">{workflowName}</h1>
              <button
                type="button"
                onClick={() => setEditingName(!editingName)}
                className="p-1 hover:bg-[#F1F5F9] rounded text-[#94A3B8] hover:text-[#64748B] transition-colors cursor-pointer"
              >
                <Pencil className="size-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-wider uppercase text-[#0B7A55] bg-[#E2F5EC] border border-[#0B7A55]/10 px-2 py-0.5 rounded">
                Active v{workflow.version}
              </span>
              <span className="text-[10px] text-[#94A3B8]">•</span>
              <span className="text-[10.5px] text-[#6B7A94]">All changes saved</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#E2E8F0] bg-white text-[11.5px] font-semibold text-[#64748B] hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Play className="size-3.5" />
            Test Workflow
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#E2E8F0] bg-white text-[11.5px] font-semibold text-[#111C3A] hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Save Draft
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 h-8 px-4 rounded-lg bg-gradient-to-r from-[#2563EB] to-[#4F46E5] text-[11.5px] font-semibold text-white hover:from-[#1D4ED8] hover:to-[#4338CA] transition-all cursor-pointer shadow-sm shadow-blue-500/20"
          >
            <Send className="size-3.5" />
            Publish Changes
          </button>
        </div>
      </header>

      {/* 3-Panel Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Node Library */}
        <aside className="w-60 shrink-0 border-r border-[#E2E8F0] bg-white overflow-y-auto">
          <NodeLibrary onAddNode={handleAddNode} />
        </aside>

        {/* Center: Canvas */}
        <main className="flex-1 relative overflow-hidden bg-[#F8FAFC]">
          <WorkflowCanvas
            nodes={nodes}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            onAddNode={handleCanvasAddNode}
          />
        </main>

        {/* Right Panel: Configuration */}
        <aside className="w-80 shrink-0 border-l border-[#E2E8F0] bg-white overflow-y-auto">
          {selectedNode ? (
            <NodeConfigPanel
              node={selectedNode}
              onChange={updates => handleUpdateNode(selectedNode.id, updates)}
            />
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-center">
              <p className="text-[11.5px] text-[#6B7A94]">Select a node on the canvas to configure it.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
