"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, Rocket } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";
import { useCompanyScope } from "@/features/support/hooks";
import { ApiError } from "@/types/api";

/**
 * First-run setup guide. Opens by itself for a Company Owner/Admin until the basics are done or they choose
 * "Finish later". Every step saves on its own, so whatever is filled in starts working at once; skipped steps stay on
 * the dashboard checklist and can be completed anytime.
 */
interface Step { id: string; title: string; done: boolean; optional: boolean; href: string }
interface Status { companyName: string; steps: Step[]; doneCount: number; complete: boolean; dismissed: boolean; showGuide: boolean; canManage: boolean }
interface Organization { revision: number; name: string; industry: string | null; website: string | null; contactPhone: string | null; timezone: string | null; currency: string | null; description: string | null }

export const OPEN_SETUP_GUIDE = "media360:open-setup-guide";
const KEY = ["onboarding-status"];
const message = (error: unknown) => (ApiError.isApiError(error) ? error.message : error instanceof Error ? error.message : "Something went wrong. Please try again.");
const input = "h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800 focus:outline-blue-600";
const INDUSTRIES = ["Marketing agency", "Retail / e-commerce", "Real estate", "Education", "Healthcare", "Restaurants & food", "Travel & hospitality", "Finance", "Manufacturing", "Professional services", "Non-profit", "Other"];
const TIMEZONES = ["Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Europe/London", "America/New_York", "UTC"];
const CURRENCIES = ["INR", "USD", "AED", "EUR", "GBP", "SGD"];

function useOnboarding() {
  const { companyId, ready } = useCompanyScope();
  const status = useQuery({ queryKey: [...KEY, companyId], enabled: ready, queryFn: () => apiClient.request<Status>({ method: "GET", path: "/onboarding", headers: companyScopeHeaders(companyId) }), staleTime: 30_000, retry: false });
  return { companyId, ready, status };
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <label className="grid gap-1 text-xs font-semibold text-slate-600">{label}{children}{hint && <span className="font-normal text-slate-400">{hint}</span>}</label>;
}

function ProfileStep({ companyId, onSaved }: { companyId: string; onSaved: () => void }) {
  const org = useQuery({ queryKey: ["onboarding-org", companyId], queryFn: () => apiClient.request<Organization>({ method: "GET", path: "/settings/organization", headers: companyScopeHeaders(companyId) }) });
  const [draft, setDraft] = useState<Partial<Organization>>({});
  const value = { ...org.data, ...draft } as Organization;
  const save = useMutation({
    mutationFn: () => {
      const changes: Record<string, unknown> = {};
      for (const key of ["industry", "website", "contactPhone", "timezone", "currency", "description"] as const) if (key in draft) changes[key] = (draft[key] as string | null)?.trim() || null;
      if (draft.name !== undefined) changes.displayName = draft.name.trim();
      return apiClient.request({ method: "PATCH", path: "/settings/organization", headers: companyScopeHeaders(companyId), body: { expectedRevision: org.data!.revision, ...changes } });
    },
    onSuccess: () => { toast.success("Company profile saved."); onSaved(); },
    onError: (error) => toast.error(message(error)),
  });
  const set = (key: keyof Organization) => (event: { target: { value: string } }) => setDraft({ ...draft, [key]: event.target.value });
  if (!org.data) return <p className="text-xs text-slate-500">{org.isError ? message(org.error) : "Loading…"}</p>;
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Company name"><input className={input} value={value.name ?? ""} onChange={set("name")} maxLength={200} /></Field>
        <Field label="Industry"><select className={input} value={value.industry ?? ""} onChange={set("industry")}><option value="">Choose…</option>{INDUSTRIES.map((item) => <option key={item}>{item}</option>)}{value.industry && !INDUSTRIES.includes(value.industry) && <option>{value.industry}</option>}</select></Field>
        <Field label="Website" hint="Example: https://yourcompany.com"><input className={input} value={value.website ?? ""} onChange={set("website")} placeholder="https://" /></Field>
        <Field label="Business phone" hint="With country code, e.g. +91 98xxxxxxxx"><input className={input} value={value.contactPhone ?? ""} onChange={set("contactPhone")} /></Field>
        <Field label="Time zone"><select className={input} value={value.timezone ?? "Asia/Kolkata"} onChange={set("timezone")}>{[...new Set([value.timezone ?? "Asia/Kolkata", ...TIMEZONES])].map((item) => <option key={item}>{item}</option>)}</select></Field>
        <Field label="Currency"><select className={input} value={value.currency ?? "INR"} onChange={set("currency")}>{[...new Set([value.currency ?? "INR", ...CURRENCIES])].map((item) => <option key={item}>{item}</option>)}</select></Field>
      </div>
      <Field label="What does your business do? (optional)"><textarea className={`${input} h-16 py-1.5`} value={value.description ?? ""} onChange={set("description")} maxLength={1000} /></Field>
      <div className="flex justify-end"><button type="button" className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={!Object.keys(draft).length || save.isPending} onClick={() => save.mutate()}>Save and continue</button></div>
    </div>
  );
}

function ClientStep({ companyId, onSaved }: { companyId: string; onSaved: () => void }) {
  const [name, setName] = useState(""), [website, setWebsite] = useState("");
  const create = useMutation({
    mutationFn: () => apiClient.request({ method: "POST", path: "/clients", headers: companyScopeHeaders(companyId), body: { name: name.trim(), ...(website.trim() ? { website: website.trim() } : {}) } }),
    onSuccess: () => { toast.success("Client created. Pick it in the sidebar to work on it."); setName(""); setWebsite(""); onSaved(); },
    onError: (error) => toast.error(message(error)),
  });
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">A Client is a business you run marketing for: your own brand, or a customer if you are an agency. WhatsApp, social pages, leads and reports belong to a Client.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Client name"><input className={input} value={name} onChange={(event) => setName(event.target.value)} maxLength={200} placeholder="e.g. Acme Store" /></Field>
        <Field label="Website (optional)"><input className={input} value={website} onChange={(event) => setWebsite(event.target.value)} placeholder="https://" /></Field>
      </div>
      <div className="flex justify-end"><button type="button" className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={name.trim().length < 2 || create.isPending} onClick={() => create.mutate()}>Create client and continue</button></div>
    </div>
  );
}

function ChannelsStep({ onOpen }: { onOpen: (href: string) => void }) {
  const channels = [
    { href: "/admin/whatsapp", title: "WhatsApp", text: "Inbox, templates, campaigns and automations on your own number." },
    { href: "/admin/meta", title: "Facebook & Instagram", text: "Pages, posts, ads and Lead Ads straight into your CRM." },
    { href: "/admin/google-business", title: "Google Business", text: "Reviews, posts and alerts for new reviews." },
    { href: "/admin/integrations", title: "All integrations", text: "LinkedIn, YouTube, Search Console and more." },
  ];
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">Connect at least one channel. You can connect the rest whenever you like; the guide comes back to this list.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {channels.map((channel) => (
          <button key={channel.href} type="button" onClick={() => onOpen(channel.href)} className="rounded-md border border-slate-200 p-3 text-left hover:border-blue-300 hover:bg-blue-50/40">
            <p className="text-sm font-semibold text-slate-900">{channel.title}</p>
            <p className="text-xs text-slate-500">{channel.text}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function TeamStep({ companyId, onSaved }: { companyId: string; onSaved: () => void }) {
  const [email, setEmail] = useState(""), [role, setRole] = useState("MANAGER");
  const invite = useMutation({
    mutationFn: () => apiClient.request({ method: "POST", path: `/companies/${companyId}/invitations`, headers: companyScopeHeaders(companyId), body: { email: email.trim(), systemRole: role } }),
    onSuccess: () => { toast.success("Invitation sent."); setEmail(""); onSaved(); },
    onError: (error) => toast.error(message(error)),
  });
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">Invite the people who will work with you. They get an email to join. You can invite more anytime from Team.</p>
      <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
        <Field label="Email"><input className={input} type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="teammate@company.com" /></Field>
        <Field label="Role"><select className={input} value={role} onChange={(event) => setRole(event.target.value)}><option value="ADMIN">Admin (everything)</option><option value="MANAGER">Manager (day-to-day work)</option><option value="VIEWER">Viewer (read only)</option></select></Field>
      </div>
      <div className="flex justify-end"><button type="button" className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || invite.isPending} onClick={() => invite.mutate()}>Send invitation</button></div>
    </div>
  );
}

/** Mounted once in the Admin shell. */
export function SetupGuide() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { companyId, status } = useOnboarding();
  const [open, setOpen] = useState(false);
  const [autoOpened, setAutoOpened] = useState(false);
  const [index, setIndex] = useState(0);
  const data = status.data;
  // Open by itself once per page load while the guide is due.
  if (data?.showGuide && !autoOpened) { setAutoOpened(true); setOpen(true); setIndex(Math.max(0, data.steps.findIndex((step) => !step.done))); }
  useEffect(() => {
    const handler = () => { setOpen(true); const steps = queryClient.getQueryData<Status>([...KEY, companyId])?.steps; setIndex(Math.max(0, steps?.findIndex((step) => !step.done) ?? 0)); };
    window.addEventListener(OPEN_SETUP_GUIDE, handler);
    return () => window.removeEventListener(OPEN_SETUP_GUIDE, handler);
  }, [companyId, queryClient]);
  const refresh = () => queryClient.invalidateQueries({ queryKey: KEY });
  const dismiss = useMutation({ mutationFn: (dismissed: boolean) => apiClient.request({ method: "POST", path: "/onboarding/dismiss", headers: companyScopeHeaders(companyId), body: { dismissed } }), onSuccess: () => void refresh() });
  if (!data?.canManage) return null;
  const steps = data.steps;
  const step = steps[index];
  const next = () => { void refresh(); setIndex((current) => Math.min(steps.length, current + 1)); };
  const finishLater = () => { setOpen(false); if (!data.complete && !data.dismissed) dismiss.mutate(true); };
  const go = (href: string) => { setOpen(false); router.push(href); };
  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) finishLater(); else setOpen(true); }}>
      <DialogContent className="max-w-2xl" showClose={false}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <DialogTitle className="flex items-center gap-2 text-lg"><Rocket className="size-5 text-blue-600" /> Set up {data.companyName}</DialogTitle>
            <DialogDescription className="text-xs">Fill what you have now. Every step saves on its own and starts working at once; the rest waits on your dashboard.</DialogDescription>
          </div>
          <button type="button" className="shrink-0 text-xs font-semibold text-slate-500 hover:text-slate-800" onClick={finishLater}>Finish later</button>
        </div>
        <ol className="flex flex-wrap gap-1">
          {steps.map((item, i) => (
            <li key={item.id}><button type="button" onClick={() => setIndex(i)} className={`flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold ${i === index ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"}`}>{item.done ? <CheckCircle2 className="size-3.5 text-emerald-600" /> : <Circle className="size-3.5" />}{item.title}{item.optional && <span className="font-normal text-slate-400">(optional)</span>}</button></li>
          ))}
        </ol>
        <div className="min-h-40">
          {step?.id === "profile" && <ProfileStep companyId={companyId} onSaved={next} />}
          {step?.id === "client" && <ClientStep companyId={companyId} onSaved={next} />}
          {step?.id === "channels" && <ChannelsStep onOpen={go} />}
          {step?.id === "team" && <TeamStep companyId={companyId} onSaved={next} />}
          {step?.id === "plan" && <div className="space-y-2 text-sm text-slate-600"><p>{step.done ? "You have an active plan." : "Pick a plan when you are ready. Limits (clients, WhatsApp numbers and messages, AI) come from the plan."}</p><button type="button" className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold" onClick={() => go("/admin/billing")}>Open Billing</button></div>}
          {!step && <div className="space-y-2 text-sm text-slate-600"><p className="font-semibold text-slate-900">{data.complete ? "Your workspace is ready." : "Nice progress!"}</p><p>{data.complete ? "Everything essential is set up. You can keep adding details anytime." : "Finish the remaining steps whenever you like from the checklist on your dashboard."}</p></div>}
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <button type="button" className="text-xs font-semibold text-slate-500 disabled:opacity-40" disabled={index === 0} onClick={() => setIndex(index - 1)}>Back</button>
          {step ? <button type="button" className="text-xs font-semibold text-slate-600 hover:text-slate-900" onClick={() => setIndex(index + 1)}>{step.done ? "Next" : "Skip for now"}</button> : <button type="button" className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white" onClick={finishLater}>Go to dashboard</button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Dashboard card: what is left, with links; reopens the guide. Hidden once everything is done. */
export function SetupChecklistCard() {
  const { companyId, status } = useOnboarding();
  const queryClient = useQueryClient();
  const reopen = useMutation({
    mutationFn: () => apiClient.request({ method: "POST", path: "/onboarding/dismiss", headers: companyScopeHeaders(companyId), body: { dismissed: false } }),
    onSettled: () => { void queryClient.invalidateQueries({ queryKey: KEY }); window.dispatchEvent(new Event(OPEN_SETUP_GUIDE)); },
  });
  const data = status.data;
  if (!data?.canManage || data.steps.every((step) => step.done)) return null;
  return (
    <section className="rounded-sm border border-blue-200 bg-blue-50/50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">Finish setting up your workspace · {data.doneCount}/{data.steps.length}</p>
          <div className="mt-1 h-1.5 w-56 overflow-hidden rounded-full bg-blue-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.round((data.doneCount / data.steps.length) * 100)}%` }} /></div>
        </div>
        <button type="button" className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white" onClick={() => reopen.mutate()}>Continue setup</button>
      </div>
      <ul className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-5">
        {data.steps.map((step) => (
          <li key={step.id}>
            <Link href={step.href} className="flex items-center gap-1.5 text-xs text-slate-700 hover:text-blue-700">{step.done ? <CheckCircle2 className="size-3.5 text-emerald-600" /> : <Circle className="size-3.5 text-slate-400" />}<span className={step.done ? "line-through text-slate-400" : ""}>{step.title}</span></Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
