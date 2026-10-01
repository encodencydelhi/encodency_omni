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
  BarChart2,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Plus,
  RefreshCw,
  Search,
  Send,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WhatsAppTemplateAnalyticsItem } from "../../live/whatsapp-api";

interface TemplatesViewProps {
  templates: WhatsAppTemplateAnalyticsItem[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onOpenModal: (modal: string) => void;
  onSyncAiSensy?: () => void;
  syncing?: boolean;
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "—";
}

function StatusBadge({ status }: { status: string }) {
  const isEnabled = status === "ENABLED";
  return (
    <span
      className={cn(
        "inline-flex rounded-sm border px-2 py-0.5 text-[11px] font-semibold",
        isEnabled
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-50 text-slate-700",
      )}
    >
      {status}
    </span>
  );
}

const BAR_COLORS = ["#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EC4899", "#06B6D4"];

export function WhatsAppTemplatesView({
  templates,
  loading,
  error,
  onRetry,
  onOpenModal,
  onSyncAiSensy,
  syncing,
}: TemplatesViewProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return templates.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));
  }, [templates, search]);

  const totalTemplates = templates.length;
  const enabledTemplates = templates.filter((t) => t.status === "ENABLED").length;
  const totalSent = templates.reduce((acc, t) => acc + (t.sent ?? 0), 0);
  const totalDelivered = templates.reduce((acc, t) => acc + (t.delivered ?? 0), 0);

  // Horizontal bar chart data: Top templates by messages sent
  const chartData = useMemo(() => {
    return [...templates]
      .sort((a, b) => (b.total ?? 0) - (a.total ?? 0))
      .slice(0, 6)
      .map((t) => ({
        name: t.name.length > 22 ? `${t.name.slice(0, 20)}...` : t.name,
        fullName: t.name,
        messages: t.total ?? 0,
        delivered: t.delivered ?? 0,
        read: t.read ?? 0,
      }));
  }, [templates]);

  return (
    <div className="space-y-4 pt-1">
      {error && (
        <div className="flex items-center justify-between border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <span>{error}</span>
          <button type="button" onClick={onRetry} className="font-semibold underline">
            Retry
          </button>
        </div>
      )}

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-sm border border-slate-200 bg-white p-3.5 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Registered Templates</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{loading ? "—" : totalTemplates}</p>
          <p className="mt-0.5 text-[10px] text-slate-400">In client registry</p>
        </div>
        <div className="rounded-sm border border-slate-200 bg-white p-3.5 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Enabled / Active</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{loading ? "—" : enabledTemplates}</p>
          <p className="mt-0.5 text-[10px] text-slate-400">Available for sends</p>
        </div>
        <div className="rounded-sm border border-slate-200 bg-white p-3.5 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Messages Dispatched</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">{loading ? "—" : totalSent.toLocaleString()}</p>
          <p className="mt-0.5 text-[10px] text-slate-400">Total template sends</p>
        </div>
        <div className="rounded-sm border border-slate-200 bg-white p-3.5 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Successful Deliveries</p>
          <p className="mt-1 text-2xl font-bold text-indigo-600">{loading ? "—" : totalDelivered.toLocaleString()}</p>
          <p className="mt-0.5 text-[10px] text-slate-400">Verified by webhooks</p>
        </div>
      </div>

      {/* Horizontal Bar Chart for Template Usage & Performance */}
      <section className="rounded-sm border border-slate-200 bg-white p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <BarChart2 className="size-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">Top Templates by Usage Volume</h2>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Horizontal performance breakdown showing which templates have generated the highest message throughput.
            </p>
          </div>
          <Button size="sm" onClick={() => onOpenModal("create-template")} className="mt-2 sm:mt-0">
            <Plus className="size-3.5 mr-1" /> Add Template
          </Button>
        </div>

        {chartData.length === 0 ? (
          <div className="my-10 flex flex-col items-center justify-center text-center">
            <FileText className="size-8 text-slate-300" />
            <p className="mt-2 text-xs font-semibold text-slate-700">No template usage data yet</p>
            <p className="text-[11px] text-slate-400">Add an approved template to begin sending messages.</p>
          </div>
        ) : (
          <div className="mt-4 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={150}
                  tick={{ fontSize: 11, fill: "#334155" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0F172A",
                    borderRadius: "6px",
                    border: "none",
                    color: "#F8FAFC",
                    fontSize: "12px",
                  }}
                  formatter={(val: any) => [`${val} messages`, "Total Volume"]}
                  labelFormatter={(_label, payload) => payload?.[0]?.payload?.fullName || _label}
                />
                <Bar dataKey="messages" radius={[0, 4, 4, 0]}>
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Expanded Template Analytics Table */}
      <section className="overflow-hidden rounded-sm border border-slate-200 bg-white shadow-2xs">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Granular Template Performance Metrics
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Delivery, read rates, and campaign utilization across all registered templates.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="w-full sm:w-56">
              <Input
                placeholder="Search templates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            {onSyncAiSensy && (
              <Button
                size="sm"
                variant="outline"
                onClick={onSyncAiSensy}
                disabled={syncing}
                className="h-8 text-xs shrink-0"
              >
                <RefreshCw className={cn("size-3.5 mr-1.5", syncing && "animate-spin")} />
                {syncing ? "Syncing..." : "Sync from AiSensy"}
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => onOpenModal("create-template")}
              className="h-8 text-xs shrink-0"
            >
              <Plus className="size-3.5 mr-1" /> Add Template
            </Button>
          </div>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Template Name</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3">Language</th>
                <th className="px-3 py-3">Sent</th>
                <th className="px-3 py-3">Delivered</th>
                <th className="px-3 py-3">Read</th>
                <th className="px-3 py-3">Failed</th>
                <th className="px-3 py-3">Delivery Rate</th>
                <th className="px-3 py-3">Read Rate</th>
                <th className="px-3 py-3">Campaigns</th>
                <th className="px-3 py-3">Last Used</th>
                <th className="px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-900">{t.name}</td>
                  <td className="px-3 py-3 text-slate-600">{t.category ?? "UTILITY"}</td>
                  <td className="px-3 py-3 text-slate-600 font-mono text-[11px]">{t.language}</td>
                  <td className="px-3 py-3 font-medium text-slate-800">{(t.total ?? 0).toLocaleString()}</td>
                  <td className="px-3 py-3 font-medium text-emerald-700">{(t.delivered ?? 0).toLocaleString()}</td>
                  <td className="px-3 py-3 font-medium text-indigo-700">{(t.read ?? 0).toLocaleString()}</td>
                  <td className="px-3 py-3 font-medium text-rose-600">{(t.failed ?? 0).toLocaleString()}</td>
                  <td className="px-3 py-3 font-semibold text-slate-800">{(t.deliveryRate ?? 0).toFixed(1)}%</td>
                  <td className="px-3 py-3 font-semibold text-slate-800">{(t.readRate ?? 0).toFixed(1)}%</td>
                  <td className="px-3 py-3 text-slate-600 font-medium">{t.campaignsUsed ?? 0}</td>
                  <td className="px-3 py-3 text-slate-500 text-[11px]">{formatDate(t.lastUsedAt)}</td>
                  <td className="px-3 py-3">
                    <StatusBadge status={t.status} />
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center text-slate-500">
                    <p className="font-semibold text-slate-700 text-sm">
                      {search ? "No templates match your search filter." : "No templates registered in client registry"}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      {search
                        ? "Try adjusting your search terms to find registered templates."
                        : "If you have approved templates in your AiSensy account, click below to pull and sync them instantly."}
                    </p>
                    {!search && (
                      <div className="flex justify-center gap-2 mt-4">
                        {onSyncAiSensy && (
                          <Button size="sm" onClick={onSyncAiSensy} disabled={syncing}>
                            <RefreshCw className={cn("size-3.5 mr-1.5", syncing && "animate-spin")} />
                            {syncing ? "Syncing from AiSensy..." : "Sync Templates from AiSensy"}
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => onOpenModal("create-template")}>
                          <Plus className="size-3.5 mr-1" /> Add Manually
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={12} className="px-4 py-10 text-center text-slate-500">
                    Loading templates…
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
