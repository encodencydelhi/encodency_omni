/**
 * EnCodency OmniPlatform - Invoicing & Collections Trend Chart
 * Recharts component with metric selectors, period selection and currency-aware tooltips.
 */

"use client";

import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney } from "../../data/money";
import type { Invoice, Payment, Refund } from "../../data/types";

interface BillingTrendChartProps {
  invoices: Invoice[];
  payments: Payment[];
  refunds: Refund[];
  currency: string;
}

export function BillingTrendChart({
  invoices,
  payments,
  refunds,
  currency,
}: BillingTrendChartProps) {
  const [metric, setMetric] = useState<"all" | "invoiced" | "collected" | "refunds">("all");

  // Aggregate monthly data for the past 6 months
  const chartData = useMemo(() => {
    const months: Array<{
      key: string;
      label: string;
      invoicedMinor: number;
      collectedMinor: number;
      refundsMinor: number;
    }> = [];

    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-US", { month: "short" });
      months.push({
        key: monthKey,
        label,
        invoicedMinor: 0,
        collectedMinor: 0,
        refundsMinor: 0,
      });
    }

    const currencyMatch = (c: string) => (currency === "ALL" ? true : c.toUpperCase() === currency.toUpperCase());

    // Invoiced
    invoices.forEach((inv) => {
      if (!currencyMatch(inv.currency) || inv.documentState === "void") return;
      const d = new Date(inv.issuedAt);
      const mKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
      const bucket = months.find((m) => m.key === mKey);
      if (bucket) {
        bucket.invoicedMinor += inv.totalMinor;
      }
    });

    // Collected
    payments.forEach((p) => {
      if (!currencyMatch(p.currency) || p.attemptStatus !== "succeeded") return;
      const d = new Date(p.settledAt ?? p.createdAt);
      const mKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
      const bucket = months.find((m) => m.key === mKey);
      if (bucket) {
        bucket.collectedMinor += p.grossAmountMinor;
      }
    });

    // Refunds
    refunds.forEach((r) => {
      if (!currencyMatch(r.currency) || r.status !== "succeeded") return;
      const d = new Date(r.processedAt ?? r.createdAt);
      const mKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
      const bucket = months.find((m) => m.key === mKey);
      if (bucket) {
        bucket.refundsMinor += r.requestedAmountMinor;
      }
    });

    return months.map((m) => ({
      name: m.label,
      invoiced: m.invoicedMinor / 100,
      collected: m.collectedMinor / 100,
      refunds: m.refundsMinor / 100,
      rawInvoicedMinor: m.invoicedMinor,
      rawCollectedMinor: m.collectedMinor,
      rawRefundsMinor: m.refundsMinor,
    }));
  }, [invoices, payments, refunds, currency]);

  return (
    <div className="flex flex-col h-full bg-card rounded-sm border border-border p-3 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border/60">
        <div>
          <h2 className="text-xs font-bold tracking-tight text-foreground uppercase">
            Invoicing & Collections Trend
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Multi-month receivables generated vs cash collected ({currency === "ALL" ? "Primary Currency" : currency}).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={metric} onValueChange={(val: any) => setMetric(val)}>
            <SelectTrigger className="h-7 w-36 text-xs rounded-sm bg-background border-border">
              <SelectValue placeholder="View Metric" />
            </SelectTrigger>
            <SelectContent className="rounded-sm">
              <SelectItem value="all" className="text-xs">All Metrics</SelectItem>
              <SelectItem value="invoiced" className="text-xs">Invoiced Only</SelectItem>
              <SelectItem value="collected" className="text-xs">Collected Only</SelectItem>
              <SelectItem value="refunds" className="text-xs">Refunds Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 w-full pt-3 min-h-[220px]">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="name"
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: "#cbd5e1" }}
            />
            <YAxis
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: "#cbd5e1" }}
              tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val.toString())}
            />
            <Tooltip
              formatter={(value: any, name: any) => {
                const label =
                  name === "invoiced"
                    ? "Invoiced"
                    : name === "collected"
                    ? "Collected"
                    : "Refunds";
                const amountMinor = Math.round(Number(value) * 100);
                return [formatMoney(amountMinor, currency === "ALL" ? "INR" : currency), label];
              }}
              contentStyle={{
                backgroundColor: "#ffffff",
                borderColor: "#cbd5e1",
                borderRadius: "2px",
                fontSize: "12px",
                padding: "8px 12px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
              formatter={(value) => (value === "invoiced" ? "Invoiced" : value === "collected" ? "Collected" : "Refunds")}
            />
            {(metric === "all" || metric === "invoiced") && (
              <Bar dataKey="invoiced" fill="#3b82f6" radius={[2, 2, 0, 0]} maxBarSize={32} />
            )}
            {(metric === "all" || metric === "collected") && (
              <Bar dataKey="collected" fill="#10b981" radius={[2, 2, 0, 0]} maxBarSize={32} />
            )}
            {(metric === "all" || metric === "refunds") && (
              <Bar dataKey="refunds" fill="#f43f5e" radius={[2, 2, 0, 0]} maxBarSize={32} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
