import type { Deal } from "../types";

const money = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;

export function CrmForecastPanel({ deals }: { deals: Deal[] }) {
  const open = deals.filter((deal) => deal.stage !== "won" && deal.stage !== "lost");
  const now = new Date();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
  const closingThisMonth = open.filter((deal) => { const date = new Date(deal.expectedCloseDate).getTime(); return Number.isFinite(date) && date >= now.getTime() && date < monthEnd; });
  const bestCase = closingThisMonth.reduce((sum, deal) => sum + deal.value, 0);
  const expected = closingThisMonth.reduce((sum, deal) => sum + deal.value * deal.probability / 100, 0);
  const committed = closingThisMonth.filter((deal) => deal.probability >= 80 || deal.stage === "negotiation").reduce((sum, deal) => sum + deal.value, 0);
  const overdue = open.filter((deal) => deal.expectedCloseDate && new Date(deal.expectedCloseDate).getTime() < now.getTime()).length;
  return <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><div className="mb-3 flex items-center justify-between"><div><h2 className="text-sm font-semibold text-slate-900">Monthly Revenue Forecast</h2><p className="text-xs text-slate-500">Open deals expected to close this month</p></div>{overdue ? <span className="rounded bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">{overdue} overdue close date{overdue === 1 ? "" : "s"}</span> : null}</div><div className="grid gap-2 sm:grid-cols-3"><ForecastValue label="Committed" value={committed} hint="80%+ or negotiation" /><ForecastValue label="Expected" value={expected} hint="Probability weighted" /><ForecastValue label="Best case" value={bestCase} hint={`${closingThisMonth.length} closing deals`} /></div></section>;
}

function ForecastValue({ label, value, hint }: { label: string; value: number; hint: string }) { return <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-1 text-lg font-bold text-slate-900">{money(value)}</p><p className="text-[11px] text-slate-500">{hint}</p></div>; }
