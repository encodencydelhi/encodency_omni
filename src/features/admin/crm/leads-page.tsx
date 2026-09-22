"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Plus, Download, Upload, Eye, Pencil, Trash2, MoreHorizontal,
  Phone, Mail, Calendar, UserPlus, ArrowRightLeft, Users, Target,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { DataTable } from "@/components/shared/data-table/data-table";
import { SearchInput } from "@/components/shared/search-input";
import { FilterBar } from "@/components/shared/filter-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { TrendAreaChart, ChartLegend } from "@/components/shared/charts/trend-area-chart";
import { DonutChart } from "@/components/shared/charts/donut-chart";
import { AdminPageTitle } from "@/features/admin/shared/admin-page-title";
import type { DataTableColumn, DataTableSelection } from "@/components/shared/data-table/types";
import type { PaginationMeta, SortSpec } from "@/types/api";
import type { TrendSeries } from "@/components/shared/charts/trend-area-chart";
import type { DonutSegment } from "@/components/shared/charts/donut-chart";
import { LeadMetricCards } from "./components/crm-metric-cards";
import { FunnelChart } from "./components/crm-funnel-chart";
import { CrmImportDialog } from "./components/crm-import-dialog";
import { leads as seedLeads, activities as seedActivities, teamMembers } from "./data/crm-data";
import { exportLeadsCsv, listValues } from "./lib/csv";
import type { Lead, LeadStage, LeadSource, CrmActivity } from "./types";

const STAGE_OPTIONS = ["new", "contacted", "qualified", "proposal", "won", "lost"] as const;
const SOURCE_OPTIONS = ["website", "google", "facebook", "instagram", "linkedin", "referral", "campaign", "import", "manual", "other"] as const;
const STAGE_LABELS: Record<LeadStage, string> = { new: "New", contacted: "Contacted", qualified: "Qualified", proposal: "Proposal", won: "Won", lost: "Lost" };
const SOURCE_LABELS: Record<LeadSource, string> = { website: "Website", google: "Google", facebook: "Facebook", instagram: "Instagram", linkedin: "LinkedIn", referral: "Referral", campaign: "Campaign", import: "Import", manual: "Manual", other: "Other" };
const STAGE_BADGE: Record<LeadStage, string> = {
  new: "bg-blue-50 text-blue-700 border border-blue-200/50 shadow-sm", 
  contacted: "bg-amber-50 text-amber-700 border border-amber-200/50 shadow-sm",
  qualified: "bg-emerald-50 text-emerald-700 border border-emerald-200/50 shadow-sm", 
  proposal: "bg-purple-50 text-purple-700 border border-purple-200/50 shadow-sm",
  won: "bg-emerald-50 text-emerald-700 border border-emerald-200/50 shadow-sm", 
  lost: "bg-red-50 text-red-700 border border-red-200/50 shadow-sm",
};

function uid() { return `l${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }
function aid() { return `a${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>(seedLeads);
  const [acts, setActs] = useState<CrmActivity[]>(seedActivities);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<SortSpec | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<string[]>([]);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<Lead | null>(null);
  const [showBulkStage, setShowBulkStage] = useState(false);
  const [bulkStage, setBulkStage] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { const t = setTimeout(() => setIsLoading(false), 600); return () => clearTimeout(t); }, []);

  const addActivity = useCallback((type: CrmActivity["type"], desc: string, entityId: string, old?: string, newVal?: string) => {
    const entry: CrmActivity = { id: aid(), type, actor: "Priya Sharma", actorInitials: "PS", description: desc, oldValue: old, newValue: newVal, entityId, entityType: "lead", createdAt: new Date().toISOString() };
    setActs((prev) => [entry, ...prev]);
  }, []);

  const filtered = useMemo(() => {
    let r = leads;
    if (search) { const q = search.toLowerCase(); r = r.filter((l) => `${l.firstName} ${l.lastName}`.toLowerCase().includes(q) || l.email.toLowerCase().includes(q) || l.company.toLowerCase().includes(q)); }
    if (stageFilter) r = r.filter((l) => l.stage === stageFilter);
    if (sourceFilter) r = r.filter((l) => l.source === sourceFilter);
    if (sort) { r = [...r].sort((a, b) => { const av = a[sort.field as keyof Lead] ?? ""; const bv = b[sort.field as keyof Lead] ?? ""; return sort.direction === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av)); }); }
    return r;
  }, [leads, search, stageFilter, sourceFilter, sort]);

  const paginated = useMemo(() => { const s = (page - 1) * pageSize; return filtered.slice(s, s + pageSize); }, [filtered, page, pageSize]);
  const pagination: PaginationMeta = useMemo(() => ({ page, pageSize, total: filtered.length, totalPages: Math.ceil(filtered.length / pageSize), hasNextPage: page < Math.ceil(filtered.length / pageSize), hasPreviousPage: page > 1 }), [page, pageSize, filtered.length]);

  const funnel = useMemo(() => {
    const sc: Record<string, number> = { new: 0, contacted: 0, qualified: 0, proposal: 0, won: 0 };
    leads.forEach((l) => { if (l.stage in sc) sc[l.stage] = (sc[l.stage] ?? 0) + 1; });
    const t = leads.length || 1;
    return [
      { label: "New", count: sc["new"] ?? 0, value: "", conversionRate: 100 },
      { label: "Contacted", count: sc["contacted"] ?? 0, value: "", conversionRate: Math.round(((sc["contacted"] ?? 0) / t) * 100) },
      { label: "Qualified", count: sc["qualified"] ?? 0, value: "", conversionRate: Math.round(((sc["qualified"] ?? 0) / t) * 100) },
      { label: "Proposal", count: sc["proposal"] ?? 0, value: "", conversionRate: Math.round(((sc["proposal"] ?? 0) / t) * 100) },
      { label: "Won", count: sc["won"] ?? 0, value: "", conversionRate: Math.round(((sc["won"] ?? 0) / t) * 100) },
    ];
  }, [leads]);

  const sourceDonut = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach((l) => { counts[l.source] = (counts[l.source] ?? 0) + 1; });
    const total = leads.length || 1;
    const colors: Record<string, string> = { website: "#2563EB", google: "#4285F4", facebook: "#0866FF", instagram: "#E1306C", linkedin: "#0A66C2", referral: "#8B5CF6", campaign: "#F59E0B", import: "#6B7280", manual: "#AAB5C6", other: "#D1D5DB" };
    return Object.entries(counts).map(([k, v]) => ({ key: k, label: SOURCE_LABELS[k as LeadSource] ?? k, value: Math.round((v / total) * 100), color: colors[k] ?? "#AAB5C6" }));
  }, [leads]);

  const trendSeries: TrendSeries[] = useMemo(() => {
    const byDate: Record<string, { created: number; won: number }> = {};
    leads.forEach((l) => { const d = l.createdAt.split("T")[0] ?? ""; if (!byDate[d]) byDate[d] = { created: 0, won: 0 }; byDate[d].created++; if (l.stage === "won") byDate[d].won++; });
    const pts = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b));
    return [
      { key: "created", label: "Created", color: "#EB0711", data: pts.map(([date, v]) => ({ date, value: v.created })) },
      { key: "won", label: "Won", color: "#078359", data: pts.map(([date, v]) => ({ date, value: v.won })) },
    ];
  }, [leads]);

  const handleSort = useCallback((field: string) => { setSort((p) => p?.field === field ? (p.direction === "asc" ? { field, direction: "desc" } : null) : { field, direction: "asc" }); }, []);

  const handleStageChange = (leadId: string, newStage: LeadStage) => {
    const lead = leads.find((l) => l.id === leadId);
    setLeads((p) => p.map((l) => l.id === leadId ? { ...l, stage: newStage } : l));
    if (lead) addActivity("stage_changed", `Stage changed to ${STAGE_LABELS[newStage]}`, leadId, STAGE_LABELS[lead.stage], STAGE_LABELS[newStage]);
    toast.success(`Lead stage changed to ${STAGE_LABELS[newStage]}`);
  };

  const handleDelete = (id: string) => { setLeads((p) => p.filter((l) => l.id !== id)); toast.success("Lead deleted"); setDetailLead(null); setDeleteTarget(null); };
  const handleBulkDelete = () => { setLeads((p) => p.filter((l) => !selected.includes(l.id))); toast.success(`${selected.length} leads deleted`); setSelected([]); setBulkDeleteOpen(false); };
  const handleBulkStageChange = () => { if (!bulkStage) return; setLeads((p) => p.map((l) => selected.includes(l.id) ? { ...l, stage: bulkStage as LeadStage } : l)); toast.success(`${selected.length} leads moved to ${STAGE_LABELS[bulkStage as LeadStage]}`); setSelected([]); setShowBulkStage(false); setBulkStage(""); };

  const handleCreateLead = (form: Record<string, string>) => {
    const newLead: Lead = {
      id: uid(), firstName: form.firstName || "New", lastName: form.lastName || "Lead", email: form.email || "", phone: form.phone || "",
      company: form.company || "", jobTitle: form.jobTitle || "", industry: "", website: "", location: "",
      streetAddress: form.streetAddress || "", city: form.city || "", state: form.state || "", zipCode: form.zipCode || "", country: form.country || "",
      source: (form.source as LeadSource) || "manual", campaign: form.campaign || "", stage: (form.stage as LeadStage) || "new",
      leadScore: 50, scoreClassification: "warm", priority: "medium", ownerId: "u1", ownerName: "Priya Sharma",
      estimatedDealValue: Number(form.dealValue) || 0, probability: 30, expectedCloseDate: form.closeDate || "",
      tags: [], notes: form.notes || "", nextFollowUp: "", lastContacted: "", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    setLeads((p) => [newLead, ...p]);
    addActivity("lead_created", `Created lead ${newLead.firstName} ${newLead.lastName}`, newLead.id);
    toast.success("Lead created successfully");
    setShowCreate(false);
  };

  const handleEditLead = (form: Record<string, string>) => {
    if (!showEdit) return;
    setLeads((p) => p.map((l) => l.id === showEdit.id ? { ...l, firstName: form.firstName || l.firstName, lastName: form.lastName || l.lastName, email: form.email || l.email, phone: form.phone || l.phone, company: form.company || l.company, jobTitle: form.jobTitle || l.jobTitle, streetAddress: form.streetAddress ?? l.streetAddress, city: form.city ?? l.city, state: form.state ?? l.state, zipCode: form.zipCode ?? l.zipCode, country: form.country ?? l.country, source: (form.source as LeadSource) || l.source, stage: (form.stage as LeadStage) || l.stage, notes: form.notes ?? l.notes, updatedAt: new Date().toISOString() } : l));
    toast.success("Lead updated");
    setShowEdit(null);
    setDetailLead(null);
  };

  const handleExport = () => {
    const rows = selected.length > 0 ? leads.filter((l) => selected.includes(l.id)) : filtered;
    if (rows.length === 0) {
      toast.error("Nothing to export");
      return;
    }
    exportLeadsCsv(rows, selected.length > 0 ? "leads-selected.csv" : "leads.csv");
    toast.success(`Exported ${rows.length} lead${rows.length === 1 ? "" : "s"}`);
  };

  const handleImport = (rows: Record<string, string>[]) => {
    const imported: Lead[] = rows.map((r, index) => ({
      id: `l${Date.now()}_${index}`,
      firstName: r.firstname || "Imported",
      lastName: r.lastname || "Lead",
      email: r.email || "",
      phone: r.phone || "",
      company: r.company || "",
      jobTitle: r.jobtitle || "",
      industry: r.industry || "",
      website: "",
      location: r.location || "",
      streetAddress: "",
      city: r.city || "",
      state: r.state || "",
      zipCode: "",
      country: r.country || "",
      source: (SOURCE_OPTIONS as readonly string[]).includes(r.source ?? "") ? (r.source as LeadSource) : "import",
      campaign: "",
      stage: (STAGE_OPTIONS as readonly string[]).includes(r.stage ?? "") ? (r.stage as LeadStage) : "new",
      leadScore: 50,
      scoreClassification: "warm",
      priority: "medium",
      ownerId: "u1",
      ownerName: r.ownername || "Priya Sharma",
      estimatedDealValue: Number(r.estimateddealvalue) || 0,
      probability: 30,
      expectedCloseDate: "",
      tags: listValues(r.tags || ""),
      notes: r.notes || "",
      nextFollowUp: r.nextfollowup || "",
      lastContacted: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    setLeads((p) => [...imported, ...p]);
    imported.forEach((l) => addActivity("lead_created", `Imported lead ${l.firstName} ${l.lastName}`, l.id));
    toast.success(`Imported ${imported.length} lead${imported.length === 1 ? "" : "s"}`);
  };

  const columns: DataTableColumn<Lead>[] = useMemo(() => [
    { id: "lead", header: "Lead", cell: (row) => (<div className="flex items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-blue-100 text-[13px] font-bold text-indigo-700 shadow-sm border border-indigo-100/50">{row.firstName[0]}{row.lastName[0]}</span><div className="min-w-0"><p className="text-[13px] font-semibold text-slate-800 truncate">{row.firstName} {row.lastName}</p><p className="text-[12px] text-slate-500 truncate">{row.email}</p></div></div>), sortField: "lastName", width: "min-w-[180px]" },
    { id: "company", header: "Company", cell: (row) => (<div><p className="text-[12px] text-[#354568]">{row.company}</p><p className="text-[12px] text-[#75829D]">{row.industry}</p></div>), hideBelow: "lg" },
    { id: "phone", header: "Phone", cell: (row) => <span className="text-[12px] text-[#354568]">{row.phone}</span>, hideBelow: "xl" },
    { id: "source", header: "Source", cell: (row) => <span className="text-[12px] text-[#354568]">{SOURCE_LABELS[row.source]}</span>, sortField: "source", hideBelow: "lg" },
    { id: "stage", header: "Stage", cell: (row) => (<span className={`inline-block w-[90px] text-center rounded-lg px-2 py-0.5 text-[12px] font-medium tracking-wide ${STAGE_BADGE[row.stage]}`}>{STAGE_LABELS[row.stage]}</span>), sortField: "stage" },
    { id: "score", header: "Score", cell: (row) => <span className={`text-[12px] font-semibold ${row.leadScore >= 70 ? "text-[#078359]" : row.leadScore >= 40 ? "text-[#92700C]" : "text-[#75829D]"}`}>{row.leadScore}</span>, sortField: "leadScore", hideBelow: "md" },
    { id: "assignee", header: "Assignee", cell: (row) => <span className="text-[12px] text-[#354568]">{row.ownerName}</span>, sortField: "ownerName", hideBelow: "lg" },
    { id: "lastContacted", header: "Last Contact", cell: (row) => <span className="text-[12px] text-[#75829D]">{row.lastContacted ? new Date(row.lastContacted).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</span>, sortField: "lastContacted", hideBelow: "xl" },
    { id: "actions", header: "", cell: (row) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}><Button variant="ghost" size="icon-sm"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={() => setDetailLead(row)}><Eye /> View</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowEdit(row)}><Pencil /> Edit</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => { toast.success("Lead assigned"); }}><UserPlus /> Assign</DropdownMenuItem>
          <DropdownMenuItem onClick={() => { const next: Record<LeadStage, LeadStage> = { new: "contacted", contacted: "qualified", qualified: "proposal", proposal: "won", won: "won", lost: "lost" }; handleStageChange(row.id, next[row.stage]); }}><ArrowRightLeft /> Advance Stage</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(row)}><Trash2 /> Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ), width: "w-10" },
  ], [leads]);

  const selection: DataTableSelection = { selectedIds: selected, onChange: setSelected };

  return (
    <div className="space-y-4">
      <AdminPageTitle eyebrow="CRM / Leads" title="Leads" description="Manage, qualify, assign and convert your sales leads."
        action={<div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)}><Upload className="size-3.5" /> Import</Button>
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="size-3.5" /> Export</Button>
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="size-3.5" /> Create Lead</Button>
        </div>}
      />

      <LeadMetricCards leads={leads} />

      <FilterBar
        search={<SearchInput value={search} onChange={setSearch} placeholder="Search leads..." />}
        filters={<div className="flex items-center gap-2">
          <Select value={stageFilter ?? "__all__"} onValueChange={(v) => setStageFilter(v === "__all__" ? null : v)}>
            <SelectTrigger size="sm" className="w-auto min-w-[8rem]"><SelectValue placeholder="Stage" /></SelectTrigger>
            <SelectContent><SelectItem value="__all__">All Stages</SelectItem>{STAGE_OPTIONS.map((s) => <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={sourceFilter ?? "__all__"} onValueChange={(v) => setSourceFilter(v === "__all__" ? null : v)}>
            <SelectTrigger size="sm" className="w-auto min-w-[8rem]"><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent><SelectItem value="__all__">All Sources</SelectItem>{SOURCE_OPTIONS.map((s) => <SelectItem key={s} value={s}>{SOURCE_LABELS[s]}</SelectItem>)}</SelectContent>
          </Select>
        </div>}
        actions={selected.length > 0 ? (<div className="flex items-center gap-2">
          <span className="text-[12px] text-[#75829D]">{selected.length} selected</span>
          <Button variant="outline" size="sm" onClick={() => setShowBulkStage(true)}>Change Stage</Button>
          <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}>Delete</Button>
        </div>) : undefined}
        activeFilterCount={(stageFilter ? 1 : 0) + (sourceFilter ? 1 : 0)}
        onClearFilters={() => { setStageFilter(null); setSourceFilter(null); setSearch(""); }}
      />

      <DataTable columns={columns} rows={paginated} getRowId={(r) => r.id} isLoading={isLoading} sort={sort} onToggleSort={handleSort} pagination={pagination} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} selection={selection} onRowClick={(r) => setDetailLead(r)} enableColumnVisibility
        emptyState={<EmptyState icon={Users} title="No leads found" description="Create your first lead or adjust filters." action={<Button size="sm" onClick={() => setShowCreate(true)}><Plus className="size-3.5" /> Create Lead</Button>} />}
      />

      <div className="grid gap-4 lg:grid-cols-3 mt-4">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-300">
          <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-3">
            <h2 className="text-[13px] font-semibold text-slate-800">Leads Over Time</h2>
          </div>
          <div className="p-4">
            {trendSeries[0]?.data.length > 0 ? <><TrendAreaChart series={trendSeries} height={180} /><div className="mt-2"><ChartLegend series={trendSeries} /></div></> : <p className="text-[13px] text-slate-500 py-8 text-center">No data yet</p>}
          </div>
        </section>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-300">
          <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-3">
            <h2 className="text-[13px] font-semibold text-slate-800">Source Distribution</h2>
          </div>
          <div className="flex items-center gap-4 p-4">
            <DonutChart segments={sourceDonut} centerValue={String(leads.length)} centerLabel="Total Leads" size={150} />
            <ul className="min-w-0 flex-1 space-y-0">{sourceDonut.map((src) => (<li key={src.key} className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-slate-50 transition-colors"><span className="size-2 shrink-0 rounded-full shadow-sm" style={{ backgroundColor: src.color }} /><span className="min-w-0 flex-1 truncate text-[13px] text-slate-600 font-medium">{src.label}</span><span className="text-[13px] font-bold text-slate-800">{src.value}%</span></li>))}</ul>
          </div>
        </section>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-300">
          <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-3">
            <h2 className="text-[13px] font-semibold text-slate-800">Lead Funnel</h2>
          </div>
          <div className="p-5"><FunnelChart stages={funnel} /></div>
        </section>
      </div>

      {/* ---- Detail Sheet ---- */}
      <Sheet open={!!detailLead} onOpenChange={() => setDetailLead(null)}>
        <SheetContent side="right" className="w-full max-w-lg">
          <SheetHeader><SheetTitle>{detailLead ? `${detailLead.firstName} ${detailLead.lastName}` : ""}</SheetTitle></SheetHeader>
          <SheetBody>{detailLead && (<Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="activity">Activity</TabsTrigger></TabsList>
            <TabsContent value="overview" className="space-y-3 mt-3">
              <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <span className={`inline-block text-center rounded-lg px-2.5 py-1 text-[13px] font-medium tracking-wide ${STAGE_BADGE[detailLead.stage]}`}>{STAGE_LABELS[detailLead.stage]}</span>
                <div className="h-6 w-px bg-slate-200"></div>
                <span className="text-[13px] font-medium text-slate-600">Score: <span className="font-bold text-slate-800">{detailLead.leadScore}</span></span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-[14px] font-semibold text-slate-800 mb-3 flex items-center gap-2"><UserPlus className="size-4 text-indigo-500" /> Contact Information</h3>
                <div className="grid grid-cols-2 gap-4 text-[13px]">
                  <div><span className="block text-slate-500 text-[11px] uppercase tracking-wider mb-0.5">Email</span> <span className="text-slate-800 font-medium">{detailLead.email}</span></div>
                  <div><span className="block text-slate-500 text-[11px] uppercase tracking-wider mb-0.5">Phone</span> <span className="text-slate-800 font-medium">{detailLead.phone}</span></div>
                  <div><span className="block text-slate-500 text-[11px] uppercase tracking-wider mb-0.5">Company</span> <span className="text-slate-800 font-medium">{detailLead.company}</span></div>
                  <div><span className="block text-slate-500 text-[11px] uppercase tracking-wider mb-0.5">Title</span> <span className="text-slate-800 font-medium">{detailLead.jobTitle}</span></div>
                  <div><span className="block text-slate-500 text-[11px] uppercase tracking-wider mb-0.5">Location</span> <span className="text-slate-800 font-medium">{detailLead.location}</span></div>
                  <div><span className="block text-slate-500 text-[11px] uppercase tracking-wider mb-0.5">Source</span> <span className="text-slate-800 font-medium">{SOURCE_LABELS[detailLead.source]}</span></div>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-[14px] font-semibold text-slate-800 mb-3 flex items-center gap-2"><Target className="size-4 text-emerald-500" /> Lead Details</h3>
                <div className="grid grid-cols-2 gap-4 text-[13px]">
                  <div><span className="block text-slate-500 text-[11px] uppercase tracking-wider mb-0.5">Owner</span> <span className="text-slate-800 font-medium">{detailLead.ownerName}</span></div>
                  <div><span className="block text-slate-500 text-[11px] uppercase tracking-wider mb-0.5">Priority</span> <span className="text-slate-800 font-medium">{detailLead.priority}</span></div>
                  <div><span className="block text-slate-500 text-[11px] uppercase tracking-wider mb-0.5">Deal Value</span> <span className="text-emerald-600 font-bold">₹{detailLead.estimatedDealValue.toLocaleString()}</span></div>
                  <div><span className="block text-slate-500 text-[11px] uppercase tracking-wider mb-0.5">Probability</span> <span className="text-slate-800 font-medium">{detailLead.probability}%</span></div>
                  <div><span className="block text-slate-500 text-[11px] uppercase tracking-wider mb-0.5">Next Follow-up</span> <span className="text-slate-800 font-medium">{detailLead.nextFollowUp || "—"}</span></div>
                  <div><span className="block text-slate-500 text-[11px] uppercase tracking-wider mb-0.5">Created</span> <span className="text-slate-800 font-medium">{new Date(detailLead.createdAt).toLocaleDateString()}</span></div>
                </div>
              </div>
              {detailLead.tags.length > 0 && <div className="flex flex-wrap gap-2 pt-1">{detailLead.tags.map((t) => <Badge key={t} tone="info" className="rounded-md font-medium">{t}</Badge>)}</div>}
              {detailLead.notes && <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4"><h3 className="text-[13px] font-semibold text-slate-800 mb-2">Notes</h3><p className="text-[13px] text-slate-600 leading-relaxed">{detailLead.notes}</p></div>}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setShowEdit(detailLead); setDetailLead(null); }}>Edit</Button>
                <Button size="sm" variant="outline" onClick={() => handleStageChange(detailLead.id, detailLead.stage === "new" ? "contacted" : detailLead.stage === "contacted" ? "qualified" : detailLead.stage === "qualified" ? "proposal" : "won")}>Advance Stage</Button>
                <Button size="sm" onClick={() => { toast.info("Task created for this lead"); }}>Add Task</Button>
              </div>
            </TabsContent>
            <TabsContent value="activity" className="mt-3">
              <ActivityTimeline entries={acts.filter((a) => a.entityId === detailLead.id).map((a) => ({ id: a.id, actor: a.actor, action: a.description, target: "", createdAt: a.createdAt }))} />
            </TabsContent>
          </Tabs>)}</SheetBody>
        </SheetContent>
      </Sheet>

      {/* ---- Import Leads ---- */}
      <CrmImportDialog
        open={showImport}
        onClose={() => setShowImport(false)}
        entityLabel="leads"
        requiredColumns={["firstname", "lastname", "email"]}
        validate={(values) => {
          const errors: string[] = [];
          if (values.source && !(SOURCE_OPTIONS as readonly string[]).includes(values.source)) {
            errors.push(`Unknown source "${values.source}"`);
          }
          if (values.stage && !(STAGE_OPTIONS as readonly string[]).includes(values.stage)) {
            errors.push(`Unknown stage "${values.stage}"`);
          }
          return errors;
        }}
        columnsHint="Required: firstName, lastName, email. Optional: phone, company, jobTitle, industry, source, stage, ownerName, estimatedDealValue, tags, location, city, state, country, notes, nextFollowUp. Separate tags with ;"
        sample={"firstName,lastName,email,phone,company,jobTitle,source,stage\nJohn,Doe,john@example.com,+91 90000 00000,Acme Corp,Manager,website,new"}
        onImport={handleImport}
      />

      {/* ---- Create Lead ---- */}
      <LeadFormModal open={showCreate} onOpenChange={setShowCreate} onSubmit={handleCreateLead} title="Create Lead" submitLabel="Save Lead" />

      {/* ---- Edit Lead ---- */}
      <LeadFormModal open={!!showEdit} onOpenChange={(v) => { if (!v) setShowEdit(null); }} onSubmit={handleEditLead} title="Edit Lead" submitLabel="Update Lead" initial={showEdit ? { firstName: showEdit.firstName, lastName: showEdit.lastName, email: showEdit.email, phone: showEdit.phone, company: showEdit.company, jobTitle: showEdit.jobTitle, source: showEdit.source, stage: showEdit.stage, notes: showEdit.notes } : undefined} />

      {/* ---- Bulk Stage ---- */}
      <Dialog open={showBulkStage} onOpenChange={setShowBulkStage}>
        <DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Change Stage</DialogTitle><DialogDescription>Move {selected.length} leads to a new stage.</DialogDescription></DialogHeader>
          <Select value={bulkStage} onValueChange={setBulkStage}><SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger><SelectContent>{STAGE_OPTIONS.map((s) => <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>)}</SelectContent></Select>
          <DialogFooter><Button variant="outline" onClick={() => setShowBulkStage(false)}>Cancel</Button><Button onClick={handleBulkStageChange} disabled={!bulkStage}>Apply</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Delete Confirmation ---- */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Lead?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. &quot;{deleteTarget?.firstName} {deleteTarget?.lastName}&quot; will be permanently removed.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={() => deleteTarget && handleDelete(deleteTarget.id)}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ---- Bulk Delete Confirmation ---- */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {selected.length} Leads?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. {selected.length} leads will be permanently removed.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={handleBulkDelete}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ---- Reusable Lead Form ---- */
function LeadFormModal({ open, onOpenChange, onSubmit, title, submitLabel, initial }: { open: boolean; onOpenChange: (v: boolean) => void; onSubmit: (form: Record<string, string>) => void; title: string; submitLabel: string; initial?: Record<string, string> }) {
  const [form, setForm] = useState<Record<string, string>>(initial ?? {});
  useEffect(() => { if (initial) setForm(initial); else setForm({}); }, [initial, open]);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const sets = (k: string) => (v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b border-slate-100">
          <DialogTitle className="text-xl font-semibold text-slate-800">{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4"><Input placeholder="First Name" value={form.firstName ?? ""} onChange={set("firstName")} className="h-10 rounded-lg" /><Input placeholder="Last Name" value={form.lastName ?? ""} onChange={set("lastName")} className="h-10 rounded-lg" /></div>
          <Input placeholder="Email" type="email" value={form.email ?? ""} onChange={set("email")} className="h-10 rounded-lg" />
          <Input placeholder="Phone" value={form.phone ?? ""} onChange={set("phone")} className="h-10 rounded-lg" />
          <div className="grid grid-cols-2 gap-4"><Input placeholder="Company" value={form.company ?? ""} onChange={set("company")} className="h-10 rounded-lg" /><Input placeholder="Job Title" value={form.jobTitle ?? ""} onChange={set("jobTitle")} className="h-10 rounded-lg" /></div>
          <Input placeholder="Street Address" value={form.streetAddress ?? ""} onChange={set("streetAddress")} className="h-10 rounded-lg" />
          <div className="grid grid-cols-2 gap-4"><Input placeholder="City" value={form.city ?? ""} onChange={set("city")} className="h-10 rounded-lg" /><Input placeholder="State" value={form.state ?? ""} onChange={set("state")} className="h-10 rounded-lg" /></div>
          <div className="grid grid-cols-2 gap-4"><Input placeholder="Zip Code" value={form.zipCode ?? ""} onChange={set("zipCode")} className="h-10 rounded-lg" /><Input placeholder="Country" value={form.country ?? ""} onChange={set("country")} className="h-10 rounded-lg" /></div>
          <div className="grid grid-cols-2 gap-4">
            <Select value={form.source ?? ""} onValueChange={sets("source")}><SelectTrigger className="h-10 rounded-lg"><SelectValue placeholder="Source" /></SelectTrigger><SelectContent>{SOURCE_OPTIONS.map((s) => <SelectItem key={s} value={s}>{SOURCE_LABELS[s]}</SelectItem>)}</SelectContent></Select>
            <Select value={form.stage ?? ""} onValueChange={sets("stage")}><SelectTrigger className="h-10 rounded-lg"><SelectValue placeholder="Stage" /></SelectTrigger><SelectContent>{STAGE_OPTIONS.map((s) => <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>)}</SelectContent></Select>
          </div>
          <Textarea placeholder="Notes" rows={3} value={form.notes ?? ""} onChange={set("notes")} className="rounded-lg resize-none" />
        </div>
        <DialogFooter className="pt-4 border-t border-slate-100">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-lg">Cancel</Button>
          <Button onClick={() => onSubmit(form)} className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white">{submitLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
