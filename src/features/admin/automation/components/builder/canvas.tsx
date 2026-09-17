"use client";

import { AutomationNode } from "../../data/types";
import { Bot, Clock3, Zap, ArrowDown, MoreVertical } from "lucide-react";

export function WorkflowCanvas({ 
  nodes, 
  selectedNodeId, 
  onSelectNode 
}: { 
  nodes: AutomationNode[], 
  selectedNodeId: string | null, 
  onSelectNode: (id: string) => void 
}) {
  return (
    <div className="flex min-h-full flex-col items-center p-12 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#94A3B8 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#F8FAFC]/50 to-[#F8FAFC] pointer-events-none"></div>

      <div className="relative z-10 w-full flex flex-col items-center">
        {nodes.length === 0 ? (
          <div className="mt-32 flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
             <div className="grid size-20 place-items-center rounded-2xl bg-white shadow-xl shadow-blue-900/5 ring-1 ring-black/5 mb-6 relative">
               <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-blue-100 to-transparent opacity-50 blur-md" />
               <Zap className="size-8 text-blue-500 relative z-10 drop-shadow-md" />
             </div>
             <h2 className="text-[16px] font-bold text-[#111C3A]">Build Your Automation</h2>
             <p className="mt-2 text-[13px] text-[#6B7A94] max-w-[260px] leading-relaxed">
               Select a trigger from the left panel to begin orchestrating your workflow.
             </p>
          </div>
        ) : (
          <div className="flex flex-col items-center pb-32">
            {nodes.map((node, index) => {
              const isSelected = node.id === selectedNodeId;
              
              return (
                <div key={node.id} className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-300" style={{ animationDelay: `${index * 50}ms` }}>
                  {/* Node Card */}
                  <button
                    onClick={() => onSelectNode(node.id)}
                    className={`
                      group relative flex w-[300px] items-start gap-4 rounded-2xl p-4 transition-all duration-300 text-left
                      ${isSelected ? 
                        "bg-white shadow-2xl shadow-blue-900/10 ring-2 ring-blue-500 scale-[1.02]" : 
                        "bg-white/90 backdrop-blur-sm shadow-md shadow-slate-200/50 ring-1 ring-slate-200 hover:shadow-lg hover:ring-slate-300 hover:-translate-y-1"}
                    `}
                  >
                    {isSelected && <div className="absolute -inset-1 rounded-2xl bg-blue-500/10 blur-xl -z-10" />}

                    <div className={`grid size-10 shrink-0 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-110 ${
                      node.type === "trigger" ? "bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-lg shadow-orange-500/20" :
                      node.type === "delay" ? "bg-gradient-to-br from-slate-400 to-slate-600 text-white shadow-lg shadow-slate-500/20" :
                      "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20"
                    }`}>
                      {node.type === "trigger" ? <Zap className="size-5" /> :
                       node.type === "delay" ? <Clock3 className="size-5" /> :
                       <Bot className="size-5" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className={`text-[13px] font-bold truncate transition-colors ${isSelected ? "text-blue-900" : "text-[#111C3A]"}`}>{node.label}</p>
                      <p className="text-[10px] text-[#6B7A94] mt-1 uppercase tracking-[0.08em] font-semibold">{node.type}</p>
                    </div>

                    <div className={`transition-opacity duration-200 ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                      <div className="grid size-6 place-items-center rounded-md hover:bg-slate-100 text-slate-400">
                        <MoreVertical className="size-4" />
                      </div>
                    </div>

                    {node.status === "configured" && (
                      <div className="absolute -top-1.5 -right-1.5 size-3.5 rounded-full bg-emerald-500 ring-2 ring-white shadow-sm" />
                    )}
                    {node.status === "error" && (
                      <div className="absolute -top-1.5 -right-1.5 size-3.5 rounded-full bg-red-500 ring-2 ring-white shadow-sm animate-pulse" />
                    )}
                  </button>

                  {/* Connection Line */}
                  {index < nodes.length - 1 && (
                    <div className="my-2 flex flex-col items-center">
                      <div className="h-6 w-px bg-gradient-to-b from-slate-300 to-transparent" />
                      <div className="grid size-6 place-items-center rounded-full border border-slate-200 bg-white shadow-sm z-10 -my-1 transition-transform hover:scale-110 hover:bg-slate-50 cursor-pointer text-slate-400 hover:text-blue-500">
                        <ArrowDown className="size-3" />
                      </div>
                      <div className="h-6 w-px bg-gradient-to-b from-transparent to-slate-300" />
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* End Node */}
            <div className="mt-2 flex flex-col items-center opacity-60 animate-in fade-in duration-700" style={{ animationDelay: `${nodes.length * 50}ms` }}>
               <div className="h-8 w-px bg-gradient-to-b from-slate-300 to-transparent" />
               <div className="px-4 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-semibold tracking-widest uppercase text-slate-500 mt-2">
                 End Workflow
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
