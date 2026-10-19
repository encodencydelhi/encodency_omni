"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, Building2, ChevronLeft, ChevronRight, Globe2, MapPin, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { AdminPageTitle } from "@/features/admin/shared/admin-page-title";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { cn } from "@/lib/utils/cn";
import { crmApi, type CrmScope } from "./data/crm-api";
import type { Company, Contact, Deal } from "./types";
import { crmLink } from "./lib/use-open-param";
import { CrmAiInsights } from "./components/crm-ai-insights";
import { CrmRecycleDialog } from "./components/crm-recycle-dialog";
import { CrmSavedViews } from "./components/crm-saved-views";

type Account = Company & { persisted: boolean; contacts: Contact[]; deals: Deal[]; pipelineValue: number; wonValue: number };
type AccountFilter = "all" | "customer" | "prospect" | "discovered";

export default function CompaniesPage() {
  const { companyId, clientId, isReady } = useTenancyContext();
  const scope = useMemo<CrmScope | null>(() => companyId && clientId ? { companyId, clientId } : null, [companyId, clientId]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<AccountFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ name: "", industry: "", website: "", location: "", notes: "" });

  const load = useCallback(async () => {
    if (!isReady || !scope) return;
    try {
      const [companyRows, contactRows, dealRows] = await Promise.all([crmApi.list<Company>("company", scope), crmApi.list<Contact>("contact", scope), crmApi.list<Deal>("deal", scope)]);
      setCompanies(companyRows); setContacts(contactRows); setDeals(dealRows);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Accounts could not be loaded."); }
  }, [isReady, scope]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  const accounts = useMemo<Account[]>(() => {
    const map = new Map<string, Company>();
    companies.forEach((company) => map.set(company.name.trim().toLowerCase(), { ...company }));
    contacts.forEach((contact) => { const name = contact.company?.trim(); if (name && !map.has(name.toLowerCase())) map.set(name.toLowerCase(), { id: `virtual:${name.toLowerCase()}`, name, industry: "", website: contact.website || "", location: contact.location || "" }); });
    deals.forEach((deal) => { const name = deal.companyName?.trim(); if (name && !map.has(name.toLowerCase())) map.set(name.toLowerCase(), { id: `virtual:${name.toLowerCase()}`, name, industry: "", website: "", location: "" }); });
    return [...map.values()].map((company) => {
      const relatedContacts = contacts.filter((contact) => contact.companyId === company.id || contact.company.trim().toLowerCase() === company.name.trim().toLowerCase());
      const relatedDeals = deals.filter((deal) => deal.companyId === company.id || deal.companyName.trim().toLowerCase() === company.name.trim().toLowerCase());
      return { ...company, persisted: !company.id.startsWith("virtual:"), contacts: relatedContacts, deals: relatedDeals, pipelineValue: relatedDeals.filter((deal) => !["won", "lost"].includes(deal.stage)).reduce((sum, deal) => sum + deal.value, 0), wonValue: relatedDeals.filter((deal) => deal.stage === "won").reduce((sum, deal) => sum + deal.value, 0) };
    }).sort((left, right) => right.pipelineValue - left.pipelineValue || left.name.localeCompare(right.name));
  }, [companies, contacts, deals]);

  const filtered = accounts.filter((account) => {
    const matchesSearch = `${account.name} ${account.industry} ${account.location} ${account.ownerName ?? ""}`.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || (filter === "discovered" ? !account.persisted : account.status === filter);
    return matchesSearch && matchesFilter;
  });
  const detail = accounts.find((account) => account.id === detailId) ?? null;
  const totals = useMemo(() => ({ pipeline: accounts.reduce((sum, account) => sum + account.pipelineValue, 0), won: accounts.reduce((sum, account) => sum + account.wonValue, 0), contacts: accounts.reduce((sum, account) => sum + account.contacts.length, 0) }), [accounts]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleAccounts = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const create = async () => {
    if (!scope || !draft.name.trim() || saving) return;
    setSaving(true);
    try {
      const saved = await crmApi.create<Company>("company", { id: "", name: draft.name.trim(), industry: draft.industry.trim(), website: draft.website.trim(), location: draft.location.trim(), notes: draft.notes.trim(), status: "prospect" }, scope);
      setCompanies((current) => [saved, ...current]); setShowCreate(false); setDraft({ name: "", industry: "", website: "", location: "", notes: "" }); toast.success("Account created");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Account could not be created."); }
    finally { setSaving(false); }
  };

  return <div className="space-y-4">
    <AdminPageTitle eyebrow="CRM / Accounts" title="Company Accounts" description="Manage every customer organization, relationship, stakeholder, and opportunity from one place." action={<div className="flex gap-2"><CrmRecycleDialog kind="company" scope={scope} onRestored={() => void load()} /><Button size="sm" onClick={() => setShowCreate(true)}><Plus className="size-3.5" /> New Account</Button></div>} />

    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
      <div className="h-1 bg-gradient-to-r from-indigo-600 via-violet-500 to-cyan-500" />
      <div className="flex flex-wrap items-center gap-x-10 gap-y-3 border-b bg-gradient-to-r from-slate-50 to-white px-5 py-4">
        <Summary label="Accounts" value={String(accounts.length)} />
        <Summary label="Linked contacts" value={String(totals.contacts)} />
        <Summary label="Open pipeline" value={money(totals.pipeline)} accent />
        <Summary label="Won revenue" value={money(totals.won)} />
        <p className="ml-auto rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium text-slate-500">Live CRM Overview</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <label className="flex h-9 min-w-[260px] flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 transition focus-within:border-indigo-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100 sm:max-w-md">
          <Search className="size-3.5 text-slate-400" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search Accounts, Industry, Location, or Owner" className="w-full bg-transparent text-xs outline-none placeholder:text-slate-400" />
        </label>
        <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">{(["all", "customer", "prospect", "discovered"] as const).map((item) => <button key={item} onClick={() => { setFilter(item); setPage(1); }} className={cn("rounded-md px-3 py-1.5 text-[11px] font-semibold transition", filter === item ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-800")}>{titleCase(item)}</button>)}</div>
        <div className="ml-auto"><CrmSavedViews namespace="companies" state={{ search, filter }} onApply={(view) => { setSearch(String(view.search ?? "")); setFilter((view.filter as AccountFilter) ?? "all"); }} /></div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left">
          <thead className="border-b bg-slate-50/80 text-[11px] tracking-wide text-slate-600"><tr><th className="px-5 py-3 font-semibold">Account</th><th className="px-3 py-3 font-semibold">Relationship</th><th className="px-3 py-3 font-semibold">Contacts</th><th className="px-3 py-3 font-semibold">Deals</th><th className="px-3 py-3 font-semibold">Open Pipeline</th><th className="px-3 py-3 font-semibold">Won Revenue</th><th className="w-12 px-3 py-3" /></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {visibleAccounts.map((account) => <tr key={account.id} onClick={() => setDetailId(account.id)} className="group h-[58px] cursor-pointer text-xs transition hover:bg-indigo-50/40">
              <td className="px-5 py-2"><div className="min-w-0"><p className="truncate text-[12px] font-semibold text-slate-900">{titleCase(account.name)}</p><p className="mt-0.5 truncate text-[10px] text-slate-500">{titleCase(account.industry || account.location || "Industry Not Added")}{account.ownerName ? ` · ${titleCase(account.ownerName)}` : ""}</p></div></td>
              <td className="px-3 py-2"><Status account={account} /></td>
              <td className="px-3 py-2"><p className="font-semibold text-slate-800">{account.contacts.length}</p><p className="text-[10px] text-slate-400">People</p></td>
              <td className="px-3 py-2"><p className="font-semibold text-slate-800">{account.deals.length}</p><p className="text-[10px] text-slate-400">Opportunities</p></td>
              <td className="px-3 py-2"><p className="font-semibold tabular-nums text-slate-900">{money(account.pipelineValue)}</p><div className="mt-1 h-1 w-20 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(100, totals.pipeline ? (account.pipelineValue / totals.pipeline) * 100 : 0)}%` }} /></div></td>
              <td className="px-3 py-2 font-semibold tabular-nums text-emerald-700">{money(account.wonValue)}</td>
              <td className="px-3 py-2"><ChevronRight className="size-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-600" /></td>
            </tr>)}
          </tbody>
        </table>
      </div>
      {!filtered.length ? <div className="py-14 text-center"><Building2 className="mx-auto size-8 text-slate-300" /><p className="mt-2 text-sm font-medium text-slate-700">No accounts found</p><p className="mt-1 text-xs text-slate-500">Try changing the search or relationship filter.</p></div> : null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-slate-50/50 px-5 py-2.5 text-[11px] text-slate-500">
        <span>Showing {filtered.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} Accounts</span>
        <div className="flex items-center gap-2"><label className="flex items-center gap-1.5">Rows Per Page<select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="h-7 rounded-md border bg-white px-2 text-[11px] font-medium text-slate-700 outline-none"><option value={5}>5</option><option value={10}>10</option><option value={20}>20</option></select></label><span className="mx-1 text-slate-300">|</span><span>Page {currentPage} of {totalPages}</span><button type="button" aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="grid size-7 place-items-center rounded-md border bg-white text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="size-3.5" /></button><button type="button" aria-label="Next page" disabled={currentPage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="grid size-7 place-items-center rounded-md border bg-white text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight className="size-3.5" /></button></div>
      </div>
    </section>

    <Sheet open={!!detail} onOpenChange={(open) => { if (!open) setDetailId(null); }}><SheetContent side="right" className="w-full max-w-2xl"><SheetHeader><SheetTitle>{detail ? titleCase(detail.name) : "Account Details"}</SheetTitle></SheetHeader><SheetBody>{detail ? <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 border-b pb-4"><div><Status account={detail} /><p className="mt-2 text-xs text-slate-500">{titleCase(detail.industry || "Industry Not Added")}{detail.location ? ` · ${titleCase(detail.location)}` : ""}</p></div>{detail.persisted ? <CrmAiInsights kind="company" recordId={detail.id} label={detail.name} scope={scope} /> : null}</div>
      {!detail.persisted ? <p className="border-l-2 border-amber-400 bg-amber-50 px-3 py-2 text-xs text-amber-800">Discovered from linked CRM records. Create a permanent account to enable account fields and AI analysis.</p> : null}
      <dl className="grid grid-cols-2 border-y sm:grid-cols-4"><Fact label="Contacts" value={String(detail.contacts.length)} /><Fact label="Deals" value={String(detail.deals.length)} /><Fact label="Pipeline" value={money(detail.pipelineValue)} /><Fact label="Won" value={money(detail.wonValue)} /></dl>
      <div className="grid gap-3 sm:grid-cols-2"><Info icon={Globe2} label="Website" value={detail.website || "Not added"} /><Info icon={MapPin} label="Location" value={detail.location || "Not added"} /></div>
      <Section title="Contacts" count={detail.contacts.length}>{detail.contacts.length ? detail.contacts.map((contact) => <Link key={contact.id} href={crmLink("contacts", contact.id)} className="flex items-center justify-between border-b py-2.5 text-xs last:border-0 hover:text-indigo-700"><span><b className="font-semibold">{`${contact.firstName} ${contact.lastName}`.trim()}</b><span className="ml-2 text-slate-500">{contact.role || "Contact"}</span></span><ArrowUpRight className="size-3.5" /></Link>) : <Empty />}</Section>
      <Section title="Deals" count={detail.deals.length}>{detail.deals.length ? detail.deals.map((deal) => <Link key={deal.id} href={crmLink("pipeline", deal.id)} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b py-2.5 text-xs last:border-0 hover:text-indigo-700"><span className="font-semibold">{deal.name}</span><span className="capitalize text-slate-500">{deal.stage}</span><span className="font-semibold tabular-nums">{money(deal.value)}</span></Link>) : <Empty />}</Section>
    </div> : null}</SheetBody></SheetContent></Sheet>

    <Dialog open={showCreate} onOpenChange={setShowCreate}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Create Company Account</DialogTitle><DialogDescription>Add an organization that can own multiple contacts and deals.</DialogDescription></DialogHeader><div className="space-y-3"><Input placeholder="Company Name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /><div className="grid grid-cols-2 gap-3"><Input placeholder="Industry" value={draft.industry} onChange={(event) => setDraft((current) => ({ ...current, industry: event.target.value }))} /><Input placeholder="Location" value={draft.location} onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))} /></div><Input placeholder="Website" value={draft.website} onChange={(event) => setDraft((current) => ({ ...current, website: event.target.value }))} /><Textarea placeholder="Account Notes" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} /></div><DialogFooter><Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button><Button disabled={!draft.name.trim() || saving} onClick={() => void create()}>{saving ? "Saving..." : "Create Account"}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}

function Summary({ label, value, accent }: { label: string; value: string; accent?: boolean }) { return <div><p className="text-[11px] font-medium text-slate-500">{label}</p><p className={cn("mt-0.5 text-lg font-semibold tabular-nums tracking-tight", accent ? "text-indigo-700" : "text-slate-900")}>{value}</p></div>; }
function Status({ account }: { account: Account }) { const label = account.persisted ? account.status || "prospect" : "discovered"; return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold", label === "customer" ? "bg-emerald-50 text-emerald-700" : label === "discovered" ? "bg-amber-50 text-amber-700" : label === "inactive" ? "bg-slate-100 text-slate-500" : "bg-indigo-50 text-indigo-700")}><span className="size-1.5 rounded-full bg-current opacity-70" />{titleCase(label)}</span>; }
function Fact({ label, value }: { label: string; value: string }) { return <div className="border-r px-3 py-3 last:border-0"><dt className="text-[10px] uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-1 text-sm font-semibold tabular-nums text-slate-900">{value}</dd></div>; }
function Info({ icon: Icon, label, value }: { icon: typeof Globe2; label: string; value: string }) { return <div className="border-l-2 border-slate-200 pl-3"><p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-slate-400"><Icon className="size-3" />{label}</p><p className="mt-1 break-words text-xs font-medium text-slate-800">{value}</p></div>; }
function Section({ title, count, children }: { title: string; count: number; children: ReactNode }) { return <section><div className="flex items-center gap-2 border-b pb-2"><h3 className="text-xs font-semibold uppercase tracking-wide text-slate-700">{title}</h3><span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{count}</span></div><div>{children}</div></section>; }
function Empty() { return <p className="py-4 text-xs text-slate-500">No linked records.</p>; }
function titleCase(value: string) { return value.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function money(value: number) { return `₹${Math.round(value).toLocaleString("en-IN")}`; }
