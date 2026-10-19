"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Plus, Download, Upload, Merge, Grid3X3, List, Eye, Pencil, Trash2, MoreHorizontal, Phone, Mail,
  MessageSquare, Tag, Users, Calendar, FolderPlus, FolderCog, BriefcaseBusiness, History, UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { DataTable } from "@/components/shared/data-table/data-table";
import { SearchInput } from "@/components/shared/search-input";
import { FilterBar } from "@/components/shared/filter-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { AdminPageTitle } from "@/features/admin/shared/admin-page-title";
import { CrmAiInsights } from "./components/crm-ai-insights";
import { isMockMode } from "@/config/env";
import type { DataTableColumn, DataTableSelection } from "@/components/shared/data-table/types";
import type { PaginationMeta, SortSpec } from "@/types/api";
import { cn } from "@/lib/utils/cn";
import { ContactMetricCards } from "./components/crm-metric-cards";
import { CrmImportDialog } from "./components/crm-import-dialog";
import { MergeContactsDialog } from "./components/merge-contacts-dialog";
import { ContactFormModal, type ContactFormValues } from "./components/contact-form-modal";
import { DealFormModal, type DealFormValues } from "./components/deal-form-modal";
import { CrmTaskDialog, type TaskDialogValues } from "./components/crm-task-dialog";
import { LogActivityDialog, type LoggableActivity } from "./components/log-activity-dialog";
import { AssignGroupsDialog, ManageGroupsDialog } from "./components/contact-groups-dialogs";
import { CrmTimeline } from "./components/crm-timeline";
import {
  contacts as seedContacts, activities as seedActivities, contactGroups as seedGroups, deals as seedDeals,
} from "./data/crm-data";
import { crmApi } from "./data/crm-api";
import { exportContactsCsv, listValues } from "./lib/csv";
import {
  BUILTIN_PIPELINE, resolvePipelines, CONTACT_STATUSES, CONTACT_STATUS_LABELS, DEAL_STAGE_LABELS, errorMessage, formatInr,
  isValidEmail, newId, normalizeActivity, normalizeContact, normalizeDeal, normalizeGroup, normalizePipeline, shortDate,
} from "./lib/crm-records";
import { useCrmWorkspace } from "./lib/use-crm-workspace";
import Link from "next/link";
import { crmLink, useOpenParam } from "./lib/use-open-param";
import { PHONE_ERROR, isValidOptionalPhone, parsePhone, sanitizePhone } from "@/lib/utils/phone";
import type { Contact, ContactGroup, ContactStatus, ContactViewMode, CrmTask, Deal, Pipeline } from "./types";

/* ------------------------------------------------------------------ */
/* Constants & helpers                                                  */
/* ------------------------------------------------------------------ */

const ALL = "__all__";
const COMMUNICATION_TYPES = ["call_logged", "email_sent", "email_opened", "meeting_scheduled", "note_added"];

const STATUS_BADGE: Record<ContactStatus, string> = {
  active: "bg-emerald-50 text-emerald-700 border border-emerald-200/50 shadow-sm",
  inactive: "bg-slate-50 text-slate-600 border border-slate-200/50 shadow-sm",
  lead: "bg-blue-50 text-blue-700 border border-blue-200/50 shadow-sm",
  customer: "bg-indigo-50 text-indigo-700 border border-indigo-200/50 shadow-sm",
  prospect: "bg-amber-50 text-amber-700 border border-amber-200/50 shadow-sm",
};

function fullName(contact: Pick<Contact, "firstName" | "lastName">): string {
  return `${contact.firstName} ${contact.lastName}`.trim();
}

function contactInitials(contact: Pick<Contact, "firstName" | "lastName">): string {
  return `${contact.firstName[0] ?? ""}${contact.lastName[0] ?? ""}`.toUpperCase() || "?";
}

function contactFormValues(contact: Contact): ContactFormValues {
  return {
    firstName: contact.firstName, lastName: contact.lastName, email: contact.email, phone: sanitizePhone(contact.phone),
    alternatePhone: sanitizePhone(contact.alternatePhone), linkedIn: contact.linkedIn, company: contact.company, role: contact.role,
    department: contact.department, website: contact.website, zipCode: contact.zipCode, city: contact.city,
    state: contact.state, country: contact.country, streetAddress: contact.streetAddress, location: contact.location,
    status: contact.status, ownerId: contact.ownerId, groups: contact.groups.join("; "), tags: contact.tags.join("; "),
    nextFollowUp: contact.nextFollowUp.slice(0, 16), lastContacted: contact.lastContacted.slice(0, 16), notes: contact.notes ?? "",
  };
}

function whatsappLink(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return null;
  return `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}`;
}

function telLink(phone: string): string | null {
  const cleaned = phone.replace(/[^\d+]/g, "");
  return cleaned.length >= 5 ? `tel:${cleaned}` : null;
}

/* ------------------------------------------------------------------ */
/* Main Page                                                            */
/* ------------------------------------------------------------------ */

export default function ContactsPage() {
  const { scope, isReady, assignees, activities, setActivities, logActivity } = useCrmWorkspace("contact");

  const [contacts, setContacts] = useState<Contact[]>(isMockMode ? seedContacts : []);
  const [groups, setGroups] = useState<ContactGroup[]>(isMockMode ? seedGroups : []);
  const [deals, setDeals] = useState<Deal[]>(isMockMode ? seedDeals : []);
  const [customPipelines, setCustomPipelines] = useState<Pipeline[]>([]);
  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [isLoading, setIsLoading] = useState(!isMockMode);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [ownerFilter, setOwnerFilter] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<SortSpec | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ContactViewMode>("list");

  const [detailId, setDetailId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Contact | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [mergePair, setMergePair] = useState<[Contact, Contact] | null>(null);
  const [groupTargets, setGroupTargets] = useState<string[] | null>(null);
  const [showGroups, setShowGroups] = useState(false);
  const [taskTarget, setTaskTarget] = useState<Contact | null>(null);
  const [dealTarget, setDealTarget] = useState<Contact | null>(null);
  const [logTarget, setLogTarget] = useState<Contact | null>(null);
  const [formKey, setFormKey] = useState(0);

  /* ---- Loading ---- */
  const load = useCallback(async () => {
    if (isMockMode) {
      setActivities(seedActivities);
      setIsLoading(false);
      return;
    }
    if (!isReady || !scope) {
      if (isReady) { setLoadError(new Error("Select a Client to view CRM contacts.")); setIsLoading(false); }
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      const rows = await crmApi.list<Contact>("contact", scope);
      setContacts(rows.map(normalizeContact));
      setSelected([]);
    } catch (error) {
      setLoadError(error);
      setIsLoading(false);
      return;
    }
    const [groupRows, activityRows, dealRows, pipelineRows, taskRows] = await Promise.allSettled([
      crmApi.list<ContactGroup>("group", scope), crmApi.list<Parameters<typeof normalizeActivity>[0]>("activity", scope),
      crmApi.list<Deal>("deal", scope), crmApi.list<Pipeline>("pipeline", scope), crmApi.list<CrmTask>("task", scope),
    ]);
    if (taskRows.status === "fulfilled") setTasks(taskRows.value);
    if (groupRows.status === "fulfilled") setGroups(groupRows.value.map(normalizeGroup));
    if (activityRows.status === "fulfilled") setActivities(activityRows.value.map(normalizeActivity));
    if (dealRows.status === "fulfilled") setDeals(dealRows.value.map(normalizeDeal));
    if (pipelineRows.status === "fulfilled") setCustomPipelines(pipelineRows.value.map(normalizePipeline));
    setIsLoading(false);
  }, [isReady, scope, setActivities]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  /* ---- Derived ---- */
  const detail = useMemo(() => contacts.find((c) => c.id === detailId) ?? null, [contacts, detailId]);

  const groupNames = useMemo(() => {
    const names = new Set(groups.map((g) => g.name));
    contacts.forEach((c) => c.groups.forEach((g) => names.add(g)));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [groups, contacts]);

  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    contacts.forEach((c) => c.groups.forEach((g) => { counts[g] = (counts[g] ?? 0) + 1; }));
    return counts;
  }, [contacts]);

  const tagOptions = useMemo(() => Array.from(new Set(contacts.flatMap((c) => c.tags))).sort((a, b) => a.localeCompare(b)), [contacts]);
  const ownerOptions = useMemo(() => {
    const byId = new Map<string, string>();
    contacts.forEach((c) => { if (c.ownerId) byId.set(c.ownerId, c.ownerName); });
    return Array.from(byId, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [contacts]);

  const allPipelines = useMemo(() => resolvePipelines(customPipelines), [customPipelines]);

  const filtered = useMemo(() => {
    let rows = contacts;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((c) =>
        fullName(c).toLowerCase().includes(q) || c.email.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) || c.phone.replace(/\s/g, "").includes(q.replace(/\s/g, "")));
    }
    if (statusFilter) rows = rows.filter((c) => c.status === statusFilter);
    if (groupFilter) rows = rows.filter((c) => c.groups.includes(groupFilter));
    if (ownerFilter) rows = rows.filter((c) => (ownerFilter === "__none__" ? !c.ownerId : c.ownerId === ownerFilter));
    if (tagFilter) rows = rows.filter((c) => c.tags.includes(tagFilter));
    if (sort) {
      rows = [...rows].sort((a, b) => {
        const av = String(a[sort.field as keyof Contact] ?? "");
        const bv = String(b[sort.field as keyof Contact] ?? "");
        const cmp = av.localeCompare(bv, undefined, { sensitivity: "base" });
        return sort.direction === "asc" ? cmp : -cmp;
      });
    }
    return rows;
  }, [contacts, search, statusFilter, groupFilter, ownerFilter, tagFilter, sort]);

  useOpenParam(!isLoading && isReady, useCallback((id: string) => {
    if (contacts.some((c) => c.id === id)) setDetailId(id);
  }, [contacts]));

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const pagination: PaginationMeta = useMemo(() => ({
    page: currentPage, pageSize, total: filtered.length, totalPages,
    hasNextPage: currentPage < totalPages, hasPreviousPage: currentPage > 1,
  }), [currentPage, pageSize, filtered.length, totalPages]);

  const activeFilterCount = [statusFilter, groupFilter, ownerFilter, tagFilter].filter(Boolean).length;

  /* ---- Persistence helpers ---- */
  const persistContacts = useCallback(async (items: Contact[]) => {
    const results = await Promise.allSettled(items.map((c) =>
      isMockMode ? Promise.resolve(c) : crmApi.update<Contact>("contact", c.id, c, scope ?? undefined).then(normalizeContact)));
    const saved = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
    const byId = new Map(saved.map((c) => [c.id, c]));
    setContacts((rows) => rows.map((row) => byId.get(row.id) ?? row));
    return { saved, failed: items.length - saved.length };
  }, [scope]);

  const buildContact = (form: ContactFormValues, base: Contact | null): Contact => {
    const owner = assignees.find((m) => m.id === form.ownerId);
    const now = new Date().toISOString();
    const company = (form.company ?? "").trim();
    return normalizeContact({
      ...(base ?? {}),
      id: base?.id ?? newId("c"),
      firstName: form.firstName!.trim(), lastName: form.lastName!.trim(), email: form.email!.trim(),
      phone: (form.phone ?? "").trim(), alternatePhone: (form.alternatePhone ?? "").trim() || undefined,
      company, companyId: base?.companyId || (company ? `co_${company.toLowerCase().replace(/[^a-z0-9]+/g, "_")}` : ""),
      role: (form.role ?? "").trim(), department: (form.department ?? "").trim(), website: (form.website ?? "").trim(),
      linkedIn: (form.linkedIn ?? "").trim(), location: (form.location ?? "").trim(),
      streetAddress: (form.streetAddress ?? "").trim(), city: (form.city ?? "").trim(), state: (form.state ?? "").trim(),
      zipCode: (form.zipCode ?? "").trim(), country: (form.country ?? "").trim(),
      ownerId: owner?.id ?? "", ownerName: owner?.name ?? "Unassigned",
      tags: listValues(form.tags ?? ""), groups: listValues(form.groups ?? ""),
      status: (CONTACT_STATUSES.includes(form.status as ContactStatus) ? form.status : "lead") as ContactStatus,
      notes: (form.notes ?? "").trim(), nextFollowUp: form.nextFollowUp ?? "", lastContacted: form.lastContacted ?? "",
      createdAt: base?.createdAt ?? now, updatedAt: now,
    });
  };

  const validateForm = (form: ContactFormValues, editingId?: string): string | null => {
    if (!form.firstName?.trim() || !form.lastName?.trim() || !form.email?.trim()) return "First name, last name and email are required";
    if (!isValidEmail(form.email)) return "Enter a valid email address";
    if (!isValidOptionalPhone(form.phone) || !isValidOptionalPhone(form.alternatePhone)) return PHONE_ERROR;
    const email = form.email.trim().toLowerCase();
    if (contacts.some((c) => c.id !== editingId && c.email.trim().toLowerCase() === email)) return "A contact with this email already exists";
    return null;
  };

  /* ---- Actions ---- */
  const handleSort = useCallback((field: string) => {
    setSort((prev) => prev?.field === field
      ? prev.direction === "asc" ? { field, direction: "desc" } : null
      : { field, direction: "asc" });
  }, []);

  const handleCreate = async (form: ContactFormValues) => {
    if (isSaving) return;
    const problem = validateForm(form);
    if (problem) { toast.error(problem); return; }
    const draft = buildContact(form, null);
    setIsSaving(true);
    try {
      const saved = isMockMode ? draft : normalizeContact(await crmApi.create("contact", draft, scope ?? undefined));
      setContacts((rows) => [saved, ...rows]);
      void logActivity("contact_created", `Created contact ${fullName(saved)}`, saved.id);
      toast.success("Contact created");
      setShowCreate(false);
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setIsSaving(false); }
  };

  const handleEdit = async (form: ContactFormValues) => {
    if (!editTarget || isSaving) return;
    const problem = validateForm(form, editTarget.id);
    if (problem) { toast.error(problem); return; }
    setIsSaving(true);
    try {
      const { saved, failed } = await persistContacts([buildContact(form, editTarget)]);
      if (failed || !saved[0]) throw new Error("The contact could not be updated.");
      void syncContactName(saved[0]);
      toast.success("Contact updated");
      setEditTarget(null);
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setIsSaving(false); }
  };

  /** Keeps the contact's name on its deals and tasks in step after a rename. */
  const syncContactName = async (contact: Contact) => {
    const name = fullName(contact);
    const staleDeals = deals.filter((d) => d.primaryContactId === contact.id && d.primaryContactName !== name);
    const staleTasks = tasks.filter((t) => t.relatedContactId === contact.id && t.relatedContactName !== name);
    if (staleDeals.length === 0 && staleTasks.length === 0) return;
    const nextDeals = staleDeals.map((d) => ({ ...d, primaryContactName: name }));
    const nextTasks = staleTasks.map((t) => ({ ...t, relatedContactName: name }));
    setDeals((rows) => rows.map((d) => nextDeals.find((n) => n.id === d.id) ?? d));
    setTasks((rows) => rows.map((t) => nextTasks.find((n) => n.id === t.id) ?? t));
    if (isMockMode) return;
    await Promise.allSettled([
      ...nextDeals.map((d) => crmApi.update("deal", d.id, d, scope ?? undefined)),
      ...nextTasks.map((t) => crmApi.update("task", t.id, t, scope ?? undefined)),
    ]);
  };

  const handleDelete = async (id: string) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      if (!isMockMode) await crmApi.remove("contact", id, scope ?? undefined);
      setContacts((rows) => rows.filter((c) => c.id !== id));
      setSelected((ids) => ids.filter((x) => x !== id));
      setDetailId((current) => (current === id ? null : current));
      setDeleteTarget(null);
      toast.success("Contact deleted");
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setIsSaving(false); }
  };

  const handleBulkDelete = async () => {
    if (!selected.length || isSaving) return;
    setIsSaving(true);
    const ids = [...selected];
    const results = await Promise.allSettled(ids.map((id) => (isMockMode ? Promise.resolve() : crmApi.remove("contact", id, scope ?? undefined))));
    const removed = ids.filter((_, i) => results[i]?.status === "fulfilled");
    setContacts((rows) => rows.filter((c) => !removed.includes(c.id)));
    setSelected(ids.filter((id) => !removed.includes(id)));
    if (removed.length) toast.success(`${removed.length} contact${removed.length === 1 ? "" : "s"} deleted`);
    if (removed.length !== ids.length) toast.error(`${ids.length - removed.length} contact${ids.length - removed.length === 1 ? "" : "s"} could not be deleted`);
    setBulkDeleteOpen(false);
    setIsSaving(false);
  };

  const handleBulkStatus = async () => {
    if (!bulkStatus || !selected.length || isSaving) return;
    setIsSaving(true);
    const status = bulkStatus as ContactStatus;
    const targets = contacts.filter((c) => selected.includes(c.id)).map((c) => ({ ...c, status, updatedAt: new Date().toISOString() }));
    const { saved, failed } = await persistContacts(targets);
    if (saved.length) toast.success(`${saved.length} contact${saved.length === 1 ? "" : "s"} set to ${CONTACT_STATUS_LABELS[status]}`);
    if (failed) toast.error(`${failed} contact${failed === 1 ? "" : "s"} could not be updated`);
    setSelected(targets.filter((t) => !saved.some((s) => s.id === t.id)).map((t) => t.id));
    setBulkStatusOpen(false);
    setBulkStatus("");
    setIsSaving(false);
  };

  const handleAssignGroups = async (names: string[]) => {
    if (!groupTargets || isSaving) return;
    setIsSaving(true);
    const targets = contacts.filter((c) => groupTargets.includes(c.id)).map((c) => ({
      ...c, groups: Array.from(new Set([...c.groups, ...names])), updatedAt: new Date().toISOString(),
    }));
    const { saved, failed } = await persistContacts(targets);
    if (saved.length) toast.success(`Added ${saved.length} contact${saved.length === 1 ? "" : "s"} to ${names.join(", ")}`);
    if (failed) toast.error(`${failed} contact${failed === 1 ? "" : "s"} could not be updated`);
    setGroupTargets(null);
    setIsSaving(false);
  };

  const handleCreateGroup = async (name: string, description: string) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const draft: ContactGroup = { id: newId("g"), name, description, contactCount: 0, createdAt: new Date().toISOString() };
      const saved = isMockMode ? draft : normalizeGroup(await crmApi.create("group", draft, scope ?? undefined));
      setGroups((rows) => [...rows, saved]);
      toast.success(`Group “${name}” created`);
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setIsSaving(false); }
  };

  const handleDeleteGroup = async (group: ContactGroup) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      if (!isMockMode) await crmApi.remove("group", group.id, scope ?? undefined);
      setGroups((rows) => rows.filter((g) => g.id !== group.id));
      const members = contacts.filter((c) => c.groups.includes(group.name))
        .map((c) => ({ ...c, groups: c.groups.filter((g) => g !== group.name), updatedAt: new Date().toISOString() }));
      if (members.length) await persistContacts(members);
      setGroupFilter((current) => (current === group.name ? null : current));
      toast.success(`Group “${group.name}” deleted`);
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setIsSaving(false); }
  };

  const handleExport = () => {
    const rows = selected.length > 0 ? contacts.filter((c) => selected.includes(c.id)) : filtered;
    if (rows.length === 0) { toast.error("Nothing to export"); return; }
    exportContactsCsv(rows, selected.length > 0 ? "contacts-selected.csv" : "contacts.csv");
    toast.success(`Exported ${rows.length} contact${rows.length === 1 ? "" : "s"}`);
  };

  const openMerge = () => {
    if (selected.length !== 2) { toast.error("Select exactly 2 contacts to merge"); return; }
    const pair = selected.map((id) => contacts.find((c) => c.id === id)).filter((c): c is Contact => Boolean(c));
    if (pair.length !== 2) { toast.error("Selected contacts not found"); return; }
    setMergePair([pair[0]!, pair[1]!]);
  };

  const handleMerge = async (merged: Contact, secondaryId: string) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const { saved, failed } = await persistContacts([merged]);
      if (failed || !saved[0]) throw new Error("The merged contact could not be saved.");
      if (!isMockMode) await crmApi.remove("contact", secondaryId, scope ?? undefined);
      setContacts((rows) => rows.filter((c) => c.id !== secondaryId));
      // Keep deals attached to the surviving contact.
      const orphaned = deals.filter((d) => d.primaryContactId === secondaryId)
        .map((d) => ({ ...d, primaryContactId: merged.id, primaryContactName: fullName(merged) }));
      if (orphaned.length) {
        const results = await Promise.allSettled(orphaned.map((d) => (isMockMode ? Promise.resolve(d) : crmApi.update<Deal>("deal", d.id, d, scope ?? undefined).then(normalizeDeal))));
        const ok = new Map(results.flatMap((r) => (r.status === "fulfilled" ? [[r.value.id, r.value] as const] : [])));
        setDeals((rows) => rows.map((d) => ok.get(d.id) ?? d));
      }
      void logActivity("contact_created", `Merged duplicate contact into ${fullName(merged)}`, merged.id);
      setSelected([]);
      setMergePair(null);
      setDetailId(null);
      toast.success(`Merged into ${fullName(merged)}`);
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setIsSaving(false); }
  };

  const handleImport = async (rows: Record<string, string>[]) => {
    const defaultOwner = assignees[0];
    const known = new Set(contacts.map((c) => c.email.trim().toLowerCase()));
    const drafts: Contact[] = [];
    let skipped = 0;
    rows.forEach((r) => {
      const email = (r.email ?? "").trim().toLowerCase();
      if (!email || known.has(email)) { skipped += 1; return; }
      known.add(email);
      const owner = assignees.find((m) => m.name.toLowerCase() === (r.ownername ?? "").trim().toLowerCase()) ?? defaultOwner;
      const company = r.company ?? "";
      drafts.push(normalizeContact({
        id: newId("c"), firstName: r.firstname || "Imported", lastName: r.lastname || "", email: r.email!.trim(),
        phone: parsePhone(r.phone) ?? "", company, companyId: company ? `co_${company.toLowerCase().replace(/[^a-z0-9]+/g, "_")}` : "",
        role: r.role, department: r.department, website: r.website, linkedIn: r.linkedin, location: r.location,
        streetAddress: r.streetaddress, city: r.city, state: r.state, zipCode: r.zipcode, country: r.country,
        ownerId: owner?.id ?? "", ownerName: owner?.name ?? "Unassigned", tags: listValues(r.tags || ""), groups: listValues(r.groups || ""),
        status: (CONTACT_STATUSES.includes(r.status as ContactStatus) ? r.status : "lead") as ContactStatus,
      }));
    });
    if (drafts.length === 0) { toast.error(skipped ? "All rows were skipped (missing or duplicate email)" : "Nothing to import"); return; }
    setIsSaving(true);
    const results = await Promise.allSettled(drafts.map((c) =>
      isMockMode ? Promise.resolve(c) : crmApi.create<Contact>("contact", c, scope ?? undefined).then(normalizeContact)));
    const saved = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
    setContacts((current) => [...saved, ...current]);
    saved.forEach((c) => void logActivity("contact_created", `Imported contact ${fullName(c)}`, c.id));
    if (saved.length) toast.success(`Imported ${saved.length} contact${saved.length === 1 ? "" : "s"}`);
    if (skipped) toast.info(`${skipped} row${skipped === 1 ? "" : "s"} skipped (missing or duplicate email)`);
    if (saved.length !== drafts.length) toast.error(`${drafts.length - saved.length} row${drafts.length - saved.length === 1 ? "" : "s"} could not be imported`);
    setIsSaving(false);
  };

  const handleCreateTask = async (values: TaskDialogValues) => {
    if (!taskTarget || isSaving) return;
    const now = new Date().toISOString();
    const task: CrmTask = {
      id: newId("t"), title: values.title, description: values.description || `Task for ${fullName(taskTarget)}`,
      type: values.type, priority: values.priority, status: "pending",
      assigneeId: taskTarget.ownerId, assigneeName: taskTarget.ownerName || "Unassigned",
      dueDate: values.dueDate, dueTime: "09:00", reminder: "none",
      relatedContactId: taskTarget.id, relatedContactName: fullName(taskTarget), tags: [], createdAt: now, updatedAt: now,
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
      if (type !== "note_added") {
        await persistContacts([{ ...logTarget, lastContacted: new Date().toISOString(), updatedAt: new Date().toISOString() }]);
      }
      toast.success("Activity logged");
      setLogTarget(null);
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setIsSaving(false); }
  };

  const handleCreateDeal = async (form: DealFormValues) => {
    if (isSaving) return;
    if (!form.name?.trim()) { toast.error("Deal name is required"); return; }
    const value = Number(form.value || 0);
    const probability = Number(form.probability || 0);
    if (!Number.isFinite(value) || value < 0) { toast.error("Value must be a positive number"); return; }
    if (!Number.isFinite(probability) || probability < 0 || probability > 100) { toast.error("Probability must be between 0 and 100"); return; }
    const owner = assignees.find((m) => m.id === form.ownerId);
    const draft = normalizeDeal({
      id: newId("d"), name: form.name.trim(), companyId: form.companyId, companyName: (form.companyName ?? "").trim(),
      primaryContactId: form.primaryContactId, primaryContactName: form.primaryContactName,
      pipelineId: form.pipelineId, stage: form.stage as Deal["stage"], value, probability, cost: Number(form.cost || 0),
      expectedCloseDate: form.expectedCloseDate, ownerId: owner?.id ?? "", ownerName: owner?.name ?? "Unassigned",
      source: form.source as Deal["source"], campaign: form.campaign, products: form.products,
      tags: listValues(form.tags ?? ""), notes: form.notes, priority: form.priority as Deal["priority"],
    });
    setIsSaving(true);
    try {
      const saved = isMockMode ? draft : normalizeDeal(await crmApi.create("deal", draft, scope ?? undefined));
      setDeals((rows) => [saved, ...rows]);
      if (dealTarget) void logActivity("deal_created", `Created deal “${saved.name}”`, dealTarget.id);
      toast.success("Deal created — find it on the Pipeline page");
      setDealTarget(null);
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setIsSaving(false); }
  };

  const openCreate = () => { setFormKey((k) => k + 1); setShowCreate(true); };
  const openEdit = (contact: Contact) => { setFormKey((k) => k + 1); setEditTarget(contact); };
  const openTask = (contact: Contact) => { setFormKey((k) => k + 1); setTaskTarget(contact); };
  const openDeal = (contact: Contact) => { setFormKey((k) => k + 1); setDealTarget(contact); };
  const openLog = (contact: Contact) => { setFormKey((k) => k + 1); setLogTarget(contact); };
  const openGroupAssign = (ids: string[]) => { setFormKey((k) => k + 1); setGroupTargets(ids); };

  /* ---- Table columns ---- */
  const columns: DataTableColumn<Contact>[] = [
    {
      id: "contact", header: "Contact", sortField: "lastName", width: "min-w-[180px]",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-indigo-100/50 bg-gradient-to-br from-indigo-50 to-blue-100 text-[13px] font-bold text-indigo-700 shadow-sm">
            {contactInitials(row)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-slate-800">{fullName(row)}</p>
            <p className="truncate text-[12px] text-slate-500">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      id: "company", header: "Company", hideBelow: "lg", sortField: "company",
      cell: (row) => (
        <div>
          <p className="text-[12px] text-[#354568]">{row.company || "—"}</p>
          <p className="text-[12px] text-[#75829D]">{row.role}</p>
        </div>
      ),
    },
    { id: "phone", header: "Phone", hideBelow: "xl", cell: (row) => <span className="text-[12px] text-[#354568]">{row.phone || "—"}</span> },
    {
      id: "tags", header: "Tags", hideBelow: "lg",
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.tags.slice(0, 2).map((t) => <Badge key={t} tone="info">{t}</Badge>)}
          {row.tags.length > 2 && <Badge tone="neutral">+{row.tags.length - 2}</Badge>}
        </div>
      ),
    },
    { id: "owner", header: "Owner", hideBelow: "lg", sortField: "ownerName", cell: (row) => <span className="text-[12px] text-[#354568]">{row.ownerName}</span> },
    {
      id: "status", header: "Status", sortField: "status",
      cell: (row) => (
        <span className={`inline-block w-[80px] rounded-lg px-2 py-0.5 text-center text-[12px] font-medium tracking-wide ${STATUS_BADGE[row.status]}`}>
          {CONTACT_STATUS_LABELS[row.status]}
        </span>
      ),
    },
    {
      id: "lastContacted", header: "Last Contact", hideBelow: "xl", sortField: "lastContacted",
      cell: (row) => <span className="text-[12px] text-[#75829D]">{row.lastContacted ? shortDate(row.lastContacted) : "—"}</span>,
    },
    {
      id: "actions", header: "", width: "w-10",
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${fullName(row)}`}><MoreHorizontal className="size-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={() => setDetailId(row.id)}><Eye /> View</DropdownMenuItem>
            <DropdownMenuItem onClick={() => openEdit(row)}><Pencil /> Edit</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => openLog(row)}><History /> Log Activity</DropdownMenuItem>
            <DropdownMenuItem onClick={() => openTask(row)}><Calendar /> Add Task</DropdownMenuItem>
            <DropdownMenuItem onClick={() => openDeal(row)}><BriefcaseBusiness /> Create Deal</DropdownMenuItem>
            <DropdownMenuItem onClick={() => openGroupAssign([row.id])}><Tag /> Add to Group</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(row)}><Trash2 /> Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const selection: DataTableSelection = { selectedIds: selected, onChange: setSelected };

  const createAction = <Button size="sm" onClick={openCreate}><Plus className="size-3.5" /> Create Contact</Button>;
  const emptyState = (
    <EmptyState
      icon={Users}
      title={contacts.length === 0 ? "No contacts yet" : "No contacts found"}
      description={contacts.length === 0 ? "Create your first contact or import a CSV." : "Adjust your search or filters."}
      action={contacts.length === 0 ? createAction : undefined}
    />
  );

  const relatedDeals = detail ? deals.filter((d) => d.primaryContactId === detail.id) : [];
  const relatedTasks = detail ? tasks.filter((t) => t.relatedContactId === detail.id) : [];
  const detailActivity = detail ? activities.filter((a) => a.entityId === detail.id) : [];
  const detailComms = detailActivity.filter((a) => COMMUNICATION_TYPES.includes(a.type));

  return (
    <div className="space-y-4">
      <AdminPageTitle
        eyebrow="CRM / Contacts"
        title="Contacts"
        description="Manage Customer Relationships, Communication History And Contact Segments."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowImport(true)}><Upload className="size-3.5" /> Import</Button>
            <Button variant="outline" size="sm" onClick={handleExport}><Download className="size-3.5" /> Export</Button>
            <Button variant="outline" size="sm" onClick={() => setShowGroups(true)}><FolderCog className="size-3.5" /> Groups</Button>
            <Button variant="outline" size="sm" onClick={openMerge} disabled={selected.length !== 2} title={selected.length === 2 ? "Merge the two selected contacts" : "Select exactly 2 contacts to merge"}>
              <Merge className="size-3.5" /> Merge
            </Button>
            {createAction}
          </div>
        }
      />

      <ContactMetricCards contacts={contacts} />

      <FilterBar
        search={<SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search name, email, phone, company..." />}
        filters={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={statusFilter ?? ALL} onValueChange={(v) => { setStatusFilter(v === ALL ? null : v); setPage(1); }}>
              <SelectTrigger size="sm" className="w-auto min-w-[8rem]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Statuses</SelectItem>
                {CONTACT_STATUSES.map((s) => <SelectItem key={s} value={s}>{CONTACT_STATUS_LABELS[s]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={groupFilter ?? ALL} onValueChange={(v) => { setGroupFilter(v === ALL ? null : v); setPage(1); }}>
              <SelectTrigger size="sm" className="w-auto min-w-[8rem]"><SelectValue placeholder="Group" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Groups</SelectItem>
                {groupNames.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={ownerFilter ?? ALL} onValueChange={(v) => { setOwnerFilter(v === ALL ? null : v); setPage(1); }}>
              <SelectTrigger size="sm" className="w-auto min-w-[8rem]"><SelectValue placeholder="Owner" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Owners</SelectItem>
                <SelectItem value="__none__">Unassigned</SelectItem>
                {ownerOptions.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {tagOptions.length > 0 ? (
              <Select value={tagFilter ?? ALL} onValueChange={(v) => { setTagFilter(v === ALL ? null : v); setPage(1); }}>
                <SelectTrigger size="sm" className="w-auto min-w-[7rem]"><SelectValue placeholder="Tag" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All Tags</SelectItem>
                  {tagOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : null}
          </div>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {selected.length > 0 ? (
              <>
                <span className="text-[12px] text-[#75829D] font-medium">{selected.length} Selected</span>
                <Button variant="outline" size="sm" onClick={() => { setFormKey((k) => k + 1); setBulkStatusOpen(true); }}><UserCheck className="size-3.5" /> Status</Button>
                <Button variant="outline" size="sm" onClick={() => openGroupAssign(selected)}><FolderPlus className="size-3.5" /> Group</Button>
                <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}><Trash2 className="size-3.5" /> Delete</Button>
              </>
            ) : null}
            <Button variant={viewMode === "list" ? "default" : "ghost"} size="sm" aria-label="List view" onClick={() => setViewMode("list")}><List className="size-3.5" /></Button>
            <Button variant={viewMode === "grid" ? "default" : "ghost"} size="sm" aria-label="Grid view" onClick={() => setViewMode("grid")}><Grid3X3 className="size-3.5" /></Button>
          </div>
        }
        activeFilterCount={activeFilterCount + (search.trim() ? 1 : 0)}
        onClearFilters={() => { setStatusFilter(null); setGroupFilter(null); setOwnerFilter(null); setTagFilter(null); setSearch(""); setPage(1); }}
      />

      {viewMode === "list" ? (
        <DataTable
          columns={columns} rows={paginated} getRowId={(r) => r.id} isLoading={isLoading} error={loadError}
          onRetry={() => void load()} sort={sort} onToggleSort={handleSort} pagination={pagination}
          onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          selection={selection} onRowClick={(r) => setDetailId(r.id)} enableColumnVisibility emptyState={emptyState}
        />
      ) : (
        <div className="space-y-3">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {isLoading ? (
              Array.from({ length: 4 }, (_, i) => <div key={i} className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />)
            ) : paginated.length === 0 ? (
              <div className="col-span-full">{emptyState}</div>
            ) : paginated.map((c) => {
              const tel = telLink(c.phone);
              const wa = whatsappLink(c.phone);
              return (
                <div
                  key={c.id} role="button" tabIndex={0}
                  className="flex cursor-pointer flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                  onClick={() => setDetailId(c.id)}
                  onKeyDown={(e) => { if (e.key === "Enter") setDetailId(c.id); }}
                >
                  <div className="mb-3 flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-indigo-100/50 bg-gradient-to-br from-indigo-50 to-blue-100 text-[14px] font-bold text-indigo-700 shadow-sm">
                      {contactInitials(c)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-slate-800">{fullName(c)}</p>
                      <p className="truncate text-[12px] text-slate-500">{[c.role, c.company].filter(Boolean).join(" · ") || c.email}</p>
                    </div>
                  </div>
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {c.tags.slice(0, 3).map((t) => <Badge key={t} tone="info" className="rounded-md text-[11px] font-medium">{t}</Badge>)}
                  </div>
                  <div className="mt-auto flex items-center gap-1.5 border-t border-slate-100 pt-3">
                    {tel ? <a href={tel} onClick={(e) => e.stopPropagation()} aria-label={`Call ${fullName(c)}`} className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "size-8 rounded-lg hover:bg-indigo-50 hover:text-indigo-600")}><Phone className="size-3.5" /></a> : null}
                    {c.email ? <a href={`mailto:${c.email}`} onClick={(e) => e.stopPropagation()} aria-label={`Email ${fullName(c)}`} className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "size-8 rounded-lg hover:bg-indigo-50 hover:text-indigo-600")}><Mail className="size-3.5" /></a> : null}
                    {wa ? <a href={wa} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} aria-label={`WhatsApp ${fullName(c)}`} className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "size-8 rounded-lg hover:bg-indigo-50 hover:text-indigo-600")}><MessageSquare className="size-3.5" /></a> : null}
                    <span className={`ml-auto inline-block rounded-lg px-2 py-0.5 text-[11px] font-medium tracking-wide ${STATUS_BADGE[c.status]}`}>{CONTACT_STATUS_LABELS[c.status]}</span>
                  </div>
                </div>
              );
            })}
          </div>
          {filtered.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-slate-500">
              <span>{(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}</span>
              <div className="flex items-center gap-2">
                <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                  <SelectTrigger size="sm" className="w-auto min-w-[5.5rem]"><SelectValue /></SelectTrigger>
                  <SelectContent>{[10, 20, 40].map((n) => <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>)}</SelectContent>
                </Select>
                <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>Next</Button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ---- Contact Detail Sheet ---- */}
      <Sheet open={!!detail} onOpenChange={(open) => { if (!open) setDetailId(null); }}>
        <SheetContent side="right" className="w-full max-w-lg">
          <SheetHeader>
            <SheetTitle>{detail ? fullName(detail) : ""}</SheetTitle>
          </SheetHeader>
          <SheetBody>
            {detail && (
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="communication">Communication</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-3 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-block rounded-lg px-2 py-0.5 text-[12px] font-semibold ${STATUS_BADGE[detail.status]}`}>{CONTACT_STATUS_LABELS[detail.status]}</span>
                    {telLink(detail.phone) ? <a href={telLink(detail.phone)!} className={buttonVariants({ variant: "outline", size: "xs" })}><Phone className="size-3" /> Call</a> : null}
                    {detail.email ? <a href={`mailto:${detail.email}`} className={buttonVariants({ variant: "outline", size: "xs" })}><Mail className="size-3" /> Email</a> : null}
                    {whatsappLink(detail.phone) ? <a href={whatsappLink(detail.phone)!} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "outline", size: "xs" })}><MessageSquare className="size-3" /> WhatsApp</a> : null}
                  </div>
                  <div className="space-y-2 rounded-sm border border-[#DDE4ED] p-3">
                    <h3 className="text-[12px] font-semibold text-[#27375D]">Contact Information</h3>
                    <div className="grid grid-cols-2 gap-2 text-[12px]">
                      <div><span className="text-[#75829D]">Email:</span> <span className="break-all text-[#354568]">{detail.email || "—"}</span></div>
                      <div><span className="text-[#75829D]">Phone:</span> <span className="text-[#354568]">{detail.phone || "—"}</span></div>
                      <div><span className="text-[#75829D]">Company:</span> <span className="text-[#354568]">{detail.company || "—"}</span></div>
                      <div><span className="text-[#75829D]">Role:</span> <span className="text-[#354568]">{detail.role || "—"}</span></div>
                      <div><span className="text-[#75829D]">Department:</span> <span className="text-[#354568]">{detail.department || "—"}</span></div>
                      <div><span className="text-[#75829D]">Location:</span> <span className="text-[#354568]">{detail.location || [detail.city, detail.state, detail.country].filter(Boolean).join(", ") || "—"}</span></div>
                      <div><span className="text-[#75829D]">Owner:</span> <span className="text-[#354568]">{detail.ownerName}</span></div>
                      <div><span className="text-[#75829D]">LinkedIn:</span> <span className="break-all text-[#354568]">{detail.linkedIn || "—"}</span></div>
                      <div><span className="text-[#75829D]">Last contact:</span> <span className="text-[#354568]">{detail.lastContacted ? shortDate(detail.lastContacted) : "—"}</span></div>
                      <div><span className="text-[#75829D]">Next follow-up:</span> <span className="text-[#354568]">{detail.nextFollowUp ? shortDate(detail.nextFollowUp) : "—"}</span></div>
                    </div>
                  </div>
                  <div className="space-y-2 rounded-sm border border-[#DDE4ED] p-3">
                    <h3 className="text-[12px] font-semibold text-[#27375D]">Groups</h3>
                    <div className="flex flex-wrap gap-1">
                      {detail.groups.length === 0 ? <span className="text-[12px] text-[#75829D]">Not in any group.</span> : detail.groups.map((g) => <Badge key={g} tone="brand">{g}</Badge>)}
                    </div>
                  </div>
                  {detail.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">{detail.tags.map((t) => <Badge key={t} tone="info">{t}</Badge>)}</div>
                  )}
                  {detail.notes ? (
                    <div className="rounded-sm border border-[#DDE4ED] bg-slate-50/50 p-3">
                      <h3 className="mb-1 text-[12px] font-semibold text-[#27375D]">Notes</h3>
                      <p className="whitespace-pre-wrap text-[12px] text-[#354568]">{detail.notes}</p>
                    </div>
                  ) : null}
                  <div className="space-y-2 rounded-sm border border-[#DDE4ED] p-3">
                    <h3 className="text-[12px] font-semibold text-[#27375D]">Deals ({relatedDeals.length})</h3>
                    {relatedDeals.length === 0 ? <p className="text-[12px] text-[#75829D]">No deals linked to this contact.</p> : (
                      <ul className="space-y-1.5">
                        {relatedDeals.map((d) => (
                          <li key={d.id} className="flex items-center justify-between gap-2 text-[12px]">
                            <Link href={crmLink("pipeline", d.id)} className="truncate font-medium text-indigo-700 underline-offset-2 hover:underline">{d.name}</Link>
                            <span className="shrink-0 text-[#75829D]">{DEAL_STAGE_LABELS[d.stage]} · {formatInr(d.value)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="space-y-2 rounded-sm border border-[#DDE4ED] p-3">
                    <h3 className="text-[12px] font-semibold text-[#27375D]">Tasks ({relatedTasks.length})</h3>
                    {relatedTasks.length === 0 ? <p className="text-[12px] text-[#75829D]">No tasks linked to this contact.</p> : (
                      <ul className="space-y-1.5">
                        {relatedTasks.map((t) => (
                          <li key={t.id} className="flex items-center justify-between gap-2 text-[12px]">
                            <Link href={crmLink("tasks", t.id)} className="truncate font-medium text-indigo-700 underline-offset-2 hover:underline">{t.title}</Link>
                            <span className="shrink-0 text-[#75829D]">{t.status.replace("_", " ")} · due {shortDate(t.dueDate)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {detail.sourceLeadId ? (
                    <p className="text-[12px] text-[#75829D]">Converted from a lead · <Link href={crmLink("leads", detail.sourceLeadId)} className="font-medium text-indigo-700 hover:underline">View lead</Link></p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <CrmAiInsights kind="contact" recordId={detail.id} label={fullName(detail)} scope={scope} />
                    <Button size="sm" variant="outline" onClick={() => { const c = detail; setDetailId(null); openEdit(c); }}><Pencil className="size-3.5" /> Edit</Button>
                    <Button size="sm" variant="outline" onClick={() => openTask(detail)}><Calendar className="size-3.5" /> Add Task</Button>
                    <Button size="sm" variant="outline" onClick={() => openGroupAssign([detail.id])}><Tag className="size-3.5" /> Group</Button>
                    <Button size="sm" onClick={() => openDeal(detail)}><BriefcaseBusiness className="size-3.5" /> Create Deal</Button>
                    <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(detail)}><Trash2 className="size-3.5" /> Delete</Button>
                  </div>
                </TabsContent>

                <TabsContent value="communication" className="mt-3 space-y-3">
                  <Button size="sm" onClick={() => openLog(detail)}><Plus className="size-3.5" /> Log Activity</Button>
                  <CrmTimeline entries={detailComms} emptyLabel="No calls, emails, meetings or notes logged yet." />
                </TabsContent>

                <TabsContent value="activity" className="mt-3">
                  <CrmTimeline entries={detailActivity} />
                </TabsContent>
              </Tabs>
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>

      {/* ---- Create / Edit Contact ---- */}
      <ContactFormModal
        key={`create-${formKey}`} open={showCreate} onOpenChange={setShowCreate} title="Create Contact" submitLabel="Save Contact"
        isSaving={isSaving} assignees={assignees} groupNames={groupNames} onSubmit={handleCreate}
        initial={{ status: "lead", country: "India", ownerId: assignees[0]?.id ?? "" }}
      />
      <ContactFormModal
        key={`edit-${editTarget?.id ?? "none"}-${formKey}`} open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}
        title="Edit Contact" submitLabel="Update Contact" isSaving={isSaving} assignees={assignees} groupNames={groupNames}
        onSubmit={handleEdit} initial={editTarget ? contactFormValues(editTarget) : undefined}
      />

      {/* ---- Import ---- */}
      <CrmImportDialog
        open={showImport} onClose={() => setShowImport(false)} entityLabel="contacts"
        requiredColumns={["firstname", "lastname", "email"]}
        validate={(values) => {
          const errors: string[] = [];
          if (!isValidOptionalPhone(values.phone)) errors.push(`Phone "${values.phone}" must be 10 digits`);
          if (values.status && !CONTACT_STATUSES.includes(values.status as ContactStatus)) errors.push(`Unknown status "${values.status}"`);
          return errors;
        }}
        columnsHint="Required: firstName, lastName, email. Optional: phone, company, role, department, status, tags, groups, ownerName, location, city, state, country, website, linkedIn. Separate multiple tags/groups with ;"
        sample={"firstName,lastName,email,phone,company,role,status,tags,groups\nJohn,Doe,john@example.com,+91 90000 00000,Acme Corp,Manager,lead,imported;vip,Enterprise"}
        onImport={handleImport}
      />

      {/* ---- Merge ---- */}
      <MergeContactsDialog open={!!mergePair} onClose={() => setMergePair(null)} pair={mergePair} onMerge={(m, id) => void handleMerge(m, id)} />

      {/* ---- Groups ---- */}
      <ManageGroupsDialog
        open={showGroups} onClose={() => setShowGroups(false)} groups={groups} counts={groupCounts}
        isSaving={isSaving} onCreate={handleCreateGroup} onDelete={handleDeleteGroup}
      />
      <AssignGroupsDialog
        key={`assign-${formKey}`} open={!!groupTargets} onClose={() => setGroupTargets(null)}
        groups={groups.length ? groups : groupNames.map((name) => ({ id: name, name, description: "", contactCount: 0, createdAt: "" }))}
        subject={groupTargets && groupTargets.length === 1 ? "this contact" : `${groupTargets?.length ?? 0} contacts`}
        isSaving={isSaving} onApply={handleAssignGroups}
      />

      {/* ---- Task / Log / Deal ---- */}
      <CrmTaskDialog
        key={`task-${taskTarget?.id ?? "none"}-${formKey}`} open={!!taskTarget} onClose={() => setTaskTarget(null)}
        linkedTo={taskTarget ? fullName(taskTarget) : ""} defaultTitle={taskTarget ? `Follow up with ${fullName(taskTarget)}` : ""}
        isSaving={isSaving} onSubmit={handleCreateTask}
      />
      <LogActivityDialog
        key={`log-${logTarget?.id ?? "none"}-${formKey}`} open={!!logTarget} onClose={() => setLogTarget(null)}
        subject={logTarget ? fullName(logTarget) : ""} isSaving={isSaving} onSubmit={handleLogActivity}
      />
      <DealFormModal
        key={`deal-${dealTarget?.id ?? "none"}-${formKey}`} open={!!dealTarget} onOpenChange={(open) => { if (!open) setDealTarget(null); }}
        title="Create Deal" submitLabel="Save Deal" isSaving={isSaving} contacts={contacts} pipelines={allPipelines}
        assignees={assignees} onSubmit={handleCreateDeal}
        initial={dealTarget ? {
          name: `${dealTarget.company || fullName(dealTarget)} deal`, primaryContactId: dealTarget.id,
          primaryContactName: fullName(dealTarget), companyName: dealTarget.company, companyId: dealTarget.companyId,
          ownerId: dealTarget.ownerId, pipelineId: BUILTIN_PIPELINE.id, stage: "new", probability: "20", priority: "medium", source: "manual",
        } : undefined}
      />

      {/* ---- Bulk status ---- */}
      <Dialog open={bulkStatusOpen} onOpenChange={setBulkStatusOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Status</DialogTitle>
            <DialogDescription>Set a new status for {selected.length} selected contact{selected.length === 1 ? "" : "s"}.</DialogDescription>
          </DialogHeader>
          <Select value={bulkStatus} onValueChange={setBulkStatus}>
            <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
            <SelectContent>{CONTACT_STATUSES.map((s) => <SelectItem key={s} value={s}>{CONTACT_STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkStatusOpen(false)}>Cancel</Button>
            <Button disabled={!bulkStatus || isSaving} onClick={() => void handleBulkStatus()}>{isSaving ? "Applying..." : "Apply"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Delete confirmations ---- */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete contact?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleteTarget ? fullName(deleteTarget) : ""}” will be removed from your contacts. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={isSaving} onClick={() => { if (deleteTarget) void handleDelete(deleteTarget.id); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.length} contact{selected.length === 1 ? "" : "s"}?</AlertDialogTitle>
            <AlertDialogDescription>The selected contacts will be removed. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={isSaving} onClick={() => void handleBulkDelete()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
