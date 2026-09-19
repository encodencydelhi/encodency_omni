"use client";

import Link from "next/link";
import { Layers, RefreshCw, ExternalLink } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { WorkspaceDefaults } from "../settings-data/types";
import { useSettingsCapability } from "../settings-data/capability-provider";

interface WorkspaceSectionProps {
  data: WorkspaceDefaults;
  onChange: (partial: Partial<WorkspaceDefaults>) => void;
}

export function WorkspaceSection({ data, onChange }: WorkspaceSectionProps) {
  const { capabilities } = useSettingsCapability();

  return (
    <div className="space-y-2">
      {/* SECTION 1: WORKSPACE DEFAULTS */}
      <section className="bg-white rounded-xl border border-[#DDE4ED] shadow-xs p-3 space-y-2 hover:border-[#CBD5E1] transition-all">
        <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-lg bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] text-white flex items-center justify-center shadow-xs shrink-0">
              <Layers className="size-3.5" />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-[#111C3A]">Workspace & Client Defaults</h3>
              <p className="text-[10px] text-[#111C3A] font-semibold">
                Configure initial startup clients, landing views, and analytics date scope defaults.
              </p>
            </div>
          </div>
          <Link
            href="/admin/projects"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10.5px] font-bold text-[#2563EB] hover:underline flex items-center gap-1 shrink-0 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 shadow-2xs hover:bg-blue-100 transition-colors"
          >
            Clients Directory <ExternalLink className="size-2.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-bold text-[#111C3A] mb-1">
              Primary Organization Client
            </label>
            <select
              value={data.primaryClient}
              onChange={(e) => onChange({ primaryClient: e.target.value })}
              disabled={!capabilities.canManagePreferences}
              className="w-full h-8 px-2.5 rounded-lg border border-[#DDE4ED] bg-[#F8FAFD] text-[11.5px] text-[#111C3A] font-semibold outline-none focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-slate-100 cursor-pointer shadow-2xs"
            >
              <option value="Moksha Sewa">Moksha Sewa (Active)</option>
              <option value="Dental Care Clinic">Dental Care Clinic</option>
              <option value="Ayur Luxe Wellness">Ayur Luxe Wellness</option>
              <option value="Global Ayurveda Summit">Global Ayurveda Summit</option>
            </select>
            <span className="text-[9.5px] text-[#111C3A] font-semibold mt-0.5 block">
              Default anchor client used for aggregate reporting and dashboard metrics.
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#111C3A] mb-1">
              Client Selection After Login
            </label>
            <select
              value={data.defaultClientAfterLogin}
              onChange={(e) => onChange({ defaultClientAfterLogin: e.target.value as any })}
              disabled={!capabilities.canManagePreferences}
              className="w-full h-8 px-2.5 rounded-lg border border-[#DDE4ED] bg-[#F8FAFD] text-[11.5px] text-[#111C3A] font-semibold outline-none focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-slate-100 cursor-pointer shadow-2xs"
            >
              <option value="Moksha Sewa">Always Open Primary Client (Moksha Sewa)</option>
              <option value="Last Used Client">Resume Last Used Client Account</option>
              <option value="Prompt Every Time">Prompt Client Selection Modal</option>
            </select>
            <span className="text-[9.5px] text-[#111C3A] font-semibold mt-0.5 block">
              Which workspace context is automatically activated upon session start.
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#111C3A] mb-1">
              Default Workspace Landing Page
            </label>
            <select
              value={data.defaultWorkspaceLandingPage}
              onChange={(e) => onChange({ defaultWorkspaceLandingPage: e.target.value as any })}
              disabled={!capabilities.canManagePreferences}
              className="w-full h-8 px-2.5 rounded-lg border border-[#DDE4ED] bg-[#F8FAFD] text-[11.5px] text-[#111C3A] font-semibold outline-none focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-slate-100 cursor-pointer shadow-2xs"
            >
              <option value="Dashboard">Executive Dashboard (/admin)</option>
              <option value="Last Used Client">Last Used Section Context</option>
              <option value="CRM">Lead CRM Pipeline (/admin/crm)</option>
              <option value="Analytics">Cross-Channel Analytics (/admin/analytics)</option>
            </select>
            <span className="text-[9.5px] text-[#111C3A] font-semibold mt-0.5 block">
              The initial root module navigated to after signing into OmniPlatform.
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#111C3A] mb-1">
              Default Date Range Filter
            </label>
            <select
              value={data.defaultDateRange}
              onChange={(e) => onChange({ defaultDateRange: e.target.value as any })}
              disabled={!capabilities.canManagePreferences}
              className="w-full h-8 px-2.5 rounded-lg border border-[#DDE4ED] bg-[#F8FAFD] text-[11.5px] text-[#111C3A] font-semibold outline-none focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-slate-100 cursor-pointer shadow-2xs"
            >
              <option value="Last 7 days">Last 7 days</option>
              <option value="Last 30 days">Last 30 days (Recommended)</option>
              <option value="Last 90 days">Last 90 days</option>
              <option value="Month to date">Month to date</option>
              <option value="Year to date">Year to date</option>
            </select>
            <span className="text-[9.5px] text-[#111C3A] font-semibold mt-0.5 block">
              Default time horizon applied across graphs, campaigns, and reports.
            </span>
          </div>
        </div>
      </section>

      {/* SECTION 2: CLIENT SWITCH BEHAVIORS */}
      <section className="bg-white rounded-xl border border-[#DDE4ED] shadow-xs p-3 space-y-2 hover:border-[#CBD5E1] transition-all">
        <div className="flex items-center gap-2 border-b border-[#F1F5F9] pb-2">
          <div className="size-6 rounded-lg bg-gradient-to-br from-[#10B981] to-[#059669] text-white flex items-center justify-center shadow-xs shrink-0">
            <RefreshCw className="size-3.5" />
          </div>
          <div>
            <h3 className="text-[13px] font-bold text-[#111C3A]">Client Context Switch Policies</h3>
            <p className="text-[10px] text-[#111C3A] font-semibold">
              Define state retention, filter persistence, and cache clearing when switching clients in the header.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          {/* Toggle 1 */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F8FAFD] border border-[#DDE4ED] shadow-2xs hover:bg-white hover:border-[#CBD5E1] transition-all">
            <div className="space-y-0.5 pr-4">
              <div className="text-[12px] font-bold text-[#111C3A]">Remember Last Selected Client</div>
              <p className="text-[10px] text-[#111C3A] font-semibold">
                Stores the client active at logout and automatically restores it upon your next visit.
              </p>
            </div>
            <Switch
              checked={data.rememberLastSelectedClient}
              onCheckedChange={(val) => onChange({ rememberLastSelectedClient: val })}
              disabled={!capabilities.canManagePreferences}
            />
          </div>

          {/* Toggle 2 */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F8FAFD] border border-[#DDE4ED] shadow-2xs hover:bg-white hover:border-[#CBD5E1] transition-all">
            <div className="space-y-0.5 pr-4">
              <div className="text-[12px] font-bold text-[#111C3A]">Reset Filters on Client Switch</div>
              <p className="text-[10px] text-[#111C3A] font-semibold">
                Automatically clear search queries, channel filters, and pagination when switching client scope.
              </p>
            </div>
            <Switch
              checked={data.resetFiltersOnClientSwitch}
              onCheckedChange={(val) => onChange({ resetFiltersOnClientSwitch: val })}
              disabled={!capabilities.canManagePreferences}
            />
          </div>

          {/* Toggle 3 */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F8FAFD] border border-[#DDE4ED] shadow-2xs hover:bg-white hover:border-[#CBD5E1] transition-all">
            <div className="space-y-0.5 pr-4">
              <div className="text-[12px] font-bold text-[#111C3A]">Remember Filters Per Client Account</div>
              <p className="text-[10px] text-[#111C3A] font-semibold">
                Persist distinct filter preferences for Moksha Sewa without overriding other client preferences.
              </p>
            </div>
            <Switch
              checked={data.rememberFiltersPerClient}
              onCheckedChange={(val) => onChange({ rememberFiltersPerClient: val })}
              disabled={!capabilities.canManagePreferences}
            />
          </div>

          {/* Toggle 4 */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F8FAFD] border border-[#DDE4ED] shadow-2xs hover:bg-white hover:border-[#CBD5E1] transition-all">
            <div className="space-y-0.5 pr-4">
              <div className="text-[12px] font-bold text-[#111C3A]">Clear Local Workspace Cache on Switch</div>
              <p className="text-[10px] text-[#111C3A] font-semibold">
                Force fresh API fetch for analytics and campaigns whenever switching client accounts.
              </p>
            </div>
            <Switch
              checked={data.clearLocalWorkspaceState}
              onCheckedChange={(val) => onChange({ clearLocalWorkspaceState: val })}
              disabled={!capabilities.canManagePreferences}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
