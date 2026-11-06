"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Loader2, MessageCircleMore as AssistantIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge, Field, Select, control } from "./ui";
import { type Template, type Workspace } from "./mock-service";
import { AI_AREAS, AI_TASKS, buildAIContext, demoAIAdapter, type AIProposal, type AIRequest, type AIResult, type AITask } from "./ai-model";
import { nativeWhatsAppApi, nativeWhatsAppEnabled } from "./native-api";

export function WhatsAppAIAssistant({ area, scope, data, draft, contactId, onApply, label = "AI Assistant", applyDescription, disabled = false, readOnly = false }: {
  area: string; scope: string; data: Workspace; draft?: Template; contactId?: string;
  onApply: (proposal: AIProposal) => void | Promise<boolean | void>; label?: string; applyDescription?: string; disabled?: boolean; readOnly?: boolean;
}) {
  const tasks = (AI_AREAS[area] || AI_AREAS.Overview!).filter(task => task !== "template_improve" || draft);
  const [open, setOpen] = useState(false);
  const [task, setTask] = useState<AITask>(tasks[0]!);
  const [prompt, setPrompt] = useState("");
  const [tone, setTone] = useState<AIRequest["tone"]>("Professional");
  const [language, setLanguage] = useState<AIRequest["language"]>(draft?.language === "Hindi" ? "Hindi" : "English");
  const [includeContext, setIncludeContext] = useState(false);
  const [targetContact, setTargetContact] = useState(contactId || data.contacts[0]?.id || "");
  const [result, setResult] = useState<AIResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const clearResult = () => { setResult(null); setError(""); setReviewing(false); setReviewed(false); };
  const close = (next: boolean) => { if (!next) { controller.current?.abort(); setBusy(false); } setOpen(next); };
  const generate = async () => {
    controller.current?.abort();
    const current = new AbortController(); controller.current = current;
    clearResult(); setBusy(true);
    try {
      const request={ scope, task, prompt, tone, language, ...(task === "reply_draft" || task === "conversation_summary" ? { targetContactId: contactId || targetContact } : {}), ...(includeContext ? { context: buildAIContext(data, contactId || targetContact, draft) } : {}) };
      const response = nativeWhatsAppEnabled ? await nativeWhatsAppApi.ai(scope,request,current.signal) : await demoAIAdapter.generate(request,current.signal);
      if (!current.signal.aborted && response.scope === scope) setResult(response);
    } catch (failure) { if (!current.signal.aborted) setError(failure instanceof Error ? failure.message : "Unable To Prepare A Suggestion. Please Try Again."); }
    finally { if (!current.signal.aborted) setBusy(false); }
  };
  const apply = async () => {
    if (busy || readOnly || !reviewed || !result || result.scope !== scope) return;
    try { setBusy(true); const saved=await onApply(result.proposal); if(saved===false)throw new Error("The suggestion could not be saved. Your review was kept."); toast.success("Reviewed Suggestion Applied To Draft", { description: "Nothing Was Sent, Submitted Or Activated." }); close(false); clearResult(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Unable To Apply This Suggestion."); }
    finally {setBusy(false);}
  };
  const editableText = result?.proposal.kind === "template" ? result.proposal.body : result?.proposal.kind === "reply" || result?.proposal.kind === "profile" ? result.proposal.text : null;
  const editText = (text: string) => {
    setResult(current => { if (!current) return current; const proposal = current.proposal; return proposal.kind === "template" ? { ...current, proposal: { ...proposal, body: text } } : proposal.kind === "reply" || proposal.kind === "profile" ? { ...current, proposal: { ...proposal, text } } : current; });
    setReviewed(false);
  };
  return <>
    <Button type="button" size="sm" variant="outline" disabled={disabled} className="border-violet-200 bg-white text-violet-700 hover:bg-violet-50" onClick={() => setOpen(true)}><AssistantIcon className="size-3.5" />{label}</Button>
    <Sheet open={open} onOpenChange={close}><SheetContent className="max-w-xl bg-white text-slate-900">
      <SheetHeader><SheetTitle className="flex items-center gap-2"><AssistantIcon className="size-4 text-violet-600" />WhatsApp AI Assistant</SheetTitle><SheetDescription>{area} · Suggestions For The Client Selected In Your Sidebar</SheetDescription></SheetHeader>
      <SheetBody className="min-h-0 space-y-4"><div className="rounded-lg border border-violet-100 bg-violet-50 p-3 text-xs text-violet-800"><Badge>{nativeWhatsAppEnabled?(result?.provider==="openai"?"OpenAI":result?.provider==="mock"?"SIMULATED AI":"AI Assistant"):"Demo AI Preview"}</Badge><p className="mt-2">{nativeWhatsAppEnabled?(result?.provider==="mock"?"Simulation adapter: no OpenAI request was made.":"Suggestions use the backend AI configuration. Review and edit before applying. WhatsApp sending remains separate."):"These are local example suggestions."}</p></div>
        <fieldset disabled={busy} className="space-y-3"><Field label="AI Task"><select className={control} value={task} onChange={event => { setTask(event.target.value as AITask); clearResult(); }}>{tasks.map(item => <option value={item} key={item}>{AI_TASKS[item].label}</option>)}</select></Field>
          <Field label="What Would You Like AI To Help With?"><Textarea rows={4} maxLength={2000} placeholder={AI_TASKS[task].prompt} value={prompt} onChange={event => { setPrompt(event.target.value); clearResult(); }} /></Field>
          <Button type="button" size="xs" variant="link" onClick={() => { setPrompt(AI_TASKS[task].prompt); clearResult(); }}>Use Example Instructions</Button>
          <div className="grid grid-cols-2 gap-2"><Select label="Tone" value={tone} options={["Professional", "Friendly", "Persuasive"]} onChange={value => { setTone(value as AIRequest["tone"]); clearResult(); }} /><Select label="Language" value={language} options={["English", "Hindi"]} onChange={value => { setLanguage(value as AIRequest["language"]); clearResult(); }} /></div>
          {(task === "reply_draft" || task === "conversation_summary") && !contactId && <Field label="Conversation"><select className={control} value={targetContact} onChange={event => { setTargetContact(event.target.value); clearResult(); }}>{data.contacts.map(contact => <option key={contact.id} value={contact.id}>{contact.name}</option>)}</select></Field>}
          <label className="flex items-start gap-2 text-xs text-slate-600"><input type="checkbox" checked={includeContext} onChange={event => { setIncludeContext(event.target.checked); clearResult(); }} /><span>Include Selected Client Counts{draft ? " And Current Template Draft" : task==="reply_draft"||task==="conversation_summary"?" And This Conversation's Last 8 Messages":""} In The AI Request</span></label><p className="text-[10px] text-slate-500">When OpenAI Is Enabled, Your Instructions And Selected Context Are Sent To OpenAI And Count Toward Company AI Usage. Review Suggestions Before Applying.</p>
          <p className="text-[11px] text-slate-400">Context is optional. No keys, account configuration, phone directory or media files are included.</p>
        </fieldset>
        <div className="flex flex-wrap gap-2"><Button type="button" size="sm" disabled={busy || nativeWhatsAppEnabled&&readOnly || prompt.trim().length < 8} className="bg-violet-600 text-white hover:bg-violet-700" onClick={() => void generate()}>{busy ? <Loader2 className="size-3.5 animate-spin" /> : <AssistantIcon className="size-3.5" />}{busy ? "Preparing Suggestion..." : result ? "Generate Again" : nativeWhatsAppEnabled?"Generate Suggestion":"Generate Demo Suggestion"}</Button>{busy && <Button type="button" size="sm" variant="outline" onClick={() => { controller.current?.abort(); setBusy(false); }}>Cancel</Button>}</div>
        {busy && <div role="status" className="space-y-2"><div className="h-3 animate-pulse rounded bg-slate-100" /><div className="h-20 animate-pulse rounded bg-slate-100" /></div>}
        {error && <div role="alert" className="rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}</div>}
        {result && <div className="space-y-3 rounded-lg border border-slate-200 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">Suggested Draft</h3><Button type="button" size="xs" variant="outline" onClick={() => { clearResult(); toast.info("Suggestion Rejected. No Draft Was Changed."); }}>Reject Suggestion</Button><Button type="button" size="xs" variant="ghost" onClick={async () => { try { await navigator.clipboard.writeText(proposalText(result.proposal)); toast.success("Suggestion Copied"); } catch { setError("Clipboard Is Unavailable. Select And Copy The Preview Text."); } }}><Copy />Copy</Button></div>
          {result.proposal.kind === "template" && <Field label="Suggested Template Name"><Input value={result.proposal.name} onChange={event => { const name = event.target.value; setResult(current => current?.proposal.kind === "template" ? { ...current, proposal: { ...current.proposal, name } } : current); setReviewed(false); }} /></Field>}
          {editableText !== null ? <Field label="Review And Edit Suggested Text"><Textarea rows={7} value={editableText} maxLength={result.proposal.kind === "template" ? 1024 : result.proposal.kind === "profile" ? 512 : 4096} onChange={event => editText(event.target.value)} /></Field> : <pre className="whitespace-pre-wrap break-words font-sans text-xs leading-6 text-slate-600">{proposalText(result.proposal)}</pre>}
          {result.proposal.kind !== "insight" && !reviewing && <Button type="button" variant="outline" size="sm" onClick={() => setReviewing(true)}>Review Changes</Button>}
          {reviewing && <div className="space-y-3 rounded border border-amber-100 bg-amber-50 p-3 text-xs text-amber-900"><p className="font-semibold">{AI_TASKS[result.task].action}</p>{readOnly && <p>This Role Can Review Or Copy Suggestions, But Cannot Apply Changes.</p>}<p>{applyDescription || "Creates or updates a local draft for your review. Existing messages, consent, billing, connections and live execution remain unchanged."}</p><label className="flex items-start gap-2"><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} />I Have Reviewed This Suggestion.</label><Button type="button" size="sm" disabled={busy || readOnly || !reviewed || editableText?.trim() === "" || (result.proposal.kind === "template" && !result.proposal.name.trim())} onClick={apply}>Confirm Apply To Draft</Button></div>}
        </div>}
      </SheetBody><SheetFooter><p className="mr-auto text-[10px] text-slate-400">Human Review Required · No Automatic Sending Or Activation</p><Button type="button" size="sm" variant="outline" onClick={() => close(false)}>Close</Button></SheetFooter>
    </SheetContent></Sheet>
  </>;
}
function proposalText(proposal: AIProposal): string {
  switch (proposal.kind) {
    case "template": return `${proposal.name}\n${proposal.body}`;
    case "campaign": return `${proposal.name}\n\nGoal: ${proposal.goal}\nAudience: ${proposal.audienceTag}\nApproach: ${proposal.approach}`;
    case "reply": case "profile": return proposal.text;
    case "workflow": return `${proposal.name}\n\n${proposal.nodes.map((node, index) => `${index + 1}. ${node.kind}: ${node.label}\n${node.value}`).join("\n\n")}`;
    case "flow": return `${proposal.name}\n\n${proposal.screens.map(screen => `${screen.title}\n${screen.fields.map(field => `- ${field.label} (${field.type}${field.required ? ", Required" : ""})`).join("\n")}`).join("\n\n")}`;
    case "insight": return `${proposal.title}\n\n${proposal.points.join("\n\n")}`;
  }
}
