"use client";
import { AdvancedTemplateFields } from './advanced-controls';
import { nativeWhatsAppApi } from "./native-api";
import Link from "next/link";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bold, Italic, Plus, Strikethrough, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { type Template, newId } from "./mock-service";
import { Field, Select } from "./ui";
import { CreationShell, ErrorSummary, IntegrationButton, TemplatePhonePreview } from "./creation-shell";
import { CreationSession, useCreationWorkspace } from "./creation-session";
import { useUnsavedChanges } from "./unsaved-changes";
import { WhatsAppAIAssistant } from "./ai-assistant";
import { TEMPLATE_TYPES, templateActions, templateParameters, validateTemplate, workspaceHref } from "./creation-model";
import { ButtonBuilder } from "./template-buttons";
import { LocationFields, TemplateExtras, TemplateLibraryPicker } from "./template-extras";

const presets: Record<string, Partial<Template>> = {
  welcome: { name: "welcome_message", category: "Marketing", body: "Hello {{1}}, welcome to our community. Explore what is new today. Thank you!", variables: { "1": "Aarav" }, sample: "Aarav" },
  order: { name: "order_update", category: "Utility", body: "Hello {{1}}, your order {{2}} is ready. Thank you for shopping with us.", variables: { "1": "Aarav", "2": "ORD-1024" }, sample: "Aarav" },
  appointment: { name: "appointment_reminder", category: "Utility", body: "Hello {{1}}, your appointment is on {{2}}. We look forward to seeing you.", variables: { "1": "Aarav", "2": "10 November, 11:00 AM" }, sample: "Aarav" },
};
export function TemplateCreationPage({ id, preset, library, mode }: { id?: string; preset?: string; library?: string; mode?: string }) {
  return <CreationSession>{selected => <TemplateEditor key={`${selected}:${id || preset || library || "new"}:${mode || ""}`} scope={selected} id={id} preset={preset} library={library} mode={mode} />}</CreationSession>;
}
function TemplateEditor({ scope, id, preset, library, mode }: { scope: string; id?: string; preset?: string; library?: string; mode?: string }) {
  const { data, update, isNative, action, refresh, envelope } = useCreationWorkspace(scope);
  const source = data.templates.find(t => t.id === id);
  const router = useRouter();
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState<Template>(() => source ? {
    ...source,
    id: source.status === "Draft" ? source.id : newId(),
    name: `${source.name.toLowerCase().replace(/[^a-z0-9_]+/g, "_")}${source.status === "Draft" || mode === "language" ? "" : "_copy"}`,
    ...(mode === "language" ? { language: source.language === "Hindi" ? "English" : "Hindi" } : {}),
    status: "Draft", type: source.type || "Text", actions: templateActions(source),
  } : { id: newId(), name: "", category: "Marketing", language: "English", type: "Text", header: "", body: "", footer: "", sample: "", variables: {}, button: "", buttonType: "URL", buttonTarget: "", actions: [], status: "Draft", ...(preset ? presets[preset] : {}) });
  const [initialDraft] = useState(() => JSON.stringify(draft));
  const guard = useUnsavedChanges(JSON.stringify(draft) !== initialDraft);
  const [errors, setErrors] = useState<string[]>([]);
  const [mediaError, setMediaError] = useState("");
  const parameters = templateParameters(draft.body);
  const dynamicCount = (draft.actions || []).filter(a => a.type === "URL" && a.urlType === "Dynamic").length;
  const sampleKeys = [...parameters, ...Array.from({ length: dynamicCount }, (_, index) => String(parameters.length + index + 1))];
  const patch = (values: Partial<Template>) => setDraft(current => ({ ...current, ...values }));
  const insertText = (before: string, after = "") => {
    if(draft.authentication)return;
    const field = bodyRef.current;
    const start = field?.selectionStart ?? draft.body.length;
    const end = field?.selectionEnd ?? start;
    const selection = draft.body.slice(start, end);
    patch({ body: draft.body.slice(0, start) + before + selection + after + draft.body.slice(end) });
    requestAnimationFrame(() => { field?.focus(); field?.setSelectionRange(start + before.length, end + before.length); });
  };
  const save = async (submit=false) => {
    const issues = validateTemplate(draft, data.templates);
    if (issues.length) { setErrors(issues); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    const firstAction = draft.actions?.[0];
    const saved: Template = { ...draft, status: "Draft", sample: draft.variables?.["1"] || draft.sample, button: firstAction?.label || "", buttonType: firstAction?.type || "URL", buttonTarget: firstAction?.value || "" };
    if(!await update(current => ({ ...current, templates: current.templates.some(t => t.id === saved.id) ? current.templates.map(t => t.id === saved.id ? saved : t) : [saved, ...current.templates] })))return;
    if(submit&&isNative&&!await action(`/templates/${saved.id}/submit`))return;
    toast.success(submit?"Template Submitted For Review":isNative?"Template Draft Saved":"Template Draft Saved Locally");
    guard.markSaved();
    router.push(workspaceHref("Templates"));
  };
  if (id && !source) return <CreationShell title="Template Not Found" section="Templates"><p className="p-4 text-sm">This Template Was Not Found In This Workspace.</p><Link href={workspaceHref("Templates")} className="text-sm text-emerald-700">Back To Templates</Link></CreationShell>;
  return <CreationShell title={source?.status === "Draft" ? "Edit Template Message" : "New Template Message"} section="Templates" aiAction={<WhatsAppAIAssistant area="Templates" scope={scope} data={data} draft={draft} label="Write With AI" applyDescription="Replaces the current template name, text, category, language and sample values. Review your media and buttons afterwards. The template is not saved or submitted." onApply={proposal => { if (proposal.kind !== "template") return; patch({ name: proposal.name.toLowerCase().replace(/[^a-z0-9_]/g, "_"), body: proposal.body, category: proposal.category, language: proposal.language, variables: proposal.variables, sample: proposal.variables["1"] || "", status: "Draft" }); setErrors([]); }} />} actions={<><Button asChild size="sm" variant="outline"><Link href={workspaceHref("Templates")}>Cancel</Link></Button><Button size="sm" onClick={()=>void save()} className="bg-emerald-600 text-white hover:bg-emerald-700">Save Draft</Button></>}>
    <ErrorSummary errors={errors} />
    <div className="mt-2 rounded-lg border border-slate-200 bg-white p-4 sm:p-6">
      {source && source.status !== "Draft" && <p className="mb-4 rounded border border-sky-100 bg-sky-50 p-2 text-xs text-sky-700">A New Draft Copy Is Being Created. The Original Template Keeps Its Existing Approval Status.</p>}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)] xl:gap-12">
        <form id="whatsapp-template-editor" className="min-w-0 space-y-5" onSubmit={event => { event.preventDefault(); save(); }}>
          <div className="space-y-1"><TemplateLibraryPicker scope={scope} draft={draft} patch={patch} autoApply={library} /><AdvancedTemplateFields draft={draft} patch={patch} data={data}/><TemplateExtras draft={draft} patch={patch} /><Select label="Template Category" value={draft.category} onChange={category => {if(category==='Authentication')patch({category,layout:'Standard',cards:[],authentication:{otpType:'COPY_CODE',securityRecommendation:true,expirationMinutes:10},body:'{{1}}',type:'Text',header:'',footer:'',actions:[],variables:{'1':'123456'},sample:'123456',mediaId:undefined,mediaName:''});else patch({category,authentication:undefined});}} options={["Marketing", "Utility", "Authentication"]} /><p className="text-[11px] text-slate-400">Choose The Category That Matches Your Message.</p></div>
          <div className="space-y-1"><Field label="Template Name"><Input required value={draft.name} maxLength={120} placeholder="e.g. new_product_launch" pattern="[a-z0-9_]+" onChange={e => patch({ name: e.target.value })} className="bg-slate-50" /></Field><p className="text-[11px] text-slate-400">Lowercase Letters, Numbers And Underscores Only. No Spaces.</p></div>
          <Select label="Template Type" value={draft.type || "Text"} onChange={type => { if(draft.authentication||draft.layout==='Carousel')return;patch({ type: type as Template["type"], mediaId: undefined, mediaName: "", mediaPreview: "", header: type === "Text" ? draft.header : "" }); setMediaError(""); }} options={TEMPLATE_TYPES} />
          {draft.type === "Text" ? <Field label="Template Header Text (Optional)"><Input disabled={!!draft.authentication||draft.layout==="Carousel"} value={draft.header} maxLength={60} placeholder="Enter Header Text" onChange={e => patch({ header: e.target.value })} className="bg-slate-50" /><span className="text-right text-[10px] text-slate-400">{draft.header.length}/60</span></Field> : draft.type === "Location" ? <LocationFields draft={draft} patch={patch} /> : <div className="space-y-2"><p className="text-xs font-semibold text-slate-600">Sample {draft.type}</p><label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-center"><Upload className="size-5 text-emerald-600" /><span className="text-xs font-semibold">{draft.mediaName || `Choose A Sample ${draft.type}`}</span><span className="text-[10px] text-slate-400">Local Preview Only · {draft.type === "Image" ? "JPG/PNG Up To 5 MB" : draft.type === "Video" ? "MP4 Up To 16 MB" : "PDF Up To 100 MB"}</span><input className="sr-only" type="file" accept={draft.type === "Image" ? "image/png,image/jpeg" : draft.type === "Video" ? "video/mp4" : "application/pdf"} onChange={async e => {
            const file = e.target.files?.[0]; if (!file) return;
            const allowed = draft.type === "Image" ? ["image/jpeg", "image/png"] : draft.type === "Video" ? ["video/mp4"] : ["application/pdf"];
            const max = (isNative ? (draft.type === "Image" ? 5 : 10) : draft.type === "Image" ? 5 : draft.type === "Video" ? 16 : 100) * 1024 * 1024;
            if (!allowed.includes(file.type) || file.size > max) { setMediaError("Choose A Supported File Within The Displayed Size Limit."); e.target.value = ""; return; }
            try {const uploaded=isNative?await nativeWhatsAppApi.upload(scope,file):undefined;patch({ mediaId:uploaded?.id,mediaName:file.name,mediaPreview:draft.type==="Image"?URL.createObjectURL(file):"" });if(isNative)await refresh();setMediaError("");}catch(error){setMediaError(error instanceof Error?error.message:"Upload Failed");}
          }} /></label>{mediaError && <p role="alert" className="text-xs text-rose-600">{mediaError}</p>}</div>}
          <div className="space-y-2"><Field label="Template Format"><Textarea aria-label="Template Format" ref={bodyRef} disabled={!!draft.authentication} required rows={8} maxLength={1024} value={draft.body} placeholder="Hello {{1}}, your order {{2}} is ready. Thank you!" onChange={e => patch({ body: e.target.value })} className="bg-slate-50 leading-6" /></Field><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex gap-1">{[{ icon: Bold, name: "Bold", mark: "*" }, { icon: Italic, name: "Italic", mark: "_" }, { icon: Strikethrough, name: "Strikethrough", mark: "~" }].map(format => <Button key={format.name} type="button" aria-label={format.name} size="icon-sm" variant="ghost" onClick={() => insertText(format.mark, format.mark)}><format.icon /></Button>)}<Button type="button" size="xs" variant="outline" onClick={() => insertText(`{{${parameters.length + 1}}}`)}><Plus />Add Variable</Button></div><span className="text-[10px] text-slate-400">{draft.body.length}/1024</span></div><p className="text-[11px] text-slate-400">Use *Bold*, _Italic_, ~Strikethrough~ And Numbered Variables.</p></div>
          {!!sampleKeys.length && <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-semibold">Sample Values</p><p className="text-[11px] text-slate-400">Add Example Values For The Preview. Campaign Values Can Be Different.</p>{sampleKeys.map(key => <Field key={key} label={`Sample Value For {{${key}}}${Number(key) > parameters.length ? " (Dynamic URL)" : ""}`}><Input value={draft.variables?.[key] || (key === "1" ? draft.sample : "")} onChange={e => patch({ variables: { ...draft.variables, [key]: e.target.value }, ...(key === "1" ? { sample: e.target.value } : {}) })} placeholder={`Sample ${key}`} /></Field>)}</div>}
          <Field label="Template Footer Text (Optional)"><Input disabled={!!draft.authentication||draft.layout==="Carousel"} value={draft.footer} maxLength={60} placeholder="e.g. Reply STOP To Opt Out" onChange={e => patch({ footer: e.target.value })} className="bg-slate-50" /><span className="text-right text-[10px] text-slate-400">{draft.footer.length}/60</span></Field>
          <ButtonBuilder scope={scope} draft={draft} patch={patch} flows={data.flows.filter(flow => /PUBLISHED/.test(flow.status ?? ""))} />
          <div className="flex flex-wrap items-start justify-between gap-3 border-t border-slate-100 pt-4"><Button type="submit" className="bg-emerald-600 text-white hover:bg-emerald-700">Save Draft</Button>{isNative?<Button type="button" variant="outline" disabled={!envelope?.access.canConfigure} onClick={()=>void save(true)}>Save And Submit For Review</Button>:<IntegrationButton>Submit For Approval</IntegrationButton>}</div>
        </form>
        <aside className="min-w-0 space-y-5 lg:sticky lg:top-4"><Select label="Template Language" value={draft.language} onChange={language => patch({ language })} options={["English", "English (US)", "Hindi", "Marathi", "Gujarati", "Tamil", "Telugu", "Kannada", "Bengali", "Spanish", "Arabic", "French"]} /><div className="border-t border-slate-100 pt-5"><TemplatePhonePreview template={draft} /></div><div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-[11px] leading-5 text-slate-500"><p className="font-semibold text-slate-700">Before You Submit</p><p>Check The Language, Sample Values And Button Destinations. Saving A Draft Does Not Submit It To WhatsApp.</p></div></aside>
      </div>
    </div>
  </CreationShell>;
}
