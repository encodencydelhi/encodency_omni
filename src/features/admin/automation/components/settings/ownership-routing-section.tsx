"use client";

import { useEffect, useState } from "react";
import { Users, Shuffle, Scale, Wifi, Clock, Plus, Trash2 } from "lucide-react";
import { getStoredCompanyId } from "@/lib/api/tenancy-storage";
import { teamApi } from "@/features/admin/team/live/team-api";
import { OwnershipRoutingSettings, RoutingAgent } from "../../data/settings-types";

interface OwnershipRoutingSectionProps {
  settings: OwnershipRoutingSettings;
  onChange: (updates: Partial<OwnershipRoutingSettings>) => void;
}

interface Member { id: string; name: string; email: string; role: string }

const MODES = [
  { id: "round_robin", icon: <Shuffle className="size-4 text-blue-600" />, title: "Round robin", desc: "Gives the next record to the online agent with the fewest assignments today." },
  { id: "weighted", icon: <Scale className="size-4 text-indigo-600" />, title: "Weighted", desc: "Agents with a higher weight receive proportionally more records." },
  { id: "availability", icon: <Wifi className="size-4 text-emerald-600" />, title: "Availability", desc: "Only agents marked Online receive records (least loaded first)." },
] as const;

export function OwnershipRoutingSection({ settings, onChange }: OwnershipRoutingSectionProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [pick, setPick] = useState("");

  useEffect(() => {
    let cancelled = false;
    teamApi.listMembers(getStoredCompanyId())
      .then((rows) => {
        if (cancelled) return;
        setMembers(rows.filter((m) => !m.suspendedAt).map((m) => ({ id: m.user.id, name: m.user.name?.trim() || m.user.email, email: m.user.email, role: String(m.systemRole ?? "").toLowerCase() })));
      })
      .catch(() => { if (!cancelled) setMembersError("Team members could not be loaded."); });
    return () => { cancelled = true; };
  }, []);

  const updateAgent = (id: string, updates: Partial<RoutingAgent>) => onChange({ agents: settings.agents.map((a) => (a.id === id ? { ...a, ...updates } : a)) });
  const removeAgent = (id: string) => onChange({ agents: settings.agents.filter((a) => a.id !== id) });
  const addAgent = () => {
    const member = members.find((m) => m.id === pick);
    if (!member || settings.agents.some((a) => a.id === member.id)) return;
    onChange({ agents: [...settings.agents, { id: member.id, name: member.name, email: member.email, role: member.role, online: true, capacityLimitPerDay: 25, weightPercentage: 50, assignedChannels: [] }] });
    setPick("");
  };
  const available = members.filter((m) => !settings.agents.some((a) => a.id === m.id));
  // Roster entries saved before the roster was tied to real team members can't be routed to.
  const unknown = settings.agents.filter((a) => members.length > 0 && !members.some((m) => m.id === a.id));

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><Users className="size-4" /></div>
        <div>
          <h3 className="text-[14px] font-bold text-[#111C3A]">Ownership &amp; routing</h3>
          <p className="mt-0.5 text-[11px] text-[#64748B]">Used by the <strong>Assign User → “Use routing rules”</strong> step and, when General → Default ownership is Round robin, for leads created from website forms.</p>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
        <h4 className="border-b border-[#F1F5F9] pb-2 text-[12.5px] font-bold text-[#111C3A]">Distribution mode</h4>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {MODES.map((mode) => {
            const selected = settings.distributionMode === mode.id;
            return (
              <button key={mode.id} type="button" onClick={() => onChange({ distributionMode: mode.id })} className={`rounded-xl border p-3.5 text-left transition-all ${selected ? "border-blue-500 bg-blue-50/50 shadow-2xs" : "border-[#E2E8F0] bg-[#FAFBFD] hover:border-[#CBD5E1] hover:bg-white"}`}>
                <div className="mb-2 flex size-7 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white shadow-2xs">{mode.icon}</div>
                <span className={`text-[12px] font-bold ${selected ? "text-blue-600" : "text-[#111C3A]"}`}>{mode.title}</span>
                <p className="mt-1 text-[10px] leading-relaxed text-[#64748B]">{mode.desc}</p>
              </button>
            );
          })}
        </div>
        {settings.distributionMode === "channel_specific" ? <p className="text-[11px] text-[#B45309]">“Channel specialist” is not supported; records are routed like Availability.</p> : null}
      </div>

      <div className="space-y-4 rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F1F5F9] pb-2">
          <h4 className="text-[12.5px] font-bold text-[#111C3A]">Agent roster ({settings.agents.filter((a) => a.online).length} of {settings.agents.length} online)</h4>
          <div className="flex items-center gap-2">
            <select aria-label="Team member to add" value={pick} onChange={(e) => setPick(e.target.value)} className="h-8 rounded-md border border-[#E2E8F0] bg-white px-2 text-[11.5px]">
              <option value="">{members.length ? "Add a team member…" : membersError ?? "Loading team…"}</option>
              {available.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <button type="button" disabled={!pick} onClick={addAgent} className="flex h-8 items-center gap-1 rounded-md bg-[#2563EB] px-3 text-[11.5px] font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-50"><Plus className="size-3.5" /> Add</button>
          </div>
        </div>

        {unknown.length ? <p className="rounded-md bg-amber-50 px-3 py-2 text-[11px] text-amber-800">{unknown.map((a) => a.name).join(", ")} {unknown.length === 1 ? "is" : "are"} not a member of this company, so records can’t be routed to them. Remove and add real team members.</p> : null}

        {settings.agents.length === 0 ? (
          <p className="py-6 text-center text-[11.5px] text-[#64748B]">No agents yet. Add the team members who should receive routed leads.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-[11px] font-medium">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[10px] uppercase tracking-wider text-[#64748B]">
                  <th className="px-3 py-2.5">Agent</th><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5">Daily cap</th>
                  {settings.distributionMode === "weighted" ? <th className="px-3 py-2.5">Weight</th> : null}
                  <th className="px-3 py-2.5 text-right">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {settings.agents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-[#FAFBFD]">
                    <td className="px-3 py-2.5">
                      <div className="font-bold text-[#111C3A]">{agent.name}</div>
                      <div className="text-[9.5px] text-[#64748B]">{agent.email}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <button type="button" onClick={() => updateAgent(agent.id, { online: !agent.online })} className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold ${agent.online ? "border-emerald-200 bg-emerald-50 text-emerald-600" : "border-slate-200 bg-slate-100 text-slate-500"}`}>
                        <span className={`size-1.5 rounded-full ${agent.online ? "bg-emerald-500" : "bg-slate-400"}`} />{agent.online ? "Online" : "Offline"}
                      </button>
                    </td>
                    <td className="px-3 py-2.5">
                      <input type="number" min={0} max={1000} value={agent.capacityLimitPerDay} onChange={(e) => updateAgent(agent.id, { capacityLimitPerDay: Math.max(0, parseInt(e.target.value) || 0) })} className="w-16 rounded border border-[#E2E8F0] bg-[#FAFBFD] px-2 py-1 font-mono text-[11px] font-bold" />
                      <span className="ml-1 text-[10px] text-[#94A3B8]">/ day (0 = no cap)</span>
                    </td>
                    {settings.distributionMode === "weighted" ? (
                      <td className="px-3 py-2.5">
                        <input type="range" min={5} max={100} step={5} value={agent.weightPercentage} onChange={(e) => updateAgent(agent.id, { weightPercentage: parseInt(e.target.value) || 10 })} className="w-24 accent-indigo-600" />
                        <span className="ml-2 font-mono text-[11px] font-bold">{agent.weightPercentage}</span>
                      </td>
                    ) : null}
                    <td className="px-3 py-2.5 text-right"><button type="button" aria-label={`Remove ${agent.name}`} onClick={() => removeAgent(agent.id)} className="rounded p-1 text-[#94A3B8] hover:bg-red-50 hover:text-red-600"><Trash2 className="size-3.5" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="space-y-4 rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
        <div className="flex items-center gap-2 border-b border-[#F1F5F9] pb-2"><Clock className="size-4 text-[#334155]" /><h4 className="text-[12.5px] font-bold text-[#111C3A]">Fallback &amp; SLA</h4></div>
        <div className="grid grid-cols-1 gap-4 text-[11px] md:grid-cols-2">
          <div>
            <label className="mb-1 block font-bold text-[#334155]">Fallback assignee (when no agent is available)</label>
            <select value={settings.fallbackAssignee} onChange={(e) => onChange({ fallbackAssignee: e.target.value })} className="w-full rounded-lg border border-[#E2E8F0] bg-[#FAFBFD] px-3 py-2 text-[12px] font-medium text-[#111C3A] focus:border-blue-500 focus:outline-none">
              <option value="">Leave unassigned (the step fails)</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="opacity-60">
            <label className="mb-1 block font-bold text-[#334155]">Auto-reassign unresponsive leads</label>
            <select disabled value={settings.slaInactivityMinutes} className="w-full cursor-not-allowed rounded-lg border border-[#E2E8F0] bg-[#FAFBFD] px-3 py-2 text-[12px]">
              <option value={settings.slaInactivityMinutes}>{settings.slaInactivityMinutes} minutes</option>
            </select>
            <p className="mt-1 text-[10px] text-[#94A3B8]">Not available yet: agent replies are not tracked, so leads are never re-routed automatically.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
