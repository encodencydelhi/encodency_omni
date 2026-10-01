"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Clock,
  Phone,
  Search,
  Tag,
  TrendingUp,
  UserCheck,
  UserMinus,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Input } from "@/components/ui/input";
import type {
  WhatsAppContactGrowthPoint,
  WhatsAppContactItem,
} from "../../live/whatsapp-api";

interface ContactsViewProps {
  contacts: WhatsAppContactItem[];
  growthTimeline: WhatsAppContactGrowthPoint[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "—";
}

export function WhatsAppContactsView({
  contacts,
  growthTimeline,
  loading,
  error,
  onRetry,
}: ContactsViewProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return contacts.filter(
      (c) => c.phone.includes(q) || (c.name && c.name.toLowerCase().includes(q)),
    );
  }, [contacts, search]);

  const totalContacts = contacts.length;
  const optedIn = contacts.filter((c) => c.optInStatus).length;
  const optedOut = contacts.filter((c) => !c.optInStatus).length;

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

      {/* 3 Summary Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-sm border border-slate-200 bg-white p-3.5 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Total Audience</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{loading ? "—" : totalContacts.toLocaleString()}</p>
          <p className="mt-0.5 text-[10px] text-slate-400">Total captured contacts</p>
        </div>
        <div className="rounded-sm border border-slate-200 bg-white p-3.5 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Opted-In Subscribers</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{loading ? "—" : optedIn.toLocaleString()}</p>
          <p className="mt-0.5 text-[10px] text-slate-400">Active broadcast recipients</p>
        </div>
        <div className="rounded-sm border border-slate-200 bg-white p-3.5 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Opted-Out / Blocked</p>
          <p className="mt-1 text-2xl font-bold text-rose-600">{loading ? "—" : optedOut.toLocaleString()}</p>
          <p className="mt-0.5 text-[10px] text-slate-400">Unsubscribed numbers</p>
        </div>
      </div>

      {/* Audience Growth Over Time Line Chart */}
      <section className="rounded-sm border border-slate-200 bg-white p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">Audience Growth & Subscriber Acquisition</h2>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Cumulative audience progression and daily new contact acquisition over the past 30 days.
            </p>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 mt-1 sm:mt-0">
            30-Day Growth Trend
          </span>
        </div>

        {growthTimeline.length === 0 ? (
          <div className="my-10 flex flex-col items-center justify-center text-center">
            <Users className="size-8 text-slate-300" />
            <p className="mt-2 text-xs font-semibold text-slate-700">No audience timeline yet</p>
            <p className="text-[11px] text-slate-400">Audience growth over time will be graphed here automatically.</p>
          </div>
        ) : (
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0F172A",
                    borderRadius: "6px",
                    border: "none",
                    color: "#F8FAFC",
                    fontSize: "12px",
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: "12px", fontSize: "11px" }}
                />
                <Line
                  type="monotone"
                  dataKey="totalContacts"
                  name="Total Contacts"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="activeContacts"
                  name="Active Contacts"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="newContacts"
                  name="New Contacts"
                  stroke="#8B5CF6"
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Contacts Table */}
      <section className="overflow-hidden rounded-sm border border-slate-200 bg-white shadow-2xs">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Audience Contacts & Opt-In Directory
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Active subscriber directory with acquisition source and opt-in status.
            </p>
          </div>
          <div className="w-full sm:w-64">
            <Input
              placeholder="Search phone or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Phone</th>
                <th className="px-3 py-3">Name</th>
                <th className="px-3 py-3">Source</th>
                <th className="px-3 py-3">Opt-in Status</th>
                <th className="px-3 py-3">Tags</th>
                <th className="px-3 py-3">Last Interaction</th>
                <th className="px-3 py-3">Created At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-900 font-mono text-[11.5px]">{c.phone}</td>
                  <td className="px-3 py-3 font-medium text-slate-700">{c.name ?? "—"}</td>
                  <td className="px-3 py-3 text-slate-600 text-[11px]">{c.source}</td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-sm border px-2 py-0.5 text-[11px] font-semibold",
                        c.optInStatus
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-rose-200 bg-rose-50 text-rose-700",
                      )}
                    >
                      {c.optInStatus ? "Opted In" : "Opted Out"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-600">
                    {c.tags.length ? (
                      <div className="flex flex-wrap gap-1">
                        {c.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-3 text-slate-500 text-[11px]">{formatDate(c.lastActiveAt)}</td>
                  <td className="px-3 py-3 text-slate-500 text-[11px]">{formatDate(c.createdAt)}</td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    {search ? "No contacts match your search filter." : "No contacts stored yet."}
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    Loading contacts…
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
