"use client";

import { CheckCircle2, Loader2, MapPin } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils/cn";
import { isValidOptionalPhone, phoneInputProps, sanitizePhone } from "@/lib/utils/phone";
import type { ContactStatus } from "../types";
import { CONTACT_STATUSES, CONTACT_STATUS_LABELS } from "../lib/crm-records";

export type ContactFormValues = Record<string, string>;

interface ContactFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  submitLabel: string;
  initial?: ContactFormValues;
  assignees: Array<{ id: string; name: string }>;
  groupNames: string[];
  isSaving?: boolean;
  onSubmit: (values: ContactFormValues) => void | Promise<void>;
}

const FIELD = "block space-y-1 text-[12px] font-medium text-slate-600";

/**
 * Create / edit contact. Mount with a changing `key` so the form state is
 * re-seeded from `initial` each time it opens.
 */
export function ContactFormModal({
  open, onOpenChange, title, submitLabel, initial, assignees, groupNames, isSaving = false, onSubmit,
}: ContactFormModalProps) {
  const [form, setForm] = useState<ContactFormValues>(() => ({ country: "India", status: "lead", ...(initial ?? {}) }));
  const [fetchingPin, setFetchingPin] = useState(false);
  const [pinFilled, setPinFilled] = useState(false);

  const set = (key: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  const setValue = (key: string) => (value: string) => setForm((prev) => ({ ...prev, [key]: value }));
  const setPhone = (key: string) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: sanitizePhone(event.target.value) }));

  const selectedGroups = (form.groups ?? "").split(";").map((g) => g.trim()).filter(Boolean);
  const toggleGroup = (name: string) => {
    const next = selectedGroups.includes(name) ? selectedGroups.filter((g) => g !== name) : [...selectedGroups, name];
    setForm((prev) => ({ ...prev, groups: next.join("; ") }));
  };

  const lookupPin = async (pin: string) => {
    if (!/^[1-9][0-9]{5}$/.test(pin)) return;
    setFetchingPin(true);
    setPinFilled(false);
    try {
      const res = await fetch(`/app-api/pincode/${pin}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success) return;
      setForm((prev) => {
        const city = data.city || prev.city || "";
        const state = data.state || prev.state || "";
        return {
          ...prev, city, state, country: data.country || prev.country || "India",
          location: prev.location || [city, state].filter(Boolean).join(", "),
        };
      });
      setPinFilled(true);
      toast.success(`Location auto-filled: ${data.city ? `${data.city}, ` : ""}${data.state}`);
    } catch { /* PIN lookup is a convenience; the fields stay editable. */ }
    finally { setFetchingPin(false); }
  };

  const onPinChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const pin = event.target.value.replace(/\D/g, "").slice(0, 6);
    setForm((prev) => ({ ...prev, zipCode: pin }));
    if (pin.length === 6) void lookupPin(pin);
    else setPinFilled(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-3xl sm:rounded-2xl">
        <DialogHeader className="shrink-0 border-b border-slate-100 bg-white px-6 py-4">
          <div className="flex flex-col gap-2 pr-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold text-slate-800">{title}</DialogTitle>
              <DialogDescription className="sr-only">Fields marked * are required.</DialogDescription>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-lg">Cancel</Button>
              <Button disabled={isSaving} onClick={() => void onSubmit(form)} className="rounded-lg">
                {isSaving ? "Saving..." : submitLabel}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-6 py-4 scrollbar-thin">
          <section className="space-y-2">
            <h3 className="text-[13px] font-semibold text-slate-800">Contact Information</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input placeholder="First Name *" value={form.firstName ?? ""} onChange={set("firstName")} />
              <Input placeholder="Last Name *" value={form.lastName ?? ""} onChange={set("lastName")} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input placeholder="Email *" type="email" value={form.email ?? ""} onChange={set("email")} />
              <Input {...phoneInputProps} placeholder="Phone (10 digits)" value={form.phone ?? ""} onChange={setPhone("phone")} aria-invalid={!isValidOptionalPhone(form.phone)} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input {...phoneInputProps} placeholder="Alternate Phone (10 digits)" value={form.alternatePhone ?? ""} onChange={setPhone("alternatePhone")} aria-invalid={!isValidOptionalPhone(form.alternatePhone)} />
              <Input placeholder="LinkedIn profile" value={form.linkedIn ?? ""} onChange={set("linkedIn")} />
            </div>
          </section>

          <section className="space-y-2 border-t border-slate-100 pt-4">
            <h3 className="text-[13px] font-semibold text-slate-800">Company</h3>
            <div className="grid gap-2 sm:grid-cols-3">
              <Input placeholder="Company" value={form.company ?? ""} onChange={set("company")} />
              <Input placeholder="Role / Job title" value={form.role ?? ""} onChange={set("role")} />
              <Input placeholder="Department" value={form.department ?? ""} onChange={set("department")} />
            </div>
            <Input placeholder="Website" type="url" value={form.website ?? ""} onChange={set("website")} />
          </section>

          <section className="space-y-3 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-slate-800">Address</h3>
              {pinFilled ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                  <CheckCircle2 className="size-3.5" /> City &amp; State auto-filled
                </span>
              ) : null}
            </div>
            <div className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5">
              <label className={FIELD}>
                PIN Code (auto-fills City &amp; State)
                <div className="relative">
                  <Input
                    placeholder="6-digit PIN code, e.g. 110001" value={form.zipCode ?? ""} onChange={onPinChange} maxLength={6}
                    className={cn("h-10 bg-white pr-9", pinFilled && "border-emerald-300 ring-1 ring-emerald-300")}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {fetchingPin ? <Loader2 className="size-4 animate-spin text-indigo-600" /> : pinFilled ? <CheckCircle2 className="size-4 text-emerald-600" /> : <MapPin className="size-4" />}
                  </span>
                </div>
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className={FIELD}>City / District<Input className="bg-white" value={form.city ?? ""} onChange={set("city")} /></label>
                <label className={FIELD}>State<Input className="bg-white" value={form.state ?? ""} onChange={set("state")} /></label>
                <label className={FIELD}>Country<Input className="bg-white" value={form.country ?? ""} onChange={set("country")} /></label>
                <label className={FIELD}>Street address / landmark<Input className="bg-white" value={form.streetAddress ?? ""} onChange={set("streetAddress")} /></label>
              </div>
            </div>
          </section>

          <section className="space-y-2 border-t border-slate-100 pt-4">
            <h3 className="text-[13px] font-semibold text-slate-800">Ownership &amp; Segmentation</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              <Select value={form.status ?? "lead"} onValueChange={setValue("status")}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  {CONTACT_STATUSES.map((s: ContactStatus) => <SelectItem key={s} value={s}>{CONTACT_STATUS_LABELS[s]}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={form.ownerId || "__none__"} onValueChange={(v) => setValue("ownerId")(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Owner" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Unassigned</SelectItem>
                  {assignees.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="mb-1.5 text-[12px] font-medium text-slate-600">Groups</p>
              {groupNames.length === 0 ? (
                <p className="text-[12px] text-slate-500">No groups yet. Create one with “Manage Groups”.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {groupNames.map((name) => {
                    const on = selectedGroups.includes(name);
                    return (
                      <button
                        key={name} type="button" onClick={() => toggleGroup(name)} aria-pressed={on}
                        className={cn("rounded-full border px-3 py-1 text-[12px] font-medium transition-colors",
                          on ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <Input placeholder="Tags separated by semicolons" value={form.tags ?? ""} onChange={set("tags")} />
          </section>

          <section className="space-y-2 border-t border-slate-100 pt-4">
            <h3 className="text-[13px] font-semibold text-slate-800">Follow-up &amp; Notes</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className={FIELD}>Next follow-up<Input type="datetime-local" value={form.nextFollowUp ?? ""} onChange={set("nextFollowUp")} /></label>
              <label className={FIELD}>Last contacted<Input type="datetime-local" value={form.lastContacted ?? ""} onChange={set("lastContacted")} /></label>
            </div>
            <Textarea placeholder="Notes" rows={3} value={form.notes ?? ""} onChange={set("notes")} className="resize-none" />
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
