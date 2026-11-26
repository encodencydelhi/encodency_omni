"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Database, ExternalLink, MapPin, PenLine, RefreshCcw, Send, Target, Users } from "lucide-react";
import { toast } from "sonner";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import {
  integrationsApi, LINKEDIN_CONVERSION_TYPES,
  type LinkedInAudiencesResponse, type LinkedInConversionType, type LinkedInConversionsResponse, type LinkedInEventsResponse, type LinkedInMember,
} from "../../integrations/live/integrations-api";
import { Kpis, LoadError, Loading, Notice } from "./linkedin-ads-leads";

const message = (cause: unknown, fallback: string) => (cause instanceof Error ? cause.message : fallback);
const when = (value: string | null) => (value ? new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");
const titleCase = (value: string) => value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const button = "inline-flex h-8 items-center gap-1.5 px-3 text-[10.5px] font-semibold disabled:opacity-50";
const primary = `${button} bg-[#0A66C2] text-white hover:bg-[#004182]`;
const secondary = `${button} border border-[#DDE4ED] bg-white text-[#253352] hover:bg-[#F8FAFC]`;
const input = "h-8 border border-[#DDE4ED] bg-white px-2 text-[11px] text-[#253352]";

/** Loads one LinkedIn feed with abort-on-change, plus a manual reload. */
function useFeed<T>(fetcher: (companyId: string, clientId: string, signal?: AbortSignal) => Promise<T>, fallback: string) {
  const { companyId, clientId } = useTenancyContext();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!companyId || !clientId) return;
    const controller = new AbortController();
    fetcher(companyId, clientId, controller.signal)
      .then((next) => { setData(next); setError(null); })
      .catch((cause: unknown) => { if (!controller.signal.aborted) setError(message(cause, fallback)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [companyId, clientId, fetcher, fallback, tick]);
  const reload = useCallback(() => { setLoading(true); setTick((value) => value + 1); }, []);
  return { companyId, clientId, data, error, loading, reload };
}

/* ------------------------------------------------------------- personal profile post ------------------------------------------------------------- */

const getMember = (companyId: string, clientId: string, signal?: AbortSignal) => integrationsApi.getLinkedInMember(companyId, clientId, signal);

/** Text post on the personal LinkedIn profile of the member who connected LinkedIn (not the company page). */
export function LinkedInProfilePost() {
  const { companyId, clientId, data } = useFeed<LinkedInMember>(getMember, "Could not load the LinkedIn member.");
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<string | null>(null);
  if (!data) return null;
  const post = async () => {
    if (!companyId || !clientId) return;
    setBusy(true);
    try {
      const result = await integrationsApi.postLinkedInMember(companyId, clientId, text);
      toast.success(`Posted on ${data.name}'s LinkedIn profile.`);
      setLast(result.url); setText(""); setConfirming(false); setOpen(false);
    } catch (cause: unknown) { toast.error(message(cause, "LinkedIn did not accept the post.")); setConfirming(false); }
    finally { setBusy(false); }
  };
  return <div className="border-b border-[#DDE4ED] bg-[#FBFCFE] px-5 py-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-[10.5px] text-[#52617D]"><PenLine className="mr-1 inline size-3.5 text-[#0A66C2]" />Personal profile: <span className="font-semibold text-[#172044]">{data.name}</span>{data.canPost ? " — post as yourself, not as the company page." : ` — ${data.reason}`}
        {last && <> · <a href={last} target="_blank" rel="noreferrer" className="font-semibold text-[#0A66C2] hover:underline">View last post <ExternalLink className="inline size-3" /></a></>}</p>
      {data.canPost && !open && <button type="button" onClick={() => setOpen(true)} className={secondary}><PenLine className="size-3" /> Post on my profile</button>}
    </div>
    {open && <div className="mt-3">
      <label className="sr-only" htmlFor="linkedin-member-post">Post text</label>
      <textarea id="linkedin-member-post" value={text} maxLength={3000} rows={4} onChange={(event) => { setText(event.target.value); setConfirming(false); }} placeholder={`What do you want to share, ${data.name.split(" ")[0]}?`} className="w-full border border-[#DDE4ED] bg-white p-2 text-[12px] text-[#253352]" />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[10px] text-[#8A97AF]">{text.length}/3000 · Text only · Public · Hashtags (#word) stay hashtags</span>
        <div className="flex items-center gap-2">
          {confirming ? <>
            <span className="text-[11px] font-semibold text-amber-800">This publishes publicly on {data.name}&apos;s profile right away. Continue?</span>
            <button type="button" disabled={busy} onClick={() => void post()} className={primary}><Send className="size-3" /> {busy ? "Posting…" : "Yes, post"}</button>
            <button type="button" disabled={busy} onClick={() => setConfirming(false)} className={secondary}>Back</button>
          </> : <>
            <button type="button" onClick={() => { setOpen(false); setText(""); }} className={secondary}>Cancel</button>
            <button type="button" disabled={!text.trim()} onClick={() => setConfirming(true)} className={primary}><Send className="size-3" /> Post</button>
          </>}
        </div>
      </div>
    </div>}
  </div>;
}

/* ---------------------------------------------------------------------- events ---------------------------------------------------------------------- */

const getEvents = (companyId: string, clientId: string, signal?: AbortSignal) => integrationsApi.getLinkedInEvents(companyId, clientId, signal);

export function LinkedInEventsPanel() {
  const { data, error, loading, reload } = useFeed<LinkedInEventsResponse>(getEvents, "Could not load LinkedIn events.");
  const [open, setOpen] = useState<string | null>(null);
  /** "Upcoming" is relative to when LinkedIn was read (keeps render pure). */
  const now = data ? Date.parse(data.syncedAt) : 0;
  return <div className="bg-white">
    <div className="flex items-center justify-between gap-3 border-b border-[#DDE4ED] px-5 py-3">
      <p className="text-[10.5px] text-[#687797]">Events organised by this Client&apos;s company page(s) on LinkedIn</p>
      <button type="button" onClick={reload} disabled={loading} className={secondary}><RefreshCcw className={`size-3 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
    </div>
    {loading && !data ? <Loading text="Loading LinkedIn events..." /> : error && !data ? <LoadError message={error} retry={reload} /> : data && <>
      {data.state !== "live" && <Notice state={data.state} reason={data.reason} />}
      {data.state === "live" && <Kpis items={[
        { label: "Events", value: String(data.events.length), icon: CalendarDays, tone: "bg-[#EAF3FB] text-[#0A66C2]" },
        { label: "Upcoming", value: String(data.events.filter((event) => Date.parse(event.startsAt ?? "") >= now).length), icon: CalendarDays, tone: "bg-[#E5F8F1] text-[#059669]" },
        { label: "In person", value: String(data.events.filter((event) => event.format === "IN_PERSON").length), icon: MapPin, tone: "bg-[#FFF4DE] text-[#D97706]" },
        { label: "Online", value: String(data.events.filter((event) => event.format === "ONLINE").length), icon: Users, tone: "bg-[#F1ECFE] text-[#7C3AED]" },
      ]} />}
      <div className="divide-y divide-[#EDF1F5]">{data.events.map((event) => {
        const upcoming = Date.parse(event.startsAt ?? "") >= now;
        const expanded = open === event.id;
        return <div key={event.id} className="px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12.5px] font-semibold text-[#172044]">{event.name}</p>
              <p className="mt-1 text-[10.5px] text-[#52617D]"><CalendarDays className="mr-1 inline size-3" />{when(event.startsAt)} – {when(event.endsAt)}{event.venue && <> · <MapPin className="mx-1 inline size-3" />{event.venue}</>}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-[10px] font-semibold ${upcoming ? "text-emerald-700" : "text-[#64748B]"}`}>{upcoming ? "Upcoming" : "Past"} · {titleCase(event.format)}</span>
              <a href={event.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[#0A66C2] hover:underline">Open on LinkedIn <ExternalLink className="size-3" /></a>
              {event.externalUrl && /^https?:\/\//.test(event.externalUrl) && <a href={event.externalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10.5px] text-[#0A66C2] hover:underline">Event website <ExternalLink className="size-3" /></a>}
            </div>
          </div>
          {event.description && <>
            <p className={`mt-2 whitespace-pre-wrap text-[11px] leading-5 text-[#52617D] ${expanded ? "" : "line-clamp-2"}`}>{event.description}</p>
            <button type="button" onClick={() => setOpen(expanded ? null : event.id)} className="mt-1 text-[10px] font-semibold text-[#0A66C2]">{expanded ? "Show less" : "Show full description"}</button>
          </>}
        </div>;
      })}</div>
      <p className="border-t border-[#EDF1F5] px-5 py-3 text-[10px] text-[#8A97AF]">Events are created and edited on LinkedIn (company page → Events). Attendee lists are not shared by LinkedIn&apos;s API.{data.partial && " Only the first 500 events are shown."}</p>
    </>}
  </div>;
}

/* ----------------------------------------------------------------- matched audiences ----------------------------------------------------------------- */

const getAudiences = (companyId: string, clientId: string, signal?: AbortSignal) => integrationsApi.getLinkedInAudiences(companyId, clientId, signal);

export function LinkedInAudiencesPanel() {
  const { companyId, clientId, data, error, loading, reload } = useFeed<LinkedInAudiencesResponse>(getAudiences, "Could not load Matched Audiences.");
  const [name, setName] = useState("");
  const [account, setAccount] = useState("");
  const [fill, setFill] = useState<{ id: string; accountId: string; source: "leads" | "contacts" | "all" } | null>(null);
  const [confirm, setConfirm] = useState<"create" | "fill" | null>(null);
  const [busy, setBusy] = useState(false);
  const accountId = account || data?.accounts[0]?.id || "";

  const create = async () => {
    if (!companyId || !clientId) return;
    setBusy(true);
    try { await integrationsApi.createLinkedInAudience(companyId, clientId, { accountId, name: name.trim() }); toast.success("Audience created on LinkedIn."); setName(""); reload(); }
    catch (cause: unknown) { toast.error(message(cause, "LinkedIn did not create the audience.")); }
    finally { setBusy(false); setConfirm(null); }
  };
  const addMembers = async () => {
    if (!companyId || !clientId || !fill) return;
    setBusy(true);
    try {
      const result = await integrationsApi.addLinkedInAudienceMembers(companyId, clientId, fill.id, { accountId: fill.accountId, source: fill.source });
      toast.success(`${result.sent} people sent to LinkedIn for matching${result.invalidOrDuplicate ? ` (${result.invalidOrDuplicate} skipped: no valid or a repeated email)` : ""}.`);
      setFill(null); reload();
    } catch (cause: unknown) { toast.error(message(cause, "LinkedIn did not accept the list.")); }
    finally { setBusy(false); setConfirm(null); }
  };

  return <div className="bg-white">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DDE4ED] px-5 py-3">
      <p className="text-[10.5px] text-[#687797]">Target this Client&apos;s own CRM people in LinkedIn ads. {data ? `${data.crmContactsWithEmail} CRM lead(s)/contact(s) have an email.` : ""}</p>
      <button type="button" onClick={reload} disabled={loading} className={secondary}><RefreshCcw className={`size-3 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
    </div>
    {loading && !data ? <Loading text="Loading Matched Audiences..." /> : error && !data ? <LoadError message={error} retry={reload} /> : data && <>
      {data.state !== "live" && <Notice state={data.state} reason={data.reason} />}
      {data.accounts.length > 0 && <div className="flex flex-wrap items-center gap-2 border-b border-[#EDF1F5] px-5 py-3">
        <label className="text-[10.5px] font-semibold text-[#52617D]" htmlFor="li-aud-account">New audience in</label>
        <select id="li-aud-account" value={accountId} onChange={(event) => setAccount(event.target.value)} className={input}>{data.accounts.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select>
        <label className="sr-only" htmlFor="li-aud-name">Audience name</label>
        <input id="li-aud-name" value={name} maxLength={100} onChange={(event) => setName(event.target.value)} placeholder="e.g. CRM leads – Nov 2026" className={`${input} min-w-56`} />
        {confirm === "create" ? <>
          <span className="text-[11px] font-semibold text-amber-800">Create “{name.trim()}” on LinkedIn?</span>
          <button type="button" disabled={busy} onClick={() => void create()} className={primary}>{busy ? "Creating…" : "Yes, create"}</button>
          <button type="button" disabled={busy} onClick={() => setConfirm(null)} className={secondary}>Cancel</button>
        </> : <button type="button" disabled={!name.trim() || !accountId} onClick={() => setConfirm("create")} className={primary}><Target className="size-3" /> Create audience</button>}
      </div>}
      {data.audiences.length > 0 && <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left"><thead><tr className="bg-[#F8FAFC] text-[10px] uppercase text-[#7B89A4]">
        <th className="px-5 py-3">Audience</th><th className="px-3 py-3">Type</th><th className="px-3 py-3">Status</th><th className="px-3 py-3 text-right">Audience size</th><th className="px-3 py-3 text-right">Matched</th><th className="px-5 py-3 text-right">Fill from CRM</th>
      </tr></thead><tbody className="divide-y divide-[#EDF1F5]">{data.audiences.map((row) => <tr key={row.id}>
        <td className="px-5 py-3"><p className="text-[11.5px] font-semibold text-[#253352]">{row.name}</p><p className="text-[9.5px] text-[#8A97AF]">{row.accountName} · updated {when(row.updatedAt)}</p></td>
        <td className="px-3 py-3 text-[10.5px] text-[#52617D]">{row.type ? titleCase(row.type) : "—"}</td>
        <td className="px-3 py-3 text-[10.5px] font-semibold text-[#52617D]">{titleCase(row.destinationStatus ?? row.status ?? "unknown")}</td>
        <td className="px-3 py-3 text-right text-[11px] text-[#253352]">{row.audienceSize?.toLocaleString("en-IN") ?? "—"}</td>
        <td className="px-3 py-3 text-right text-[11px] text-[#253352]">{row.matchedCount?.toLocaleString("en-IN") ?? "—"}</td>
        <td className="px-5 py-3 text-right">{row.type !== "USER" ? <span className="text-[10px] text-[#8A97AF]">Person audiences only</span> : fill?.id === row.id ? <div className="flex flex-wrap items-center justify-end gap-2">
          <label className="sr-only" htmlFor={`li-fill-${row.id}`}>Who</label>
          <select id={`li-fill-${row.id}`} value={fill.source} onChange={(event) => setFill({ ...fill, source: event.target.value as "leads" | "contacts" | "all" })} className={input}><option value="all">Leads + contacts</option><option value="leads">Leads only</option><option value="contacts">Contacts only</option></select>
          {confirm === "fill" ? <button type="button" disabled={busy} onClick={() => void addMembers()} className={primary}><Database className="size-3" /> {busy ? "Sending…" : "Yes, send hashed emails"}</button>
            : <button type="button" onClick={() => setConfirm("fill")} className={primary}>Send</button>}
          <button type="button" disabled={busy} onClick={() => { setFill(null); setConfirm(null); }} className={secondary}>Cancel</button>
        </div> : <button type="button" onClick={() => { setFill({ id: row.id, accountId: row.accountId, source: "all" }); setConfirm(null); }} className="text-[10.5px] font-semibold text-[#0A66C2] hover:underline">Add CRM people</button>}</td>
      </tr>)}</tbody></table></div>}
      <p className="border-t border-[#EDF1F5] px-5 py-3 text-[10px] text-[#8A97AF]">Only SHA-256 hashes of emails leave Media360, never names or phone numbers. LinkedIn takes up to 48 hours to match people, and an audience needs at least 300 matched members before ads can target it.</p>
    </>}
  </div>;
}

/* -------------------------------------------------------------------- conversions -------------------------------------------------------------------- */

const getConversions = (companyId: string, clientId: string, signal?: AbortSignal) => integrationsApi.getLinkedInConversions(companyId, clientId, signal);

export function LinkedInConversionsPanel() {
  const { companyId, clientId, data, error, loading, reload } = useFeed<LinkedInConversionsResponse>(getConversions, "Could not load LinkedIn conversions.");
  const [rule, setRule] = useState({ name: "", type: "LEAD" as LinkedInConversionType, account: "" });
  const [event, setEvent] = useState<{ id: string; accountId: string; email: string; amount: string } | null>(null);
  const [confirm, setConfirm] = useState<"rule" | "event" | null>(null);
  const [busy, setBusy] = useState(false);
  const accountId = rule.account || data?.accounts[0]?.id || "";

  const createRule = async () => {
    if (!companyId || !clientId) return;
    setBusy(true);
    try { await integrationsApi.createLinkedInConversionRule(companyId, clientId, { accountId, name: rule.name.trim(), type: rule.type }); toast.success("Conversion rule created on LinkedIn."); setRule({ ...rule, name: "" }); reload(); }
    catch (cause: unknown) { toast.error(message(cause, "LinkedIn did not create the conversion rule.")); }
    finally { setBusy(false); setConfirm(null); }
  };
  const send = async () => {
    if (!companyId || !clientId || !event) return;
    setBusy(true);
    try {
      await integrationsApi.sendLinkedInConversion(companyId, clientId, event.id, { accountId: event.accountId, email: event.email.trim(), ...(event.amount ? { amount: Number(event.amount) } : {}) });
      toast.success("Conversion sent to LinkedIn."); setEvent(null);
    } catch (cause: unknown) { toast.error(message(cause, "LinkedIn did not accept the conversion.")); }
    finally { setBusy(false); setConfirm(null); }
  };

  return <div className="bg-white">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DDE4ED] px-5 py-3">
      <p className="text-[10.5px] text-[#687797]">Tell LinkedIn when an ad lead became a real result (meeting, sale), so campaigns optimise for it.</p>
      <button type="button" onClick={reload} disabled={loading} className={secondary}><RefreshCcw className={`size-3 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
    </div>
    {loading && !data ? <Loading text="Loading LinkedIn conversions..." /> : error && !data ? <LoadError message={error} retry={reload} /> : data && <>
      {data.state !== "live" && <Notice state={data.state} reason={data.reason} />}
      {data.accounts.length > 0 && <div className="flex flex-wrap items-center gap-2 border-b border-[#EDF1F5] px-5 py-3">
        <label className="text-[10.5px] font-semibold text-[#52617D]" htmlFor="li-conv-account">New rule in</label>
        <select id="li-conv-account" value={accountId} onChange={(e) => setRule({ ...rule, account: e.target.value })} className={input}>{data.accounts.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select>
        <label className="sr-only" htmlFor="li-conv-name">Rule name</label>
        <input id="li-conv-name" value={rule.name} maxLength={100} onChange={(e) => setRule({ ...rule, name: e.target.value })} placeholder="e.g. Qualified lead (CRM)" className={`${input} min-w-52`} />
        <label className="sr-only" htmlFor="li-conv-type">Type</label>
        <select id="li-conv-type" value={rule.type} onChange={(e) => setRule({ ...rule, type: e.target.value as LinkedInConversionType })} className={input}>{LINKEDIN_CONVERSION_TYPES.map((type) => <option key={type} value={type}>{titleCase(type)}</option>)}</select>
        {confirm === "rule" ? <>
          <span className="text-[11px] font-semibold text-amber-800">Create it and attribute it to all campaigns of this account?</span>
          <button type="button" disabled={busy} onClick={() => void createRule()} className={primary}>{busy ? "Creating…" : "Yes, create"}</button>
          <button type="button" disabled={busy} onClick={() => setConfirm(null)} className={secondary}>Cancel</button>
        </> : <button type="button" disabled={!rule.name.trim() || !accountId} onClick={() => setConfirm("rule")} className={primary}><Target className="size-3" /> Create rule</button>}
      </div>}
      {data.rules.length > 0 && <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left"><thead><tr className="bg-[#F8FAFC] text-[10px] uppercase text-[#7B89A4]">
        <th className="px-5 py-3">Conversion rule</th><th className="px-3 py-3">Type</th><th className="px-3 py-3">Tracked by</th><th className="px-3 py-3">Attribution</th><th className="px-3 py-3">Last event</th><th className="px-5 py-3 text-right">Send a conversion</th>
      </tr></thead><tbody className="divide-y divide-[#EDF1F5]">{data.rules.map((row) => <tr key={row.id}>
        <td className="px-5 py-3"><p className="text-[11.5px] font-semibold text-[#253352]">{row.name}</p><p className="text-[9.5px] text-[#8A97AF]">{row.accountName}{row.enabled ? "" : " · disabled"}</p></td>
        <td className="px-3 py-3 text-[10.5px] text-[#52617D]">{row.type ? titleCase(row.type) : "—"}</td>
        <td className="px-3 py-3 text-[10.5px] text-[#52617D]">{row.method === "CONVERSIONS_API" ? "Conversions API" : row.method ? titleCase(row.method) : "—"}</td>
        <td className="px-3 py-3 text-[10.5px] text-[#52617D]">{row.postClickWindowDays ?? "—"}d click · {row.viewThroughWindowDays ?? "—"}d view</td>
        <td className="px-3 py-3 text-[10.5px] text-[#52617D]">{when(row.lastCallbackAt)}</td>
        <td className="px-5 py-3 text-right">{!row.canReceiveEvents ? <span className="text-[10px] text-[#8A97AF]">Tracked by the Insight Tag</span> : event?.id === row.id ? <div className="flex flex-wrap items-center justify-end gap-2">
          <label className="sr-only" htmlFor={`li-ev-email-${row.id}`}>Email</label>
          <input id={`li-ev-email-${row.id}`} type="email" value={event.email} onChange={(e) => { setEvent({ ...event, email: e.target.value }); setConfirm(null); }} placeholder="Customer email" className={`${input} w-48`} />
          <label className="sr-only" htmlFor={`li-ev-amount-${row.id}`}>Value</label>
          <input id={`li-ev-amount-${row.id}`} type="number" min={0} step="0.01" value={event.amount} onChange={(e) => setEvent({ ...event, amount: e.target.value })} placeholder="Value (optional)" className={`${input} w-32`} />
          {confirm === "event" ? <button type="button" disabled={busy} onClick={() => void send()} className={primary}><Send className="size-3" /> {busy ? "Sending…" : "Yes, send"}</button>
            : <button type="button" disabled={!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(event.email.trim())} onClick={() => setConfirm("event")} className={primary}>Send</button>}
          <button type="button" disabled={busy} onClick={() => { setEvent(null); setConfirm(null); }} className={secondary}>Cancel</button>
        </div> : <button type="button" onClick={() => { setEvent({ id: row.id, accountId: row.accountId, email: "", amount: "" }); setConfirm(null); }} className="text-[10.5px] font-semibold text-[#0A66C2] hover:underline">Send conversion</button>}</td>
      </tr>)}</tbody></table></div>}
      <p className="border-t border-[#EDF1F5] px-5 py-3 text-[10px] text-[#8A97AF]">The email is SHA-256 hashed before it is sent; LinkedIn counts only conversions from the last 90 days, and sending the same one twice is counted once.</p>
    </>}
  </div>;
}
