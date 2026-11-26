"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";
import { useCompanyScope } from "@/features/support/hooks";
import { ApiError } from "@/types/api";
import { btn, btnPrimary, PageHeader, Panel, TableShell, Td, Th, Tr } from "@/features/admin/meta-ads/components/ui";

/**
 * API & Developers: a Company Owner/Admin creates API keys so the company's own systems (website, CRM, app) can create
 * contacts and templates, send WhatsApp messages and run campaigns through the Media360 Public API.
 */
interface KeyRow { id: string; name: string; clientId: string; clientName: string | null; scopes: string[]; prefix: string; createdAt: string; expiresAt: string | null; revokedAt: string | null; lastUsedAt: string | null; requestCount: number; active: boolean }
interface KeyList { scopes: Array<{ id: string; label: string }>; rateLimitPerMinute: number; planAllows: boolean; clients: Array<{ id: string; name: string }>; items: KeyRow[] }

const base = "/developers/api-keys";
const message = (error: unknown) => (ApiError.isApiError(error) ? error.message : error instanceof Error ? error.message : "Something went wrong. Please try again.");
const when = (value: string | null) => (value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—");
const input = "h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800 focus:outline-blue-600";

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className={btn} onClick={() => { void navigator.clipboard.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); }); }}>
      {done ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {done ? "Copied" : "Copy"}
    </button>
  );
}

function Code({ children }: { children: string }) {
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-md bg-slate-900 p-3 text-[11.5px] leading-5 text-slate-100"><code>{children}</code></pre>
      <div className="absolute right-2 top-2"><CopyButton text={children} /></div>
    </div>
  );
}

function CreateKey({ list, companyId, onCreated }: { list: KeyList; companyId: string; onCreated: (token: string) => void }) {
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [scopes, setScopes] = useState<string[]>(["whatsapp:read", "contacts:write", "messages:send"]);
  const [expiry, setExpiry] = useState("365");
  const create = useMutation({
    mutationFn: () => apiClient.request<{ token: string }>({ method: "POST", path: base, headers: companyScopeHeaders(companyId), body: { name: name.trim(), clientId, scopes, expiresInDays: expiry === "never" ? null : Number(expiry) } }),
    onSuccess: (result) => { onCreated(result.token); setName(""); },
    onError: (error) => toast.error(message(error)),
  });
  const toggle = (id: string) => setScopes(scopes.includes(id) ? scopes.filter((s) => s !== id) : [...scopes, id]);
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1 text-xs font-semibold text-slate-600">Key name<input className={input} value={name} maxLength={80} placeholder="e.g. Website orders" onChange={(e) => setName(e.target.value)} /></label>
        <label className="grid gap-1 text-xs font-semibold text-slate-600">Client<select className={input} value={clientId} onChange={(e) => setClientId(e.target.value)}><option value="">Choose a client…</option>{list.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="grid gap-1 text-xs font-semibold text-slate-600">Expires<select className={input} value={expiry} onChange={(e) => setExpiry(e.target.value)}><option value="30">In 30 days</option><option value="90">In 90 days</option><option value="365">In 1 year</option><option value="never">Never</option></select></label>
      </div>
      <fieldset>
        <legend className="mb-1 text-xs font-semibold text-slate-600">What this key may do</legend>
        <div className="grid gap-1 sm:grid-cols-2">
          {list.scopes.map((scope) => (
            <label key={scope.id} className="flex items-start gap-2 rounded-md border border-slate-200 px-2 py-1.5 text-xs">
              <input type="checkbox" className="mt-0.5" checked={scopes.includes(scope.id)} onChange={() => toggle(scope.id)} />
              <span><span className="font-mono font-semibold text-slate-800">{scope.id}</span><span className="block text-slate-500">{scope.label}</span></span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex justify-end"><button type="button" className={btnPrimary} disabled={!name.trim() || !clientId || !scopes.length || create.isPending || !list.planAllows} onClick={() => create.mutate()}><KeyRound className="size-3.5" /> Create API key</button></div>
    </div>
  );
}

export function DevelopersPage() {
  const queryClient = useQueryClient();
  const { companyId, ready } = useCompanyScope();
  const [token, setToken] = useState<string | null>(null);
  const keys = useQuery({ queryKey: ["developer-keys", companyId], enabled: ready && Boolean(companyId), queryFn: () => apiClient.request<KeyList>({ method: "GET", path: base, headers: companyScopeHeaders(companyId) }), retry: false });
  const revoke = useMutation({
    mutationFn: (id: string) => apiClient.request({ method: "POST", path: `${base}/${id}/revoke`, headers: companyScopeHeaders(companyId) }),
    onSuccess: () => { toast.success("Key revoked. Calls with it stop working immediately."); void queryClient.invalidateQueries({ queryKey: ["developer-keys"] }); },
    onError: (error) => toast.error(message(error)),
  });
  const api = typeof window !== "undefined" ? `${window.location.origin}/api/v1/public/v1` : "/api/v1/public/v1";
  const sample = token ?? "m360_YOUR_KEY";

  return (
    <div className="space-y-4">
      <PageHeader title="API & Developers" subtitle="Let your own website, CRM or app send WhatsApp messages, create templates and run campaigns through Media360." />
      {keys.isError && <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">{message(keys.error)}</p>}
      {keys.data && !keys.data.planAllows && <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">Your current plan does not include API access. Upgrade the plan in Billing.</p>}

      {token && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
          <p className="mb-2 text-sm font-semibold text-emerald-900">Copy your new API key now. It will not be shown again.</p>
          <div className="flex flex-wrap items-center gap-2"><code className="break-all rounded bg-white px-2 py-1 text-xs text-slate-900">{token}</code><CopyButton text={token} /><button type="button" className={btn} onClick={() => setToken(null)}>I saved it</button></div>
          <p className="mt-2 text-[11px] text-emerald-800">Keep it secret like a password: put it in your server&apos;s settings, never in a website&apos;s browser code or an app people download.</p>
        </div>
      )}

      {keys.data && (
        <Panel title="Create an API key">
          <CreateKey list={keys.data} companyId={companyId} onCreated={(value) => { setToken(value); void queryClient.invalidateQueries({ queryKey: ["developer-keys"] }); }} />
        </Panel>
      )}

      <Panel title="Your API keys">
        {keys.isLoading && <p className="text-xs text-slate-500">Loading…</p>}
        {keys.data && keys.data.items.length === 0 && <p className="text-xs text-slate-500">No keys yet.</p>}
        {keys.data && keys.data.items.length > 0 && (
          <TableShell>
            <thead><tr><Th>Name</Th><Th>Client</Th><Th>Scopes</Th><Th>Last used</Th><Th>Expires</Th><Th /></tr></thead>
            <tbody>
              {keys.data.items.map((key) => (
                <Tr key={key.id}>
                  <Td><p className="font-semibold text-slate-900">{key.name}</p><p className="font-mono text-[11px] text-slate-500">{key.prefix}</p></Td>
                  <Td>{key.clientName ?? "—"}</Td>
                  <Td><p className="max-w-xs text-[11px] text-slate-600">{key.scopes.join(", ")}</p></Td>
                  <Td>{when(key.lastUsedAt)}<p className="text-[11px] text-slate-500">{key.requestCount.toLocaleString("en-IN")} calls</p></Td>
                  <Td>{key.revokedAt ? <span className="text-rose-700">Revoked</span> : key.expiresAt ? when(key.expiresAt) : "Never"}</Td>
                  <Td>{key.active && <button type="button" className={btn} disabled={revoke.isPending} onClick={() => { if (window.confirm(`Revoke "${key.name}"? Systems using it stop working at once.`)) revoke.mutate(key.id); }}>Revoke</button>}</Td>
                </Tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </Panel>

      <Panel title="How to use the API">
        <div className="space-y-3 text-xs text-slate-600">
          <p>Base URL: <code className="rounded bg-slate-100 px-1 text-slate-900">{api}</code>. Send the key in every request as <code className="rounded bg-slate-100 px-1">Authorization: Bearer m360_…</code>. Limit: {keys.data?.rateLimitPerMinute ?? 120} requests per minute per key. A key works only for its Client.</p>
          <p className="font-semibold text-slate-800">1. Check the key</p>
          <Code>{`curl ${api}/me \\\n  -H "Authorization: Bearer ${sample}"`}</Code>
          <p className="font-semibold text-slate-800">2. Add a contact (they must have agreed to receive WhatsApp messages)</p>
          <Code>{`curl -X POST ${api}/whatsapp/contacts \\\n  -H "Authorization: Bearer ${sample}" -H "Content-Type: application/json" \\\n  -d '{"phone":"+919800000001","name":"Rahul","consent":true,"tags":["website"]}'`}</Code>
          <p className="font-semibold text-slate-800">3. Create a template and send it to Meta for approval</p>
          <Code>{`curl -X POST ${api}/whatsapp/templates \\\n  -H "Authorization: Bearer ${sample}" -H "Content-Type: application/json" \\\n  -d '{"name":"order_update","category":"Utility","language":"English","body":"Hi {{1}}, your order {{2}} is on the way.","variables":{"1":"Rahul","2":"#1001"},"submit":true}'`}</Code>
          <p className="font-semibold text-slate-800">4. Send a message (template any time; free text only within 24 hours of the customer&apos;s last message)</p>
          <Code>{`curl -X POST ${api}/whatsapp/messages \\\n  -H "Authorization: Bearer ${sample}" -H "Content-Type: application/json" \\\n  -d '{"to":"+919800000001","type":"template","templateId":"TEMPLATE_ID","parameters":{"1":"Rahul","2":"#1001"},"idempotencyKey":"order-1001-shipped"}'`}</Code>
          <p className="font-semibold text-slate-800">5. Create and launch a campaign</p>
          <Code>{`curl -X POST ${api}/whatsapp/campaigns \\\n  -H "Authorization: Bearer ${sample}" -H "Content-Type: application/json" \\\n  -d '{"name":"Diwali offer","templateId":"TEMPLATE_ID","phones":["+919800000001","+919800000002"],"parameters":{"1":"Friend"}}'\n\ncurl -X POST ${api}/whatsapp/campaigns/CAMPAIGN_ID/launch \\\n  -H "Authorization: Bearer ${sample}" -H "Content-Type: application/json" -d '{"confirm":true}'`}</Code>
          <p className="font-semibold text-slate-800">6. Get delivery and reply events on your server</p>
          <Code>{`curl -X POST ${api}/whatsapp/webhooks \\\n  -H "Authorization: Bearer ${sample}" -H "Content-Type: application/json" \\\n  -d '{"url":"https://your-server.example/whatsapp-events","events":["message.received","message.status"]}'`}</Code>
          <div className="rounded-md border border-slate-200 p-3">
            <p className="mb-1 font-semibold text-slate-800">All endpoints</p>
            <ul className="grid gap-1 font-mono text-[11px] sm:grid-cols-2">
              {[
                "GET  /me", "GET  /whatsapp/contacts?phone=&limit=&cursor=", "POST /whatsapp/contacts", "GET  /whatsapp/templates", "GET  /whatsapp/templates/{id}", "POST /whatsapp/templates",
                "POST /whatsapp/templates/{id}/submit", "POST /whatsapp/messages", "GET  /whatsapp/messages/{id}", "GET  /whatsapp/campaigns", "GET  /whatsapp/campaigns/{id}", "POST /whatsapp/campaigns",
                "POST /whatsapp/campaigns/{id}/launch", "POST /whatsapp/campaigns/{id}/pause", "GET  /whatsapp/webhooks", "POST /whatsapp/webhooks", "DELETE /whatsapp/webhooks/{id}",
              ].map((line) => <li key={line}>{line}</li>)}
            </ul>
            <p className="mt-2 text-[11px] text-slate-500">Errors come back as JSON with <code>message</code> and, where useful, <code>reason</code> (for example <code>missing_scope</code>, <code>contact_not_found</code>, <code>rate_limited</code>). The same rules as the app apply: consent, the 24-hour window, approved templates, plan limits.</p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
