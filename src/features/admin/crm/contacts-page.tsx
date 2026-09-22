"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Plus, Download, Upload, Merge, Grid3X3, List, Eye, Pencil, Trash2,
  MoreHorizontal, Phone, Mail, MessageSquare, Building2, Tag, Users, Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { DataTable } from "@/components/shared/data-table/data-table";
import { SearchInput } from "@/components/shared/search-input";
import { FilterBar } from "@/components/shared/filter-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { AdminPageTitle } from "@/features/admin/shared/admin-page-title";
import type { DataTableColumn, DataTableSelection } from "@/components/shared/data-table/types";
import type { PaginationMeta, SortSpec } from "@/types/api";
import { ContactMetricCards } from "./components/crm-metric-cards";
import { CrmImportDialog } from "./components/crm-import-dialog";
import { MergeContactsDialog } from "./components/merge-contacts-dialog";
import { contacts as initialContacts, activities, contactGroups, teamMembers } from "./data/crm-data";
import { exportContactsCsv, listValues } from "./lib/csv";
import type { Contact, ContactStatus, ContactViewMode } from "./types";
import { formatDate } from "@/lib/utils/format";

/* ------------------------------------------------------------------ */
/* Constants                                                            */
/* ------------------------------------------------------------------ */

const STATUS_OPTIONS: ContactStatus[] = ["active", "inactive", "lead", "customer", "prospect"];
const STATUS_LABELS: Record<ContactStatus, string> = { active: "Active", inactive: "Inactive", lead: "Lead", customer: "Customer", prospect: "Prospect" };
const STATUS_BADGE: Record<ContactStatus, string> = {
  active: "bg-emerald-50 text-emerald-700 border border-emerald-200/50 shadow-sm",
  inactive: "bg-slate-50 text-slate-600 border border-slate-200/50 shadow-sm",
  lead: "bg-blue-50 text-blue-700 border border-blue-200/50 shadow-sm",
  customer: "bg-indigo-50 text-indigo-700 border border-indigo-200/50 shadow-sm",
  prospect: "bg-amber-50 text-amber-700 border border-amber-200/50 shadow-sm",
};

/* ------------------------------------------------------------------ */
/* Main Page                                                            */
/* ------------------------------------------------------------------ */

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<SortSpec | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ContactViewMode>("list");
  const [detailContact, setDetailContact] = useState<Contact | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [mergePair, setMergePair] = useState<[Contact, Contact] | null>(null);

  /* ---- Derived data ---- */
  const filtered = useMemo(() => {
    let result = contacts;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.company.toLowerCase().includes(q)
      );
    }
    if (statusFilter) result = result.filter((c) => c.status === statusFilter);
    if (groupFilter) result = result.filter((c) => c.groups.includes(groupFilter));
    if (sort) {
      result = [...result].sort((a, b) => {
        const av = a[sort.field as keyof Contact] ?? "";
        const bv = b[sort.field as keyof Contact] ?? "";
        return sort.direction === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
      });
    }
    return result;
  }, [contacts, search, statusFilter, groupFilter, sort]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const pagination: PaginationMeta = useMemo(() => ({
    page, pageSize, total: filtered.length,
    totalPages: Math.ceil(filtered.length / pageSize),
    hasNextPage: page < Math.ceil(filtered.length / pageSize),
    hasPreviousPage: page > 1,
  }), [page, pageSize, filtered.length]);

  /* ---- Actions ---- */
  const handleSort = useCallback((field: string) => {
    setSort((prev) =>
      prev?.field === field
        ? prev.direction === "asc" ? { field, direction: "desc" } : null
        : { field, direction: "asc" }
    );
  }, []);

  const handleDelete = (id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
    toast.success("Contact deleted");
    setDetailContact(null);
  };

  const handleExport = () => {
    const rows = selected.length > 0
      ? contacts.filter((c) => selected.includes(c.id))
      : filtered;
    if (rows.length === 0) {
      toast.error("Nothing to export");
      return;
    }
    exportContactsCsv(rows, selected.length > 0 ? "contacts-selected.csv" : "contacts.csv");
    toast.success(`Exported ${rows.length} contact${rows.length === 1 ? "" : "s"}`);
  };

  const openMerge = () => {
    if (selected.length !== 2) {
      toast.error("Select exactly 2 contacts to merge");
      return;
    }
    const pair = selected
      .map((id) => contacts.find((c) => c.id === id))
      .filter((c): c is Contact => Boolean(c));
    const [first, second] = pair;
    if (!first || !second) {
      toast.error("Selected contacts not found");
      return;
    }
    setMergePair([first, second]);
  };

  const handleMerge = (merged: Contact, secondaryId: string) => {
    setContacts((prev) =>
      prev
        .filter((c) => c.id !== secondaryId)
        .map((c) => (c.id === merged.id ? merged : c))
    );
    setSelected([]);
    setMergePair(null);
    setDetailContact(null);
    toast.success(`Merged into ${merged.firstName} ${merged.lastName}`);
  };

  const handleImport = (rows: Record<string, string>[]) => {
    const now = new Date().toISOString();
    const imported: Contact[] = rows.map((r, index) => ({
      id: `c${Date.now()}_${index}`,
      firstName: r.firstname || "Imported",
      lastName: r.lastname || "",
      email: r.email || "",
      phone: r.phone || "",
      company: r.company || "",
      companyId: "co_imported",
      role: r.role || "",
      department: r.department || "",
      website: r.website || "",
      linkedIn: r.linkedin || "",
      location: r.location || "",
      streetAddress: r.streetaddress || "",
      city: r.city || "",
      state: r.state || "",
      zipCode: r.zipcode || "",
      country: r.country || "",
      ownerId: "u1",
      ownerName: r.ownername || "Priya Sharma",
      tags: listValues(r.tags || ""),
      groups: listValues(r.groups || ""),
      status: (STATUS_OPTIONS.includes(r.status as ContactStatus) ? r.status : "lead") as ContactStatus,
      lastContacted: "",
      nextFollowUp: "",
      createdAt: now,
      updatedAt: now,
    }));
    setContacts((prev) => [...imported, ...prev]);
    toast.success(`Imported ${imported.length} contact${imported.length === 1 ? "" : "s"}`);
  };

  /* ---- Table columns ---- */
  const columns: DataTableColumn<Contact>[] = useMemo(() => [
    {
      id: "contact",
      header: "Contact",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-blue-100 text-[13px] font-bold text-indigo-700 shadow-sm border border-indigo-100/50">
            {row.firstName[0]}{row.lastName[0]}
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-slate-800 truncate">{row.firstName} {row.lastName}</p>
            <p className="text-[12px] text-slate-500 truncate">{row.email}</p>
          </div>
        </div>
      ),
      sortField: "lastName",
      width: "min-w-[180px]",
    },
    {
      id: "company",
      header: "Company",
      cell: (row) => (
        <div>
          <p className="text-[12px] text-[#354568]">{row.company}</p>
          <p className="text-[12px] text-[#75829D]">{row.role}</p>
        </div>
      ),
      hideBelow: "lg",
    },
    {
      id: "phone",
      header: "Phone",
      cell: (row) => <span className="text-[12px] text-[#354568]">{row.phone}</span>,
      hideBelow: "xl",
    },
    {
      id: "tags",
      header: "Tags",
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.tags.slice(0, 2).map((t) => <Badge key={t} tone="info">{t}</Badge>)}
          {row.tags.length > 2 && <Badge tone="neutral">+{row.tags.length - 2}</Badge>}
        </div>
      ),
      hideBelow: "lg",
    },
    {
      id: "owner",
      header: "Owner",
      cell: (row) => <span className="text-[12px] text-[#354568]">{row.ownerName}</span>,
      sortField: "ownerName",
      hideBelow: "lg",
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => (
        <span className={`inline-block w-[80px] text-center rounded-lg px-2 py-0.5 text-[12px] font-medium tracking-wide ${STATUS_BADGE[row.status]}`}>
          {STATUS_LABELS[row.status]}
        </span>
      ),
      sortField: "status",
    },
    {
      id: "lastContacted",
      header: "Last Contact",
      cell: (row) => (
        <span className="text-[12px] text-[#75829D]">
          {row.lastContacted ? new Date(row.lastContacted).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
        </span>
      ),
      sortField: "lastContacted",
      hideBelow: "xl",
    },
    {
      id: "actions",
      header: "",
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon-sm"><MoreHorizontalIcon /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={() => setDetailContact(row)}><Eye /> View</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDetailContact(row)}><Pencil /> Edit</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => toast.info("Task created")}><Calendar /> Add Task</DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast.info("Added to group")}><Tag /> Add to Group</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => handleDelete(row.id)}><Trash2 /> Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      width: "w-10",
    },
  ], []);

  const selection: DataTableSelection = { selectedIds: selected, onChange: setSelected };

  return (
    <div className="space-y-4">
      <AdminPageTitle
        eyebrow="CRM / Contacts"
        title="Contacts"
        description="Manage customer relationships, communication history and contact segments."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowImport(true)}><Upload className="size-3.5" /> Import</Button>
            <Button variant="outline" size="sm" onClick={handleExport}><Download className="size-3.5" /> Export</Button>
            <Button variant="outline" size="sm" onClick={openMerge} disabled={selected.length > 0 && selected.length !== 2}><Merge className="size-3.5" /> Merge</Button>
            <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="size-3.5" /> Create Contact</Button>
          </div>
        }
      />

      <ContactMetricCards contacts={contacts} />

      <FilterBar
        search={<SearchInput value={search} onChange={setSearch} placeholder="Search contacts..." />}
        filters={
          <div className="flex items-center gap-2">
            <Select value={statusFilter ?? "__all__"} onValueChange={(v) => setStatusFilter(v === "__all__" ? null : v)}>
              <SelectTrigger size="sm" className="w-auto min-w-[8rem]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Status</SelectItem>
                {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={groupFilter ?? "__all__"} onValueChange={(v) => setGroupFilter(v === "__all__" ? null : v)}>
              <SelectTrigger size="sm" className="w-auto min-w-[8rem]"><SelectValue placeholder="Group" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Groups</SelectItem>
                {contactGroups.map((g) => <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            {selected.length > 0 && (
              <span className="text-[12px] text-[#75829D]">{selected.length} selected</span>
            )}
            <Button variant={viewMode === "list" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("list")}><List className="size-3.5" /></Button>
            <Button variant={viewMode === "grid" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("grid")}><Grid3X3 className="size-3.5" /></Button>
          </div>
        }
        activeFilterCount={(statusFilter ? 1 : 0) + (groupFilter ? 1 : 0)}
        onClearFilters={() => { setStatusFilter(null); setGroupFilter(null); setSearch(""); }}
      />

      {viewMode === "list" ? (
        <DataTable
          columns={columns}
          rows={paginated}
          getRowId={(r) => r.id}
          isLoading={false}
          sort={sort}
          onToggleSort={handleSort}
          pagination={pagination}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          selection={selection}
          onRowClick={(r) => setDetailContact(r)}
          enableColumnVisibility
          emptyState={
            <EmptyState icon={Users} title="No contacts found" description="Create your first contact or adjust filters."
              action={<Button size="sm" onClick={() => setShowCreate(true)}><Plus className="size-3.5" /> Create Contact</Button>}
            />
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-4">
          {paginated.map((c) => (
            <div key={c.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer" onClick={() => setDetailContact(c)}>
              <div className="flex items-center gap-3 mb-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-blue-100 text-[14px] font-bold text-indigo-700 shadow-sm border border-indigo-100/50">
                  {c.firstName[0]}{c.lastName[0]}
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-slate-800 truncate">{c.firstName} {c.lastName}</p>
                  <p className="text-[12px] text-slate-500 truncate">{c.role} · {c.company}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {c.tags.slice(0, 3).map((t) => <Badge key={t} tone="info" className="rounded-md font-medium text-[11px]">{t}</Badge>)}
              </div>
              <div className="mt-auto flex items-center gap-1.5 pt-3 border-t border-slate-100">
                <Button variant="ghost" size="icon-sm" className="h-8 w-8 rounded-lg hover:bg-indigo-50 hover:text-indigo-600" onClick={(e) => { e.stopPropagation(); toast.info("Calling..."); }}><Phone className="size-3.5" /></Button>
                <Button variant="ghost" size="icon-sm" className="h-8 w-8 rounded-lg hover:bg-indigo-50 hover:text-indigo-600" onClick={(e) => { e.stopPropagation(); toast.info("Emailing..."); }}><Mail className="size-3.5" /></Button>
                <Button variant="ghost" size="icon-sm" className="h-8 w-8 rounded-lg hover:bg-indigo-50 hover:text-indigo-600" onClick={(e) => { e.stopPropagation(); toast.info("Messaging..."); }}><MessageSquare className="size-3.5" /></Button>
                <span className={`ml-auto inline-block rounded-lg px-2 py-0.5 text-[11px] font-medium tracking-wide ${STATUS_BADGE[c.status]}`}>{STATUS_LABELS[c.status]}</span>
              </div>
            </div>
          ))}
          {paginated.length === 0 && (
            <div className="col-span-full">
              <EmptyState icon={Users} title="No contacts found" description="Create your first contact or adjust filters."
                action={<Button size="sm" onClick={() => setShowCreate(true)}><Plus className="size-3.5" /> Create Contact</Button>}
              />
            </div>
          )}
        </div>
      )}

      {/* ---- Contact Detail Sheet ---- */}
      <Sheet open={!!detailContact} onOpenChange={() => setDetailContact(null)}>
        <SheetContent side="right" className="w-full max-w-lg">
          <SheetHeader>
            <SheetTitle>{detailContact ? `${detailContact.firstName} ${detailContact.lastName}` : ""}</SheetTitle>
          </SheetHeader>
          <SheetBody>
            {detailContact && (
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="communication">Communication</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="space-y-3 mt-3">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block rounded-sm px-1.5 py-0.5 text-[12px] font-semibold ${STATUS_BADGE[detailContact.status]}`}>{STATUS_LABELS[detailContact.status]}</span>
                  </div>
                  <div className="rounded-sm border border-[#DDE4ED] p-3 space-y-2">
                    <h3 className="text-[12px] font-semibold text-[#27375D]">Contact Information</h3>
                    <div className="grid grid-cols-2 gap-2 text-[12px]">
                      <div><span className="text-[#75829D]">Email:</span> <span className="text-[#354568]">{detailContact.email}</span></div>
                      <div><span className="text-[#75829D]">Phone:</span> <span className="text-[#354568]">{detailContact.phone}</span></div>
                      <div><span className="text-[#75829D]">Company:</span> <span className="text-[#354568]">{detailContact.company}</span></div>
                      <div><span className="text-[#75829D]">Role:</span> <span className="text-[#354568]">{detailContact.role}</span></div>
                      <div><span className="text-[#75829D]">Department:</span> <span className="text-[#354568]">{detailContact.department}</span></div>
                      <div><span className="text-[#75829D]">Location:</span> <span className="text-[#354568]">{detailContact.location}</span></div>
                      <div><span className="text-[#75829D]">Owner:</span> <span className="text-[#354568]">{detailContact.ownerName}</span></div>
                      <div><span className="text-[#75829D]">LinkedIn:</span> <span className="text-[#354568]">{detailContact.linkedIn || "—"}</span></div>
                    </div>
                  </div>
                  <div className="rounded-sm border border-[#DDE4ED] p-3 space-y-2">
                    <h3 className="text-[12px] font-semibold text-[#27375D]">Groups</h3>
                    <div className="flex flex-wrap gap-1">
                      {detailContact.groups.map((g) => <Badge key={g} tone="brand">{g}</Badge>)}
                    </div>
                  </div>
                  {detailContact.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {detailContact.tags.map((t) => <Badge key={t} tone="info">{t}</Badge>)}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => toast.info("Task created")}><Calendar /> Add Task</Button>
                    <Button size="sm" onClick={() => toast.info("Creating deal...")}>Create Deal</Button>
                  </div>
                </TabsContent>
                <TabsContent value="communication" className="mt-3">
                  <div className="space-y-2">
                    {[
                      { type: "Email", subject: "Welcome to Moksha Sewa", date: "2026-09-18", direction: "Outbound" },
                      { type: "Call", subject: "Follow-up on proposal", date: "2026-09-15", direction: "Inbound" },
                      { type: "WhatsApp", subject: "Shared campaign details", date: "2026-09-10", direction: "Outbound" },
                    ].map((c, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-sm border border-[#DDE4ED] p-2">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-sm bg-[#EEF2F7]">
                          {c.type === "Email" ? <Mail className="size-3" /> : c.type === "Call" ? <Phone className="size-3" /> : <MessageSquare className="size-3" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-medium text-[#172044] truncate">{c.subject}</p>
                          <p className="text-[12px] text-[#75829D]">{c.type} · {c.direction} · {c.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="activity" className="mt-3">
                  <ActivityTimeline
                    entries={activities.filter((a) => a.entityId === detailContact.id || a.entityType === "contact").map((a) => ({
                      id: a.id, actor: a.actor, action: a.description, target: "", createdAt: a.createdAt,
                    }))}
                  />
                </TabsContent>
              </Tabs>
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>

      {/* ---- Import Contacts ---- */}
      <CrmImportDialog
        open={showImport}
        onClose={() => setShowImport(false)}
        entityLabel="contacts"
        requiredColumns={["firstname", "lastname", "email"]}
        validate={(values) => {
          const errors: string[] = [];
          if (values.status && !STATUS_OPTIONS.includes(values.status as ContactStatus)) {
            errors.push(`Unknown status "${values.status}"`);
          }
          return errors;
        }}
        columnsHint="Required: firstName, lastName, email. Optional: phone, company, role, department, status, tags, groups, ownerName, location, city, state, country, website, linkedIn. Separate multiple tags/groups with ;"
        sample={"firstName,lastName,email,phone,company,role,status,tags,groups\nJohn,Doe,john@example.com,+91 90000 00000,Acme Corp,Manager,lead,imported;vip,Enterprise"}
        onImport={handleImport}
      />

      {/* ---- Merge Contacts ---- */}
      <MergeContactsDialog
        open={!!mergePair}
        onClose={() => setMergePair(null)}
        pair={mergePair}
        onMerge={handleMerge}
      />

      {/* ---- Create Contact Modal ---- */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b border-slate-100">
            <DialogTitle className="text-xl font-semibold text-slate-800">Create Contact</DialogTitle>
            <DialogDescription>Add a new contact to your address book.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <Input placeholder="First Name" className="h-10 rounded-lg" />
              <Input placeholder="Last Name" className="h-10 rounded-lg" />
            </div>
            <Input placeholder="Email" type="email" className="h-10 rounded-lg" />
            <Input placeholder="Phone" className="h-10 rounded-lg" />
            <div className="grid grid-cols-2 gap-4">
              <Input placeholder="Company" className="h-10 rounded-lg" />
              <Input placeholder="Role" className="h-10 rounded-lg" />
            </div>
            <Input placeholder="Street Address" className="h-10 rounded-lg" />
            <div className="grid grid-cols-2 gap-4">
              <Input placeholder="City" className="h-10 rounded-lg" />
              <Input placeholder="State" className="h-10 rounded-lg" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input placeholder="Zip Code" className="h-10 rounded-lg" />
              <Input placeholder="Country" className="h-10 rounded-lg" />
            </div>
            <Textarea placeholder="Notes" rows={3} className="rounded-lg resize-none" />
          </div>
          <DialogFooter className="pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setShowCreate(false)} className="rounded-lg">Cancel</Button>
            <Button onClick={() => { toast.success("Contact created"); setShowCreate(false); }} className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white">Save Contact</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MoreHorizontalIcon() { return <MoreHorizontal className="size-4" />; }
function CalendarIcon() { return <Calendar className="size-4" />; }
