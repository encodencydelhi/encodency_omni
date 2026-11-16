"use client";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { confirmAction } from "@/lib/ui-dialog-store";
import { nativeWhatsAppApi, nativeWhatsAppEnabled } from "./native-api";
import { Badge, Field, Modal } from "./ui";
import { newId, type Template, type TemplateAction } from "./mock-service";
import { headerVariable } from "./creation-model";

type Patch = (values: Partial<Template>) => void;

/** Location header: a fixed place shown on every message. */
export function LocationFields({ draft, patch }: { draft: Template; patch: Patch }) {
  const place = draft.location ?? { latitude: 0, longitude: 0, name: "", address: "" };
  const set = (values: Partial<NonNullable<Template["location"]>>) => patch({ location: { ...place, ...values } });
  return (
    <div className="space-y-2 rounded-lg border border-slate-200 p-3">
      <p className="text-xs font-semibold text-slate-600">Location Header</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Latitude"><Input type="number" step="any" min={-90} max={90} value={place.latitude} onChange={(event) => set({ latitude: Number(event.target.value) })} /></Field>
        <Field label="Longitude"><Input type="number" step="any" min={-180} max={180} value={place.longitude} onChange={(event) => set({ longitude: Number(event.target.value) })} /></Field>
      </div>
      <Field label="Place Name"><Input maxLength={100} value={place.name} onChange={(event) => set({ name: event.target.value })} /></Field>
      <Field label="Address"><Input maxLength={200} value={place.address} onChange={(event) => set({ address: event.target.value })} /></Field>
    </div>
  );
}

/** Header sample value and the limited-time-offer block, shown under the template basics. */
export function TemplateExtras({ draft, patch }: { draft: Template; patch: Patch }) {
  const offer = draft.limitedTimeOffer;
  const offerAllowed = draft.category === "Marketing" && !draft.authentication && draft.layout !== "Carousel";
  return (
    <div className="space-y-3">
      {headerVariable(draft) && (
        <Field label="Header Variable Sample ({{1}} In The Header)">
          <Input maxLength={60} value={draft.variables?.["0"] ?? ""} placeholder="Sample value for the header" onChange={(event) => patch({ variables: { ...draft.variables, "0": event.target.value } })} />
        </Field>
      )}
      {offerAllowed && (
        <div className="space-y-2 rounded-lg border border-slate-200 p-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <input type="checkbox" checked={!!offer} onChange={(event) => patch(event.target.checked ? { limitedTimeOffer: { text: "Limited offer!", hasExpiration: true, offerHours: 24 }, footer: "" } : { limitedTimeOffer: undefined })} />
            Limited-Time Offer (Countdown)
          </label>
          {offer && (
            <>
              <Field label="Offer Headline (16 Characters)"><Input maxLength={16} value={offer.text} onChange={(event) => patch({ limitedTimeOffer: { ...offer, text: event.target.value } })} /></Field>
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={offer.hasExpiration} onChange={(event) => patch({ limitedTimeOffer: { ...offer, hasExpiration: event.target.checked } })} />Show A Countdown</label>
              {offer.hasExpiration && (
                <Field label="Offer Lasts (Hours From The Moment Each Message Is Sent)"><Input type="number" min={1} max={720} value={offer.offerHours ?? 24} onChange={(event) => patch({ limitedTimeOffer: { ...offer, offerHours: Number(event.target.value) } })} /></Field>
              )}
              <p className="text-[11px] text-slate-400">Limited-Time Offers Do Not Allow A Footer. Add A Coupon Code Or Link Button Below.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export interface LibraryItem { id: string; title: string; description: string; category: string; language: string; definition: Record<string, unknown> }

/** Turns a starter template into editor fields. Nothing is saved or submitted by this. */
export function libraryFields(item: LibraryItem, current: Template): Partial<Template> {
  const d = item.definition as Partial<Template> & { actions?: Omit<TemplateAction, "id">[] };
  return {
    name: String(d.name ?? current.name), category: String(d.category ?? current.category), language: String(d.language ?? current.language), type: "Text", header: d.header ?? "", body: d.body ?? "", footer: d.footer ?? "",
    variables: d.variables ?? {}, sample: d.variables?.["1"] ?? "",
    actions: (d.actions ?? []).map((action) => ({ ...action, id: newId(), urlType: /\{\{\d+\}\}$/.test(String(action.value)) ? "Dynamic" : "Static" })) as TemplateAction[],
    limitedTimeOffer: d.limitedTimeOffer, authentication: d.authentication, layout: "Standard", cards: [], mediaId: undefined, mediaName: "",
  };
}

/** Starter templates from the server, filterable by language. */
export function LibraryList({ scope, onPick }: { scope: string; onPick: (item: LibraryItem) => void }) {
  const [language, setLanguage] = useState("All");
  const library = useQuery({ queryKey: ["whatsapp-template-library", scope], enabled: nativeWhatsAppEnabled, queryFn: () => nativeWhatsAppApi.records<LibraryItem>(scope, "/template-library") });
  const items = (library.data?.items ?? []).filter((item) => language === "All" || item.language === language);
  return (
    <div className="space-y-3">
      <div className="flex gap-2">{["All", "English", "Hindi"].map((value) => <Button key={value} type="button" size="xs" variant={language === value ? "secondary" : "outline"} onClick={() => setLanguage(value)}>{value}</Button>)}</div>
      <p className="text-[11px] text-slate-500">These Are Starting Points. WhatsApp Reviews Every Template; Approval Is Not Guaranteed.</p>
      {library.error ? <p role="alert" className="text-xs text-rose-700">{library.error.message}</p> : library.isLoading ? <p role="status" className="text-xs">Loading...</p> : (
        <ul className="max-h-96 space-y-2 overflow-auto">
          {items.map((item) => (
            <li key={item.id} className="rounded border border-slate-200 p-2">
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">{item.title}</p><span className="flex gap-1"><Badge>{item.category}</Badge><Badge>{item.language}</Badge></span></div>
              <p className="my-1 text-xs text-slate-600">{item.description}</p>
              <p className="rounded bg-slate-50 p-2 text-xs">{String((item.definition as { body?: string }).body ?? "")}</p>
              <Button type="button" size="xs" className="mt-2" onClick={() => onPick(item)}>Use This Template</Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** "Start From Library" inside the editor. `autoApply` opens the editor already filled when it was reached from the template list. */
export function TemplateLibraryPicker({ scope, draft, patch, autoApply }: { scope: string; draft: Template; patch: Patch; autoApply?: string }) {
  const [open, setOpen] = useState(false);
  const applied = useRef(false);
  const apply = async (item: LibraryItem) => {
    if (draft.body.trim() && !await confirmAction("Replace what you have written with this starter template?", { title: "Use Starter Template?", confirmLabel: "Replace" })) return;
    patch(libraryFields(item, draft));
    setOpen(false);
    toast.success("Starter Template Loaded. Review It Before Saving.");
  };
  useEffect(() => {
    if (!autoApply || applied.current || !nativeWhatsAppEnabled) return;
    applied.current = true;
    void nativeWhatsAppApi.records<LibraryItem>(scope, "/template-library").then((result) => {
      const item = result.items.find((entry) => entry.id === autoApply);
      if (item) { patch(libraryFields(item, draft)); toast.success("Starter Template Loaded. Review It Before Saving."); }
    }).catch((error: unknown) => toast.error(error instanceof Error ? error.message : "The starter template could not be loaded."));
  }, [autoApply, scope, patch, draft]);
  if (!nativeWhatsAppEnabled) return null;
  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>Start From Library</Button>
      <Modal title="Starter Templates" open={open} onClose={() => setOpen(false)}><LibraryList scope={scope} onPick={(item) => void apply(item)} /></Modal>
    </>
  );
}

/** Deletes a template after confirmation. The server blocks it while an unfinished campaign still uses the template. */
export function TemplateDeleteButton({ scope, template, disabled, onDone }: { scope: string; template: Template; disabled?: boolean; onDone: () => void }) {
  if (!nativeWhatsAppEnabled) return null;
  return (
    <Button type="button" size="xs" variant="ghost" disabled={disabled} onClick={async () => {
      if (!await confirmAction(`Delete the template "${template.name}" (${template.language})? ${template.status === "Draft" ? "" : "It is also deleted at WhatsApp, and the name cannot be reused for a while."}`, { title: "Delete Template?", confirmLabel: "Delete" })) return;
      try { await nativeWhatsAppApi.removeTemplate(scope, template.id); toast.success("Template Deleted"); onDone(); } catch (error) { toast.error(error instanceof Error ? error.message : "The template could not be deleted."); }
    }}>Delete</Button>
  );
}
