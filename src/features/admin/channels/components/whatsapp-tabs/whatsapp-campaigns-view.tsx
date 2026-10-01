"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Eye,
  Megaphone,
  Plus,
  Radio,
  Search,
  Send,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WhatsAppCampaignItem } from "../../live/whatsapp-api";

interface CampaignsViewProps {
  campaigns: WhatsAppCampaignItem[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onOpenModal?: (modal: string) => void;
  onViewAudience?: (campaignId: string) => void;
}

type CampaignMetric = "sent" | "delivered" | "read" | "failed";

const METRIC_CONFIG = {
  sent: { label: "Sent Messages", color: "#3B82F6", icon: Send },
  delivered: { label: "Delivered Messages", color: "#10B981", icon: CheckCircle2 },
  read: { label: "Read Messages", color: "#8B5CF6", icon: Eye },
  failed: { label: "Failed Messages", color: "#EF4444", icon: XCircle },
};

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "—";
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "ACTIVE" || status === "COMPLETED"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "RUNNING"
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : status === "FAILED"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-slate-200 bg-slate-50 text-slate-700";
  return (
    <span className={cn("inline-flex rounded-sm border px-2 py-0.5 text-[11px] font-semibold", color)}>
      {status.replaceAll("_", " ")}
    </span>
  );
}

export function WhatsAppCampaignsView({
  campaigns,
  loading,
  error,
  onRetry,
  onOpenModal,
  onViewAudience,
}: CampaignsViewProps) {
  const [selectedMetric, setSelectedMetric] = useState<CampaignMetric>("delivered");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return campaigns.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  }, [campaigns, search]);

  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter((c) => c.status === "ACTIVE" || c.status === "RUNNING").length;
  const completedCampaigns = campaigns.filter((c) => c.status === "COMPLETED").length;
  const totalAudience = campaigns.reduce((acc, c) => acc + c.audience, 0);

  // Top campaigns chart data
  const chartData = useMemo(() => {
    return campaigns.slice(0, 8).map((c) => ({
      name: c.name.length > 20 ? `${c.name.slice(0, 18)}...` : c.name,
      fullName: c.name,
      sent: c.sent,
      delivered: c.delivered,
      read: c.read,
      failed: c.failed,
      value: c[selectedMetric] ?? 0,
    }));
  }, [campaigns, selectedMetric]);

  const activeMetricConfig = METRIC_CONFIG[selectedMetric];

  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center justify-end">
        {onOpenModal && (
          <Button onClick={() => onOpenModal("create-campaign")} className="shrink-0 h-8">
            <Plus className="size-3.5 mr-1" /> Create Campaign
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-center justify-between border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <span>{error}</span>
          <button type="button" onClick={onRetry} className="font-semibold underline">
            Retry
          </button>
        </div>
      )}

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-sm border border-slate-200 bg-white p-3.5 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Total Campaigns</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{loading ? "—" : totalCampaigns}</p>
          <p className="mt-0.5 text-[10px] text-slate-400">All registered campaigns</p>
        </div>
        <div className="rounded-sm border border-slate-200 bg-white p-3.5 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Active / Running</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{loading ? "—" : activeCampaigns}</p>
          <p className="mt-0.5 text-[10px] text-slate-400">Live audience broadcasts</p>
        </div>
        <div className="rounded-sm border border-slate-200 bg-white p-3.5 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Completed</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{loading ? "—" : completedCampaigns}</p>
          <p className="mt-0.5 text-[10px] text-slate-400">Finished broadcasts</p>
        </div>
        <div className="rounded-sm border border-slate-200 bg-white p-3.5 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Total Audience</p>
          <p className="mt-1 text-2xl font-bold text-indigo-600">{loading ? "—" : totalAudience.toLocaleString()}</p>
          <p className="mt-0.5 text-[10px] text-slate-400">Cumulative recipients</p>
        </div>
      </div>

      {/* Bar Chart Comparing Campaigns with Metric Switcher */}
      <section className="rounded-sm border border-slate-200 bg-white p-4 shadow-2xs">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">Campaign Performance Comparison</h2>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Benchmark campaigns side-by-side by switching metrics between Sent, Delivered, Read, or Failed.
            </p>
          </div>

          {/* Metric Switcher */}
          <div className="flex items-center gap-1 rounded bg-slate-100 p-0.5 text-xs">
            {(["sent", "delivered", "read", "failed"] as const).map((metric) => {
              const cfg = METRIC_CONFIG[metric];
              return (
                <button
                  key={metric}
                  type="button"
                  onClick={() => setSelectedMetric(metric)}
                  className={cn(
                    "rounded px-2.5 py-1 text-[11px] font-medium transition-colors capitalize",
                    selectedMetric === metric
                      ? "bg-white text-slate-900 shadow-2xs font-semibold"
                      : "text-slate-600 hover:text-slate-900",
                  )}
                >
                  {metric}
                </button>
              );
            })}
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="my-10 flex flex-col items-center justify-center text-center">
            <Megaphone className="size-8 text-slate-300" />
            <p className="mt-2 text-xs font-semibold text-slate-700">No campaigns recorded yet</p>
            <p className="text-[11px] text-slate-400">Campaigns created will be benchmarked here automatically.</p>
          </div>
        ) : (
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#64748B" }}
                  tickLine={false}
                  axisLine={false}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0F172A",
                    borderRadius: "6px",
                    border: "none",
                    color: "#F8FAFC",
                    fontSize: "12px",
                  }}
                  formatter={(val: any) => [`${val} messages`, activeMetricConfig.label]}
                  labelFormatter={(_label, payload) => payload?.[0]?.payload?.fullName || _label}
                />
                <Bar dataKey="value" fill={activeMetricConfig.color} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Detailed Campaign Table */}
      <section className="overflow-hidden rounded-sm border border-slate-200 bg-white shadow-2xs">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Campaign Performance Registry</h3>
            <p className="mt-0.5 text-xs text-slate-500">Comprehensive delivery and read conversion per campaign.</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="w-full sm:w-64">
              <Input
                placeholder="Search campaigns..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Campaign</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Audience</th>
                <th className="px-3 py-3">Sent</th>
                <th className="px-3 py-3">Delivered</th>
                <th className="px-3 py-3">Read</th>
                <th className="px-3 py-3">Failed</th>
                <th className="px-3 py-3">Delivery %</th>
                <th className="px-3 py-3">Read %</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-900">{c.name}</td>
                  <td className="px-3 py-3 text-slate-600 font-mono text-[11px]">{c.type}</td>
                  <td className="px-3 py-3 font-medium text-slate-700">{c.audience.toLocaleString()}</td>
                  <td className="px-3 py-3 font-medium text-slate-700">{c.sent.toLocaleString()}</td>
                  <td className="px-3 py-3 font-medium text-emerald-700">{c.delivered.toLocaleString()}</td>
                  <td className="px-3 py-3 font-medium text-indigo-700">{c.read.toLocaleString()}</td>
                  <td className="px-3 py-3 font-medium text-rose-600">{c.failed.toLocaleString()}</td>
                  <td className="px-3 py-3 font-semibold text-slate-800">{c.deliveryRate.toFixed(1)}%</td>
                  <td className="px-3 py-3 font-semibold text-slate-800">{c.readRate.toFixed(1)}%</td>
                  <td className="px-3 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-3 py-3 text-right">
                    {onViewAudience && (
                      <Button variant="ghost" size="sm" onClick={() => onViewAudience(c.id)} className="h-7 text-[11px]">
                        <Eye className="mr-1.5 size-3" /> View Audience
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-slate-500">
                    {search ? "No campaigns match your search filter." : "No campaigns stored yet."}
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-slate-500">
                    Loading campaigns…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
