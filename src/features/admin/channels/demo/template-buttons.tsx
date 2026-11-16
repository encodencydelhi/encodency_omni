"use client";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, Select } from "./ui";
import { newId, type Flow, type Template, type TemplateAction } from "./mock-service";
import { templateActions, templateParameters } from "./creation-model";
import { nativeWhatsAppApi, nativeWhatsAppEnabled } from "./native-api";

const ADD_OPTIONS: { label: string; type: TemplateAction["type"] }[] = [
  { label: "Website Link (URL)", type: "URL" },
  { label: "Call Phone Number", type: "Phone" },
  { label: "Quick Reply", type: "Quick Reply" },
  { label: "Copy Coupon Code", type: "Copy Code" },
  { label: "Open WhatsApp Flow", type: "Flow" },
  { label: "View Catalog", type: "Catalog" },
];
const TYPE_LABEL: Record<TemplateAction["type"], string> = { URL: "Website Link", Phone: "Call Phone Number", "Quick Reply": "Quick Reply", "Copy Code": "Copy Coupon Code", Flow: "WhatsApp Flow", Catalog: "Catalog" };
const LIMITS: Record<TemplateAction["type"], number> = { URL: 2, Phone: 1, "Quick Reply": 10, "Copy Code": 1, Flow: 1, Catalog: 1 };

/**
 * One button list for every button type, up to ten. The server enforces the same rules; these hints only stop mistakes early:
 * at most two links, one call, one coupon, one Flow; quick replies stay together; a catalog template has just its catalog button.
 * A website link can be tracked: its URL then points at this deployment's redirect, which records the click per recipient.
 */
export function ButtonBuilder({ scope, draft, patch, flows }: { scope: string; draft: Template; patch: (values: Partial<Template>) => void; flows: Flow[] }) {
  const actions = templateActions(draft);
  const bodyKeys = templateParameters(draft.body).length;
  const tracking = useQuery({ queryKey: ["whatsapp-link-tracking", scope], enabled: nativeWhatsAppEnabled, queryFn: () => nativeWhatsAppApi.linkTracking(scope) });
  const base = tracking.data?.baseUrl ?? null;
  // The n-th dynamic link takes the next free variable number after the body variables.
  const variableOf = (list: TemplateAction[], id: string) => bodyKeys + list.filter((item) => item.type === "URL" && item.urlType === "Dynamic").findIndex((item) => item.id === id) + 1;
  const set = (next: TemplateAction[]) => patch({ actions: next });
  const edit = (id: string, values: Partial<TemplateAction>) => set(actions.map((action) => (action.id === id ? { ...action, ...values } : action)));
  const used = (type: TemplateAction["type"]) => actions.filter((action) => action.type === type).length;
  const available = ADD_OPTIONS.filter((option) => used(option.type) < LIMITS[option.type] && (option.type !== "Copy Code" || draft.category === "Marketing") && (option.type !== "Catalog" || !actions.length) && !actions.some((action) => action.type === "Catalog"));

  // Keep every tracked link pointing at the redirect with the right variable number as buttons are added, removed or the body changes.
  const expected = base ? actions.map((action) => (action.type === "URL" && action.track ? `${base}{{${variableOf(actions, action.id)}}}` : null)) : [];
  const drift = expected.some((value, index) => value !== null && actions[index]?.value !== value);
  useEffect(() => {
    if (!drift || !base) return;
    patch({ actions: actions.map((action, index) => (expected[index] ? { ...action, value: expected[index] as string, urlType: "Dynamic" as const } : action)) });
  });

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-slate-600">Buttons ({actions.length} Of 10)</p>
      <p className="text-[11px] text-slate-400">Add Links, A Call Button, Quick Replies Or A Coupon Code. Keep Quick Replies Together, Before Or After The Other Buttons.</p>
      {actions.map((action, index) => {
        const dynamic = action.type === "URL" && action.urlType === "Dynamic";
        const variable = dynamic ? variableOf(actions, action.id) : null;
        return (
          <div key={action.id} className="space-y-3 rounded-lg border border-slate-200 p-3">
            <div className="flex items-end gap-2">
              <div className="flex-1"><p className="text-xs font-semibold">{index + 1}. {TYPE_LABEL[action.type]}</p></div>
              <Button type="button" aria-label="Remove Button" size="icon-sm" variant="ghost" onClick={() => set(actions.filter((item) => item.id !== action.id))}><Trash2 /></Button>
            </div>
            {action.type !== "Copy Code" && action.type !== "Catalog" && (
              <Field label="Button Title (25 Characters)"><Input value={action.label} maxLength={25} onChange={(event) => edit(action.id, { label: event.target.value })} /></Field>
            )}
            {action.type === "URL" && (
              <>
                {nativeWhatsAppEnabled && (
                  <label className="flex items-start gap-2 text-xs">
                    <input type="checkbox" checked={!!action.track} disabled={!base && !action.track} onChange={(event) => event.target.checked
                      ? edit(action.id, { track: true, urlType: "Dynamic", trackTarget: action.trackTarget ?? (action.value.startsWith("https://") && !dynamic ? action.value : ""), value: "" })
                      : edit(action.id, { track: false, urlType: "Static", value: action.trackTarget ?? "", trackTarget: undefined })} />
                    <span>Track Clicks On This Link{!base && !action.track ? " (Not Available: This Deployment Has No Link Tracking Address Configured)" : ""}</span>
                  </label>
                )}
                {action.track ? (
                  <>
                    <Field label="Destination URL (Where The Customer Lands)"><Input value={action.trackTarget ?? ""} placeholder="https://example.com/offer" onChange={(event) => edit(action.id, { trackTarget: event.target.value })} /></Field>
                    <p className="break-all text-[11px] text-slate-400">The Button Uses {action.value || "A Tracking Address"}. Each Message Gets Its Own Link, So You Can See Who Clicked. Add A Sample Value For {`{{${variable}}}`} Below.</p>
                  </>
                ) : (
                  <>
                    <Select label="URL Type" value={action.urlType || "Static"} options={["Static", "Dynamic"]} onChange={(urlType) => edit(action.id, { urlType: urlType as "Static" | "Dynamic" })} />
                    <Field label="Button URL"><Input value={action.value} placeholder={variable ? `https://example.com/orders/{{${variable}}}` : "https://example.com"} onChange={(event) => edit(action.id, { value: event.target.value })} /></Field>
                    {variable && <p className="text-[11px] text-slate-400">A Dynamic URL Ends With {`{{${variable}}}`}. Add A Sample Value For It Below.</p>}
                  </>
                )}
              </>
            )}
            {action.type === "Phone" && <Field label="Phone Number (Country Code, Without +)"><Input value={action.value} placeholder="919000000100" onChange={(event) => edit(action.id, { value: event.target.value })} /></Field>}
            {action.type === "Copy Code" && <Field label="Example Coupon Code (Up To 15 Letters Or Numbers)"><Input value={action.value} maxLength={15} placeholder="SAVE10" onChange={(event) => edit(action.id, { value: event.target.value })} /></Field>}
            {action.type === "Flow" && (
              <Select label="WhatsApp Flow" value={flows.find((flow) => flow.id === action.value)?.name ?? "Choose A Published Flow"} options={["Choose A Published Flow", ...flows.map((flow) => flow.name)]} onChange={(name) => edit(action.id, { value: flows.find((flow) => flow.name === name)?.id ?? "" })} />
            )}
            {action.type === "Quick Reply" && <p className="text-[11px] text-slate-400">Taps On This Button Are Counted In The Campaign Report.</p>}
            {action.type === "Catalog" && <p className="text-xs text-slate-500">Shows Your Connected Product Catalog. The Catalog Must Be Linked To Your WhatsApp Business Account.</p>}
          </div>
        );
      })}
      {actions.length < 10 && available.length > 0 && !draft.authentication && draft.layout !== "Carousel" && (
        <div className="flex flex-wrap items-end gap-2">
          <Select label="Add A Button" value="Add A Button..." options={["Add A Button...", ...available.map((option) => option.label)]} onChange={(label) => {
            const option = available.find((item) => item.label === label);
            if (option) set([...actions, { id: newId(), type: option.type, label: option.type === "Copy Code" ? "Copy offer code" : option.type === "Catalog" ? "View catalog" : "", value: "", urlType: "Static" }]);
          }} />
          <span className="pb-2 text-[11px] text-slate-400"><Plus className="inline size-3" /> Up To Ten In Total</span>
        </div>
      )}
    </div>
  );
}
