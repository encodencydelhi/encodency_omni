"use client";

import { useState } from "react";
import {
  Search,
  Plus,
  Upload,
  Pencil,
  History,
  Ban,
  Trash2,
  Download,
  Tag,
  X,
  UsersRound,
  UserCheck,
  UserX,
  UserMinus,
  UserPlus,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface ContactsTabProps {
  onOpenModal: (modal: string) => void;
}

const initialContacts = [
  { id: 1, initial: "D", name: "Deepak Mishra", phone: "+91 98123 45670", email: "deepak.m@email.com", labels: ["Donor", "Volunteer"], lastInteraction: "Apr 14, 2025", status: "Active", optedIn: true, created: "Jan 15, 2025", color: "bg-blue-100 text-blue-700" },
  { id: 2, initial: "S", name: "Sunita Verma", phone: "+91 98234 56781", email: "sunita.v@email.com", labels: ["Event Attendee"], lastInteraction: "Apr 13, 2025", status: "Active", optedIn: true, created: "Feb 3, 2025", color: "bg-emerald-100 text-emerald-700" },
  { id: 3, initial: "R", name: "Rohit Tiwari", phone: "+91 98345 67892", email: "rohit.t@email.com", labels: ["Volunteer", "Newsletter"], lastInteraction: "Apr 12, 2025", status: "Active", optedIn: true, created: "Dec 20, 2024", color: "bg-amber-100 text-amber-800" },
  { id: 4, initial: "K", name: "Komal Pandey", phone: "+91 98456 78903", email: "komal.p@email.com", labels: ["Donor"], lastInteraction: "Apr 10, 2025", status: "Active", optedIn: true, created: "Mar 1, 2025", color: "bg-purple-100 text-purple-700" },
  { id: 5, initial: "A", name: "Ajay Dubey", phone: "+91 98567 89014", email: "ajay.d@email.com", labels: ["Newsletter", "Event Attendee"], lastInteraction: "Apr 8, 2025", status: "Active", optedIn: true, created: "Jan 28, 2025", color: "bg-pink-100 text-pink-700" },
  { id: 6, initial: "N", name: "Nandini Rai", phone: "+91 98678 90125", email: "nandini.r@email.com", labels: ["Donor", "Volunteer"], lastInteraction: "Apr 5, 2025", status: "Active", optedIn: true, created: "Nov 12, 2024", color: "bg-rose-100 text-rose-700" },
  { id: 7, initial: "M", name: "Manoj Jha", phone: "+91 98789 01236", email: "manoj.j@email.com", labels: ["Newsletter"], lastInteraction: "Apr 1, 2025", status: "Blocked", optedIn: false, created: "Oct 5, 2024", color: "bg-teal-100 text-teal-700" },
  { id: 8, initial: "P", name: "Pooja Saxena", phone: "+91 98890 12347", email: "pooja.s@email.com", labels: ["Event Attendee", "Volunteer"], lastInteraction: "Mar 28, 2025", status: "Active", optedIn: true, created: "Feb 15, 2025", color: "bg-indigo-100 text-indigo-700" },
  { id: 9, initial: "V", name: "Vikrant Chauhan", phone: "+91 98901 23458", email: "vikrant.c@email.com", labels: ["Donor"], lastInteraction: "Mar 20, 2025", status: "Unsubscribed", optedIn: false, created: "Sep 10, 2024", color: "bg-purple-100 text-purple-700" },
  { id: 10, initial: "L", name: "Lata Sinha", phone: "+91 98012 34569", email: "lata.s@email.com", labels: ["Newsletter", "Donor"], lastInteraction: "Mar 15, 2025", status: "Active", optedIn: true, created: "Dec 1, 2024", color: "bg-blue-100 text-blue-700" },
];

const labelColors: Record<string, string> = {
  Donor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Volunteer: "bg-blue-50 text-blue-700 border-blue-200",
  "Event Attendee": "bg-purple-50 text-purple-700 border-purple-200",
  Newsletter: "bg-amber-50 text-amber-700 border-amber-200",
};

const statusColors: Record<string, string> = {
  Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Blocked: "bg-rose-50 text-rose-700 border-rose-200",
  Unsubscribed: "bg-amber-50 text-amber-700 border-amber-200",
};

export function ContactsTab({ onOpenModal }: ContactsTabProps) {
  const [contactList, setContactList] = useState(initialContacts);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [labelFilter, setLabelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = contactList.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.phone.includes(search)) return false;
    if (labelFilter !== "all" && !c.labels.some((l) => l.toLowerCase() === labelFilter)) return false;
    if (statusFilter !== "all" && c.status.toLowerCase() !== statusFilter) return false;
    return true;
  });

  const toggleSelect = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleAll = () => {
    if (selected.length === filtered.length) {
      setSelected([]);
    } else {
      setSelected(filtered.map((c) => c.id));
    }
  };

  const handleDelete = (id: number) => {
    const item = contactList.find((c) => c.id === id);
    setContactList(contactList.filter((c) => c.id !== id));
    toast.success(`Deleted contact: "${item?.name}"`);
  };

  const handleBlock = (id: number) => {
    setContactList(contactList.map((c) => (c.id === id ? { ...c, status: "Blocked", optedIn: false } : c)));
    toast.success("Contact Blocked");
  };

  return (
    <div className="space-y-2 pt-1">
      {/* 6 Key Contacts Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {[
          { label: "Total Contacts", value: "4,820", trend: "↑ 14%", icon: UsersRound, bg: "bg-emerald-50/80 border-emerald-200/80", iconBg: "bg-emerald-600 text-white shadow-xs", text: "text-emerald-700", note: "all synced leads" },
          { label: "Active Opt-in", value: "4,612", trend: "95.6%", icon: UserCheck, bg: "bg-blue-50/80 border-blue-200/80", iconBg: "bg-blue-600 text-white shadow-xs", text: "text-blue-700", note: "verified consent" },
          { label: "New This Month", value: "384", trend: "↑ 22%", icon: UserPlus, bg: "bg-purple-50/80 border-purple-200/80", iconBg: "bg-purple-600 text-white shadow-xs", text: "text-purple-700", note: "organic leads" },
          { label: "Opted Out", value: "156", trend: "3.2%", icon: UserMinus, bg: "bg-amber-50/80 border-amber-200/80", iconBg: "bg-amber-600 text-white shadow-xs", text: "text-amber-700", note: "unsubscribed contacts" },
          { label: "Blocked / Spam", value: "52", trend: "1.0%", icon: UserX, bg: "bg-rose-50/80 border-rose-200/80", iconBg: "bg-rose-600 text-white shadow-xs", text: "text-rose-700", note: "flagged numbers" },
          { label: "Verified WABA", value: "98.8%", trend: "Active", icon: ShieldCheck, bg: "bg-teal-50/80 border-teal-200/80", iconBg: "bg-teal-600 text-white shadow-xs", text: "text-teal-700", note: "WABA reachable" },
        ].map((stat, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center gap-2.5 rounded-sm border p-3 bg-white shadow-2xs transition-all hover:-translate-y-0.5 hover:shadow-xs",
              stat.bg
            )}
          >
            <span className={cn("grid size-9 shrink-0 place-items-center rounded-sm", stat.iconBg)}>
              <stat.icon className="size-4.5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[10.5px] font-medium text-slate-500 uppercase tracking-wider">{stat.label}</p>
              <div className="flex items-baseline gap-1">
                <b className="text-lg font-bold tracking-tight text-slate-900">{stat.value}</b>
                <span className={cn("text-[11px] font-medium whitespace-nowrap", stat.text)}>{stat.trend}</span>
              </div>
              <p className="text-[9.5px] text-slate-400 font-normal truncate">{stat.note}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Top Search & Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search contacts..."
              className="h-10 pl-9 text-xs border-slate-200 focus:border-emerald-500 rounded-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={labelFilter} onValueChange={setLabelFilter}>
            <SelectTrigger className="h-10 w-36 text-xs border-slate-200 rounded-sm">
              <SelectValue placeholder="Label" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Labels</SelectItem>
              <SelectItem value="donor">Donor</SelectItem>
              <SelectItem value="volunteer">Volunteer</SelectItem>
              <SelectItem value="event attendee">Event Attendee</SelectItem>
              <SelectItem value="newsletter">Newsletter</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 w-36 text-xs border-slate-200 rounded-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
              <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenModal("import-contacts")}
            className="h-10 text-xs font-bold px-3.5 border-slate-200 rounded-sm flex items-center gap-1.5"
          >
            <Upload className="size-3.5 text-slate-600" /> Import CSV
          </Button>
          <Button
            onClick={() => onOpenModal("add-contact")}
            className="h-10 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-sm shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
          >
            <Plus className="size-4" /> Add Contact
          </Button>
        </div>
      </div>

      {/* Bulk Select Banner */}
      {selected.length > 0 && (
        <div className="flex items-center gap-3 rounded-sm border border-emerald-200 bg-emerald-50/80 px-4 py-2.5 shadow-xs">
          <span className="text-xs font-bold text-emerald-900">{selected.length} contacts selected</span>
          <div className="h-4 w-px bg-emerald-200" />
          <Button size="sm" variant="ghost" onClick={() => toast.success(`Exporting ${selected.length} contacts to CSV...`)} className="h-7 text-xs font-bold text-emerald-800 hover:bg-emerald-100">
            <Download className="size-3.5 mr-1" /> Export
          </Button>
          <Button size="sm" variant="ghost" onClick={() => toast.success("Added label to selected contacts")} className="h-7 text-xs font-bold text-emerald-800 hover:bg-emerald-100">
            <Tag className="size-3.5 mr-1" /> Add Label
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setSelected([]); toast.success("Blocked selected contacts"); }} className="h-7 text-xs font-bold text-rose-700 hover:bg-rose-100">
            <Ban className="size-3.5 mr-1" /> Block
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected([])} className="ml-auto text-xs text-slate-500 hover:text-slate-800">
            <X className="size-4" />
          </Button>
        </div>
      )}

      {/* Main Table */}
      <section className="overflow-hidden rounded-sm border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="w-10 px-4 py-3">
                  <Checkbox checked={selected.length === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} />
                </th>
                <th className="px-3 py-3">Contact</th>
                <th className="px-3 py-3">Phone</th>
                <th className="px-3 py-3">Email</th>
                <th className="px-3 py-3">Labels</th>
                <th className="px-3 py-3">Last Interaction</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Opt-in</th>
                <th className="px-3 py-3">Created</th>
                <th className="px-3 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3">
                    <Checkbox checked={selected.includes(c.id)} onCheckedChange={() => toggleSelect(c.id)} />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className={cn("grid size-8 shrink-0 place-items-center rounded-sm text-xs font-bold shadow-xs", c.color)}>
                        {c.initial}
                      </span>
                      <span className="font-bold text-slate-900">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-slate-600 font-medium">{c.phone}</td>
                  <td className="px-3 py-3 text-slate-600 font-medium">{c.email}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.labels.map((l) => (
                        <span key={l} className={cn("rounded-sm px-2 py-0.5 text-[10px] font-bold border", labelColors[l])}>
                          {l}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-slate-400 font-medium">{c.lastInteraction}</td>
                  <td className="px-3 py-3">
                    <span className={cn("rounded-sm px-2 py-0.5 text-[11px] font-bold border", statusColors[c.status])}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-semibold">
                    <span className={cn("text-[11px]", c.optedIn ? "text-emerald-700" : "text-rose-600")}>
                      {c.optedIn ? "✓ Opted-in" : "✕ Opted-out"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-400 font-medium">{c.created}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => toast.success(`Editing contact: ${c.name}`)} className="rounded-sm p-1.5 hover:bg-slate-100 text-slate-500" title="Edit">
                        <Pencil className="size-3.5" />
                      </button>
                      <button onClick={() => toast.info(`Viewing activity history for ${c.name}`)} className="rounded-sm p-1.5 hover:bg-blue-50 text-blue-600" title="History">
                        <History className="size-3.5" />
                      </button>
                      <button onClick={() => handleBlock(c.id)} className="rounded-sm p-1.5 hover:bg-rose-50 text-rose-600" title="Block">
                        <Ban className="size-3.5" />
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="rounded-sm p-1.5 hover:bg-rose-50 text-rose-600" title="Delete">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 bg-slate-50/50">
          <span className="text-xs text-slate-500 font-medium">Showing {filtered.length} of {contactList.length} contacts</span>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="h-8 text-xs font-semibold px-2.5">
              <ChevronLeft className="size-3.5" /> Prev
            </Button>
            <Button size="sm" className="h-8 text-xs font-bold px-3 bg-emerald-600 text-white hover:bg-emerald-700">1</Button>
            <Button variant="outline" size="sm" className="h-8 text-xs font-semibold px-2.5">
              Next <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
