"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Plus, Download, Upload, Eye, Pencil, Trash2, MoreHorizontal,
  UserPlus, ArrowRightLeft, Users, Target, MapPin, Loader2, CheckCircle2, Link2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { useAuth } from "@/features/auth/components/auth-provider";
import { isMockMode } from "@/config/env";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { teamApi } from "@/features/admin/team/live/team-api";
import type { DataTableColumn, DataTableSelection } from "@/components/shared/data-table/types";
import type { PaginationMeta, SortSpec } from "@/types/api";
import type { TrendSeries } from "@/components/shared/charts/trend-area-chart";
import { LeadMetricCards } from "./components/crm-metric-cards";
import { FunnelChart } from "./components/crm-funnel-chart";
import { CrmImportDialog } from "./components/crm-import-dialog";
import { leads as seedLeads, activities as seedActivities, teamMembers } from "./data/crm-data";
import { exportLeadsCsv, listValues } from "./lib/csv";
import type { Lead, LeadStage, LeadSource, CrmActivity, CrmTask, TaskPriority, Contact, Deal, Pipeline } from "./types";
import { crmApi, type CrmScope } from "./data/crm-api";
import Link from "next/link";
import { ConvertLeadDialog, type ConvertLeadValues } from "./components/convert-lead-dialog";
import { newId, resolvePipelines, normalizeContact, normalizeDeal, normalizePipeline } from "./lib/crm-records";
import { crmLink, useOpenParam } from "./lib/use-open-param";
import { PHONE_ERROR, isValidOptionalPhone, parsePhone, phoneInputProps, sanitizePhone } from "@/lib/utils/phone";

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

function normalizeLead(lead: Partial<Lead>): Lead {
  const now = new Date().toISOString();
  const score = Number(lead.leadScore);
  const dealValue = Number(lead.estimatedDealValue);
  const probability = Number(lead.probability);
  return {
    id: String(lead.id ?? ""), firstName: String(lead.firstName ?? ""), lastName: String(lead.lastName ?? ""),
    email: String(lead.email ?? ""), phone: String(lead.phone ?? ""), alternatePhone: lead.alternatePhone,
    company: String(lead.company ?? ""), jobTitle: String(lead.jobTitle ?? ""), industry: String(lead.industry ?? ""),
    website: String(lead.website ?? ""), location: String(lead.location ?? ""), streetAddress: String(lead.streetAddress ?? ""),
    city: String(lead.city ?? ""), state: String(lead.state ?? ""), zipCode: String(lead.zipCode ?? ""), country: String(lead.country ?? ""),
    source: SOURCE_OPTIONS.includes(lead.source as LeadSource) ? lead.source as LeadSource : "manual",
    campaign: String(lead.campaign ?? ""),
    stage: STAGE_OPTIONS.includes(lead.stage as LeadStage) ? lead.stage as LeadStage : "new",
    leadScore: Number.isFinite(score) ? score : 50,
    scoreClassification: ["cold", "warm", "hot"].includes(String(lead.scoreClassification)) ? lead.scoreClassification! : "warm",
    priority: ["low", "medium", "high"].includes(String(lead.priority)) ? lead.priority! : "medium",
    ownerId: String(lead.ownerId ?? ""), ownerName: String(lead.ownerName ?? "Unassigned"),
    estimatedDealValue: Number.isFinite(dealValue) ? dealValue : 0,
    probability: Number.isFinite(probability) ? probability : 30,
    expectedCloseDate: String(lead.expectedCloseDate ?? ""), tags: Array.isArray(lead.tags) ? lead.tags.map(String) : [],
    notes: String(lead.notes ?? ""), nextFollowUp: String(lead.nextFollowUp ?? ""), lastContacted: String(lead.lastContacted ?? ""),
    convertedContactId: lead.convertedContactId ? String(lead.convertedContactId) : undefined,
    convertedDealId: lead.convertedDealId ? String(lead.convertedDealId) : undefined,
    createdAt: String(lead.createdAt ?? now), updatedAt: String(lead.updatedAt ?? now),
  };
}

function normalizeActivity(activity: Partial<CrmActivity>): CrmActivity {
  return {
    id: String(activity.id ?? ""), type: activity.type ?? "note_added", actor: String(activity.actor ?? "Current user"),
    actorInitials: String(activity.actorInitials ?? "CU"), description: String(activity.description ?? "Activity recorded"),
    oldValue: activity.oldValue, newValue: activity.newValue, entityId: String(activity.entityId ?? ""),
    entityType: activity.entityType ?? "lead", createdAt: String(activity.createdAt ?? new Date().toISOString()),
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The request could not be completed.";
}

function leadFormValues(lead: Lead): Record<string, string> {
  return {
    firstName: lead.firstName, lastName: lead.lastName, email: lead.email, phone: sanitizePhone(lead.phone),
    alternatePhone: sanitizePhone(lead.alternatePhone), company: lead.company, jobTitle: lead.jobTitle, industry: lead.industry,
    website: lead.website, location: lead.location, streetAddress: lead.streetAddress, city: lead.city, state: lead.state,
    zipCode: lead.zipCode, country: lead.country, source: lead.source, campaign: lead.campaign, stage: lead.stage,
    leadScore: String(lead.leadScore), scoreClassification: lead.scoreClassification, priority: lead.priority,
    ownerId: lead.ownerId, estimatedDealValue: String(lead.estimatedDealValue), probability: String(lead.probability),
    expectedCloseDate: lead.expectedCloseDate.slice(0, 10), tags: lead.tags.join("; "), notes: lead.notes,
    nextFollowUp: lead.nextFollowUp.slice(0, 16), lastContacted: lead.lastContacted.slice(0, 16),
  };
}

export default function LeadsPage() {
  const { user } = useAuth();
  const { companyId, clientId, isReady } = useTenancyContext();
  const scope = useMemo<CrmScope | null>(() => companyId && clientId ? { companyId, clientId } : null, [companyId, clientId]);
  const [leads, setLeads] = useState<Lead[]>(isMockMode ? seedLeads : []);
  const [acts, setActs] = useState<CrmActivity[]>(isMockMode ? seedActivities : []);
  const [assignees, setAssignees] = useState<Array<{ id: string; name: string }>>(() => isMockMode ? teamMembers.map((member) => ({ id: member.id, name: member.name })) : []);
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
  const [isLoading, setIsLoading] = useState(!isMockMode);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [assignTarget, setAssignTarget] = useState<Lead | null>(null);
  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const [taskTarget, setTaskTarget] = useState<Lead | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("medium");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [customPipelines, setCustomPipelines] = useState<Pipeline[]>([]);
  const [convertTarget, setConvertTarget] = useState<Lead | null>(null);
  const [convertKey, setConvertKey] = useState(0);

  const loadLeads = useCallback(async () => {
    if (isMockMode) { setIsLoading(false); return; }
    if (!isReady || !scope) {
      if (isReady) { setLoadError(new Error("Select a Client to view CRM leads.")); setIsLoading(false); }
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      const [leadRows, activityRows, memberRows] = await Promise.all([
        crmApi.list<Lead>("lead", scope), crmApi.list<CrmActivity>("activity", scope),
        teamApi.listMembers(scope.companyId).catch(() => []),
      ]);
      setLeads(leadRows.map(normalizeLead));
      setActs(activityRows.map(normalizeActivity));
      const activeMembers = memberRows.filter((member) => !member.suspendedAt).map((member) => ({ id: member.user.id, name: member.user.name?.trim() || member.user.email }));
      if (activeMembers.length) setAssignees(activeMembers);
      setSelected([]);
    } catch (error) { setLoadError(error); }
    finally { setIsLoading(false); }
  }, [isReady, scope]);

  useEffect(() => { const timer = window.setTimeout(() => void loadLeads(), 0); return () => window.clearTimeout(timer); }, [loadLeads]);

  useEffect(() => {
    if (isMockMode || !scope) return;
    let cancelled = false;
    void Promise.allSettled([crmApi.list<Contact>("contact", scope), crmApi.list<Pipeline>("pipeline", scope)]).then(([contactRows, pipelineRows]) => {
      if (cancelled) return;
      if (contactRows.status === "fulfilled") setContacts(contactRows.value.map(normalizeContact));
      if (pipelineRows.status === "fulfilled") setCustomPipelines(pipelineRows.value.map(normalizePipeline));
    });
    return () => { cancelled = true; };
  }, [scope]);

  const addActivity = useCallback(async (type: CrmActivity["type"], desc: string, entityId: string, old?: string, newVal?: string) => {
    const actor = user?.name?.trim() || user?.email || "Current user";
    const entry = normalizeActivity({ id: aid(), type, actor, actorInitials: actor.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(), description: desc, oldValue: old, newValue: newVal, entityId, entityType: "lead", createdAt: new Date().toISOString() });
    try {
      const saved = isMockMode ? entry : normalizeActivity(await crmApi.create("activity", entry, scope ?? undefined));
      setActs((prev) => [saved, ...prev]);
    } catch { /* The primary lead action already succeeded; activity logging is best-effort. */ }
  }, [scope, user]);

  const filtered = useMemo(() => {
    let r = leads;
    if (search) { const q = search.toLowerCase(); r = r.filter((l) => `${l.firstName} ${l.lastName}`.toLowerCase().includes(q) || l.email.toLowerCase().includes(q) || l.company.toLowerCase().includes(q)); }
    if (stageFilter) r = r.filter((l) => l.stage === stageFilter);
    if (sourceFilter) r = r.filter((l) => l.source === sourceFilter);
    if (sort) { r = [...r].sort((a, b) => { const av = a[sort.field as keyof Lead] ?? ""; const bv = b[sort.field as keyof Lead] ?? ""; const comparison = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv)); return sort.direction === "asc" ? comparison : -comparison; }); }
    return r;
  }, [leads, search, stageFilter, sourceFilter, sort]);

  useOpenParam(!isLoading && isReady, useCallback((id: string) => {
    const lead = leads.find((l) => l.id === id);
    if (lead) setDetailLead(lead);
  }, [leads]));

  const totalPages = Math.ceil(filtered.length / pageSize);
  const currentPage = Math.min(page, Math.max(1, totalPages));
  const paginated = useMemo(() => { const s = (currentPage - 1) * pageSize; return filtered.slice(s, s + pageSize); }, [filtered, currentPage, pageSize]);
  const pagination: PaginationMeta = useMemo(() => ({ page: currentPage, pageSize, total: filtered.length, totalPages, hasNextPage: currentPage < totalPages, hasPreviousPage: currentPage > 1 }), [currentPage, pageSize, filtered.length, totalPages]);

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

  const handleStageChange = async (leadId: string, newStage: LeadStage) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.stage === newStage || isSaving) return;
    const updated = normalizeLead({ ...lead, stage: newStage, updatedAt: new Date().toISOString() });
    setIsSaving(true);
    try {
      const saved = isMockMode ? updated : normalizeLead(await crmApi.update("lead", leadId, updated, scope ?? undefined));
      setLeads((rows) => rows.map((row) => row.id === leadId ? saved : row));
      setDetailLead((current) => current?.id === leadId ? saved : current);
      void addActivity("stage_changed", `Stage changed to ${STAGE_LABELS[newStage]}`, leadId, STAGE_LABELS[lead.stage], STAGE_LABELS[newStage]);
      toast.success(`Lead stage changed to ${STAGE_LABELS[newStage]}`);
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      if (!isMockMode) await crmApi.remove("lead", id, scope ?? undefined);
      setLeads((rows) => rows.filter((lead) => lead.id !== id));
      setSelected((ids) => ids.filter((selectedId) => selectedId !== id));
      toast.success("Lead deleted"); setDetailLead(null); setDeleteTarget(null);
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setIsSaving(false); }
  };

  const handleBulkDelete = async () => {
    if (!selected.length || isSaving) return;
    setIsSaving(true);
    const ids = [...selected];
    const results = await Promise.allSettled(ids.map((id) => isMockMode ? Promise.resolve() : crmApi.remove("lead", id, scope ?? undefined)));
    const removed = ids.filter((_, index) => results[index]?.status === "fulfilled");
    setLeads((rows) => rows.filter((lead) => !removed.includes(lead.id)));
    setSelected(ids.filter((id) => !removed.includes(id)));
    if (removed.length) toast.success(`${removed.length} lead${removed.length === 1 ? "" : "s"} deleted`);
    if (removed.length !== ids.length) toast.error(`${ids.length - removed.length} lead${ids.length - removed.length === 1 ? "" : "s"} could not be deleted`);
    setBulkDeleteOpen(false); setIsSaving(false);
  };

  const handleBulkStageChange = async () => {
    if (!bulkStage || !selected.length || isSaving) return;
    setIsSaving(true);
    const stage = bulkStage as LeadStage;
    const targets = leads.filter((lead) => selected.includes(lead.id));
    const results = await Promise.allSettled(targets.map((lead) => {
      const updated = normalizeLead({ ...lead, stage, updatedAt: new Date().toISOString() });
      return isMockMode ? Promise.resolve(updated) : crmApi.update("lead", lead.id, updated, scope ?? undefined).then(normalizeLead);
    }));
    const saved = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
    const savedMap = new Map(saved.map((lead) => [lead.id, lead]));
    setLeads((rows) => rows.map((lead) => savedMap.get(lead.id) ?? lead));
    saved.forEach((lead) => void addActivity("stage_changed", `Stage changed to ${STAGE_LABELS[stage]}`, lead.id, undefined, STAGE_LABELS[stage]));
    if (saved.length) toast.success(`${saved.length} lead${saved.length === 1 ? "" : "s"} moved to ${STAGE_LABELS[stage]}`);
    if (saved.length !== targets.length) toast.error(`${targets.length - saved.length} lead${targets.length - saved.length === 1 ? "" : "s"} could not be updated`);
    setSelected(targets.filter((lead) => !savedMap.has(lead.id)).map((lead) => lead.id));
    setShowBulkStage(false); setBulkStage(""); setIsSaving(false);
  };

  const handleCreateLead = async (form: Record<string, string>) => {
    if (!form.firstName?.trim() || !form.lastName?.trim() || !form.email?.trim()) { toast.error("First name, last name and email are required"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) { toast.error("Enter a valid email address"); return; }
    if (!isValidOptionalPhone(form.phone) || !isValidOptionalPhone(form.alternatePhone)) { toast.error(PHONE_ERROR); return; }
    const leadScore = Number(form.leadScore);
    const probability = Number(form.probability);
    if (!Number.isFinite(leadScore) || leadScore < 0 || leadScore > 100) { toast.error("Lead score must be between 0 and 100"); return; }
    if (!Number.isFinite(probability) || probability < 0 || probability > 100) { toast.error("Probability must be between 0 and 100"); return; }
    if (isSaving) return;
    const selectedOwner = assignees.find((member) => member.id === form.ownerId) ?? assignees[0];
    const newLead = normalizeLead({
      id: uid(), firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim(), phone: form.phone || "", alternatePhone: form.alternatePhone || "",
      company: form.company || "", jobTitle: form.jobTitle || "", industry: form.industry || "", website: form.website || "", location: form.location || "",
      streetAddress: form.streetAddress || "", city: form.city || "", state: form.state || "", zipCode: form.zipCode || "", country: form.country || "",
      source: (form.source as LeadSource) || "manual", campaign: form.campaign || "", stage: (form.stage as LeadStage) || "new",
      leadScore, scoreClassification: (form.scoreClassification as Lead["scoreClassification"]) || "warm",
      priority: (form.priority as Lead["priority"]) || "medium", ownerId: selectedOwner?.id ?? "", ownerName: selectedOwner?.name ?? "Unassigned",
      estimatedDealValue: Number(form.estimatedDealValue) || 0, probability, expectedCloseDate: form.expectedCloseDate || "",
      tags: listValues(form.tags || ""), notes: form.notes || "", nextFollowUp: form.nextFollowUp || "", lastContacted: form.lastContacted || "",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
    setIsSaving(true);
    try {
      const saved = isMockMode ? newLead : normalizeLead(await crmApi.create("lead", newLead, scope ?? undefined));
      setLeads((rows) => [saved, ...rows]);
      void addActivity("lead_created", `Created lead ${saved.firstName} ${saved.lastName}`, saved.id);
      toast.success("Lead created successfully"); setShowCreate(false);
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setIsSaving(false); }
  };

  const handleEditLead = async (form: Record<string, string>) => {
    if (!showEdit || isSaving) return;
    if (!form.firstName?.trim() || !form.lastName?.trim() || !form.email?.trim()) { toast.error("First name, last name and email are required"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) { toast.error("Enter a valid email address"); return; }
    if (!isValidOptionalPhone(form.phone) || !isValidOptionalPhone(form.alternatePhone)) { toast.error(PHONE_ERROR); return; }
    const leadScore = Number(form.leadScore);
    const probability = Number(form.probability);
    if (!Number.isFinite(leadScore) || leadScore < 0 || leadScore > 100) { toast.error("Lead score must be between 0 and 100"); return; }
    if (!Number.isFinite(probability) || probability < 0 || probability > 100) { toast.error("Probability must be between 0 and 100"); return; }
    const selectedOwner = assignees.find((member) => member.id === form.ownerId);
    const updated = normalizeLead({
      ...showEdit, firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim(), phone: form.phone ?? showEdit.phone,
      alternatePhone: form.alternatePhone ?? showEdit.alternatePhone, company: form.company ?? showEdit.company, jobTitle: form.jobTitle ?? showEdit.jobTitle,
      industry: form.industry ?? showEdit.industry, website: form.website ?? showEdit.website, location: form.location ?? showEdit.location,
      streetAddress: form.streetAddress ?? showEdit.streetAddress, city: form.city ?? showEdit.city, state: form.state ?? showEdit.state,
      zipCode: form.zipCode ?? showEdit.zipCode, country: form.country ?? showEdit.country, source: (form.source as LeadSource) || showEdit.source,
      campaign: form.campaign ?? showEdit.campaign, stage: (form.stage as LeadStage) || showEdit.stage,
      leadScore, scoreClassification: (form.scoreClassification as Lead["scoreClassification"]) || showEdit.scoreClassification,
      priority: (form.priority as Lead["priority"]) || showEdit.priority, ownerId: selectedOwner?.id ?? showEdit.ownerId,
      ownerName: selectedOwner?.name ?? showEdit.ownerName, estimatedDealValue: Number(form.estimatedDealValue), probability,
      expectedCloseDate: form.expectedCloseDate ?? showEdit.expectedCloseDate, tags: listValues(form.tags || ""), notes: form.notes ?? showEdit.notes,
      nextFollowUp: form.nextFollowUp ?? showEdit.nextFollowUp, lastContacted: form.lastContacted ?? showEdit.lastContacted,
      updatedAt: new Date().toISOString(),
    });
    setIsSaving(true);
    try {
      const saved = isMockMode ? updated : normalizeLead(await crmApi.update("lead", showEdit.id, updated, scope ?? undefined));
      setLeads((rows) => rows.map((lead) => lead.id === saved.id ? saved : lead));
      void syncLeadName(saved);
      toast.success("Lead updated"); setShowEdit(null); setDetailLead(null);
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setIsSaving(false); }
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

  const handleImport = async (rows: Record<string, string>[]) => {
    const defaultOwner = assignees[0];
    const imported: Lead[] = rows.map((r, index) => ({
      id: `l${Date.now()}_${index}`,
      firstName: r.firstname || "Imported",
      lastName: r.lastname || "Lead",
      email: r.email || "",
      phone: parsePhone(r.phone) ?? "",
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
      ownerId: defaultOwner?.id ?? "",
      ownerName: r.ownername || defaultOwner?.name || "Unassigned",
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
    setIsSaving(true);
    const results = await Promise.allSettled(imported.map((lead) => isMockMode ? Promise.resolve(lead) : crmApi.create("lead", lead, scope ?? undefined).then(normalizeLead)));
    const saved = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
    setLeads((current) => [...saved, ...current]);
    saved.forEach((lead) => void addActivity("lead_created", `Imported lead ${lead.firstName} ${lead.lastName}`, lead.id));
    if (saved.length) toast.success(`Imported ${saved.length} lead${saved.length === 1 ? "" : "s"}`);
    if (saved.length !== imported.length) toast.error(`${imported.length - saved.length} row${imported.length - saved.length === 1 ? "" : "s"} could not be imported`);
    setIsSaving(false);
  };

  const logFor = async (entityType: CrmActivity["entityType"], entityId: string, type: CrmActivity["type"], description: string) => {
    if (isMockMode) return;
    const actor = user?.name?.trim() || user?.email || "Current user";
    const entry = normalizeActivity({ id: aid(), type, actor, actorInitials: actor.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(), description, entityId, entityType, createdAt: new Date().toISOString() });
    try { await crmApi.create("activity", entry, scope ?? undefined); } catch { /* best-effort */ }
  };

  /** Keeps the lead's name on its tasks in step after a rename. */
  const syncLeadName = async (lead: Lead) => {
    if (isMockMode) return;
    try {
      const name = `${lead.firstName} ${lead.lastName}`.trim();
      const rows = await crmApi.list<CrmTask>("task", scope ?? undefined);
      const stale = rows.filter((t) => t.relatedLeadId === lead.id && t.relatedLeadName !== name);
      await Promise.allSettled(stale.map((t) => crmApi.update("task", t.id, { ...t, relatedLeadName: name }, scope ?? undefined)));
    } catch { /* best-effort */ }
  };

  const allPipelines = useMemo(() => resolvePipelines(customPipelines), [customPipelines]);
  const existingContact = useMemo(() => {
    if (!convertTarget) return null;
    if (convertTarget.convertedContactId) return contacts.find((c) => c.id === convertTarget.convertedContactId) ?? null;
    const email = convertTarget.email.trim().toLowerCase();
    return email ? contacts.find((c) => c.email.trim().toLowerCase() === email) ?? null : null;
  }, [convertTarget, contacts]);

  const openConvert = (lead: Lead) => { setConvertKey((k) => k + 1); setConvertTarget(lead); };

  const handleConvert = async (values: ConvertLeadValues) => {
    if (!convertTarget || isSaving) return;
    const lead = convertTarget;
    const fullName = `${lead.firstName} ${lead.lastName}`.trim();
    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      let contact = existingContact;
      if (!contact) {
        const draft = normalizeContact({
          id: newId("c"), firstName: lead.firstName, lastName: lead.lastName, email: lead.email, phone: lead.phone,
          alternatePhone: lead.alternatePhone, company: lead.company, companyId: lead.company ? `co_${lead.company.toLowerCase().replace(/[^a-z0-9]+/g, "_")}` : "",
          role: lead.jobTitle, website: lead.website, location: lead.location, streetAddress: lead.streetAddress, city: lead.city,
          state: lead.state, zipCode: lead.zipCode, country: lead.country, ownerId: lead.ownerId, ownerName: lead.ownerName,
          tags: lead.tags, status: "prospect", notes: lead.notes, sourceLeadId: lead.id, lastContacted: lead.lastContacted,
          nextFollowUp: lead.nextFollowUp, createdAt: now, updatedAt: now,
        });
        const created = isMockMode ? draft : normalizeContact(await crmApi.create("contact", draft, scope ?? undefined));
        contact = created;
        setContacts((rows) => [created, ...rows]);
        void logFor("contact", created.id, "contact_created", `Created from lead ${fullName}`);
      }
      let deal: Deal | null = null;
      if (values.createDeal) {
        const draft = normalizeDeal({
          id: newId("d"), name: values.dealName, companyName: lead.company, companyId: contact.companyId,
          primaryContactId: contact.id, primaryContactName: `${contact.firstName} ${contact.lastName}`.trim(),
          pipelineId: values.pipelineId, stage: values.stage, value: values.dealValue, probability: lead.probability,
          expectedCloseDate: lead.expectedCloseDate, ownerId: lead.ownerId, ownerName: lead.ownerName, source: lead.source,
          campaign: lead.campaign, tags: lead.tags, notes: lead.notes, priority: lead.priority, createdAt: now, updatedAt: now,
        });
        deal = isMockMode ? draft : normalizeDeal(await crmApi.create("deal", draft, scope ?? undefined));
        void logFor("deal", deal.id, "deal_created", `Created from lead ${fullName}`);
      }
      const updated = normalizeLead({
        ...lead,
        stage: lead.stage === "new" || lead.stage === "contacted" ? "qualified" : lead.stage,
        convertedContactId: contact.id, convertedDealId: deal?.id ?? lead.convertedDealId, updatedAt: now,
      });
      const saved = isMockMode ? updated : normalizeLead(await crmApi.update("lead", lead.id, updated, scope ?? undefined));
      setLeads((rows) => rows.map((row) => row.id === saved.id ? saved : row));
      setDetailLead((current) => current?.id === saved.id ? saved : current);
      void addActivity("lead_converted", deal ? `Converted to contact and deal “${deal.name}”` : "Converted to contact", lead.id);
      toast.success(deal ? "Lead converted — contact and deal created" : "Lead converted to a contact");
      setConvertTarget(null);
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setIsSaving(false); }
  };

  const openAssign = (lead: Lead) => {
    setAssignTarget(lead);
    setSelectedOwnerId(lead.ownerId || assignees[0]?.id || "");
  };

  const handleAssign = async () => {
    if (!assignTarget || !selectedOwnerId || isSaving) return;
    const owner = assignees.find((member) => member.id === selectedOwnerId);
    if (!owner) { toast.error("Select a valid assignee"); return; }
    const previousOwner = assignTarget.ownerName;
    const updated = normalizeLead({ ...assignTarget, ownerId: owner.id, ownerName: owner.name, updatedAt: new Date().toISOString() });
    setIsSaving(true);
    try {
      const saved = isMockMode ? updated : normalizeLead(await crmApi.update("lead", updated.id, updated, scope ?? undefined));
      setLeads((rows) => rows.map((lead) => lead.id === saved.id ? saved : lead));
      setDetailLead((current) => current?.id === saved.id ? saved : current);
      void addActivity("owner_changed", `Assigned lead to ${owner.name}`, saved.id, previousOwner, owner.name);
      toast.success(`Lead assigned to ${owner.name}`); setAssignTarget(null);
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setIsSaving(false); }
  };

  const openTask = (lead: Lead) => {
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    setTaskTarget(lead); setTaskTitle(`Follow up with ${lead.firstName} ${lead.lastName}`);
    setTaskDueDate(tomorrow.toISOString().slice(0, 10)); setTaskPriority("medium");
    setDetailLead(null);
  };

  const handleCreateTask = async () => {
    if (!taskTarget || !taskTitle.trim() || !taskDueDate || isSaving) return;
    const now = new Date().toISOString();
    const task: CrmTask = {
      id: `t${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, title: taskTitle.trim(),
      description: `Follow-up task for ${taskTarget.firstName} ${taskTarget.lastName}`, type: "follow_up", priority: taskPriority,
      status: "pending", assigneeId: taskTarget.ownerId, assigneeName: taskTarget.ownerName || "Unassigned",
      dueDate: taskDueDate, dueTime: "09:00", reminder: "none", relatedLeadId: taskTarget.id,
      relatedLeadName: `${taskTarget.firstName} ${taskTarget.lastName}`, tags: [], createdAt: now, updatedAt: now,
    };
    setIsSaving(true);
    try {
      const saved = isMockMode ? task : await crmApi.create("task", task, scope ?? undefined);
      void addActivity("task_created", `Created task ${saved.title}`, taskTarget.id);
      toast.success("Task created for this lead"); setTaskTarget(null);
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setIsSaving(false); }
  };

  const columns: DataTableColumn<Lead>[] = [
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
          <DropdownMenuItem onClick={() => openAssign(row)}><UserPlus /> Assign</DropdownMenuItem>
          <DropdownMenuItem onClick={() => openConvert(row)}><Link2 /> {row.convertedContactId ? "Convert again" : "Convert"}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => { const next: Record<LeadStage, LeadStage> = { new: "contacted", contacted: "qualified", qualified: "proposal", proposal: "won", won: "won", lost: "lost" }; void handleStageChange(row.id, next[row.stage]); }}><ArrowRightLeft /> Advance Stage</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(row)}><Trash2 /> Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ), width: "w-10" },
  ];

  const selection: DataTableSelection = { selectedIds: selected, onChange: setSelected };

  return (
    <div className="space-y-1">
      <AdminPageTitle
        eyebrow="CRM / Leads"
        title="Leads"
        description="Manage, Qualify, Assign And Convert Your Sales Leads."
        action={<div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)}><Upload className="size-3.5" /> Import</Button>
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="size-3.5" /> Export</Button>
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="size-3.5" /> Create Lead</Button>
        </div>}
      />

      <LeadMetricCards leads={leads} />

      <FilterBar
        search={<SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search leads..." />}
        filters={<div className="flex items-center gap-2">
          <Select value={stageFilter ?? "__all__"} onValueChange={(v) => { setStageFilter(v === "__all__" ? null : v); setPage(1); }}>
            <SelectTrigger size="sm" className="w-auto min-w-[8rem]"><SelectValue placeholder="Stage" /></SelectTrigger>
            <SelectContent><SelectItem value="__all__">All Stages</SelectItem>{STAGE_OPTIONS.map((s) => <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={sourceFilter ?? "__all__"} onValueChange={(v) => { setSourceFilter(v === "__all__" ? null : v); setPage(1); }}>
            <SelectTrigger size="sm" className="w-auto min-w-[8rem]"><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent><SelectItem value="__all__">All Sources</SelectItem>{SOURCE_OPTIONS.map((s) => <SelectItem key={s} value={s}>{SOURCE_LABELS[s]}</SelectItem>)}</SelectContent>
          </Select>
        </div>}
        actions={selected.length > 0 ? (<div className="flex items-center gap-2">
          <span className="text-[12px] text-[#75829D] font-medium">{selected.length} Selected</span>
          <Button variant="outline" size="sm" onClick={() => setShowBulkStage(true)}>Change Stage</Button>
          <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}>Delete</Button>
        </div>) : undefined}
        activeFilterCount={(stageFilter ? 1 : 0) + (sourceFilter ? 1 : 0)}
        onClearFilters={() => { setStageFilter(null); setSourceFilter(null); setSearch(""); setPage(1); }}
      />

      <DataTable columns={columns} rows={paginated} getRowId={(r) => r.id} isLoading={isLoading} error={loadError} onRetry={() => void loadLeads()} sort={sort} onToggleSort={handleSort} pagination={pagination} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} selection={selection} onRowClick={(r) => setDetailLead(r)} enableColumnVisibility
        emptyState={<EmptyState icon={Users} title="No leads found" description="Create your first lead or adjust filters." action={<Button size="sm" onClick={() => setShowCreate(true)}><Plus className="size-3.5" /> Create Lead</Button>} />}
      />

      <div className="grid gap-1 lg:grid-cols-3 mt-1">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-300">
          <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-3">
            <h2 className="text-[13px] font-semibold text-slate-800">Leads Over Time</h2>
          </div>
          <div className="p-4">
            {(trendSeries[0]?.data.length ?? 0) > 0 ? <><TrendAreaChart series={trendSeries} height={180} /><div className="mt-2"><ChartLegend series={trendSeries} /></div></> : <p className="text-[13px] text-slate-500 py-8 text-center">No data yet</p>}
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
                  <div><span className="block text-slate-500 text-[11px] font-medium capitalize mb-0.5">Email</span> <span className="text-slate-800 font-medium">{detailLead.email}</span></div>
                  <div><span className="block text-slate-500 text-[11px] font-medium capitalize mb-0.5">Phone</span> <span className="text-slate-800 font-medium">{detailLead.phone}</span></div>
                  <div><span className="block text-slate-500 text-[11px] font-medium capitalize mb-0.5">Alternate Phone</span> <span className="text-slate-800 font-medium">{detailLead.alternatePhone || "-"}</span></div>
                  <div><span className="block text-slate-500 text-[11px] font-medium capitalize mb-0.5">Company</span> <span className="text-slate-800 font-medium">{detailLead.company}</span></div>
                  <div><span className="block text-slate-500 text-[11px] font-medium capitalize mb-0.5">Title</span> <span className="text-slate-800 font-medium">{detailLead.jobTitle}</span></div>
                  <div><span className="block text-slate-500 text-[11px] font-medium capitalize mb-0.5">Industry</span> <span className="text-slate-800 font-medium">{detailLead.industry || "-"}</span></div>
                  <div><span className="block text-slate-500 text-[11px] font-medium capitalize mb-0.5">Website</span> <span className="break-all text-slate-800 font-medium">{detailLead.website || "-"}</span></div>
                  <div><span className="block text-slate-500 text-[11px] font-medium capitalize mb-0.5">Location</span> <span className="text-slate-800 font-medium">{detailLead.location || [detailLead.city, detailLead.state, detailLead.country].filter(Boolean).join(", ") || "-"}</span></div>
                  <div><span className="block text-slate-500 text-[11px] font-medium capitalize mb-0.5">Source</span> <span className="text-slate-800 font-medium">{SOURCE_LABELS[detailLead.source]}</span></div>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-[14px] font-semibold text-slate-800 mb-3 flex items-center gap-2"><Target className="size-4 text-emerald-500" /> Lead Details</h3>
                <div className="grid grid-cols-2 gap-4 text-[13px]">
                  <div><span className="block text-slate-500 text-[11px] font-medium capitalize mb-0.5">Owner</span> <span className="text-slate-800 font-medium">{detailLead.ownerName}</span></div>
                  <div><span className="block text-slate-500 text-[11px] font-medium capitalize mb-0.5">Priority</span> <span className="text-slate-800 font-medium">{detailLead.priority}</span></div>
                  <div><span className="block text-slate-500 text-[11px] font-medium capitalize mb-0.5">Classification</span> <span className="text-slate-800 font-medium">{detailLead.scoreClassification}</span></div>
                  <div><span className="block text-slate-500 text-[11px] font-medium capitalize mb-0.5">Campaign</span> <span className="text-slate-800 font-medium">{detailLead.campaign || "-"}</span></div>
                  <div><span className="block text-slate-500 text-[11px] font-medium capitalize mb-0.5">Deal Value</span> <span className="text-emerald-600 font-bold">₹{detailLead.estimatedDealValue.toLocaleString()}</span></div>
                  <div><span className="block text-slate-500 text-[11px] font-medium capitalize mb-0.5">Probability</span> <span className="text-slate-800 font-medium">{detailLead.probability}%</span></div>
                  <div><span className="block text-slate-500 text-[11px] font-medium capitalize mb-0.5">Expected Close</span> <span className="text-slate-800 font-medium">{detailLead.expectedCloseDate || "-"}</span></div>
                  <div><span className="block text-slate-500 text-[11px] font-medium capitalize mb-0.5">Next Follow-up</span> <span className="text-slate-800 font-medium">{detailLead.nextFollowUp || "—"}</span></div>
                  <div><span className="block text-slate-500 text-[11px] font-medium capitalize mb-0.5">Created</span> <span className="text-slate-800 font-medium">{new Date(detailLead.createdAt).toLocaleDateString()}</span></div>
                  <div><span className="block text-slate-500 text-[11px] font-medium capitalize mb-0.5">Last Contacted</span> <span className="text-slate-800 font-medium">{detailLead.lastContacted || "-"}</span></div>
                </div>
              </div>
              {detailLead.tags.length > 0 && <div className="flex flex-wrap gap-2 pt-1">{detailLead.tags.map((t) => <Badge key={t} tone="info" className="rounded-md font-medium">{t}</Badge>)}</div>}
              {detailLead.notes && <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4"><h3 className="text-[13px] font-semibold text-slate-800 mb-2">Notes</h3><p className="text-[13px] text-slate-600 leading-relaxed">{detailLead.notes}</p></div>}
              {(detailLead.convertedContactId || detailLead.convertedDealId) && (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-[13px]">
                  <span className="font-semibold text-emerald-800">Converted</span>
                  {detailLead.convertedContactId && <Link className="font-medium text-indigo-700 underline-offset-2 hover:underline" href={crmLink("contacts", detailLead.convertedContactId)}>View contact</Link>}
                  {detailLead.convertedDealId && <Link className="font-medium text-indigo-700 underline-offset-2 hover:underline" href={crmLink("pipeline", detailLead.convertedDealId)}>View deal</Link>}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => { setShowEdit(detailLead); setDetailLead(null); }}>Edit</Button>
                <Button size="sm" variant="outline" disabled={isSaving} onClick={() => openConvert(detailLead)}><Link2 className="size-3.5" /> {detailLead.convertedContactId ? "Convert again" : "Convert"}</Button>
                <Button size="sm" variant="outline" disabled={isSaving} onClick={() => void handleStageChange(detailLead.id, detailLead.stage === "new" ? "contacted" : detailLead.stage === "contacted" ? "qualified" : detailLead.stage === "qualified" ? "proposal" : "won")}>Advance Stage</Button>
                <Button size="sm" disabled={isSaving} onClick={() => openTask(detailLead)}>Add Task</Button>
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
          if (!isValidOptionalPhone(values.phone)) errors.push(`Phone "${values.phone}" must be 10 digits`);
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
      <LeadFormModal key={showCreate ? "create-open" : "create-closed"} open={showCreate} onOpenChange={setShowCreate} onSubmit={handleCreateLead} title="Create Lead" submitLabel="Save Lead" isSaving={isSaving} assignees={assignees} initial={{ source: "manual", stage: "new", leadScore: "50", scoreClassification: "warm", priority: "medium", probability: "30", ownerId: assignees[0]?.id ?? "", country: "India" }} />

      {/* ---- Edit Lead ---- */}
      <LeadFormModal key={showEdit?.id ?? "edit-closed"} open={!!showEdit} onOpenChange={(v) => { if (!v) setShowEdit(null); }} onSubmit={handleEditLead} title="Edit Lead" submitLabel="Update Lead" isSaving={isSaving} assignees={assignees} initial={showEdit ? leadFormValues(showEdit) : undefined} />

      {/* ---- Convert Lead ---- */}
      <ConvertLeadDialog
        key={`convert-${convertTarget?.id ?? "none"}-${convertKey}`} open={!!convertTarget} onClose={() => setConvertTarget(null)}
        lead={convertTarget} pipelines={allPipelines} existingContactName={existingContact ? `${existingContact.firstName} ${existingContact.lastName}`.trim() : undefined}
        isSaving={isSaving} onConfirm={handleConvert}
      />

      {/* ---- Assign Lead ---- */}
      <Dialog open={!!assignTarget} onOpenChange={(open) => { if (!open) setAssignTarget(null); }}>
        <DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Assign Lead</DialogTitle><DialogDescription>Choose the team member responsible for {assignTarget?.firstName} {assignTarget?.lastName}.</DialogDescription></DialogHeader>
          <Select value={selectedOwnerId} onValueChange={setSelectedOwnerId}><SelectTrigger><SelectValue placeholder="Select assignee" /></SelectTrigger><SelectContent>{assignees.map((member) => <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>)}</SelectContent></Select>
          <DialogFooter><Button variant="outline" onClick={() => setAssignTarget(null)}>Cancel</Button><Button onClick={() => void handleAssign()} disabled={!selectedOwnerId || isSaving}>{isSaving ? "Assigning..." : "Assign"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Create Follow-up Task ---- */}
      <Dialog open={!!taskTarget} onOpenChange={(open) => { if (!open) setTaskTarget(null); }}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Add Task</DialogTitle><DialogDescription>Create a follow-up task linked to {taskTarget?.firstName} {taskTarget?.lastName}.</DialogDescription></DialogHeader>
          <div className="space-y-3"><Input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Task title" /><div className="grid grid-cols-2 gap-3"><Input type="date" value={taskDueDate} onChange={(event) => setTaskDueDate(event.target.value)} /><Select value={taskPriority} onValueChange={(value) => setTaskPriority(value as TaskPriority)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low priority</SelectItem><SelectItem value="medium">Medium priority</SelectItem><SelectItem value="high">High priority</SelectItem></SelectContent></Select></div></div>
          <DialogFooter><Button variant="outline" onClick={() => setTaskTarget(null)}>Cancel</Button><Button onClick={() => void handleCreateTask()} disabled={!taskTitle.trim() || !taskDueDate || isSaving}>{isSaving ? "Creating..." : "Create Task"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Bulk Stage ---- */}
      <Dialog open={showBulkStage} onOpenChange={setShowBulkStage}>
        <DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Change Stage</DialogTitle><DialogDescription>Move {selected.length} leads to a new stage.</DialogDescription></DialogHeader>
          <Select value={bulkStage} onValueChange={setBulkStage}><SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger><SelectContent>{STAGE_OPTIONS.map((s) => <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>)}</SelectContent></Select>
          <DialogFooter><Button variant="outline" onClick={() => setShowBulkStage(false)}>Cancel</Button><Button onClick={() => void handleBulkStageChange()} disabled={!bulkStage || isSaving}>Apply</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Delete Confirmation ---- */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Lead?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. &quot;{deleteTarget?.firstName} {deleteTarget?.lastName}&quot; will be permanently removed.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={isSaving} onClick={() => { if (deleteTarget) void handleDelete(deleteTarget.id); }}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ---- Bulk Delete Confirmation ---- */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {selected.length} Leads?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. {selected.length} leads will be permanently removed.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={isSaving} onClick={() => void handleBulkDelete()}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ---- Reusable Lead Form ---- */
function LeadFormModal({
  open,
  onOpenChange,
  onSubmit,
  title,
  submitLabel,
  initial,
  assignees,
  isSaving = false,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (form: Record<string, string>) => void | Promise<void>;
  title: string;
  submitLabel: string;
  initial?: Record<string, string>;
  assignees: Array<{ id: string; name: string }>;
  isSaving?: boolean;
}) {
  const [form, setForm] = useState<Record<string, string>>(() => ({
    country: "India",
    ...(initial ?? {}),
  }));
  const [isFetchingPincode, setIsFetchingPincode] = useState(false);
  const [pincodeSuccess, setPincodeSuccess] = useState(false);

  // Lock background scroll when open
  useEffect(() => {
    if (!open) return;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, [open]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));
  const sets = (k: string) => (v: string) =>
    setForm((p) => ({ ...p, [k]: v }));
  const setPhoneField = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: sanitizePhone(e.target.value) }));

  const fetchPincodeDetails = async (pin: string) => {
    if (!/^[1-9][0-9]{5}$/.test(pin)) return;
    setIsFetchingPincode(true);
    setPincodeSuccess(false);

    try {
      const res = await fetch(`/app-api/pincode/${pin}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setForm((prev) => {
            const nextCity = data.city || prev.city || "";
            const nextState = data.state || prev.state || "";
            const nextCountry = data.country || prev.country || "India";
            const autoLoc = [nextCity, nextState].filter(Boolean).join(", ");
            return {
              ...prev,
              city: nextCity,
              state: nextState,
              country: nextCountry,
              location: prev.location ? prev.location : autoLoc,
            };
          });
          setPincodeSuccess(true);
          toast.success(`Location auto-filled: ${data.city ? `${data.city}, ` : ""}${data.state}`);
          return;
        }
      }
      setPincodeSuccess(false);
    } catch (_err) {
      setPincodeSuccess(false);
    } finally {
      setIsFetchingPincode(false);
    }
  };

  const handlePincodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 6);
    setForm((p) => ({ ...p, zipCode: raw }));
    if (raw.length === 6) {
      void fetchPincodeDetails(raw);
    } else {
      setPincodeSuccess(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-3xl sm:rounded-2xl overscroll-contain">
        <DialogHeader className="shrink-0 border-b border-slate-100 bg-white px-6 py-4">
          <div className="flex flex-col gap-2 pr-8 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <DialogTitle className="text-xl font-semibold text-slate-800">{title}</DialogTitle>
            <div className="flex shrink-0 items-center justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-lg">
                Cancel
              </Button>
              <Button
                disabled={isSaving}
                onClick={() => void onSubmit(form)}
                className="rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                {isSaving ? "Saving..." : submitLabel}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-4 overscroll-contain scrollbar-thin">
          <section className="space-y-2">
            <h3 className="text-[13px] font-semibold text-slate-800">Contact Information</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input placeholder="First Name *" value={form.firstName ?? ""} onChange={set("firstName")} />
              <Input placeholder="Last Name *" value={form.lastName ?? ""} onChange={set("lastName")} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input placeholder="Email *" type="email" value={form.email ?? ""} onChange={set("email")} />
              <Input {...phoneInputProps} placeholder="Phone (10 digits)" value={form.phone ?? ""} onChange={setPhoneField("phone")} aria-invalid={!isValidOptionalPhone(form.phone)} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input {...phoneInputProps} placeholder="Alternate Phone (10 digits)" value={form.alternatePhone ?? ""} onChange={setPhoneField("alternatePhone")} aria-invalid={!isValidOptionalPhone(form.alternatePhone)} />
              <Input placeholder="Location (e.g. City, State)" value={form.location ?? ""} onChange={set("location")} />
            </div>
          </section>

          <section className="space-y-3 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-slate-800">Company & Address</h3>
              {pincodeSuccess && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                  <CheckCircle2 className="size-3.5" /> City & State auto-filled
                </span>
              )}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Input placeholder="Company" value={form.company ?? ""} onChange={set("company")} />
              <Input placeholder="Job Title" value={form.jobTitle ?? ""} onChange={set("jobTitle")} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input placeholder="Industry" value={form.industry ?? ""} onChange={set("industry")} />
              <Input placeholder="Website" type="url" value={form.website ?? ""} onChange={set("website")} />
            </div>

            {/* Address fields: PIN Code FIRST as requested */}
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold capitalize text-slate-600 flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-indigo-500" /> Postal Address
                </span>
                <span className="text-[11px] text-slate-400">Enter PIN Code to auto-fill location</span>
              </div>

              {/* 1. PINCODE FIRST */}
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-600">
                  PIN Code / Postal Code (Auto-fills City & State)
                </label>
                <div className="relative">
                  <Input
                    placeholder="Enter 6-digit PIN code (e.g. 110001)"
                    value={form.zipCode ?? ""}
                    onChange={handlePincodeChange}
                    maxLength={6}
                    className={cn(
                      "h-10 pr-9 font-medium bg-white",
                      pincodeSuccess && "border-emerald-300 ring-1 ring-emerald-300"
                    )}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    {isFetchingPincode ? (
                      <Loader2 className="size-4 animate-spin text-indigo-600" />
                    ) : pincodeSuccess ? (
                      <CheckCircle2 className="size-4 text-emerald-600" />
                    ) : (
                      <MapPin className="size-4 text-slate-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* 2. City & State (Auto-fetched, also editable) */}
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-600">
                    City / District
                  </label>
                  <Input
                    placeholder="City / District"
                    value={form.city ?? ""}
                    onChange={set("city")}
                    className="bg-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-600">
                    State
                  </label>
                  <Input
                    placeholder="State"
                    value={form.state ?? ""}
                    onChange={set("state")}
                    className="bg-white"
                  />
                </div>
              </div>

              {/* 3. Country & Street Address */}
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-600">
                    Country
                  </label>
                  <Input
                    placeholder="Country"
                    value={form.country || "India"}
                    onChange={set("country")}
                    className="bg-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-600">
                    Street Address / Landmark
                  </label>
                  <Input
                    placeholder="Street Address, Building, Floor"
                    value={form.streetAddress ?? ""}
                    onChange={set("streetAddress")}
                    className="bg-white"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-2 border-t border-slate-100 pt-4">
            <h3 className="text-[13px] font-semibold text-slate-800">Qualification &amp; Ownership</h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <Select value={form.source ?? ""} onValueChange={sets("source")}>
                <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
                <SelectContent>{SOURCE_OPTIONS.map((s) => <SelectItem key={s} value={s}>{SOURCE_LABELS[s]}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={form.stage ?? ""} onValueChange={sets("stage")}>
                <SelectTrigger><SelectValue placeholder="Stage" /></SelectTrigger>
                <SelectContent>{STAGE_OPTIONS.map((s) => <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={form.priority ?? ""} onValueChange={sets("priority")}>
                <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low priority</SelectItem>
                  <SelectItem value="medium">Medium priority</SelectItem>
                  <SelectItem value="high">High priority</SelectItem>
                </SelectContent>
              </Select>
              <Select value={form.scoreClassification ?? ""} onValueChange={sets("scoreClassification")}>
                <SelectTrigger><SelectValue placeholder="Classification" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cold">Cold</SelectItem>
                  <SelectItem value="warm">Warm</SelectItem>
                  <SelectItem value="hot">Hot</SelectItem>
                </SelectContent>
              </Select>
              <Select value={form.ownerId ?? ""} onValueChange={sets("ownerId")}>
                <SelectTrigger><SelectValue placeholder="Assignee" /></SelectTrigger>
                <SelectContent>{assignees.map((member) => <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Campaign" value={form.campaign ?? ""} onChange={set("campaign")} />
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <Input aria-label="Lead score" title="Lead score" type="number" min="0" max="100" placeholder="Lead Score (0-100)" value={form.leadScore ?? ""} onChange={set("leadScore")} />
              <Input aria-label="Estimated deal value" title="Estimated deal value" type="number" min="0" placeholder="Estimated Deal Value" value={form.estimatedDealValue ?? ""} onChange={set("estimatedDealValue")} />
              <Input aria-label="Probability" title="Probability" type="number" min="0" max="100" placeholder="Probability %" value={form.probability ?? ""} onChange={set("probability")} />
            </div>
          </section>

          <section className="space-y-2 border-t border-slate-100 pt-4">
            <h3 className="text-[13px] font-semibold text-slate-800">Follow-up &amp; Notes</h3>
            <div className="grid gap-2 sm:grid-cols-3">
              <label className="space-y-1 text-[12px] text-slate-600">Expected Close Date<Input type="date" value={form.expectedCloseDate ?? ""} onChange={set("expectedCloseDate")} /></label>
              <label className="space-y-1 text-[12px] text-slate-600">Next Follow-up<Input type="datetime-local" value={form.nextFollowUp ?? ""} onChange={set("nextFollowUp")} /></label>
              <label className="space-y-1 text-[12px] text-slate-600">Last Contacted<Input type="datetime-local" value={form.lastContacted ?? ""} onChange={set("lastContacted")} /></label>
            </div>
            <Input placeholder="Tags separated by semicolons" value={form.tags ?? ""} onChange={set("tags")} />
            <Textarea placeholder="Notes" rows={3} value={form.notes ?? ""} onChange={set("notes")} className="resize-none" />
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
