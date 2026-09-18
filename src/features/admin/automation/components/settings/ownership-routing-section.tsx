"use client";

import { Users, Shuffle, Scale, Wifi, Compass, Clock } from "lucide-react";
import { OwnershipRoutingSettings, RoutingAgent } from "../../data/settings-types";

interface OwnershipRoutingSectionProps {
  settings: OwnershipRoutingSettings;
  onChange: (updates: Partial<OwnershipRoutingSettings>) => void;
}

export function OwnershipRoutingSection({ settings, onChange }: OwnershipRoutingSectionProps) {
  const handleUpdateAgent = (index: number, updates: Partial<RoutingAgent>) => {
    const updated = [...settings.agents];
    const current = updated[index];
    if (current) {
      updated[index] = { ...current, ...updates };
      onChange({ agents: updated });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-4 flex items-start gap-3">
        <div className="size-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
          <Users className="size-4" />
        </div>
        <div>
          <h3 className="text-[14px] font-bold text-[#111C3A]">Lead Ownership & Inbound Routing Rules</h3>
          <p className="text-[11px] text-[#64748B] mt-0.5">
            Automate distribution of incoming Meta Ads and WhatsApp leads among sales reps using Round Robin, weights, or live availability.
          </p>
        </div>
      </div>

      {/* Distribution Mode Cards */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-5 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#F1F5F9]">
          <Shuffle className="size-4 text-[#334155]" />
          <h4 className="text-[12.5px] font-bold text-[#111C3A]">Lead Distribution Algorithm</h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {[
            {
              id: "round_robin",
              icon: <Shuffle className="size-4 text-blue-600" />,
              title: "Round Robin",
              desc: "Rotates leads evenly one-by-one across all active roster agents.",
            },
            {
              id: "weighted",
              icon: <Scale className="size-4 text-indigo-600" />,
              title: "Weighted Ratio",
              desc: "Assigns higher lead volumes to senior reps based on assigned weight %.",
            },
            {
              id: "availability",
              icon: <Wifi className="size-4 text-emerald-600" />,
              title: "Availability Only",
              desc: "Directs leads strictly to agents currently logged in and marked 'Online'.",
            },
            {
              id: "channel_specific",
              icon: <Compass className="size-4 text-purple-600" />,
              title: "Channel Specialist",
              desc: "Matches WhatsApp leads to chat reps and Meta Ads forms to sales execs.",
            },
          ].map((mode) => {
            const isSelected = settings.distributionMode === mode.id;
            return (
              <div
                key={mode.id}
                onClick={() => onChange({ distributionMode: mode.id as any })}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? "bg-blue-50/50 border-blue-500 shadow-2xs"
                    : "bg-[#FAFBFD] border-[#E2E8F0] hover:bg-white hover:border-[#CBD5E1]"
                }`}
              >
                <div>
                  <div className="size-7 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-center mb-2 shadow-2xs">
                    {mode.icon}
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[12px] font-bold ${isSelected ? "text-blue-600" : "text-[#111C3A]"}`}>
                      {mode.title}
                    </span>
                    <div className={`size-3.5 rounded-full border flex items-center justify-center ${isSelected ? "border-blue-600" : "border-[#CBD5E1]"}`}>
                      {isSelected && <div className="size-1.5 rounded-full bg-blue-600" />}
                    </div>
                  </div>
                  <p className="text-[10px] text-[#64748B] leading-relaxed mt-1">{mode.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Team Agent Roster Table */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-[#334155]" />
            <h4 className="text-[12.5px] font-bold text-[#111C3A]">Assigned Sales & Support Agent Roster</h4>
          </div>
          <span className="text-[11px] font-mono text-[#64748B]">
            {settings.agents.filter(a => a.online).length} of {settings.agents.length} Agents Online
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] font-medium border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-[#64748B] text-[10px] uppercase tracking-wider bg-[#F8FAFC]">
                <th className="py-2.5 px-3">Agent</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Daily Capacity Limit</th>
                {settings.distributionMode === "weighted" && (
                  <th className="py-2.5 px-3">Weight %</th>
                )}
                <th className="py-2.5 px-3">Assigned Channels</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {settings.agents.map((agent, i) => (
                <tr key={agent.id} className="hover:bg-[#FAFBFD] transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="size-7 rounded-full bg-slate-100 text-[#111C3A] font-bold text-[11px] flex items-center justify-center border border-[#E2E8F0]">
                        {agent.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-[#111C3A]">{agent.name}</div>
                        <div className="text-[9.5px] text-[#64748B]">{agent.role}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-2.5 px-3">
                    <button
                      type="button"
                      onClick={() => handleUpdateAgent(i, { online: !agent.online })}
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors cursor-pointer ${
                        agent.online ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200"
                      }`}
                    >
                      <span className={`size-1.5 rounded-full ${agent.online ? "bg-emerald-500" : "bg-slate-400"}`} />
                      {agent.online ? "Online" : "Offline"}
                    </button>
                  </td>

                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="5"
                        max="100"
                        value={agent.capacityLimitPerDay}
                        onChange={(e) => handleUpdateAgent(i, { capacityLimitPerDay: parseInt(e.target.value) || 10 })}
                        className="w-16 bg-[#FAFBFD] border border-[#E2E8F0] rounded px-2 py-1 text-[11px] font-mono font-bold text-[#111C3A] focus:outline-none focus:border-blue-500"
                      />
                      <span className="text-[10px] text-[#94A3B8]">leads / day</span>
                    </div>
                  </td>

                  {settings.distributionMode === "weighted" && (
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="5"
                          max="100"
                          step="5"
                          value={agent.weightPercentage}
                          onChange={(e) => handleUpdateAgent(i, { weightPercentage: parseInt(e.target.value) || 10 })}
                          className="w-24 accent-indigo-600 cursor-pointer"
                        />
                        <span className="font-mono font-bold text-[11px] text-[#111C3A]">{agent.weightPercentage}%</span>
                      </div>
                    </td>
                  )}

                  <td className="py-2.5 px-3">
                    <div className="flex flex-wrap gap-1">
                      {agent.assignedChannels.map((c) => (
                        <span key={c} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[9.5px] font-bold">
                          {c}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SLA & Inactivity Escalation */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-5 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#F1F5F9]">
          <Clock className="size-4 text-[#334155]" />
          <h4 className="text-[12.5px] font-bold text-[#111C3A]">SLA & Auto-Reassignment Escalation</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]">
          <div>
            <label className="block font-bold text-[#334155] mb-1">
              Auto-Reassign Unresponsive Leads After
            </label>
            <select
              value={settings.slaInactivityMinutes}
              onChange={(e) => onChange({ slaInactivityMinutes: parseInt(e.target.value) || 15 })}
              className="w-full bg-[#FAFBFD] border border-[#E2E8F0] rounded-lg px-3 py-2 text-[12px] text-[#111C3A] font-medium focus:outline-none focus:border-blue-500 focus:bg-white"
            >
              <option value={5}>5 minutes (Fast response / High-intent)</option>
              <option value={15}>15 minutes (Standard SLA)</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
            </select>
            <p className="text-[10px] text-[#94A3B8] mt-1">
              If the assigned agent has not sent a manual message within this timeframe, the lead rotates to the next rep.
            </p>
          </div>

          <div>
            <label className="block font-bold text-[#334155] mb-1">Fallback Assignee (When all reps offline)</label>
            <input
              type="text"
              value={settings.fallbackAssignee}
              onChange={(e) => onChange({ fallbackAssignee: e.target.value })}
              className="w-full bg-[#FAFBFD] border border-[#E2E8F0] rounded-lg px-3 py-2 text-[12px] text-[#111C3A] font-medium focus:outline-none focus:border-blue-500 focus:bg-white"
            />
            <p className="text-[10px] text-[#94A3B8] mt-1">
              Default administrator or unassigned queue bucket to receive overflow leads.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
