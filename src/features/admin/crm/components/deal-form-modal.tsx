"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Contact, Pipeline } from "../types";
import { DEAL_PRIORITIES, DEAL_SOURCES, DEAL_STAGE_LABELS } from "../lib/crm-records";

export type DealFormValues = Record<string, string>;

interface DealFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  submitLabel: string;
  initial?: DealFormValues;
  contacts: Contact[];
  pipelines: Pipeline[];
  assignees: Array<{ id: string; name: string }>;
  isSaving?: boolean;
  onSubmit: (values: DealFormValues) => void | Promise<void>;
}

const FIELD = "block space-y-1 text-[12px] font-medium text-slate-600";
const NONE = "__none__";

/** Create / edit deal. Mount with a changing `key` to re-seed from `initial`. */
export function DealFormModal({
  open, onOpenChange, title, submitLabel, initial, contacts, pipelines, assignees, isSaving = false, onSubmit,
}: DealFormModalProps) {
  const [form, setForm] = useState<DealFormValues>(() => ({
    pipelineId: pipelines[0]?.id ?? "", stage: "new", probability: "20", priority: "medium", source: "manual", ...(initial ?? {}),
  }));
  const set = (key: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  const setValue = (key: string) => (value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const pipeline = pipelines.find((p) => p.id === form.pipelineId) ?? pipelines[0];
  const stages = pipeline?.stages ?? [];

  const pickContact = (id: string) => {
    if (id === NONE) {
      setForm((prev) => ({ ...prev, primaryContactId: "", primaryContactName: "" }));
      return;
    }
    const contact = contacts.find((c) => c.id === id);
    if (!contact) return;
    setForm((prev) => ({
      ...prev, primaryContactId: contact.id, primaryContactName: `${contact.firstName} ${contact.lastName}`.trim(),
      companyName: prev.companyName || contact.company, companyId: prev.companyId || contact.companyId,
    }));
  };

  const pickPipeline = (id: string) => {
    const next = pipelines.find((p) => p.id === id);
    setForm((prev) => ({
      ...prev, pipelineId: id,
      stage: next && !next.stages.includes(prev.stage as never) ? (next.stages[0] ?? "new") : (prev.stage ?? "new"),
    }));
  };

  const value = Number(form.value || 0);
  const cost = Number(form.cost || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-2xl sm:rounded-2xl">
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
            <h3 className="text-[13px] font-semibold text-slate-800">Deal</h3>
            <Input placeholder="Deal name *" value={form.name ?? ""} onChange={set("name")} />
            <div className="grid gap-2 sm:grid-cols-2">
              <label className={FIELD}>
                Pipeline
                <Select value={form.pipelineId ?? ""} onValueChange={pickPipeline}>
                  <SelectTrigger><SelectValue placeholder="Pipeline" /></SelectTrigger>
                  <SelectContent>{pipelines.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </label>
              <label className={FIELD}>
                Stage
                <Select value={form.stage ?? "new"} onValueChange={setValue("stage")}>
                  <SelectTrigger><SelectValue placeholder="Stage" /></SelectTrigger>
                  <SelectContent>{stages.map((s) => <SelectItem key={s} value={s}>{DEAL_STAGE_LABELS[s]}</SelectItem>)}</SelectContent>
                </Select>
              </label>
            </div>
          </section>

          <section className="space-y-2 border-t border-slate-100 pt-4">
            <h3 className="text-[13px] font-semibold text-slate-800">Company &amp; Contact</h3>
            <label className={FIELD}>
              Primary contact
              <Select value={form.primaryContactId || NONE} onValueChange={pickContact}>
                <SelectTrigger><SelectValue placeholder="Select a contact" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No contact</SelectItem>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{`${c.firstName} ${c.lastName}`.trim() || c.email}{c.company ? ` · ${c.company}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <Input placeholder="Company" value={form.companyName ?? ""} onChange={set("companyName")} />
          </section>

          <section className="space-y-2 border-t border-slate-100 pt-4">
            <h3 className="text-[13px] font-semibold text-slate-800">Value</h3>
            <div className="grid gap-2 sm:grid-cols-3">
              <label className={FIELD}>Value (₹)<Input type="number" min="0" value={form.value ?? ""} onChange={set("value")} /></label>
              <label className={FIELD}>Cost (₹)<Input type="number" min="0" value={form.cost ?? ""} onChange={set("cost")} /></label>
              <label className={FIELD}>Probability (%)<Input type="number" min="0" max="100" value={form.probability ?? ""} onChange={set("probability")} /></label>
            </div>
            {value > 0 ? (
              <p className="text-[12px] text-slate-500">
                Expected profit ₹{Math.max(0, value - cost).toLocaleString("en-IN")} · weighted ₹{Math.round((value * Number(form.probability || 0)) / 100).toLocaleString("en-IN")}
              </p>
            ) : null}
          </section>

          <section className="space-y-2 border-t border-slate-100 pt-4">
            <h3 className="text-[13px] font-semibold text-slate-800">Ownership</h3>
            <div className="grid gap-2 sm:grid-cols-3">
              <label className={FIELD}>
                Owner
                <Select value={form.ownerId || NONE} onValueChange={(v) => setValue("ownerId")(v === NONE ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Owner" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Unassigned</SelectItem>
                    {assignees.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </label>
              <label className={FIELD}>
                Priority
                <Select value={form.priority ?? "medium"} onValueChange={setValue("priority")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DEAL_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p[0]!.toUpperCase() + p.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </label>
              <label className={FIELD}>
                Source
                <Select value={form.source ?? "manual"} onValueChange={setValue("source")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DEAL_SOURCES.map((s) => <SelectItem key={s} value={s}>{s[0]!.toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </label>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className={FIELD}>Expected close date<Input type="date" value={form.expectedCloseDate ?? ""} onChange={set("expectedCloseDate")} /></label>
              <label className={FIELD}>Campaign<Input value={form.campaign ?? ""} onChange={set("campaign")} /></label>
            </div>
          </section>

          <section className="space-y-2 border-t border-slate-100 pt-4">
            <h3 className="text-[13px] font-semibold text-slate-800">Details</h3>
            <Input placeholder="Products / services" value={form.products ?? ""} onChange={set("products")} />
            <Input placeholder="Tags separated by semicolons" value={form.tags ?? ""} onChange={set("tags")} />
            <Textarea placeholder="Notes" rows={3} value={form.notes ?? ""} onChange={set("notes")} className="resize-none" />
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
