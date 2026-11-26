"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/types/api";
import { nativeScopeHeaders } from "./native-api";
import { useCreationWorkspace } from "./creation-session";
import { Badge, Field, Panel } from "./ui";

/**
 * WhatsApp account tools for the selected Client's number: webhook subscription, number registration, business profile,
 * Meta Embedded Signup, product messages and automatic read receipts. Everything goes through Media360's backend.
 */
const root = "/integrations/whatsapp/v2/account";
const call = <T,>(scope: string, method: "GET" | "POST" | "PUT", path: string, body?: unknown) => apiClient.request<T>({ method, path: root + path, body, headers: nativeScopeHeaders(scope) });
/** Calls the account endpoints (/integrations/whatsapp/v2/account/...) for the selected Client. */
export const accountCall = <T,>(scope: string, method: "GET" | "POST" | "PUT", path: string, body?: unknown) => call<T>(scope, method, path, body);
const message = (error: unknown) => (ApiError.isApiError(error) ? error.message : error instanceof Error ? error.message : "Something went wrong. Please try again.");
const select = "h-9 rounded-md border border-slate-200 px-2 text-sm";

export interface AccountStatus { origin: string; subscribed: boolean; authorized: boolean; registered: boolean; displayPhone: string; quality: string }
interface Profile { about: string; address: string; description: string; email: string; websites: string[]; vertical: string; profilePictureUrl: string | null; verticals: string[] }
interface EmbeddedConfig { available: boolean; appId: string | null; configId: string | null; graphVersion: string }
interface ContactOption { id: string; name: string; phone: string; consent: boolean; suppressed?: boolean }

/** Blue ticks when an agent opens a chat, and "typing..." while they write (at most every 20 s). */
export function useWhatsAppReadReceipts(scope: string, enabled: boolean, lastIncomingId: string | undefined) {
  const marked = useRef(new Set<string>());
  const typedAt = useRef(0);
  useEffect(() => {
    if (!enabled || !lastIncomingId || marked.current.has(lastIncomingId)) return;
    marked.current.add(lastIncomingId);
    void call(scope, "POST", `/messages/${lastIncomingId}/read`, {}).catch(() => marked.current.delete(lastIncomingId));
  }, [enabled, lastIncomingId, scope]);
  return useCallback(() => {
    if (!enabled || !lastIncomingId || Date.now() - typedAt.current < 20_000) return;
    typedAt.current = Date.now();
    void call(scope, "POST", `/messages/${lastIncomingId}/read`, { typing: true }).catch(() => undefined);
  }, [enabled, lastIncomingId, scope]);
}

type FacebookSdk = { init: (options: Record<string, unknown>) => void; login: (callback: (response: { authResponse?: { code?: string } }) => void, options: Record<string, unknown>) => void };
const sdkWindow = () => window as unknown as { FB?: FacebookSdk; fbAsyncInit?: () => void };
function loadFacebookSdk(appId: string, version: string): Promise<FacebookSdk> {
  return new Promise((resolve, reject) => {
    const w = sdkWindow();
    if (w.FB) { w.FB.init({ appId, autoLogAppEvents: true, xfbml: false, version }); return resolve(w.FB); }
    w.fbAsyncInit = () => { w.FB!.init({ appId, autoLogAppEvents: true, xfbml: false, version }); resolve(w.FB!); };
    const script = document.createElement("script");
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true; script.defer = true; script.crossOrigin = "anonymous";
    script.onerror = () => reject(new Error("Could not load the Facebook SDK. Check your internet or ad blocker."));
    document.body.appendChild(script);
  });
}

export function EmbeddedSignup({ scope, onDone }: { scope: string; onDone: () => void }) {
  const config = useQuery({ queryKey: ["whatsapp-embedded", scope], queryFn: () => call<EmbeddedConfig>(scope, "GET", "/embedded-signup"), retry: false });
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const start = async () => {
    const setup = config.data;
    if (!setup?.available || !setup.appId || !setup.configId) return;
    if (pin && !/^\d{6}$/.test(pin)) return toast.error("The PIN must be 6 digits (or leave it empty).");
    setBusy(true);
    try {
      const FB = await loadFacebookSdk(setup.appId, setup.graphVersion);
      let session: { wabaId?: string; phoneNumberId?: string } = {};
      const listener = (event: MessageEvent) => {
        if (typeof event.origin !== "string" || !event.origin.endsWith("facebook.com")) return;
        try {
          const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
          if (data?.type !== "WA_EMBEDDED_SIGNUP") return;
          if (data.event === "FINISH") session = { wabaId: String(data.data?.waba_id ?? ""), phoneNumberId: String(data.data?.phone_number_id ?? "") };
          if (data.event === "CANCEL") toast.message("Meta signup was closed before finishing.");
          if (data.event === "ERROR") toast.error(String(data.data?.error_message ?? "Meta signup reported an error."));
        } catch { /* not a signup message */ }
      };
      window.addEventListener("message", listener);
      FB.login(async (response) => {
        window.removeEventListener("message", listener);
        const code = response.authResponse?.code;
        if (!code || !session.wabaId || !session.phoneNumberId) { setBusy(false); if (code) toast.error("Meta did not return the WhatsApp account and number. Choose a number in the popup and finish all steps."); return; }
        try {
          const result = await call<{ steps: Record<string, boolean | string> }>(scope, "POST", "/embedded-signup", { code, wabaId: session.wabaId, phoneNumberId: session.phoneNumberId, ...(pin ? { pin } : {}) });
          const failed = Object.entries(result.steps).filter(([, ok]) => ok === false).map(([step]) => step);
          if (failed.length) toast.warning(`Connected, but these steps need a retry below: ${failed.join(", ")}.`); else toast.success("WhatsApp connected. Verify and activate the connection to start sending.");
          onDone();
        } catch (error) { toast.error(message(error)); } finally { setBusy(false); }
      }, { config_id: setup.configId, response_type: "code", override_default_response_type: true, extras: { setup: {} } });
    } catch (error) { setBusy(false); toast.error(message(error)); }
  };
  if (!config.data) return null;
  return (
    <div className="rounded-md border border-slate-200 p-3">
      <p className="mb-1 text-xs font-semibold text-slate-700">Connect with Meta (Embedded Signup)</p>
      {config.data.available ? (
        <>
          <p className="mb-2 text-xs text-slate-500">The client logs in to Facebook, picks or creates its WhatsApp Business account and number, and Media360 saves the connection, subscribes webhooks and registers the number.</p>
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Two-step PIN for a new number (optional)"><Input value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="6 digits" className="w-36" /></Field>
            <Button type="button" onClick={() => void start()} disabled={busy}>{busy ? "Connecting…" : "Connect With Meta"}</Button>
          </div>
        </>
      ) : <p className="text-xs text-amber-700">Not set up on the platform yet: the Super Admin must add the Embedded Signup configuration ID (WHATSAPP_META_EMBEDDED_SIGNUP_CONFIG_ID).</p>}
    </div>
  );
}

export function BusinessProfile({ scope }: { scope: string }) {
  const queryClient = useQueryClient();
  const profile = useQuery({ queryKey: ["whatsapp-profile", scope], queryFn: () => call<Profile>(scope, "GET", "/profile"), retry: false });
  const [draft, setDraft] = useState<Partial<Profile> | null>(null);
  const value = { ...profile.data, ...draft } as Profile;
  const save = useMutation({
    mutationFn: () => call(scope, "PUT", "/profile", { about: value.about, address: value.address, description: value.description, email: value.email, websites: (value.websites ?? []).filter(Boolean), vertical: value.vertical }),
    onSuccess: () => { toast.success("Business profile saved on WhatsApp."); setDraft(null); void queryClient.invalidateQueries({ queryKey: ["whatsapp-profile", scope] }); },
    onError: (error) => toast.error(message(error)),
  });
  const photo = useMutation({
    mutationFn: async (file: File) => {
      if (!["image/jpeg", "image/png"].includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error("Choose a JPG or PNG up to 5 MB.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = ""; for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return call(scope, "PUT", "/profile/photo", { mimeType: file.type, dataBase64: btoa(binary) });
    },
    onSuccess: () => { toast.success("Profile picture updated."); void queryClient.invalidateQueries({ queryKey: ["whatsapp-profile", scope] }); },
    onError: (error) => toast.error(message(error)),
  });
  const set = (key: keyof Profile) => (event: { target: { value: string } }) => setDraft({ ...draft, [key]: event.target.value });
  if (profile.isError) return <p className="text-xs text-amber-700">{message(profile.error)}</p>;
  if (!profile.data) return <p className="text-xs text-slate-500">Loading business profile…</p>;
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Field label="About (shown under the name, required)"><Input value={value.about} maxLength={139} onChange={set("about")} /></Field>
      <Field label="Category"><select className={select} value={value.vertical} onChange={set("vertical")}><option value="">Not set</option>{profile.data.verticals.map((v) => <option key={v} value={v}>{v.replace(/_/g, " ")}</option>)}</select></Field>
      <Field label="Description"><Input value={value.description} maxLength={512} onChange={set("description")} /></Field>
      <Field label="Address"><Input value={value.address} maxLength={256} onChange={set("address")} /></Field>
      <Field label="Email"><Input value={value.email} maxLength={128} onChange={set("email")} /></Field>
      <Field label="Websites (up to 2, with https://)"><Input value={(value.websites ?? []).join(", ")} onChange={(event) => setDraft({ ...draft, websites: event.target.value.split(",").map((s) => s.trim()).slice(0, 2) })} /></Field>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        {profile.data.profilePictureUrl && <img src={profile.data.profilePictureUrl} alt="WhatsApp profile" width={40} height={40} className="rounded-full border border-slate-200" />}
        <label className="text-xs font-semibold text-slate-600">Profile picture (JPG/PNG, square 640×640 works best) <input type="file" accept="image/jpeg,image/png" className="mt-1 block text-xs" disabled={photo.isPending} onChange={(event) => { const file = event.target.files?.[0]; if (file) photo.mutate(file); event.target.value = ""; }} /></label>
        <Button type="button" className="ml-auto" onClick={() => save.mutate()} disabled={!draft || save.isPending}>Save Profile</Button>
      </div>
    </div>
  );
}

export function NativeAccountPanel({ scope }: { scope: string }) {
  const queryClient = useQueryClient();
  const { envelope } = useCreationWorkspace(scope);
  const configured = Boolean(envelope?.connection.configured);
  const status = useQuery({ queryKey: ["whatsapp-account-status", scope], queryFn: () => call<AccountStatus>(scope, "GET", "/status"), retry: false, enabled: configured });
  const refresh = () => { void queryClient.invalidateQueries({ queryKey: ["whatsapp-account-status", scope] }); void queryClient.invalidateQueries({ queryKey: ["whatsapp-native", scope] }); };
  const subscribe = useMutation({ mutationFn: () => call(scope, "POST", "/subscribe"), onSuccess: () => { toast.success("Media360 now receives this WhatsApp account's messages and updates."); refresh(); }, onError: (error) => toast.error(message(error)) });
  const [pin, setPin] = useState("");
  const register = useMutation({ mutationFn: () => call(scope, "POST", "/register", { pin }), onSuccess: () => { toast.success("Number registered with WhatsApp."); setPin(""); refresh(); }, onError: (error) => toast.error(message(error)) });
  const s = status.data;
  return (
    <Panel title="WhatsApp Account Setup" actions={s ? <Badge>{s.origin}</Badge> : undefined}>
      <div className="space-y-3">
        <EmbeddedSignup scope={scope} onDone={refresh} />
        {status.isError && <p className="text-xs text-amber-700">{message(status.error)}</p>}
        {s && (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-md border border-slate-200 p-3">
              <p className="mb-1 text-xs font-semibold text-slate-700">Incoming messages (webhook subscription)</p>
              <p className="mb-2 text-xs text-slate-500">{s.subscribed ? "On: Media360 receives this account's messages and status updates." : "Off: messages to this number do not reach Media360 yet. Another tool (for example an old provider) may still be connected."}</p>
              {!s.subscribed && <Button type="button" size="sm" onClick={() => subscribe.mutate()} disabled={subscribe.isPending}>Turn On Incoming Messages</Button>}
            </div>
            <div className="rounded-md border border-slate-200 p-3">
              <p className="mb-1 text-xs font-semibold text-slate-700">Number registration {s.displayPhone && `· ${s.displayPhone}`}</p>
              <p className="mb-2 text-xs text-slate-500">{s.registered ? "Registered: the number can send and receive." : "Not registered: enter a 6-digit PIN. It becomes the two-step PIN; if the number already has one, use that. Meta allows 10 tries in 72 hours."}</p>
              {!s.registered && <div className="flex flex-wrap items-end gap-2"><Input aria-label="Two-step PIN" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="6-digit PIN" className="w-32" /><Button type="button" size="sm" onClick={() => register.mutate()} disabled={pin.length !== 6 || register.isPending}>Register Number</Button></div>}
            </div>
          </div>
        )}
        {!configured && <p className="text-xs text-slate-500">Connect this Client’s WhatsApp first (with Meta above, or by entering its details in “WhatsApp Connection”). Webhooks, number registration and the business profile appear here after that.</p>}
        {configured && <div className="rounded-md border border-slate-200 p-3">
          <p className="mb-2 text-xs font-semibold text-slate-700">Business profile on WhatsApp</p>
          <BusinessProfile scope={scope} />
        </div>}
      </div>
    </Panel>
  );
}

/** Send one product, or a list of up to 30, from the Client's Meta catalogue (Commerce Manager). */
export function NativeProducts({ scope, contacts }: { scope: string; contacts: ContactOption[] }) {
  const [contactId, setContactId] = useState("");
  const [catalogId, setCatalogId] = useState("");
  const [kind, setKind] = useState<"product" | "product_list">("product_list");
  const [header, setHeader] = useState("");
  const [body, setBody] = useState("Here are some products you may like.");
  const [ids, setIds] = useState("");
  const list = ids.split(/[\s,]+/).map((id) => id.trim()).filter(Boolean);
  const send = useMutation({
    mutationFn: () => call(scope, "POST", "/products/send", { contactId, catalogId: catalogId.trim(), kind, body: body.trim(), idempotencyKey: `ui-${crypto.randomUUID()}`, ...(kind === "product" ? { productRetailerId: list[0] } : { header: header.trim(), sections: [{ title: "Products", productRetailerIds: list.slice(0, 30) }] }) }),
    onSuccess: () => { toast.success("Products sent."); setIds(""); },
    onError: (error) => toast.error(message(error)),
  });
  const valid = contactId && /^\d{5,30}$/.test(catalogId.trim()) && body.trim() && list.length > 0 && (kind === "product" || header.trim());
  return (
    <Panel title="Send Products From Your Catalogue">
      <p className="mb-3 text-xs text-slate-500">The catalogue must be connected to this WhatsApp account in Commerce Manager. Use the product Content IDs (retailer IDs) from the catalogue. The customer must have messaged in the last 24 hours.</p>
      <div className="grid gap-2 sm:grid-cols-3">
        <Field label="Customer"><select className={select} value={contactId} onChange={(event) => setContactId(event.target.value)}><option value="">Choose a contact…</option>{contacts.filter((c) => c.consent && !c.suppressed).map((c) => <option key={c.id} value={c.id}>{c.name || c.phone} · {c.phone}</option>)}</select></Field>
        <Field label="Catalogue ID"><Input value={catalogId} inputMode="numeric" onChange={(event) => setCatalogId(event.target.value)} /></Field>
        <Field label="Type"><select className={select} value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}><option value="product_list">Product list (up to 30)</option><option value="product">Single product</option></select></Field>
        {kind === "product_list" && <Field label="Header"><Input value={header} maxLength={60} onChange={(event) => setHeader(event.target.value)} /></Field>}
        <Field label="Message"><Input value={body} maxLength={1024} onChange={(event) => setBody(event.target.value)} /></Field>
        <Field label={kind === "product" ? "Product ID" : "Product IDs (comma or space separated)"}><Input value={ids} onChange={(event) => setIds(event.target.value)} /></Field>
      </div>
      <div className="mt-3 flex justify-end"><Button type="button" onClick={() => send.mutate()} disabled={!valid || send.isPending}>Send Products</Button></div>
    </Panel>
  );
}
