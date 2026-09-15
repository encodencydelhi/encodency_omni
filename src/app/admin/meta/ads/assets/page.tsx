"use client";

import Link from "next/link";
import { useState } from "react";
import { FaFacebookF, FaInstagram, FaMeta } from "react-icons/fa6";
import { Database, Info, Plug, RefreshCw, Search, Unplug } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { connectedAssets } from "@/features/admin/meta-ads/data";
import { date, dateTime, relative } from "@/features/admin/meta-ads/format";
import {
  TableShell,
  Th,
  Tr,
  Td,
} from "@/features/admin/meta-ads/components/ui";
import {
  ADS_ROOT,
  AdsWorkspace,
} from "@/features/admin/meta-ads/components/workspace";
import type { ConnectedAsset } from "@/features/admin/meta-ads/types";

const GROUP_ICONS: Record<ConnectedAsset["group"], React.ReactNode> = {
  "Ad Account": <FaMeta className="size-4 text-[#0866ff]" />,
  "Facebook Page": <FaFacebookF className="size-4 text-[#1877f2]" />,
  "Instagram Business": <FaInstagram className="size-4 text-[#d946ef]" />,
  "Pixel / Data Source": <Database className="size-4 text-[#7c3aed]" />,
};

type FilterTab = "All" | "Connected" | "Needs Attention" | "Syncing" | "Disconnected";

const TAB_META: Record<FilterTab, { count: number; dotColor: string }> = {
  All: { count: connectedAssets.length, dotColor: "" },
  Connected: { count: connectedAssets.filter((a) => a.status === "Connected").length, dotColor: "bg-[#059669]" },
  "Needs Attention": { count: connectedAssets.filter((a) => a.status !== "Connected" && a.status !== "Syncing").length, dotColor: "bg-[#d97706]" },
  Syncing: { count: connectedAssets.filter((a) => a.status === "Syncing").length, dotColor: "bg-[#2563eb]" },
  Disconnected: { count: connectedAssets.filter((a) => a.status === "Disconnected").length, dotColor: "bg-[#dc2626]" },
};

const HEALTH_ITEMS: { status: ConnectedAsset["status"]; description: string; dotColor: string }[] = [
  { status: "Connected", description: "Everything is authorised and syncing normally.", dotColor: "bg-[#059669]" },
  { status: "Syncing", description: "Meta is refreshing data for this asset right now.", dotColor: "bg-[#2563eb]" },
  { status: "Needs Reauthorization", description: "The access token expired. Reconnect to restore delivery.", dotColor: "bg-[#d97706]" },
  { status: "Permission Missing", description: "A required scope is missing.", dotColor: "bg-[#d97706]" },
  { status: "Sync Failed", description: "Meta returned an error on the last sync. Retry it.", dotColor: "bg-[#dc2626]" },
  { status: "Disconnected", description: "The asset was removed and campaigns using it cannot run.", dotColor: "bg-[#dc2626]" },
];

export default function AssetsPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>("All");
  const [search, setSearch] = useState("");

  const filtered = connectedAssets.filter((a) => {
    if (activeTab === "Connected" && a.status !== "Connected") return false;
    if (activeTab === "Syncing" && a.status !== "Syncing") return false;
    if (activeTab === "Needs Attention" && (a.status === "Connected" || a.status === "Syncing")) return false;
    if (activeTab === "Disconnected" && a.status !== "Disconnected") return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        a.name.toLowerCase().includes(q) ||
        a.handle.toLowerCase().includes(q) ||
        a.group.toLowerCase().includes(q) ||
        a.assetId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const renderToneChip = (status: ConnectedAsset["status"]) => {
    const chipStyles: Record<ConnectedAsset["status"], { bg: string; text: string; border: string; dot: string }> = {
      Connected: { bg: "bg-[#dcfce7]", text: "text-[#14532d]", border: "border-[#86efac]", dot: "bg-[#16a34a]" },
      Syncing: { bg: "bg-[#dbeafe]", text: "text-[#1e3a8a]", border: "border-[#93c5fd]", dot: "bg-[#2563eb]" },
      "Needs Reauthorization": { bg: "bg-[#fef3c7]", text: "text-[#78350f]", border: "border-[#fcd34d]", dot: "bg-[#d97706]" },
      "Permission Missing": { bg: "bg-[#fef3c7]", text: "text-[#78350f]", border: "border-[#fcd34d]", dot: "bg-[#d97706]" },
      "Sync Failed": { bg: "bg-[#fee2e2]", text: "text-[#7f1d1d]", border: "border-[#fca5a5]", dot: "bg-[#dc2626]" },
      Disconnected: { bg: "bg-[#fee2e2]", text: "text-[#7f1d1d]", border: "border-[#fca5a5]", dot: "bg-[#dc2626]" },
    };
    const s = chipStyles[status];
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm border px-2.5 py-0.5 text-[10.5px] font-semibold",
          s.bg, s.text, s.border,
        )}
      >
        <span className={cn("size-2 rounded-sm shrink-0", s.dot)} />
        {status}
      </span>
    );
  };

  return (
    <AdsWorkspace showDateRange={false}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <section>
          <h2 className="text-[18px] font-bold text-[#0f172a]">Connected Assets</h2>
          <p className="text-[12px] text-[#475569]">Manage connected Meta assets, permissions and synchronization.</p>
        </section>
        <div className="relative min-w-[200px]">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#64748b]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assets..."
            className="h-9 w-full rounded-sm border border-[#e2e8f0] bg-white pl-9 pr-3 text-[12px] font-medium text-[#0f172a] placeholder:text-[#94a3b8] outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20"
          />
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {(Object.keys(TAB_META) as FilterTab[]).map((tab) => {
          const meta = TAB_META[tab];
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-[12px] font-semibold transition-all",
                isActive
                  ? "bg-[#eff6ff] border-2 border-[#2563eb] text-[#1e40af]"
                  : "bg-white text-[#334155] border border-[#e2e8f0] hover:bg-[#f8fafc] hover:border-[#cbd5e1]",
              )}
            >
              {meta.dotColor && <span className={cn("size-2 rounded-sm shrink-0", meta.dotColor)} />}
              {tab}
              <span
                className={cn(
                  "rounded-sm px-1.5 py-px text-[10px] font-bold",
                  isActive ? "bg-[#2563eb]/10 text-[#2563eb]" : "bg-[#f1f5f9] text-[#475569]",
                )}
              >
                {meta.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-sm border border-[#e2e8f0] bg-white shadow-sm overflow-hidden">
        <TableShell minWidth={900} striped={false}>
          <thead>
            <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
              <Th className="text-[11px] font-semibold text-[#334155]">Asset</Th>
              <Th className="text-[11px] font-semibold text-[#334155]">Status</Th>
              <Th className="text-[11px] font-semibold text-[#334155]">Details</Th>
              <Th className="text-[11px] font-semibold text-[#334155]">Permissions</Th>
              <Th className="text-[11px] font-semibold text-[#334155] text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((asset) => (
              <Tr key={asset.id} className="border-b border-[#f1f5f9] last:border-0">
                <Td>
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-[#f1f5f9]">
                      {GROUP_ICONS[asset.group]}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-[#0f172a] truncate">{asset.name}</p>
                      <p className="text-[11px] text-[#475569] truncate">{asset.handle}</p>
                    </div>
                  </div>
                </Td>
                <Td>{renderToneChip(asset.status)}</Td>
                <Td>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-[#64748b]">Asset ID</span>
                      <code className="font-mono text-[10px] text-[#334155] bg-[#f1f5f9] px-1.5 py-0.5 rounded">{asset.assetId}</code>
                    </div>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-[#64748b]">Connected on</span>
                      <span className="text-[#334155]">{date(asset.connectedOn)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-[#64748b]">Last sync</span>
                      <span className="text-[#334155]" title={dateTime(asset.lastSync)}>{relative(asset.lastSync)}</span>
                    </div>
                  </div>
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    {asset.permissions.map((p) => (
                      <span key={p} className="rounded-sm border border-[#e2e8f0] bg-[#f8fafc] px-2 py-0.5 text-[10px] font-medium text-[#334155]">
                        {p}
                      </span>
                    ))}
                    {asset.missingPermissions.map((p) => (
                      <span key={p} className="rounded-sm border border-[#fde68a] bg-[#fef3c7] px-2 py-0.5 text-[10px] font-medium text-[#92400e]">
                        {p}
                      </span>
                    ))}
                  </div>
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-1.5">
                    {asset.status !== "Connected" && asset.status !== "Syncing" ? (
                      <button
                        type="button"
                        onClick={() => toast.success(`Reconnecting ${asset.name}…`)}
                        className="rounded-sm bg-[#2563eb] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#1d4ed8] transition-colors"
                      >
                        Reconnect
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toast.success(`Syncing ${asset.name}…`)}
                        className="rounded-sm border border-[#e2e8f0] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#334155] hover:bg-[#f8fafc] transition-colors"
                      >
                        <RefreshCw className="size-3 inline mr-1" />
                        Sync
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => toast.success(`Refreshing permissions for ${asset.name}…`)}
                      className="rounded-sm border border-[#e2e8f0] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#334155] hover:bg-[#f8fafc] transition-colors"
                    >
                      Refresh
                    </button>
                    <button
                      type="button"
                      onClick={() => toast.success(`Opening ${asset.name} in Meta Business Suite`)}
                      className="rounded-sm border border-[#e2e8f0] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#334155] hover:bg-[#f8fafc] transition-colors"
                    >
                      Manage
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        toast.warning(`Disconnect ${asset.name}?`, {
                          description: "Campaigns using this asset will stop delivering until it is reconnected.",
                        })
                      }
                      className="rounded-sm border border-[#fecaca] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#dc2626] hover:bg-[#fef2f2] transition-colors"
                    >
                      <Unplug className="size-3 inline mr-1" />
                      Disconnect
                    </button>
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableShell>
      </div>

      <section className="mt-4 rounded-sm border border-[#e2e8f0] bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-sm bg-[#eff6ff]">
            <Plug className="size-4 text-[#2563eb]" />
          </span>
          <h3 className="text-[13px] font-bold text-[#0f172a]">Connection Health</h3>
          <p className="text-[11px] text-[#475569]">Understand the different connection states and what they mean.</p>
          <Link href={`${ADS_ROOT}/issues?tab=connection`} className="ml-auto text-[11px] font-semibold text-[#2563eb] hover:underline">
            Learn more
          </Link>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {HEALTH_ITEMS.map((item) => (
            <div key={item.status} className="rounded-sm border border-[#e2e8f0] bg-[#f8fafc] p-3">
              <div className="mb-1.5 flex items-center gap-2">
                <span className={cn("size-2.5 rounded-sm", item.dotColor)} />
                <span className="text-[11px] font-bold text-[#0f172a]">{item.status}</span>
              </div>
              <p className="text-[10px] leading-relaxed text-[#475569]">{item.description}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[10px] leading-relaxed text-[#64748b]">
          <Info className="size-3.5 shrink-0" />
          Access tokens are never shown here. Reconnecting opens Meta&apos;s own authorisation flow. Problems detected automatically also appear in{" "}
          <Link href={`${ADS_ROOT}/issues?tab=connection`} className="font-semibold text-[#2563eb] hover:underline">
            Issues &amp; Warnings
          </Link>
          .
        </p>
      </section>
    </AdsWorkspace>
  );
}
