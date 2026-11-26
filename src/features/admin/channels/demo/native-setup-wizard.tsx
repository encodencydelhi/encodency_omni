"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useCreationWorkspace } from "./creation-session";
import { newId } from "./mock-service";
import { nativeWhatsAppApi } from "./native-api";
import { BusinessProfile, EmbeddedSignup, accountCall, type AccountStatus } from "./native-account";
import { useWorkspaceAccess } from "./workspace-access";
import { Field } from "./ui";

/**
 * WhatsApp setup guide for the selected Client. Opens by itself on the WhatsApp page while the live number is not
 * active (until "Finish later"), and from the "Set Up WhatsApp" button. Every step saves on its own with the same
 * server checks as the Settings tab, so whatever is done starts working; the rest can be finished anytime.
 * Steps: connect -> incoming messages + registration -> verify -> business profile -> templates -> test & activate.
 */
export const OPEN_WHATSAPP_SETUP = "media360:open-whatsapp-setup";
const later = (scope: string) => `media360.whatsapp-setup-later:${scope}`;
const readLater = (scope: string) => { try { return window.localStorage.getItem(later(scope)) === "1"; } catch { return false; } };
const writeLater = (scope: string, value: boolean) => { try { if (value) window.localStorage.setItem(later(scope), "1"); else window.localStorage.removeItem(later(scope)); } catch { /* storage blocked */ } };
const errorText = (error: unknown) => (error instanceof Error ? error.message : "Something went wrong. Please try again.");
const select = "h-9 w-full rounded-sm border border-slate-200 px-2 text-sm";

export function WhatsAppSetupWizard({ scope }: { scope: string }) {
  const queryClient = useQueryClient();
  const { envelope, data, action, refresh, update, isNative } = useCreationWorkspace(scope);
  const access = useWorkspaceAccess();
  const connection = envelope?.connection;
  const live = envelope?.mode === "META";
  const canConfigure = envelope?.access.canConfigure ?? false;
  const readiness = (connection?.readiness ?? {}) as Record<string, unknown>;
  const status = useQuery({ queryKey: ["whatsapp-account-status", scope], queryFn: () => accountCall<AccountStatus>(scope, "GET", "/status"), retry: false, enabled: Boolean(live && connection?.configured) });
  const [open, setOpen] = useState(false);
  const [auto, setAuto] = useState(false);
  const [index, setIndex] = useState(0);

  const approved = data.templates.filter((template) => template.status === "Approved");
  const steps = [
    { id: "connect", title: "Connect number", done: Boolean(connection?.configured) },
    { id: "incoming", title: "Incoming messages", done: Boolean(status.data?.subscribed && status.data?.registered) || (readiness.subscription === true && readiness.registered === true) },
    { id: "verify", title: "Verify", done: readiness.assets === true && readiness.health === true },
    { id: "profile", title: "Business profile", done: false, optional: true },
    { id: "templates", title: "Templates", done: approved.length > 0 },
    { id: "activate", title: "Test & activate", done: connection?.status === "ACTIVE" },
  ];
  const firstOpen = Math.max(0, steps.findIndex((step) => !step.done && !("optional" in step)));

  // Opens by itself once per visit while a live number still needs setup.
  if (live && canConfigure && envelope && connection?.status !== "ACTIVE" && !auto && !readLater(scope)) { setAuto(true); setOpen(true); setIndex(firstOpen); }
  useEffect(() => {
    const handler = () => { writeLater(scope, false); setOpen(true); setIndex(firstOpen); };
    window.addEventListener(OPEN_WHATSAPP_SETUP, handler);
    return () => window.removeEventListener(OPEN_WHATSAPP_SETUP, handler);
  }, [scope, firstOpen]);

  const reload = async () => { await refresh(); void queryClient.invalidateQueries({ queryKey: ["whatsapp-account-status", scope] }); };
  const finishLater = () => { setOpen(false); if (connection?.status !== "ACTIVE") writeLater(scope, true); };
  if (!isNative || !live || !canConfigure) return null;
  const step = steps[index];

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) finishLater(); else setOpen(true); }}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto" showClose={false}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <DialogTitle className="flex items-center gap-2 text-lg"><MessageCircle className="size-5 text-emerald-600" /> Set up WhatsApp for this Client</DialogTitle>
            <DialogDescription className="text-xs">Do as much as you can now. Every step saves on its own; you can come back anytime with “Set Up WhatsApp”.</DialogDescription>
          </div>
          <button type="button" className="shrink-0 text-xs font-semibold text-slate-500 hover:text-slate-800" onClick={finishLater}>Finish later</button>
        </div>
        <ol className="flex flex-wrap gap-1">
          {steps.map((item, i) => (
            <li key={item.id}><button type="button" onClick={() => setIndex(i)} className={`flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold ${i === index ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600"}`}>{item.done ? <CheckCircle2 className="size-3.5 text-emerald-600" /> : <Circle className="size-3.5" />}{i + 1}. {item.title}</button></li>
          ))}
        </ol>
        <div className="min-h-48 text-xs">
          {step?.id === "connect" && <ConnectStep scope={scope} configured={Boolean(connection?.configured)} hasToken={Boolean(connection?.hasAccessToken)} onDone={async () => { await reload(); setIndex(1); }} />}
          {step?.id === "incoming" && <IncomingStep scope={scope} status={status.data} error={status.error} configured={Boolean(connection?.configured)} onDone={reload} />}
          {step?.id === "verify" && (
            <div className="space-y-2">
              <p className="text-slate-500">Media360 asks Meta to confirm the token, that the number belongs to this account, its registration, quality and that messages reach Media360.</p>
              <Button size="sm" disabled={!connection?.configured} onClick={() => void action("/connection/verify").then((ok) => { if (ok) toast.success("Checked with Meta."); })}>Verify With Meta</Button>
              <Readiness readiness={readiness} />
            </div>
          )}
          {step?.id === "profile" && (connection?.configured ? <div className="space-y-2"><p className="text-slate-500">What customers see when they open your chat. Optional, but it builds trust.</p><BusinessProfile scope={scope} /></div> : <p className="text-slate-500">Connect the number first.</p>)}
          {step?.id === "templates" && (
            <div className="space-y-2">
              <p className="text-slate-500">Templates are messages Meta approves in advance; you need one to start a chat or run a campaign. Get the ones already approved in your WhatsApp account, or create new ones in the Templates tab (Meta usually approves within minutes to a day).</p>
              <Button size="sm" variant="outline" disabled={!connection?.configured} onClick={() => void action("/templates/sync").then((ok) => { if (ok) toast.success("Templates updated from Meta."); })}>Get Templates From Meta</Button>
              <p>{approved.length ? <>Approved templates: <strong>{approved.map((template) => template.name).join(", ")}</strong></> : "No approved template yet."}</p>
            </div>
          )}
          {step?.id === "activate" && <ActivateStep approved={approved} contacts={data.contacts} readiness={readiness} active={connection?.status === "ACTIVE"} revision={connection?.revision} canSend={Boolean(access.canSend ?? access.canEdit)} action={action} update={update} />}
          {!step && <p className="text-sm text-slate-700">{connection?.status === "ACTIVE" ? "WhatsApp is live for this Client. You can now use the Inbox, Templates and Campaigns." : "Good progress. Finish the remaining steps anytime with “Set Up WhatsApp”."}</p>}
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <button type="button" className="text-xs font-semibold text-slate-500 disabled:opacity-40" disabled={index === 0} onClick={() => setIndex(index - 1)}>Back</button>
          {step ? <button type="button" className="text-xs font-semibold text-slate-600 hover:text-slate-900" onClick={() => setIndex(index + 1)}>{step.done ? "Next" : "Skip for now"}</button> : <Button size="sm" onClick={finishLater}>Close</Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Readiness({ readiness }: { readiness: Record<string, unknown> }) {
  const labels: Record<string, string> = { configuration: "Details saved", assets: "Token can use this number", registered: "Number registered", subscription: "Incoming messages on", callbackConfigured: "Platform webhook URL", health: "Number quality OK", webhookDelivery: "Delivery report received", testSend: "Test message sent" };
  return (
    <dl className="grid gap-1 rounded border border-slate-100 p-2 sm:grid-cols-2">
      {Object.entries(labels).map(([key, label]) => <div key={key} className="flex justify-between gap-2"><dt>{label}</dt><dd className={readiness[key] === true ? "text-emerald-700" : "text-amber-700"}>{readiness[key] === true ? "Verified" : "Pending"}</dd></div>)}
    </dl>
  );
}

function ConnectStep({ scope, configured, hasToken, onDone }: { scope: string; configured: boolean; hasToken: boolean; onDone: () => Promise<void> }) {
  const [wabaId, setWabaId] = useState(""), [phoneNumberId, setPhoneNumberId] = useState(""), [token, setToken] = useState(""), [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try { await nativeWhatsAppApi.configure(scope, { wabaId: wabaId.trim(), phoneNumberId: phoneNumberId.trim(), accessToken: token.trim() }); setToken(""); toast.success("WhatsApp details saved."); await onDone(); }
    catch (error) { toast.error(errorText(error)); }
    finally { setSaving(false); }
  };
  return (
    <div className="space-y-3">
      {configured && <p className="rounded border border-emerald-200 bg-emerald-50 p-2 text-emerald-800">This Client’s number is saved. Enter new details only to change it.</p>}
      <EmbeddedSignup scope={scope} onDone={() => void onDone()} />
      <div className="rounded-md border border-slate-200 p-3">
        <p className="mb-1 font-semibold text-slate-700">Or enter the details yourself</p>
        <p className="mb-2 text-slate-500">WhatsApp Manager shows the WhatsApp Business Account ID and the Phone Number ID. Business Settings → System users → Generate token (expiry: Never) with whatsapp_business_messaging and whatsapp_business_management. The token is stored encrypted.</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <Field label="WhatsApp Business Account ID"><Input value={wabaId} inputMode="numeric" onChange={(event) => setWabaId(event.target.value.replace(/\D/g, ""))} /></Field>
          <Field label="Phone Number ID"><Input value={phoneNumberId} inputMode="numeric" onChange={(event) => setPhoneNumberId(event.target.value.replace(/\D/g, ""))} /></Field>
          <Field label="Access Token"><Input type="password" autoComplete="off" value={token} placeholder={hasToken ? "Saved (enter to replace)" : ""} onChange={(event) => setToken(event.target.value)} /></Field>
        </div>
        <div className="mt-2 flex justify-end"><Button size="sm" disabled={saving || wabaId.length < 5 || phoneNumberId.length < 5 || token.trim().length < 20} onClick={() => void save()}>{saving ? "Saving..." : "Save And Continue"}</Button></div>
      </div>
    </div>
  );
}

function IncomingStep({ scope, status, error, configured, onDone }: { scope: string; status: AccountStatus | undefined; error: unknown; configured: boolean; onDone: () => Promise<void> }) {
  const [pin, setPin] = useState(""), [busy, setBusy] = useState(false);
  const run = async (path: string, body?: unknown, done?: string) => {
    setBusy(true);
    try { await accountCall(scope, "POST", path, body); if (done) toast.success(done); await onDone(); }
    catch (caught) { toast.error(errorText(caught)); }
    finally { setBusy(false); }
  };
  if (!configured) return <p className="text-slate-500">Connect the number first.</p>;
  if (error) return <p className="text-amber-700">{errorText(error)}</p>;
  if (!status) return <p className="text-slate-500">Checking with Meta…</p>;
  return (
    <div className="space-y-3">
      <div className="rounded-md border border-slate-200 p-3">
        <p className="font-semibold text-slate-700">Incoming messages: {status.subscribed ? <span className="text-emerald-700">On</span> : <span className="text-amber-700">Off</span>}</p>
        <p className="mb-2 text-slate-500">{status.subscribed ? "Customer messages and delivery reports reach Media360." : "Messages to this number do not reach Media360 yet. An old provider (for example AiSensy) may still hold the number."}</p>
        {!status.subscribed && <Button size="sm" disabled={busy} onClick={() => void run("/subscribe", undefined, "Incoming messages are on.")}>Turn On Incoming Messages</Button>}
      </div>
      <div className="rounded-md border border-slate-200 p-3">
        <p className="font-semibold text-slate-700">Number registration {status.displayPhone && `· ${status.displayPhone}`}: {status.registered ? <span className="text-emerald-700">Registered</span> : <span className="text-amber-700">Not registered</span>}</p>
        {!status.registered && <>
          <p className="mb-2 text-slate-500">Choose a 6-digit PIN. It becomes the number’s two-step PIN (if it already has one, enter that). Meta allows 10 tries in 72 hours.</p>
          <div className="flex flex-wrap items-end gap-2"><Input aria-label="Two-step PIN" className="w-32" value={pin} inputMode="numeric" placeholder="6-digit PIN" onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))} /><Button size="sm" disabled={busy || pin.length !== 6} onClick={() => void run("/register", { pin }, "Number registered.")}>Register Number</Button></div>
        </>}
      </div>
    </div>
  );
}

/** Values for {{1}}, {{2}}...: the template's approved example values, with {{1}} set to the contact's name. Meta rejects a send with a missing variable. */
function testParameters(template: { variables?: Record<string, string> } | undefined, name?: string): Record<string, string> {
  const values = { ...(template?.variables ?? {}) };
  if ("1" in values && name) values["1"] = name;
  return values;
}

function ActivateStep({ approved, contacts, readiness, active, revision, canSend, action, update }: {
  approved: Array<{ id: string; name: string; variables?: Record<string, string> }>; contacts: Array<{ id: string; name: string; phone: string; consent: boolean }>; readiness: Record<string, unknown>; active: boolean; revision?: number; canSend: boolean;
  action: (path: string, body?: unknown) => Promise<boolean>; update: ReturnType<typeof useCreationWorkspace>["update"];
}) {
  const [templateId, setTemplateId] = useState(""), [contactId, setContactId] = useState("");
  const [myName, setMyName] = useState(""), [myPhone, setMyPhone] = useState("");
  const consenting = contacts.filter((contact) => contact.consent);
  if (active) return <p className="text-emerald-700">WhatsApp is live for this Client.</p>;
  const addMe = async () => {
    const phone = myPhone.trim();
    if (!/^\+[1-9]\d{7,14}$/.test(phone.replace(/[\s-]/g, ""))) return toast.error("Enter the number with country code, e.g. +919800000001.");
    const id = newId();
    if (await update((current) => ({ ...current, contacts: [{ id, name: myName.trim() || "Me", phone: phone.replace(/[\s-]/g, ""), tags: ["test"], consent: true, agent: "Unassigned", notes: "Added for the activation test message." }, ...current.contacts] }))) { setContactId(id); toast.success("Added as a contact."); }
  };
  return (
    <div className="space-y-3">
      <div className="rounded-md border border-slate-200 p-3">
        <p className="mb-1 font-semibold text-slate-700">a. Send one test message to your own phone</p>
        <p className="mb-2 text-slate-500">This is a real WhatsApp message. When it is delivered, “Test message sent” and “Delivery report received” turn Verified.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="Approved template"><select className={select} value={templateId} onChange={(event) => setTemplateId(event.target.value)}><option value="">{approved.length ? "Choose…" : "Get templates in step 5 first"}</option>{approved.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></Field>
          <Field label="Send to"><select className={select} value={contactId} onChange={(event) => setContactId(event.target.value)}><option value="">{consenting.length ? "Choose a contact…" : "Add yourself below"}</option>{consenting.map((contact) => <option key={contact.id} value={contact.id}>{contact.name || contact.phone} · {contact.phone}</option>)}</select></Field>
        </div>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <Field label="Your name"><Input className="w-36" value={myName} onChange={(event) => setMyName(event.target.value)} /></Field>
          <Field label="Your WhatsApp number"><Input className="w-44" value={myPhone} placeholder="+91…" onChange={(event) => setMyPhone(event.target.value)} /></Field>
          <Button size="sm" variant="outline" onClick={() => void addMe()}>Add Me As Contact</Button>
          <Button size="sm" className="ml-auto" disabled={!templateId || !contactId || !canSend} onClick={() => void action("/connection/test-send", { confirm: true, kind: "TEMPLATE", contactId, templateId, body: "", parameters: testParameters(approved.find((template) => template.id === templateId), consenting.find((contact) => contact.id === contactId)?.name), idempotencyKey: `activation-test-${templateId}-${contactId}-${Date.now()}` }).then((ok) => { if (ok) toast.success("Test message sent. Check your phone."); })}>Send Test Message</Button>
        </div>
      </div>
      <div className="rounded-md border border-slate-200 p-3">
        <p className="mb-1 font-semibold text-slate-700">b. Verify again and activate</p>
        <p className="mb-2 text-slate-500">After the test message is delivered, press Verify again (activation needs a check from the last 15 minutes), then Activate.</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => void action("/connection/verify")}>Verify Again</Button>
          <Button size="sm" disabled={readiness.testSend !== true || readiness.webhookDelivery !== true} onClick={() => { if (window.confirm("Activate live WhatsApp? This Client can then send real messages and campaigns; Meta charges apply.")) void action("/connection/activate", { confirm: true, expectedRevision: revision }).then((ok) => { if (ok) toast.success("WhatsApp is live for this Client."); }); }}>Activate WhatsApp</Button>
        </div>
        <Readiness readiness={readiness} />
      </div>
    </div>
  );
}
