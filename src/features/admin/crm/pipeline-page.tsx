"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  Plus, MoreHorizontal, Eye, Pencil, Trash2, CheckCircle2, XCircle, GripVertical, Settings, RotateCcw,
  ArrowRightLeft, Calendar, History, Target, ChevronLeft, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { SearchInput } from "@/components/shared/search-input";
import { FilterBar } from "@/components/shared/filter-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { AdminPageTitle } from "@/features/admin/shared/admin-page-title";
import { CrmAiInsights } from "./components/crm-ai-insights";
import { CrmRecordHistoryPanel } from "./components/crm-record-history";
import { CrmRecycleDialog } from "./components/crm-recycle-dialog";
import { CrmSavedViews } from "./components/crm-saved-views";
import { CrmForecastPanel } from "./components/crm-forecast-panel";
import { isMockMode } from "@/config/env";
import { PipelineMetricCards } from "./components/crm-metric-cards";
import { FunnelChart } from "./components/crm-funnel-chart";
import { CrmTimeline } from "./components/crm-timeline";
import { DealFormModal, type DealFormValues } from "./components/deal-form-modal";
import { CrmTaskDialog, type TaskDialogValues } from "./components/crm-task-dialog";
import { LogActivityDialog, type LoggableActivity } from "./components/log-activity-dialog";
import { PipelineSettingsDialog } from "./components/pipeline-settings-dialog";
import { deals as seedDeals, activities as seedActivities, contacts as seedContacts } from "./data/crm-data";
import { crmApi } from "./data/crm-api";
import { listValues } from "./lib/csv";
import {
  BUILTIN_PIPELINE, DEAL_PRIORITIES, DEAL_STAGES, DEAL_STAGE_LABELS, errorMessage, formatInr, newId, resolvePipelines,
  normalizeActivity, normalizeContact, normalizeDeal, normalizePipeline, shortDate,
} from "./lib/crm-records";
import { useCrmWorkspace } from "./lib/use-crm-workspace";
import Link from "next/link";
import { crmLink, useOpenParam } from "./lib/use-open-param";
import type { Contact, CrmTask, Deal, DealStage, Pipeline } from "./types";

/* ------------------------------------------------------------------ */
/* Constants                                                            */
/* ------------------------------------------------------------------ */

const ALL = "__all__";

const STAGE_COLORS: Record<DealStage, string> = {
  new: "border-t-[#2563EB]", qualified: "border-t-[#4285F4]", discovery: "border-t-[#F59E0B]",
  proposal: "border-t-[#8B5CF6]", negotiation: "border-t-[#F97316]", won: "border-t-[#078359]", lost: "border-t-[#DC2626]",
};

const STAGE_DOT: Record<DealStage, string> = {
  new: "bg-[#2563EB]", qualified: "bg-[#4285F4]", discovery: "bg-[#F59E0B]",
  proposal: "bg-[#8B5CF6]", negotiation: "bg-[#F97316]", won: "bg-[#078359]", lost: "bg-[#DC2626]",
};

const STAGE_BADGE: Record<DealStage, string> = {
  new: "bg-blue-50 text-blue-700 border border-blue-200/50 shadow-sm",
  qualified: "bg-indigo-50 text-indigo-700 border border-indigo-200/50 shadow-sm",
  discovery: "bg-amber-50 text-amber-700 border border-amber-200/50 shadow-sm",
  proposal: "bg-purple-50 text-purple-700 border border-purple-200/50 shadow-sm",
  negotiation: "bg-orange-50 text-orange-700 border border-orange-200/50 shadow-sm",
  won: "bg-emerald-50 text-emerald-700 border border-emerald-200/50 shadow-sm",
  lost: "bg-red-50 text-red-700 border border-red-200/50 shadow-sm",
};

const PRIORITY_BADGE: Record<string, string> = {
  high: "bg-red-50 text-red-700 border border-red-200/50 shadow-sm",
  medium: "bg-amber-50 text-amber-700 border border-amber-200/50 shadow-sm",
  low: "bg-slate-50 text-slate-600 border border-slate-200/50 shadow-sm",
};

const CLOSE_FILTERS = [
  { value: "overdue", label: "Overdue" },
  { value: "month", label: "Closing This Month" },
  { value: "30", label: "Next 30 Days" },
  { value: "none", label: "No Close Date" },
] as const;

function dealFormValues(deal: Deal): DealFormValues {
  return {
    name: deal.name, pipelineId: deal.pipelineId, stage: deal.stage, primaryContactId: deal.primaryContactId,
    primaryContactName: deal.primaryContactName, companyId: deal.companyId, companyName: deal.companyName,
    value: String(deal.value), cost: String(deal.cost), probability: String(deal.probability), ownerId: deal.ownerId,
    priority: deal.priority, source: deal.source, expectedCloseDate: deal.expectedCloseDate.slice(0, 10),
    campaign: deal.campaign, products: deal.products, tags: deal.tags.join("; "), notes: deal.notes,
  };
}

function isOpen(deal: Deal): boolean {
  return deal.stage !== "won" && deal.stage !== "lost";
}

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function isOverdue(deal: Deal): boolean {
  if (!isOpen(deal) || !deal.expectedCloseDate) return false;
  const close = new Date(deal.expectedCloseDate).getTime();
  return Number.isFinite(close) && close < startOfToday();
}

/* ------------------------------------------------------------------ */
/* Main Page                                                            */
/* ------------------------------------------------------------------ */

export default function PipelinePage() {
  const { scope, isReady, assignees, activities, setActivities, logActivity } = useCrmWorkspace("deal");

  const [deals, setDeals] = useState<Deal[]>(isMockMode ? seedDeals : []);
  const [customPipelines, setCustomPipelines] = useState<Pipeline[]>([]);
  const [contacts, setContacts] = useState<Contact[]>(isMockMode ? seedContacts : []);
  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [isLoading, setIsLoading] = useState(!isMockMode);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);

  const [pipelineId, setPipelineId] = useState(BUILTIN_PIPELINE.id);
  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [closeFilter, setCloseFilter] = useState<string | null>(null);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createStage, setCreateStage] = useState<DealStage>("new");
  const [editTarget, setEditTarget] = useState<Deal | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Deal | null>(null);
  const [lostTarget, setLostTarget] = useState<Deal | null>(null);
  const [lostReason, setLostReason] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [taskTarget, setTaskTarget] = useState<Deal | null>(null);
  const [logTarget, setLogTarget] = useState<Deal | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<DealStage | null>(null);
  const [notesDraft, setNotesDraft] = useState<{ id: string; text: string } | null>(null);
  const [formKey, setFormKey] = useState(0);

  /* ---- Loading ---- */
  const load = useCallback(async () => {
    if (isMockMode) {
      setActivities(seedActivities);
      setIsLoading(false);
      return;
    }
    if (!isReady || !scope) {
      if (isReady) { setLoadError(new Error("Select a Client to view the CRM pipeline.")); setIsLoading(false); }
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      const rows = await crmApi.list<Deal>("deal", scope);
      setDeals(rows.map(normalizeDeal));
    } catch (error) {
      setLoadError(error);
      setIsLoading(false);
      return;
    }
    const [pipelineRows, contactRows, activityRows, taskRows] = await Promise.allSettled([
      crmApi.list<Pipeline>("pipeline", scope), crmApi.list<Contact>("contact", scope),
      crmApi.list<Parameters<typeof normalizeActivity>[0]>("activity", scope), crmApi.list<CrmTask>("task", scope),
    ]);
    if (taskRows.status === "fulfilled") setTasks(taskRows.value);
    if (pipelineRows.status === "fulfilled") setCustomPipelines(pipelineRows.value.map(normalizePipeline));
    if (contactRows.status === "fulfilled") setContacts(contactRows.value.map(normalizeContact));
    if (activityRows.status === "fulfilled") setActivities(activityRows.value.map(normalizeActivity));
    setIsLoading(false);
  }, [isReady, scope, setActivities]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  /* ---- Derived ---- */
  const pipelines = useMemo(() => resolvePipelines(customPipelines), [customPipelines]);
  const pipeline = useMemo(() => pipelines.find((p) => p.id === pipelineId) ?? pipelines[0] ?? BUILTIN_PIPELINE, [pipelines, pipelineId]);

  const pipelineDeals = useMemo(() => deals.filter((d) => d.pipelineId === pipeline.id), [deals, pipeline.id]);

  const dealCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    deals.forEach((d) => { counts[d.pipelineId] = (counts[d.pipelineId] ?? 0) + 1; });
    return counts;
  }, [deals]);

  /** Open stages from the pipeline, plus any stage a deal still carries, then Won / Lost. */
  const displayStages = useMemo<DealStage[]>(() => {
    const open = pipeline.stages.filter((s) => s !== "won" && s !== "lost");
    const extra = Array.from(new Set(pipelineDeals.map((d) => d.stage)))
      .filter((s) => s !== "won" && s !== "lost" && !open.includes(s));
    const orderedExtra = DEAL_STAGES.filter((s) => extra.includes(s));
    return [...open, ...orderedExtra, "won", "lost"];
  }, [pipeline, pipelineDeals]);

  const ownerOptions = useMemo(() => {
    const byId = new Map<string, string>();
    pipelineDeals.forEach((d) => { if (d.ownerId) byId.set(d.ownerId, d.ownerName); });
    return Array.from(byId, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [pipelineDeals]);

  const filteredDeals = useMemo(() => {
    const today = startOfToday();
    const now = new Date();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime();
    const in30 = today + 30 * 24 * 60 * 60 * 1000;
    const q = search.trim().toLowerCase();
    return pipelineDeals.filter((d) => {
      if (q && !(d.name.toLowerCase().includes(q) || d.companyName.toLowerCase().includes(q) || d.primaryContactName.toLowerCase().includes(q))) return false;
      if (ownerFilter && (ownerFilter === "__none__" ? d.ownerId : d.ownerId !== ownerFilter)) return false;
      if (priorityFilter && d.priority !== priorityFilter) return false;
      if (closeFilter) {
        const close = d.expectedCloseDate ? new Date(d.expectedCloseDate).getTime() : NaN;
        const has = Number.isFinite(close);
        if (closeFilter === "none") return !has;
        if (!has || !isOpen(d)) return false;
        if (closeFilter === "overdue") return close < today;
        if (closeFilter === "month") return close >= today && close <= monthEnd;
        if (closeFilter === "30") return close >= today && close <= in30;
      }
      return true;
    });
  }, [pipelineDeals, search, ownerFilter, priorityFilter, closeFilter]);

  const dealsByStage = useMemo(() => {
    const map: Record<string, Deal[]> = {};
    displayStages.forEach((s) => { map[s] = []; });
    filteredDeals.forEach((d) => { (map[d.stage] ??= []).push(d); });
    return map;
  }, [filteredDeals, displayStages]);

  const funnel = useMemo(() => {
    const stages = displayStages.filter((s) => s !== "lost");
    const total = filteredDeals.filter((d) => d.stage !== "lost").length || 1;
    return stages.map((s) => {
      const count = (dealsByStage[s] ?? []).length;
      return { label: DEAL_STAGE_LABELS[s], count, value: `${count} deals`, conversionRate: Math.round((count / total) * 100) };
    });
  }, [displayStages, filteredDeals, dealsByStage]);

  const detail = useMemo(() => deals.find((d) => d.id === detailId) ?? null, [deals, detailId]);
  const detailTasks = detail ? tasks.filter((t) => t.relatedDealId === detail.id) : [];

  useOpenParam(!isLoading && isReady, useCallback((id: string) => {
    const deal = deals.find((d) => d.id === id);
    if (!deal) return;
    setPipelineId(deal.pipelineId);
    setDetailId(id);
  }, [deals]));
  const detailActivity = detail ? activities.filter((a) => a.entityId === detail.id) : [];
  const activeFilterCount = [ownerFilter, priorityFilter, closeFilter].filter(Boolean).length + (search.trim() ? 1 : 0);

  const boardRef = useRef<HTMLDivElement>(null);
  const scrollBoard = useCallback((direction: "left" | "right") => {
    if (!boardRef.current) return;
    const distance = 320;
    boardRef.current.scrollBy({
      left: direction === "left" ? -distance : distance,
      behavior: "smooth",
    });
  }, []);

  /* ---- Persistence ---- */
  const saveDeal = useCallback(async (next: Deal): Promise<Deal> => {
    const stamped = { ...next, updatedAt: new Date().toISOString() };
    const saved = isMockMode ? stamped : normalizeDeal(await crmApi.update<Deal>("deal", stamped.id, stamped, scope ?? undefined));
    setDeals((rows) => rows.map((d) => (d.id === saved.id ? saved : d)));
    return saved;
  }, [scope]);

  const moveDeal = useCallback(async (deal: Deal, stage: DealStage) => {
    if (deal.stage === stage || isSaving) return;
    const probability = stage === "won" ? 100 : stage === "lost" ? 0 : deal.stage === "won" || deal.stage === "lost" ? 20 : deal.probability;
    const optimistic = { ...deal, stage, probability, lostReason: stage === "lost" ? deal.lostReason : undefined };
    setDeals((rows) => rows.map((d) => (d.id === deal.id ? optimistic : d)));
    try {
      await saveDeal(optimistic);
      void logActivity("stage_changed", `Moved “${deal.name}”`, deal.id, DEAL_STAGE_LABELS[deal.stage], DEAL_STAGE_LABELS[stage]);
      toast.success(`“${deal.name}” moved to ${DEAL_STAGE_LABELS[stage]}`);
    } catch (error) {
      setDeals((rows) => rows.map((d) => (d.id === deal.id ? deal : d)));
      toast.error(errorMessage(error));
    }
  }, [isSaving, logActivity, saveDeal]);

  /* ---- Drag & drop ---- */
  const handleDrop = (stage: DealStage, droppedId: string) => {
    const deal = deals.find((d) => d.id === (droppedId || draggedId));
    setDraggedId(null);
    setDragOverStage(null);
    if (!deal) return;
    if (stage === "lost" && deal.stage !== "lost") { setLostReason(""); setLostTarget(deal); return; }
    void moveDeal(deal, stage);
  };

  /* ---- Deal form handlers ---- */
  const buildDeal = (form: DealFormValues, base: Deal | null): Deal | string => {
    if (!form.name?.trim()) return "Deal name is required";
    const value = Number(form.value || 0);
    const cost = Number(form.cost || 0);
    const probability = Number(form.probability || 0);
    if (!Number.isFinite(value) || value < 0) return "Value must be a positive number";
    if (!Number.isFinite(cost) || cost < 0) return "Cost must be a positive number";
    if (!Number.isFinite(probability) || probability < 0 || probability > 100) return "Probability must be between 0 and 100";
    const owner = assignees.find((m) => m.id === form.ownerId);
    const now = new Date().toISOString();
    return normalizeDeal({
      ...(base ?? {}), id: base?.id ?? newId("d"), name: form.name.trim(), companyId: form.companyId ?? "",
      companyName: (form.companyName ?? "").trim(), primaryContactId: form.primaryContactId ?? "",
      primaryContactName: form.primaryContactName ?? "", pipelineId: form.pipelineId || pipeline.id,
      stage: form.stage as DealStage, value, cost, probability, expectedCloseDate: form.expectedCloseDate ?? "",
      ownerId: owner?.id ?? "", ownerName: owner?.name ?? "Unassigned", source: form.source as Deal["source"],
      campaign: (form.campaign ?? "").trim(), products: (form.products ?? "").trim(), tags: listValues(form.tags ?? ""),
      notes: (form.notes ?? "").trim(), priority: form.priority as Deal["priority"],
      createdAt: base?.createdAt ?? now, updatedAt: now,
    });
  };

  const handleCreate = async (form: DealFormValues) => {
    if (isSaving) return;
    const built = buildDeal(form, null);
    if (typeof built === "string") { toast.error(built); return; }
    setIsSaving(true);
    try {
      const saved = isMockMode ? built : normalizeDeal(await crmApi.create("deal", built, scope ?? undefined));
      setDeals((rows) => [saved, ...rows]);
      void logActivity("deal_created", `Created deal “${saved.name}”`, saved.id);
      toast.success("Deal created");
      setShowCreate(false);
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setIsSaving(false); }
  };

  const handleEdit = async (form: DealFormValues) => {
    if (!editTarget || isSaving) return;
    const built = buildDeal(form, editTarget);
    if (typeof built === "string") { toast.error(built); return; }
    setIsSaving(true);
    try {
      const saved = await saveDeal(built);
      if (saved.stage !== editTarget.stage) {
        void logActivity("stage_changed", `Moved “${saved.name}”`, saved.id, DEAL_STAGE_LABELS[editTarget.stage], DEAL_STAGE_LABELS[saved.stage]);
      } else if (saved.value !== editTarget.value) {
        void logActivity("value_changed", `Updated value of “${saved.name}”`, saved.id, formatInr(editTarget.value), formatInr(saved.value));
      }
      void syncDealName(saved);
      toast.success("Deal updated");
      setEditTarget(null);
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setIsSaving(false); }
  };

  /** Keeps the deal's name on its tasks in step after a rename. */
  const syncDealName = async (deal: Deal) => {
    const stale = tasks.filter((t) => t.relatedDealId === deal.id && t.relatedDealName !== deal.name);
    if (stale.length === 0) return;
    const next = stale.map((t) => ({ ...t, relatedDealName: deal.name }));
    setTasks((rows) => rows.map((t) => next.find((n) => n.id === t.id) ?? t));
    if (isMockMode) return;
    await Promise.allSettled(next.map((t) => crmApi.update("task", t.id, t, scope ?? undefined)));
  };

  const handleDelete = async (deal: Deal) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      if (!isMockMode) await crmApi.remove("deal", deal.id, scope ?? undefined);
      setDeals((rows) => rows.filter((d) => d.id !== deal.id));
      setDetailId((current) => (current === deal.id ? null : current));
      setDeleteTarget(null);
      toast.success("Deal deleted");
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setIsSaving(false); }
  };

  const confirmLost = async () => {
    if (!lostTarget || isSaving) return;
    const deal = lostTarget;
    setIsSaving(true);
    try {
      const reason = lostReason.trim();
      const saved = await saveDeal({ ...deal, stage: "lost", probability: 0, lostReason: reason || undefined });
      void logActivity("stage_changed", `Marked “${saved.name}” as lost${reason ? `: ${reason}` : ""}`, saved.id, DEAL_STAGE_LABELS[deal.stage], "Lost");
      toast.success("Deal marked as Lost");
      setLostTarget(null);
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setIsSaving(false); }
  };

  const saveNotes = async (deal: Deal, text: string) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await saveDeal({ ...deal, notes: text.trim() });
      void logActivity("note_added", "Updated deal notes", deal.id);
      setNotesDraft(null);
      toast.success("Notes saved");
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setIsSaving(false); }
  };

  const handleCreateTask = async (values: TaskDialogValues) => {
    if (!taskTarget || isSaving) return;
    const now = new Date().toISOString();
    const task: CrmTask = {
      id: newId("t"), title: values.title, description: values.description || `Task for deal ${taskTarget.name}`,
      type: values.type, priority: values.priority, status: "pending",
      assigneeId: taskTarget.ownerId, assigneeName: taskTarget.ownerName || "Unassigned",
      dueDate: values.dueDate, dueTime: "09:00", reminder: "none",
      relatedDealId: taskTarget.id, relatedDealName: taskTarget.name,
      relatedContactId: taskTarget.primaryContactId || undefined, relatedContactName: taskTarget.primaryContactName || undefined,
      tags: [], createdAt: now, updatedAt: now,
    };
    setIsSaving(true);
    try {
      const savedTask = isMockMode ? task : await crmApi.create<CrmTask>("task", task, scope ?? undefined);
      setTasks((rows) => [savedTask, ...rows]);
      void logActivity("task_created", `Created task “${task.title}”`, taskTarget.id);
      toast.success("Task created");
      setTaskTarget(null);
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setIsSaving(false); }
  };

  const handleLogActivity = async (type: LoggableActivity, description: string) => {
    if (!logTarget || isSaving) return;
    setIsSaving(true);
    try {
      await logActivity(type, description, logTarget.id);
      toast.success("Activity logged");
      setLogTarget(null);
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setIsSaving(false); }
  };

  /* ---- Pipeline settings ---- */
  const handleSavePipeline = async (draft: { id?: string; name: string; stages: DealStage[] }) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      if (draft.id === BUILTIN_PIPELINE.id) {
        // The default pipeline: keep one stored override record (isDefault) so deals keep pipelineId "pipeline_1".
        const existing = customPipelines.find((p) => p.isDefault);
        const next = normalizePipeline({ id: existing?.id ?? newId("p"), name: draft.name, stages: draft.stages, isDefault: true });
        const saved = isMockMode
          ? next
          : normalizePipeline(existing
            ? await crmApi.update<Pipeline>("pipeline", existing.id, { ...existing, ...next }, scope ?? undefined)
            : await crmApi.create<Pipeline>("pipeline", next, scope ?? undefined));
        setCustomPipelines((rows) => (existing ? rows.map((p) => (p.id === existing.id ? saved : p)) : [...rows, saved]));
        toast.success("Default pipeline updated");
      } else if (draft.id) {
        const current = customPipelines.find((p) => p.id === draft.id);
        const next = normalizePipeline({ id: draft.id, name: draft.name, stages: draft.stages });
        const saved = isMockMode ? next : normalizePipeline(await crmApi.update<Pipeline>("pipeline", draft.id, { ...(current ?? {}), ...next }, scope ?? undefined));
        setCustomPipelines((rows) => rows.map((p) => (p.id === saved.id ? saved : p)));
        toast.success("Pipeline updated");
      } else {
        const next = normalizePipeline({ id: newId("p"), name: draft.name, stages: draft.stages });
        const saved = isMockMode ? next : normalizePipeline(await crmApi.create<Pipeline>("pipeline", next, scope ?? undefined));
        setCustomPipelines((rows) => [...rows, saved]);
        setPipelineId(saved.id);
        toast.success("Pipeline created");
      }
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setIsSaving(false); }
  };

  const handleDeletePipeline = async (target: Pipeline) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      if (!isMockMode) await crmApi.remove("pipeline", target.id, scope ?? undefined);
      setCustomPipelines((rows) => rows.filter((p) => p.id !== target.id));
      setPipelineId((current) => (current === target.id ? BUILTIN_PIPELINE.id : current));
      toast.success(`Pipeline “${target.name}” deleted`);
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setIsSaving(false); }
  };

  const openCreate = (stage: DealStage = pipeline.stages[0] ?? "new") => {
    setCreateStage(stage);
    setFormKey((k) => k + 1);
    setShowCreate(true);
  };
  const openEdit = (deal: Deal) => { setFormKey((k) => k + 1); setEditTarget(deal); };
  const openTask = (deal: Deal) => { setFormKey((k) => k + 1); setTaskTarget(deal); };
  const openLog = (deal: Deal) => { setFormKey((k) => k + 1); setLogTarget(deal); };
  const askLost = (deal: Deal) => { setLostReason(""); setLostTarget(deal); };

  const renderDealMenu = (deal: Deal) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon-sm" className="size-7" aria-label={`Actions for ${deal.name}`}><MoreHorizontal className="size-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => setDetailId(deal.id)}><Eye /> View</DropdownMenuItem>
        <DropdownMenuItem onClick={() => openEdit(deal)}><Pencil /> Edit</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Move to</DropdownMenuLabel>
        {displayStages.filter((s) => s !== deal.stage && s !== "lost").map((s) => (
          <DropdownMenuItem key={s} onClick={() => void moveDeal(deal, s)}><ArrowRightLeft /> {DEAL_STAGE_LABELS[s]}</DropdownMenuItem>
        ))}
        {deal.stage !== "lost" ? <DropdownMenuItem onClick={() => askLost(deal)}><XCircle /> Lost</DropdownMenuItem> : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => openTask(deal)}><Calendar /> Add Task</DropdownMenuItem>
        <DropdownMenuItem onClick={() => openLog(deal)}><History /> Log Activity</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(deal)}><Trash2 /> Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const hasDeals = pipelineDeals.length > 0;
  const margin = detail && detail.value > 0 ? Math.round(((detail.value - detail.cost) / detail.value) * 100) : null;

  return (
    <div className="space-y-2">
      <AdminPageTitle
        eyebrow="CRM / Pipeline"
        title={pipeline.name}
        description={`Track And Manage Deals Through Every Stage${pipelines.length > 1 ? ` · ${pipelines.length} Pipelines` : ""}.`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <CrmRecycleDialog kind="deal" scope={scope} onRestored={() => void load()} />
            <Select value={pipeline.id} onValueChange={setPipelineId}>
              <SelectTrigger className="w-auto min-w-[140px]" aria-label="Pipeline"><SelectValue /></SelectTrigger>
              <SelectContent>{pipelines.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}><Settings className="size-3.5" /> Pipelines</Button>
            <Button size="sm" onClick={() => openCreate()}><Plus className="size-3.5" /> Create Deal</Button>
          </div>
        }
      />

      <PipelineMetricCards deals={pipelineDeals} />
      <CrmForecastPanel deals={pipelineDeals} />

      <FilterBar
        search={<SearchInput value={search} onChange={setSearch} placeholder="Search deal, company, contact..." />}
        filters={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={ownerFilter ?? ALL} onValueChange={(v) => setOwnerFilter(v === ALL ? null : v)}>
              <SelectTrigger size="sm" className="w-auto min-w-[8rem]"><SelectValue placeholder="Owner" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Owners</SelectItem>
                <SelectItem value="__none__">Unassigned</SelectItem>
                {ownerOptions.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={priorityFilter ?? ALL} onValueChange={(v) => setPriorityFilter(v === ALL ? null : v)}>
              <SelectTrigger size="sm" className="w-auto min-w-[8rem]"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Priorities</SelectItem>
                {DEAL_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p[0]!.toUpperCase() + p.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={closeFilter ?? ALL} onValueChange={(v) => setCloseFilter(v === ALL ? null : v)}>
              <SelectTrigger size="sm" className="w-auto min-w-[9rem]"><SelectValue placeholder="Close Date" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Any Close Date</SelectItem>
                {CLOSE_FILTERS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        }
        actions={<CrmSavedViews namespace="pipeline" state={{ search, ownerFilter, priorityFilter, closeFilter, pipelineId }} onApply={(view) => { setSearch(String(view.search ?? "")); setOwnerFilter(view.ownerFilter ? String(view.ownerFilter) : null); setPriorityFilter(view.priorityFilter ? String(view.priorityFilter) : null); setCloseFilter(view.closeFilter ? String(view.closeFilter) : null); if (view.pipelineId) setPipelineId(String(view.pipelineId)); }} />}
        activeFilterCount={activeFilterCount}
        onClearFilters={() => { setSearch(""); setOwnerFilter(null); setPriorityFilter(null); setCloseFilter(null); }}
      />

      {loadError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-700">
          <p className="font-medium">The pipeline could not be loaded.</p>
          <p className="mt-0.5">{errorMessage(loadError)}</p>
          <Button className="mt-3" size="sm" variant="outline" onClick={() => void load()}><RotateCcw className="size-3.5" /> Retry</Button>
        </div>
      ) : isLoading ? (
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-72 min-w-[280px] flex-1 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />)}
        </div>
      ) : !hasDeals ? (
        <EmptyState
          icon={Target} title="No deals in this pipeline yet"
          description="Create your first deal to start tracking it through the stages."
          action={<Button size="sm" onClick={() => openCreate()}><Plus className="size-3.5" /> Create Deal</Button>}
        />
      ) : (
        <>
          {/* ---- Kanban Board Controls & Header ---- */}
          <div className="flex items-center justify-between gap-2 px-1 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-semibold text-slate-700">
                Pipeline Stages ({displayStages.length})
              </span>
              <span className="hidden sm:inline text-[11px] text-slate-400">
                • Scroll Horizontally To View All Stages
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="size-7.5 p-0 rounded-lg text-slate-600 hover:text-slate-900 border-slate-200 shadow-2xs"
                onClick={() => scrollBoard("left")}
                title="Scroll Left"
                aria-label="Scroll pipeline left"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="size-7.5 p-0 rounded-lg text-slate-600 hover:text-slate-900 border-slate-200 shadow-2xs"
                onClick={() => scrollBoard("right")}
                title="Scroll Right"
                aria-label="Scroll pipeline right"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          {/* ---- Kanban Board with Horizontal Scroller ---- */}
          <div
            ref={boardRef}
            className="overflow-x-auto pb-4 pt-1 scroll-smooth"
            style={{
              scrollbarWidth: "thin",
            }}
          >
            <div className="flex gap-3 items-stretch" style={{ width: "max-content", minWidth: "100%" }}>
              {displayStages.map((stage) => {
                const stageDeals = dealsByStage[stage] ?? [];
                const totalValue = stageDeals.reduce((sum, d) => sum + d.value, 0);
                const isTarget = dragOverStage === stage && draggedId !== null;
                return (
                  <div
                    key={stage}
                    className={`w-[295px] sm:w-[305px] shrink-0 flex flex-col h-[480px] rounded-2xl border border-t-[3px] bg-slate-50/80 shadow-xs backdrop-blur-sm transition-colors ${STAGE_COLORS[stage]} ${isTarget ? "border-indigo-400 bg-indigo-50/70 ring-2 ring-indigo-400/30" : "border-slate-200"}`}
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (dragOverStage !== stage) setDragOverStage(stage); }}
                    onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOverStage(null); }}
                    onDrop={(e) => { e.preventDefault(); handleDrop(stage, e.dataTransfer.getData("text/plain")); }}
                  >
                    {/* Stage Header */}
                    <div className="flex shrink-0 items-center justify-between rounded-t-xl border-b border-slate-200/80 bg-white/70 px-3.5 py-2.5">
                      <div>
                        <h3 className="text-[13px] font-bold text-slate-800 leading-tight">{DEAL_STAGE_LABELS[stage]}</h3>
                        <p className="text-[11.5px] font-medium text-slate-500 mt-0.5">{stageDeals.length} deal{stageDeals.length === 1 ? "" : "s"} · {formatInr(totalValue)}</p>
                      </div>
                      <Button
                        variant="ghost" size="icon-sm" className="size-7 rounded-lg hover:bg-slate-100 text-slate-500" aria-label={`Add deal to ${DEAL_STAGE_LABELS[stage]}`}
                        disabled={stage === "lost"} onClick={() => openCreate(stage)}
                      >
                        <Plus className="size-4" />
                      </Button>
                    </div>

                    {/* Column List with Vertical Scroller (equal height across all columns) */}
                    <div className="scrollbar-thin flex-1 min-h-0 space-y-2 overflow-y-auto p-2">
                      {stageDeals.length === 0 ? (
                        <div className="flex h-full min-h-[140px] items-center justify-center text-[12px] font-medium text-slate-400">
                          {isTarget ? "Drop Deal Here" : "No Deals"}
                        </div>
                      ) : stageDeals.map((deal) => (
                        <div
                          key={deal.id}
                          draggable
                          onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", deal.id); setDraggedId(deal.id); }}
                          onDragEnd={() => { setDraggedId(null); setDragOverStage(null); }}
                          onClick={() => setDetailId(deal.id)}
                          className={`group cursor-grab rounded-xl border border-slate-200/90 bg-white p-2.5 sm:p-3 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300 active:cursor-grabbing ${draggedId === deal.id ? "opacity-40" : ""}`}
                        >
                          {/* Title & Grip / Actions */}
                          <div className="flex items-start justify-between gap-1 mb-1">
                            <p className="text-[13px] font-bold leading-snug text-slate-800 line-clamp-1">{deal.name}</p>
                            <div className="flex shrink-0 items-center -mr-1">
                              <GripVertical className="size-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" aria-hidden />
                              {renderDealMenu(deal)}
                            </div>
                          </div>

                          {/* Company & Deal Value */}
                          <div className="flex items-baseline justify-between gap-2 mb-2">
                            <p className="text-[11.5px] font-medium text-slate-500 truncate max-w-[170px]">
                              {deal.companyName || deal.primaryContactName || "No Company"}
                            </p>
                            <span className="text-[13px] font-extrabold text-emerald-600 shrink-0">
                              {formatInr(deal.value)}
                            </span>
                          </div>

                          {/* Priority, Overdue & Close date */}
                          <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[11px]">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className={`inline-block rounded px-1.5 py-0.2 text-[10px] font-bold tracking-wide capitalize ${PRIORITY_BADGE[deal.priority]}`}>
                                {deal.priority.charAt(0).toUpperCase() + deal.priority.slice(1)}
                              </span>
                              {isOverdue(deal) && (
                                <span className="inline-block rounded border border-red-200 bg-red-50 px-1.5 py-0.2 text-[10px] font-bold text-red-700">
                                  Overdue
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-medium text-slate-400 shrink-0">
                              Close: {shortDate(deal.expectedCloseDate)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ---- Analytics ---- */}
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-3"><h2 className="text-[13px] font-semibold text-slate-800">Pipeline Funnel</h2></div>
              <div className="p-6"><FunnelChart stages={funnel} /></div>
            </section>
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-3"><h2 className="text-[13px] font-semibold text-slate-800">Stage Breakdown</h2></div>
              <div className="space-y-1.5 p-4">
                {displayStages.filter((s) => s !== "lost").map((stage) => {
                  const stageDeals = dealsByStage[stage] ?? [];
                  const totalVal = stageDeals.reduce((sum, d) => sum + d.value, 0);
                  return (
                    <div key={stage} className="flex items-center gap-4 rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5">
                      <span className={`size-3 rounded-full shadow-sm ${STAGE_DOT[stage]}`} />
                      <span className="flex-1 text-[13px] font-bold text-slate-800">{DEAL_STAGE_LABELS[stage]}</span>
                      <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[13px] font-medium text-slate-500">{stageDeals.length} deal{stageDeals.length === 1 ? "" : "s"}</span>
                      <span className="text-[14px] font-bold text-slate-800">{formatInr(totalVal)}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </>
      )}

      {/* ---- Deal Detail Sheet ---- */}
      <Sheet open={!!detail} onOpenChange={(open) => { if (!open) { setDetailId(null); setNotesDraft(null); } }}>
        <SheetContent side="right" className="w-full max-w-lg">
          <SheetHeader><SheetTitle>{detail?.name}</SheetTitle></SheetHeader>
          <SheetBody>
            {detail && (
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-3 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-block rounded-lg px-2 py-0.5 text-[12px] font-semibold ${STAGE_BADGE[detail.stage]}`}>{DEAL_STAGE_LABELS[detail.stage]}</span>
                    <span className={`inline-block rounded-lg px-2 py-0.5 text-[12px] font-semibold ${PRIORITY_BADGE[detail.priority]}`}>{detail.priority}</span>
                    {isOverdue(detail) ? <span className="inline-block rounded-lg border border-red-200 bg-red-50 px-2 py-0.5 text-[12px] font-semibold text-red-700">Overdue</span> : null}
                  </div>

                  <label className="block space-y-1 text-[12px] font-medium text-slate-600">Stage
                    <Select
                      value={detail.stage}
                      onValueChange={(v) => {
                        if (v === "lost") askLost(detail);
                        else void moveDeal(detail, v as DealStage);
                      }}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{displayStages.map((s) => <SelectItem key={s} value={s}>{DEAL_STAGE_LABELS[s]}</SelectItem>)}</SelectContent>
                    </Select>
                  </label>

                  <div className="space-y-2 rounded-sm border border-[#DDE4ED] p-3">
                    <h3 className="text-[12px] font-semibold text-[#27375D]">Deal Information</h3>
                    <div className="grid grid-cols-2 gap-2 text-[12px]">
                      <div><span className="text-[#75829D]">Value:</span> <span className="font-semibold text-[#354568]">₹{detail.value.toLocaleString("en-IN")}</span></div>
                      <div><span className="text-[#75829D]">Probability:</span> <span className="text-[#354568]">{detail.probability}%</span></div>
                      <div><span className="text-[#75829D]">Weighted:</span> <span className="text-[#354568]">₹{Math.round((detail.value * detail.probability) / 100).toLocaleString("en-IN")}</span></div>
                      <div><span className="text-[#75829D]">Cost:</span> <span className="text-[#354568]">₹{detail.cost.toLocaleString("en-IN")}</span></div>
                      <div><span className="text-[#75829D]">Profit:</span> <span className="text-[#354568]">₹{(detail.value - detail.cost).toLocaleString("en-IN")}</span></div>
                      <div><span className="text-[#75829D]">Margin:</span> <span className="text-[#354568]">{margin === null ? "—" : `${margin}%`}</span></div>
                    </div>
                  </div>

                  <div className="space-y-2 rounded-sm border border-[#DDE4ED] p-3">
                    <h3 className="text-[12px] font-semibold text-[#27375D]">Details</h3>
                    <div className="grid grid-cols-2 gap-2 text-[12px]">
                      <div><span className="text-[#75829D]">Company:</span> <span className="text-[#354568]">{detail.companyName || "—"}</span></div>
                      <div><span className="text-[#75829D]">Contact:</span>{" "}
                        {detail.primaryContactId && contacts.some((c) => c.id === detail.primaryContactId)
                          ? <Link href={crmLink("contacts", detail.primaryContactId)} className="font-medium text-indigo-700 hover:underline">{detail.primaryContactName || "View Contact"}</Link>
                          : <span className="text-[#354568]">{detail.primaryContactName || "—"}</span>}
                      </div>
                      <div><span className="text-[#75829D]">Owner:</span> <span className="text-[#354568]">{detail.ownerName}</span></div>
                      <div><span className="text-[#75829D]">Close Date:</span> <span className="text-[#354568]">{shortDate(detail.expectedCloseDate)}</span></div>
                      <div><span className="text-[#75829D]">Source:</span> <span className="text-[#354568]">{detail.source}</span></div>
                      <div><span className="text-[#75829D]">Campaign:</span> <span className="text-[#354568]">{detail.campaign || "—"}</span></div>
                      <div className="col-span-2"><span className="text-[#75829D]">Products:</span> <span className="text-[#354568]">{detail.products || "—"}</span></div>
                      {detail.stage === "lost" && detail.lostReason ? (
                        <div className="col-span-2"><span className="text-[#75829D]">Lost Reason:</span> <span className="text-[#354568]">{detail.lostReason}</span></div>
                      ) : null}
                    </div>
                  </div>

                  {detail.tags.length > 0 && <div className="flex flex-wrap gap-1">{detail.tags.map((t) => <Badge key={t} tone="info">{t}</Badge>)}</div>}

                  <div className="space-y-2 rounded-sm border border-[#DDE4ED] p-3">
                    <h3 className="text-[12px] font-semibold text-[#27375D]">Tasks ({detailTasks.length})</h3>
                    {detailTasks.length === 0 ? <p className="text-[12px] text-[#75829D]">No tasks linked to this deal.</p> : (
                      <ul className="space-y-1.5">
                        {detailTasks.map((t) => (
                          <li key={t.id} className="flex items-center justify-between gap-2 text-[12px]">
                            <Link href={crmLink("tasks", t.id)} className="truncate font-medium text-indigo-700 underline-offset-2 hover:underline">{t.title}</Link>
                            <span className="shrink-0 text-[#75829D]">{t.status.replace("_", " ")} · due {shortDate(t.dueDate)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <CrmAiInsights kind="deal" recordId={detail.id} label={detail.name} scope={scope} />
                    <CrmRecordHistoryPanel kind="deal" recordId={detail.id} scope={scope} />
                    <Button size="sm" variant="outline" onClick={() => { const d = detail; setDetailId(null); openEdit(d); }}><Pencil className="size-3.5" /> Edit</Button>
                    {isOpen(detail) ? (
                      <>
                        <Button size="sm" variant="outline" disabled={isSaving} onClick={() => void moveDeal(detail, "won")}><CheckCircle2 className="size-3.5" /> Mark Won</Button>
                        <Button size="sm" variant="outline" disabled={isSaving} onClick={() => askLost(detail)}><XCircle className="size-3.5" /> Mark Lost</Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" disabled={isSaving} onClick={() => void moveDeal(detail, pipeline.stages[0] ?? "new")}><RotateCcw className="size-3.5" /> Reopen</Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => openTask(detail)}><Calendar className="size-3.5" /> Add Task</Button>
                    <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(detail)}><Trash2 className="size-3.5" /> Delete</Button>
                  </div>
                </TabsContent>

                <TabsContent value="activity" className="mt-3 space-y-3">
                  <Button size="sm" onClick={() => openLog(detail)}><Plus className="size-3.5" /> Log Activity</Button>
                  <CrmTimeline entries={detailActivity} />
                </TabsContent>

                <TabsContent value="notes" className="mt-3 space-y-2">
                  <Textarea
                    rows={6} className="resize-none" placeholder="Add notes about this deal..."
                    value={notesDraft?.id === detail.id ? notesDraft.text : detail.notes}
                    onChange={(e) => setNotesDraft({ id: detail.id, text: e.target.value })}
                  />
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" disabled={notesDraft?.id !== detail.id} onClick={() => setNotesDraft(null)}>Discard</Button>
                    <Button size="sm" disabled={isSaving || notesDraft?.id !== detail.id || notesDraft.text.trim() === detail.notes.trim()} onClick={() => notesDraft && void saveNotes(detail, notesDraft.text)}>
                      {isSaving ? "Saving..." : "Save Notes"}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>

      {/* ---- Create / Edit Deal ---- */}
      <DealFormModal
        key={`create-${formKey}`} open={showCreate} onOpenChange={setShowCreate} title="Create Deal" submitLabel="Save Deal"
        isSaving={isSaving} contacts={contacts} pipelines={pipelines} assignees={assignees} onSubmit={handleCreate}
        initial={{ pipelineId: pipeline.id, stage: createStage, probability: "20", priority: "medium", source: "manual", ownerId: assignees[0]?.id ?? "" }}
      />
      <DealFormModal
        key={`edit-${editTarget?.id ?? "none"}-${formKey}`} open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}
        title="Edit Deal" submitLabel="Update Deal" isSaving={isSaving} contacts={contacts} pipelines={pipelines}
        assignees={assignees} onSubmit={handleEdit} initial={editTarget ? dealFormValues(editTarget) : undefined}
      />

      {/* ---- Pipeline settings ---- */}
      <PipelineSettingsDialog
        open={showSettings} onClose={() => setShowSettings(false)} defaultPipeline={pipelines[0] ?? BUILTIN_PIPELINE} pipelines={customPipelines.filter((p) => !p.isDefault)} dealCounts={dealCounts}
        isSaving={isSaving} onSave={handleSavePipeline} onDelete={handleDeletePipeline}
      />

      {/* ---- Task / Log ---- */}
      <CrmTaskDialog
        key={`task-${taskTarget?.id ?? "none"}-${formKey}`} open={!!taskTarget} onClose={() => setTaskTarget(null)}
        linkedTo={taskTarget?.name ?? ""} defaultTitle={taskTarget ? `Follow up: ${taskTarget.name}` : ""}
        isSaving={isSaving} onSubmit={handleCreateTask}
      />
      <LogActivityDialog
        key={`log-${logTarget?.id ?? "none"}-${formKey}`} open={!!logTarget} onClose={() => setLogTarget(null)}
        subject={logTarget?.name ?? ""} isSaving={isSaving} onSubmit={handleLogActivity}
      />

      {/* ---- Mark lost ---- */}
      <Dialog open={!!lostTarget} onOpenChange={(open) => { if (!open) setLostTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mark deal as lost</DialogTitle>
            <DialogDescription>“{lostTarget?.name}” will move to Lost with 0% probability. You can reopen it later.</DialogDescription>
          </DialogHeader>
          <Textarea rows={3} className="resize-none" value={lostReason} onChange={(e) => setLostReason(e.target.value)} placeholder="Why was it lost? (optional)" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setLostTarget(null)}>Cancel</Button>
            <Button variant="destructive" disabled={isSaving} onClick={() => void confirmLost()}>{isSaving ? "Saving..." : "Mark Lost"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Delete ---- */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete deal?</AlertDialogTitle>
            <AlertDialogDescription>“{deleteTarget?.name}” will be permanently removed from the pipeline. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={isSaving} onClick={() => { if (deleteTarget) void handleDelete(deleteTarget); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
