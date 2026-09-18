"use client";

import { useState, useMemo } from "react";
import { 
  Terminal, Search, Pause, Play, Trash2, Download, 
  ChevronDown, ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { AutomationConsoleLog, AutomationLogLevel } from "../../data/types";

interface LiveConsoleStreamProps {
  logs: AutomationConsoleLog[];
  isStreaming: boolean;
  onToggleStreaming: () => void;
  onClearLogs: () => void;
  onSelectRun: (runId: string) => void;
}

export function LiveConsoleStream({
  logs,
  isStreaming,
  onToggleStreaming,
  onClearLogs,
  onSelectRun
}: LiveConsoleStreamProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<"all" | AutomationLogLevel>("all");
  const [expandedLogIds, setExpandedLogIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedLogIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (selectedLevel !== "all" && log.level !== selectedLevel) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesMsg = log.message.toLowerCase().includes(q);
        const matchesSource = log.source.toLowerCase().includes(q);
        const matchesRun = log.runId?.toLowerCase().includes(q);
        const matchesWf = log.workflowName?.toLowerCase().includes(q);
        if (!matchesMsg && !matchesSource && !matchesRun && !matchesWf) return false;
      }
      return true;
    });
  }, [logs, selectedLevel, searchQuery]);

  const levelCounts = useMemo(() => {
    return {
      all: logs.length,
      error: logs.filter(l => l.level === "error").length,
      warn: logs.filter(l => l.level === "warn").length,
      info: logs.filter(l => l.level === "info").length,
      debug: logs.filter(l => l.level === "debug").length,
    };
  }, [logs]);

  const handleExportConsole = () => {
    const content = filteredLogs.map(l => 
      `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.source}] ${l.runId ? `(Run: ${l.runId}) ` : ""}${l.message} ${l.details ? JSON.stringify(l.details) : ""}`
    ).join("\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `automation_console_${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Console logs exported to file");
  };

  const getLevelBadge = (level: AutomationLogLevel) => {
    switch (level) {
      case "error":
        return "bg-[#FEF2F2] text-[#EF4444] border-[#FECACA]";
      case "warn":
        return "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]";
      case "info":
        return "bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]";
      case "debug":
        return "bg-[#F3E8FF] text-[#9333EA] border-[#E9D5FF]";
    }
  };

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden flex flex-col">
      
      {/* Top Console Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#F8FAFC] border-b border-[#E2E8F0]">
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Streaming Status Beacon */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-white border border-[#E2E8F0] shadow-2xs">
            <span className="relative flex size-2">
              {isStreaming && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full size-2 ${isStreaming ? "bg-emerald-500" : "bg-amber-500"}`}></span>
            </span>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#334155]">
              {isStreaming ? "LIVE STREAMING" : "STREAM PAUSED"}
            </span>
          </div>

          {/* Level Filter Buttons */}
          <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-[#E2E8F0] text-[10.5px] font-mono shadow-2xs">
            <button
              onClick={() => setSelectedLevel("all")}
              className={`px-2 py-1 rounded font-bold border transition-colors ${
                selectedLevel === "all" 
                  ? "bg-slate-100 text-[#0F172A] border-[#CBD5E1]" 
                  : "text-[#64748B] border-transparent hover:text-[#0F172A] hover:bg-slate-50"
              }`}
            >
              ALL ({levelCounts.all})
            </button>
            <button
              onClick={() => setSelectedLevel("error")}
              className={`px-2 py-1 rounded font-bold transition-colors ${
                selectedLevel === "error" ? "bg-[#FEF2F2] text-[#EF4444] border border-[#FECACA]" : "text-[#EF4444] hover:bg-red-50/50"
              }`}
            >
              ERROR ({levelCounts.error})
            </button>
            <button
              onClick={() => setSelectedLevel("warn")}
              className={`px-2 py-1 rounded font-bold transition-colors ${
                selectedLevel === "warn" ? "bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]" : "text-[#D97706] hover:bg-amber-50/50"
              }`}
            >
              WARN ({levelCounts.warn})
            </button>
            <button
              onClick={() => setSelectedLevel("info")}
              className={`px-2 py-1 rounded font-bold transition-colors ${
                selectedLevel === "info" ? "bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]" : "text-[#2563EB] hover:bg-blue-50/50"
              }`}
            >
              INFO ({levelCounts.info})
            </button>
            <button
              onClick={() => setSelectedLevel("debug")}
              className={`px-2 py-1 rounded font-bold transition-colors ${
                selectedLevel === "debug" ? "bg-[#F3E8FF] text-[#9333EA] border border-[#E9D5FF]" : "text-[#9333EA] hover:bg-purple-50/50"
              }`}
            >
              DEBUG ({levelCounts.debug})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search console logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white border border-[#E2E8F0] rounded-md pl-7 pr-3 py-1 text-[11px] font-mono text-[#1E293B] w-[180px] lg:w-[220px] focus:outline-none focus:border-blue-500 placeholder:text-[#94A3B8] shadow-2xs"
            />
          </div>
        </div>

        {/* Console Action Tools */}
        <div className="flex items-center gap-2">
          
          <button
            onClick={onToggleStreaming}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10.5px] font-mono font-bold border transition-colors ${
              isStreaming 
                ? "bg-white hover:bg-slate-50 text-[#334155] border-[#E2E8F0] shadow-2xs" 
                : "bg-emerald-50 hover:bg-emerald-100 text-[#065F46] border-[#A7F3D0]"
            }`}
          >
            {isStreaming ? <Pause className="size-3" /> : <Play className="size-3" />}
            {isStreaming ? "Pause Stream" : "Resume Stream"}
          </button>

          <button
            onClick={handleExportConsole}
            className="p-1.5 text-[#64748B] hover:text-[#111C3A] rounded hover:bg-white transition-colors"
            title="Export logs to file"
          >
            <Download className="size-3.5" />
          </button>

          <button
            onClick={onClearLogs}
            className="p-1.5 text-[#64748B] hover:text-[#EF4444] rounded hover:bg-white transition-colors"
            title="Clear console output"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Output Body (Light Theme) */}
      <div className="p-3 font-mono text-[11px] leading-relaxed max-h-[580px] min-h-[420px] overflow-y-auto bg-[#FAFBFD] scrollbar-thin select-text">
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-[#94A3B8] space-y-2">
            <Terminal className="size-8 opacity-40" />
            <p>No console log entries matching active filters.</p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const badgeClass = getLevelBadge(log.level);
            const isExpanded = expandedLogIds[log.id] ?? false;
            const timeFormatted = new Date(log.timestamp).toLocaleTimeString("en-US", { 
              hour12: false, 
              hour: "2-digit", 
              minute: "2-digit", 
              second: "2-digit", 
              fractionalSecondDigits: 3 
            });

            return (
              <div 
                key={log.id} 
                className="group hover:bg-white hover:shadow-2xs px-2.5 py-2.5 transition-colors border-b border-[#E2E8F0]"
              >
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-[#94A3B8] text-[10px] shrink-0 font-medium">{timeFormatted}</span>
                  
                  <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold border uppercase shrink-0 ${badgeClass}`}>
                    {log.level}
                  </span>

                  <span className="text-[#0369A1] text-[10.5px] shrink-0 font-bold">
                    [{log.source}]
                  </span>

                  {log.runId && (
                    <button
                      onClick={() => onSelectRun(log.runId!)}
                      className="text-[#2563EB] hover:text-[#1D4ED8] hover:underline shrink-0 text-[10.5px] font-bold cursor-pointer"
                      title="Inspect this Run Trace"
                    >
                      @{log.runId}
                    </button>
                  )}

                  <span className="flex-1 break-all text-[#1E293B] font-medium">
                    {log.message}
                  </span>

                  {log.details && (
                    <button
                      onClick={() => toggleExpand(log.id)}
                      className="text-[9.5px] px-1.5 py-0.2 bg-white hover:bg-slate-50 text-[#334155] rounded border border-[#E2E8F0] flex items-center gap-0.5 shrink-0 cursor-pointer shadow-2xs font-semibold"
                    >
                      {isExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                      Payload Details
                    </button>
                  )}
                </div>

                {/* Inline JSON expander if present */}
                {isExpanded && log.details && (
                  <div className="mt-2 ml-10 p-2.5 rounded-lg bg-white border border-[#E2E8F0] text-[10.5px] text-[#334155] overflow-x-auto shadow-2xs">
                    <pre>{JSON.stringify(log.details, null, 2)}</pre>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Terminal Footer Bar */}
      <div className="px-3.5 py-2 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between text-[10.5px] font-mono text-[#64748B]">
        <div>
          Showing <strong className="text-[#111C3A]">{filteredLogs.length}</strong> of <strong className="text-[#111C3A]">{logs.length}</strong> logs
        </div>
        <div className="flex items-center gap-3">
          <span>Encoding: UTF-8</span>
          <span>•</span>
          <span>Buffer: In-Memory Ring Buffer</span>
          <span>•</span>
          <span>Status: Active Listener</span>
        </div>
      </div>

    </div>
  );
}
