"use client";

import { useState } from "react";
import { AutomationNode, AutomationWorkflow } from "../../data/types";
import { WButton } from "../../../website/components/ui/kit";
import { ArrowLeft, Play, Save,  } from "lucide-react";
import { NodeLibrary } from "./node-library";
import { WorkflowCanvas } from "./canvas";
import { NodeConfigPanel } from "./node-config-panel";

export function WorkflowBuilder({ workflow, onBack }: { workflow: AutomationWorkflow, onBack: () => void }) {
  const [nodes, setNodes] = useState<AutomationNode[]>(workflow.nodes || []);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || null;

  const handleAddNode = (type: string, label: string) => {
    const newNode: AutomationNode = {
      id: `node_${Date.now()}`,
      type: type as any,
      label,
      status: "idle",
      config: {}
    };
    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
  };

  const handleUpdateNode = (id: string, updates: Partial<AutomationNode>) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, ...updates, status: "configured" } : n));
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#F8FAFC]">
      {/* Topbar */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#E2E8F0]/80 bg-white/80 backdrop-blur-md px-6 shadow-sm z-20">
        <div className="flex items-center gap-5">
          <button onClick={onBack} className="p-2 hover:bg-[#F1F5F9] rounded-xl transition-all hover:scale-105 active:scale-95 text-[#64748B]">
            <ArrowLeft className="size-4.5" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-[14px] font-bold text-[#111C3A]">{workflow.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-bold tracking-wider uppercase text-[#0B7A55] bg-[#E2F5EC] border border-[#0B7A55]/10 px-2 py-0.5 rounded-md">Active v{workflow.version}</span>
              <span className="text-[10px] font-medium text-[#94A3B8]">•</span>
              <span className="text-[10px] font-medium text-[#6B7A94]">Unsaved changes</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <WButton size="sm" icon={Play} className="text-[#64748B] hover:bg-slate-100 hover:text-slate-900 border-transparent shadow-none bg-transparent">Test Workflow</WButton>
          <WButton size="sm" tone="primary" icon={Save} className="bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 shadow-md shadow-blue-900/20 rounded-lg px-4">Publish Changes</WButton>
        </div>
      </header>

      {/* 3-Panel Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Node Library */}
        <aside className="w-64 shrink-0 border-r border-[#E2E8F0] bg-white overflow-y-auto">
          <NodeLibrary onAddNode={handleAddNode} />
        </aside>

        {/* Center: Canvas */}
        <main className="flex-1 relative overflow-auto bg-[#F8FAFC]">
           <WorkflowCanvas 
             nodes={nodes} 
             selectedNodeId={selectedNodeId} 
             onSelectNode={setSelectedNodeId} 
           />
        </main>

        {/* Right Panel: Configuration */}
        <aside className="w-80 shrink-0 border-l border-[#E2E8F0] bg-white overflow-y-auto shadow-[-4px_0_24px_rgba(0,0,0,0.02)]">
           {selectedNode ? (
             <NodeConfigPanel 
               node={selectedNode} 
               onChange={(updates) => handleUpdateNode(selectedNode.id, updates)} 
             />
           ) : (
             <div className="flex h-full items-center justify-center p-6 text-center text-[#6B7A94]">
               <p className="text-[11.5px]">Select a node on the canvas to configure it.</p>
             </div>
           )}
        </aside>
      </div>
    </div>
  );
}
