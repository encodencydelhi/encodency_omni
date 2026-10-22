"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Megaphone, Play, CalendarDays, CheckCircle2, Users, Database,
  Search, SlidersHorizontal, ArrowDownUp, Plus, MoreVertical,
  Copy, Link2, BarChart3, ChevronDown,
  ChevronRight, Target, AlertCircle, RefreshCw, Loader2
} from "lucide-react";
import { ChannelLogo } from "@/features/admin/shared/channel-logo";
import { campaignsApi, type CampaignRecord } from "./live/campaigns-api";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { ApiError } from "@/types/api";
function ChannelIcon({ channel, size = 18 }: { channel: string; size?: number }) {
  return <ChannelLogo channel={channel} className={`h-[${size}px] w-[${size}px]`} />;
}

function StatCard({ item }: { item: { icon: React.ComponentType<{ size?: number }>; title: string; value: string; trend: string; note: string; tone: string; down?: boolean } }) {
  const Icon = item.icon;
  const iconTone = {
    red: "bg-[#fff0f1] text-[#e32937]",
    green: "bg-[#e4f9ef] text-[#16a16c]",
    purple: "bg-[#f1eaff] text-[#8054d5]",
    blue: "bg-[#e9f3ff] text-[#347fd3]",
    orange: "bg-[#fff3e1] text-[#d99018]"
  }[item.tone];

  return (
    <div className="flex h-[82px] items-center gap-3 rounded-[7px] border border-[#e6eaf0] bg-white px-[13px] py-3 shadow-[0_2px_8px_rgba(25,39,65,.025)]">
      <div className={`grid h-[38px] w-[38px] shrink-0 place-items-center rounded-sm ${iconTone}`}>
        <Icon size={18} />
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="text-[12px] font-semibold text-[#536078]">{item.title}</span>
        <div className="mt-0.5 flex items-baseline gap-[5px]">
          <strong className="text-[20px] leading-none tracking-[-.4px] text-[#13203e]">{item.value}</strong>
          <em className={`text-[12px] font-semibold not-italic ${item.down ? "text-[#df3440]" : "text-[#13a16b]"}`}>
            {item.down ? "↓" : "↑"} {item.trend}
          </em>
        </div>
        <small className="mt-1 whitespace-nowrap text-[12px] text-[#8b95a6]">{item.note}</small>
      </div>
    </div>
  );
}

function CampaignThumb({ image, title }: { image?: string; title: string }) {
  if (image) {
    return (
      <div className="relative h-9 w-[45px] shrink-0 overflow-hidden rounded-[5px]">
        <Image src={image} alt={title} fill sizes="45px" className="object-cover" />
      </div>
    );
  }
  return (
    <div className="grid h-9 w-[45px] shrink-0 place-items-center overflow-hidden rounded-[5px] bg-gradient-to-br from-[#1a6da0] to-[#5ab3d9] text-white">
      <span className="text-[12px] font-semibold leading-[1.05]">CLEAN<br />GANGA</span>
    </div>
  );
}

const tabs = [
  { label: "All Campaigns", count: 24, filter: "all" },
  { label: "Active", count: 8, filter: "active" },
  { label: "Scheduled", count: 6, filter: "scheduled" },
  { label: "Completed", count: 7, filter: "completed" },
  { label: "Draft", count: 2, filter: "draft" },
  { label: "Archived", count: 1, filter: "archived" },
] as const;

type TabFilter = typeof tabs[number]["filter"];

export function CampaignsPage() {
  const router = useRouter();
  const { companyId, clientId, isReady } = useTenancyContext();
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [liveCampaigns, setLiveCampaigns] = useState<CampaignRecord[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [conflictNotice, setConflictNotice] = useState<string | null>(null);

  const fetchLiveCampaigns = useCallback(async () => {
    if (!companyId || !clientId) return;
    setIsLoading(true);
    setErrorMessage(null);
    setConflictNotice(null);
    try {
      const res = await campaignsApi.list(companyId, clientId);
      let items = res.items;

      // Merge any locally created campaigns so newly created campaigns appear immediately
      try {
        const rawLocal = localStorage.getItem("omni_created_campaigns");
        if (rawLocal) {
          const localList: CampaignRecord[] = JSON.parse(rawLocal);
          const relevant = localList.filter((c) => c.clientId === clientId || !clientId);
          const existingIds = new Set(items.map((i) => i.id));
          const toAdd = relevant.filter((r) => !existingIds.has(r.id));
          items = [...toAdd, ...items];
        }
      } catch {}

      setLiveCampaigns(items);
    } catch (err: unknown) {
      if (ApiError.isApiError(err)) {
        setErrorMessage(err.message || `Failed to fetch campaigns (HTTP ${err.status})`);
      } else {
        setErrorMessage("Unable to connect to campaigns API. Please verify backend service.");
      }
      setLiveCampaigns(null);
    } finally {
      setIsLoading(false);
    }
  }, [companyId, clientId]);

  useEffect(() => {
    if (isReady) {
      fetchLiveCampaigns();
    }
  }, [isReady, fetchLiveCampaigns]);

  const allDisplayCampaigns = useMemo(() => {
    if (liveCampaigns !== null) {
      return liveCampaigns.map((c) => {
        const statusTone =
          c.status === "ACTIVE" ? "active" :
          c.status === "COMPLETED" ? "completed" :
          c.status === "PAUSED" ? "scheduled" :
          "draft";

        const statusLabel =
          c.status === "ACTIVE" ? "Active" :
          c.status === "COMPLETED" ? "Completed" :
          c.status === "PAUSED" ? "Scheduled" :
          "Draft";

        return {
          id: c.id,
          title: c.name,
          desc: c.budget ? `${c.budget.currency} ${Number(c.budget.amount).toLocaleString()} budget` : "Multi-channel campaign",
          project: "Active Client",
          channels: ["Facebook", "Instagram", "LinkedIn"],
          extra: "",
          image: "",
          status: statusLabel,
          statusTone: statusTone,
          dates: [
            c.startDate ? new Date(c.startDate).toLocaleDateString() : "Immediate",
            c.endDate ? new Date(c.endDate).toLocaleDateString() : "Ongoing"
          ],
          leads: "—",
          leadGrowth: "",
          spend: c.budget ? `${c.budget.currency} ${Number(c.budget.amount).toLocaleString()}` : "—",
          conversions: "—",
          conversionGrowth: "",
          score: "—",
          scoreTone: "empty",
          updated: [`Rev ${c.revision}`, `Updated ${new Date(c.updatedAt).toLocaleDateString()}`],
          revision: c.revision,
        };
      });
    }
    return [];
  }, [liveCampaigns]);

  const tabCounts = useMemo(() => {
    const list = allDisplayCampaigns;
    return {
      all: list.length,
      active: list.filter((c) => c.statusTone === "active").length,
      scheduled: list.filter((c) => c.statusTone === "scheduled").length,
      completed: list.filter((c) => c.statusTone === "completed").length,
      draft: list.filter((c) => c.statusTone === "draft").length,
      archived: 0,
    };
  }, [allDisplayCampaigns]);

  const filteredCampaigns = useMemo(() => {
    let result = allDisplayCampaigns;
    if (activeTab !== "all") {
      result = result.filter((c) => c.statusTone === activeTab);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.desc.toLowerCase().includes(q) ||
          c.project.toLowerCase().includes(q)
      );
    }
    return result;
  }, [allDisplayCampaigns, activeTab, searchQuery]);

  const dynamicStats = useMemo(() => {
    const list = liveCampaigns ?? [];
    const total = list.length;
    const active = list.filter((c) => c.status === "ACTIVE").length;
    const completed = list.filter((c) => c.status === "COMPLETED").length;
    const scheduled = list.filter((c) => c.status === "PAUSED" || c.status === "DRAFT").length;
    return [
      { icon: Megaphone, title: "Total Campaigns", value: String(total), trend: "Live", note: `${total} in workspace`, tone: "red" },
      { icon: Play, title: "Active Campaigns", value: String(active), trend: `${total ? Math.round((active / total) * 100) : 0}%`, note: "Of total campaigns", tone: "green" },
      { icon: CalendarDays, title: "Scheduled", value: String(scheduled), trend: "Planned", note: `${scheduled} upcoming`, tone: "purple" },
      { icon: CheckCircle2, title: "Completed", value: String(completed), trend: "Archived", note: `${completed} delivered`, tone: "green" },
      { icon: Users, title: "Total Leads", value: "—", trend: "CRM", note: "Integrated with CRM", tone: "blue" },
      { icon: Database, title: "Total Spend", value: "—", trend: "Budget", note: "Tracked per campaign", tone: "orange" },
    ];
  }, [liveCampaigns]);

  return (
    <div className="w-full bg-[#f6f8fb] font-sans text-[#13203e]">
      <div className="mx-auto w-full max-w-[1500px]">
        {/* Revision Conflict Notice Banner (TASK-11A Concurrency) */}
        {conflictNotice && (
          <div className="mb-3 flex items-center justify-between rounded-[7px] border border-[#f5c6cb] bg-[#f8d7da] px-4 py-2.5 text-[12px] text-[#721c24]">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0 text-[#721c24]" />
              <span>{conflictNotice}</span>
            </div>
            <button
              onClick={fetchLiveCampaigns}
              className="flex items-center gap-1 rounded bg-[#721c24] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#501319]"
            >
              <RefreshCw size={11} /> Reload Latest
            </button>
          </div>
        )}

        {/* Header */}
        <header className="mb-2.5 grid grid-cols-1 items-center gap-3 lg:h-16 lg:grid-cols-[minmax(0,1fr)_580px]">
          <div>
            <div className="mb-0.5 flex items-center gap-2 text-[10px] text-[#758198]">
              <span>Dashboard</span><ChevronRight size={10} /><b className="text-[#26314a]">Campaigns</b>
            </div>
            <h1 className="m-0 text-[24px] font-[780] leading-[1.05] tracking-[-.7px]">
              Campaigns
            </h1>
            <p className="mt-[5px] text-[11px] text-[#718097]">Plan, manage and track multi-channel marketing campaigns.</p>
          </div>

          <div className="relative flex h-16 items-center justify-between overflow-hidden rounded-[7px] border border-[#e8ebf1] bg-gradient-to-r from-white via-white to-[#fff7f7] px-[18px] lg:block lg:flex">
            <div className="relative z-10 flex h-full flex-col justify-center">
              <b className="block text-[11px]">Turn Campaign Ideas Into Impact</b>
              <span className="text-[12px] text-[#7b8598]">Reach more people and drive action across your channels.</span>
              <div className="mt-[7px] h-[3px] w-12 rounded bg-[#df2029]" />
            </div>
            <Target className="relative z-10 text-[#e42b34]" size={62} strokeWidth={1.3} />
            <div className="absolute inset-y-0 right-0 w-[55%] bg-[radial-gradient(circle_at_78%_38%,rgba(227,30,39,.13)_0_17px,transparent_18px),radial-gradient(circle_at_89%_58%,rgba(227,30,39,.08)_0_28px,transparent_29px)]" />
          </div>
        </header>

        {/* Stats */}
        <section className="mb-2.5 grid grid-cols-2 gap-[9px] lg:grid-cols-6">
          {dynamicStats.map((item) => <StatCard key={item.title} item={item} />)}
        </section>

        {/* Tabs / toolbar */}
        <section className="flex min-h-[42px] items-center gap-5 rounded-t-[7px] border border-[#e5e9ef] bg-white px-3.5 lg:gap-7">
          {tabs.map((tab) => (
            <button
              key={tab.filter}
              onClick={() => setActiveTab(tab.filter)}
              className={`relative h-[42px] shrink-0 border-0 bg-transparent px-0 text-[10px] transition-colors ${activeTab === tab.filter
                ? "font-[750] text-[#19233e] after:absolute after:bottom-0 after:left-[-6px] after:right-[-6px] after:h-0.5 after:bg-[#e62c36]"
                : "text-[#5f6c83] hover:text-[#29354e]"
                }`}
            >
              {tab.label} ({tabCounts[tab.filter]})
            </button>
          ))}
          <div className="ml-auto hidden shrink-0 items-center gap-2 lg:flex">
            <button
              onClick={fetchLiveCampaigns}
              title="Refresh campaigns from live API"
              disabled={isLoading}
              className="flex h-[29px] items-center gap-1 rounded-[6px] border border-[#dfe4eb] bg-white px-2 text-[12px] font-semibold text-[#29354e] hover:bg-[#f8fafc] disabled:opacity-50"
            >
              <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
            </button>
            <label className="flex h-[29px] w-[198px] items-center gap-1.5 rounded-[6px] border border-[#e0e5ec] bg-[#fbfcfe] px-2.5 text-[#8791a4]">
              <Search size={13} />
              <input
                className="w-full border-0 bg-transparent text-[12px] text-[#27334e] outline-none"
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </label>
            <button className="flex h-[29px] items-center gap-1.5 rounded-[6px] border border-[#dfe4eb] bg-white px-2.5 text-[12px] font-semibold text-[#29354e]"><SlidersHorizontal size={12} />Filter</button>
            <button className="flex h-[29px] items-center gap-1.5 rounded-[6px] border border-[#dfe4eb] bg-white px-2.5 text-[12px] font-semibold text-[#29354e]"><ArrowDownUp size={12} />Sort<ChevronDown size={10} /></button>
            <button onClick={() => router.push("/admin/campaigns/new")} className="flex h-[29px] items-center gap-1.5 rounded-[6px] border border-[#e51e28] bg-[#e51e28] px-3.5 text-[12px] font-semibold text-white"><Plus size={13} />Create Campaign</button>
          </div>
        </section>

        {/* Table */}
        <section className="rounded-b-[7px] border border-t-0 border-[#e5e9ef] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1400px] table-fixed border-collapse">
              <colgroup>
                <col className="w-8" /><col className="w-[320px]" /><col className="w-[160px]" /><col className="w-[200px]" />
                <col className="w-[130px]" /><col className="w-[180px]" /><col className="w-[120px]" /><col className="w-[120px]" />
                <col className="w-[140px]" /><col className="w-[120px]" /><col className="w-[160px]" /><col className="w-[120px]" />
              </colgroup>
              <thead>
                <tr className="h-[31px] bg-[#f7f9fc] text-left text-[12px] font-semibold text-[#637088]">
                  {["", "Campaign", "Project", "Channels", "Status", "Date Range", "Leads", "Spend", "Conversions", "Performance", "Last Updated", "Actions"].map((h, i) =>
                    <th key={i} className="border-y border-[#e8ecf2] px-2.5 font-semibold">{i === 0 ? <input className="h-[13px] w-[13px] accent-[#e5222b]" type="checkbox" /> : h}</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf0f4]">
                {isLoading ? (
                  <tr>
                    <td colSpan={12} className="px-2.5 py-12 text-center text-[12px] text-[#8a94a6]">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="size-5 animate-spin text-[#e62c36]" />
                        <span>Loading live campaigns...</span>
                      </div>
                    </td>
                  </tr>
                ) : errorMessage ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-8 text-center text-[12px]">
                      <div className="mx-auto flex max-w-md flex-col items-center gap-2 text-red-600">
                        <AlertCircle className="size-5" />
                        <span className="font-semibold">{errorMessage}</span>
                        <p className="text-[11px] text-[#69758b]">
                          Unable to retrieve campaigns from the running backend.
                        </p>
                        <button
                          onClick={fetchLiveCampaigns}
                          className="mt-2 flex items-center gap-1.5 rounded-sm bg-[#e62c36] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#c91d26]"
                        >
                          <RefreshCw size={11} /> Retry Connection
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : filteredCampaigns.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-2.5 py-8 text-center text-[12px] text-[#8a94a6]">
                      No campaigns found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredCampaigns.map((c) => (
                    <tr
                      key={c.id}
                      className="h-[49px] cursor-pointer border-b border-[#edf0f4] text-[12px] text-[#44516a] transition-colors hover:bg-[#f9fafc]"
                      onClick={() => router.push(`/admin/campaigns/${c.id}`)}
                    >
                      <td className="px-2.5" onClick={(event) => event.stopPropagation()}><input className="h-[13px] w-[13px] accent-[#e5222b]" type="checkbox" /></td>
                      <td className="px-2.5" onClick={(event) => event.stopPropagation()}>
                        <div className="flex min-w-0 items-center gap-[9px]">
                          <CampaignThumb image={c.image} title={c.title} />
                          <div className="min-w-0">
                            <b className="block overflow-hidden text-ellipsis whitespace-nowrap text-[12px] text-[#26334d] hover:text-[#e62c36]">{c.title}</b>
                            <small className="mt-0.5 block overflow-hidden text-ellipsis whitespace-nowrap text-[12px] text-[#8a94a6]">{c.desc}</small>
                          </div>
                        </div>
                      </td>
                      <td className="px-2.5 font-semibold text-[#556178]">{c.project}</td>
                      <td className="px-2.5">
                        <div className="flex items-center gap-[5px]">
                          {c.channels.map((ch, j) => <ChannelIcon key={j} channel={ch} />)}
                          {c.extra && <span className="text-[12px] font-semibold text-[#647088]">{c.extra}</span>}
                        </div>
                      </td>
                      <td className="px-2.5">
                        <span className={`inline-flex items-center gap-1 rounded-sm px-[7px] py-1 text-[12px] font-semibold ${c.statusTone === "active" ? "bg-[#e4f8ee] text-[#16a16d]" :
                          c.statusTone === "scheduled" ? "bg-[#e8f2ff] text-[#397fd4]" :
                            c.statusTone === "completed" ? "bg-[#e6f8ee] text-[#16a16d]" : "bg-[#eef2f6] text-[#66748a]"
                          }`}><i className="h-[5px] w-[5px] rounded-sm bg-current" />{c.status}</span>
                      </td>
                      <td className="px-2.5 leading-[1.3]"><span className="block">{c.dates[0]}</span><span className="block text-[#5c687d]">- {c.dates[1]}</span></td>
                      <td className="px-2.5"><strong className="block text-[12px] text-[#26334d]">{c.leads}</strong>{c.leadGrowth && <em className="text-[12px] font-semibold not-italic text-[#13a16b]">↑ {c.leadGrowth}</em>}</td>
                      <td className="px-2.5"><strong className="text-[12px] text-[#26334d]">{c.spend}</strong></td>
                      <td className="px-2.5"><strong className="block text-[12px] text-[#26334d]">{c.conversions}</strong>{c.conversionGrowth && <em className="text-[12px] font-semibold not-italic text-[#13a16b]">↑ {c.conversionGrowth}</em>}</td>
                      <td className="px-2.5">
                        <div className="relative grid h-9 w-9 place-items-center text-[12px] font-[750] text-[#27354d]">
                          <svg className="h-9 w-9 -rotate-90" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="14" fill="none" stroke="#edf1f5" strokeWidth="3.5" />
                            {c.score !== "—" && <circle cx="18" cy="18" r="14" fill="none"
                              stroke={c.scoreTone === "yellow" ? "#efbd25" : c.scoreTone === "red" ? "#ed3742" : "#21b47b"}
                              strokeWidth="3.5"
                              strokeLinecap="round"
                              strokeDasharray={`${(Number(c.score) / 100) * 87.96} 87.96`}
                            />}
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-[12px] font-[750]">{c.score}</span>
                        </div>
                      </td>
                      <td className="px-2.5 leading-[1.35]"><b className="block text-[12px] font-medium">{c.updated[0]}</b><small className="text-[12px] text-[#8b95a6]">{c.updated[1]}</small></td>
                      <td className="px-2.5" onClick={(event) => event.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            className="h-[29px] rounded-[6px] border border-[#e1e6ed] bg-white px-[13px] text-[12px] font-semibold text-[#35415a] hover:bg-[#f7f9fc]"
                            onClick={() => router.push(`/admin/campaigns/${c.id}`)}
                          >
                            Open
                          </button>
                          <button type="button" className="grid h-[29px] w-[29px] place-items-center rounded-[6px] border border-[#e1e6ed] bg-white text-[#6d7890]"><MoreVertical size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex h-8 items-center px-3.5 text-[12px] text-[#69758b]">
            <span>Showing {filteredCampaigns.length} campaign{filteredCampaigns.length === 1 ? "" : "s"}</span>
          </div>
        </section>

        {/* Quick actions */}
        <section className="mt-[9px] grid grid-cols-1 gap-[9px] sm:grid-cols-2 xl:grid-cols-4">
          {([
            [Plus, "Create Campaign", "Plan and launch a new marketing campaign across multiple channels.", "Create Campaign", "red"],
            [Copy, "Duplicate Campaign", "Save time by duplicating an existing campaign.", "Duplicate Campaign", "blue"],
            [Link2, "Connect Channels", "Connect your social media, website and other channels.", "Manage Integrations", "blue"],
            [BarChart3, "View Reports", "See detailed analytics and performance reports for your campaigns.", "View Reports", "purple"]
          ] as [React.ComponentType<{ size?: number }>, string, string, string, string][]).map(([Icon, title, desc, button, tone]) => (
            <div key={title} className="flex flex-col rounded-[7px] border border-[#e5e9ef] bg-white p-3">
              <div className="flex items-start gap-2.5">
                <span className={`grid h-[34px] w-[34px] shrink-0 place-items-center rounded-sm ${tone === "red" ? "bg-[#fff0f1] text-[#e42a35]" : tone === "purple" ? "bg-[#f0eaff] text-[#8156d7]" : "bg-[#e8f2ff] text-[#3582da]"}`}><Icon size={17} /></span>
                <div className="min-w-0 flex-1">
                  <b className="block text-[12px] text-[#17223d]">{title}</b>
                  <p className="mt-0.5 text-[11px] leading-[1.4] text-[#8b95a6]">{desc}</p>
                </div>
              </div>
              <button className="mt-3 w-fit rounded-[5px] border border-[#dfe4eb] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#35415a]">{button}</button>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

export default CampaignsPage;
