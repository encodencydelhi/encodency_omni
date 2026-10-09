"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { FaFacebookF, FaInstagram, FaMeta } from "react-icons/fa6";
import { CheckCircle2, CircleDashed, Loader2, LogOut, RefreshCw, XCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { btn, btnPrimary, EmptyState, TableShell, Td, Th, Tr } from "@/features/admin/meta-ads/components/ui";
import { useMeta } from "../connection-context";
import { DisconnectDialog, MapResourceDialog } from "../components/connection-dialogs";
import { ProfileCard } from "../components/profile-card";
import { useSocialOverview } from "../live/meta-hooks";
import { missingEssential, PRODUCT_LABEL, type MetaProduct } from "../permissions";
import { ConnectionGate, InlineNotice, KeyValue, META_ROOT, MetaShell, Pill, Section } from "../ui";

const when = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—");

const HEALTH: Record<string, { label: string; tone: "green" | "amber" | "red" | "slate" }> = {
  healthy: { label: "Healthy", tone: "green" },
  expiring_soon: { label: "Expires soon", tone: "amber" },
  expired: { label: "Expired", tone: "red" },
  revoked: { label: "Revoked", tone: "red" },
  error: { label: "Error", tone: "red" },
  not_connected: { label: "Not connected", tone: "slate" },
};

const PRODUCT_ICON: Record<MetaProduct, typeof FaMeta> = { ads: FaMeta, facebook: FaFacebookF, instagram: FaInstagram };

export function MetaSettingsPage() {
  return (
    <MetaShell title="Meta settings" subtitle="Connection, permissions and linked accounts." showRefresh>
      <SettingsBody />
    </MetaShell>
  );
}

function SettingsBody() {
  const meta = useMeta();
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [mapKind, setMapKind] = useState<"FACEBOOK_PAGE" | "INSTAGRAM_ACCOUNT" | null>(null);
  const connected = meta.state === "connected" || meta.state === "reconnect";
  const social = useSocialOverview(meta.companyId, meta.state === "connected");
  const health = HEALTH[meta.connection?.health ?? "not_connected"] ?? HEALTH.not_connected!;

  const pageNames = new Map((social.data?.pages ?? []).map((page) => [page.id, page.name] as const));
  const instagramNames = new Map((social.data?.pages ?? []).flatMap((page) => (page.instagram ? [[page.instagram.id, `@${page.instagram.username ?? page.instagram.id}`] as const] : [])));
  const linked = [...(meta.meta?.resources ?? []), ...(meta.instagram?.resources ?? [])].filter((resource) => resource.resourceType === "FACEBOOK_PAGE" || resource.resourceType === "INSTAGRAM_ACCOUNT");

  return (
    <div className="space-y-1">
      {meta.state !== "connected" && meta.state !== "reconnect" && <ConnectionGate>{null}</ConnectionGate>}

      {connected && (
        <Section
          title="Connection"
          description="The Meta login this Company uses for Ads, Facebook and Instagram."
          action={
            <>
              <button type="button" className={btn} onClick={meta.refresh}>
                <RefreshCw className={cn("size-3.5", meta.isFetching && "animate-spin")} />
                Refresh status
              </button>
              <button type="button" className={btnPrimary} onClick={() => void meta.connect()} disabled={meta.busy === "connect"}>
                {meta.busy === "connect" && <Loader2 className="size-4 animate-spin" />}
                Reconnect
              </button>
            </>
          }
        >
          {meta.state === "reconnect" && (
            <div className="mb-4">
              <InlineNotice tone="red" title="This Meta login has expired or was revoked">Reconnect to read data again. Linked accounts are kept.</InlineNotice>
            </div>
          )}
          <dl className="grid gap-x-10 lg:grid-cols-2">
            <div>
              <KeyValue label="Logged in as">{meta.connection?.accountName ?? "Name not shared by Meta"}</KeyValue>
              <KeyValue label="Meta user ID">{meta.connection?.externalAccountId ?? "—"}</KeyValue>
              <KeyValue label="Health">
                <Pill tone={health.tone}>{health.label}</Pill>
              </KeyValue>
            </div>
            <div>
              <KeyValue label="Last updated">{when(meta.connection?.lastUpdatedAt)}</KeyValue>
              <KeyValue label="Linked to this Client">{(meta.meta?.mappedResourceCount ?? 0) + (meta.instagram?.mappedResourceCount ?? 0)} account(s)</KeyValue>
              <KeyValue label="Data freshness">Live from Meta, kept for 1–5 minutes to respect Meta&apos;s limits. Refresh forces a reload.</KeyValue>
            </div>
          </dl>
        </Section>
      )}

      {meta.state === "connected" && <ProfileCard compact />}

      {connected && (
        <Section title="Permissions" description="What the Meta login granted, and what each permission is used for." flush>
          <div className="grid gap-1 border-b border-slate-100 p-1 sm:grid-cols-3">
            {(["ads", "facebook", "instagram"] as const).map((product) => {
              const missing = missingEssential(meta.scopes, product);
              const Icon = PRODUCT_ICON[product];
              return (
                <div key={product} className={cn("flex items-center gap-3 rounded-sm border p-3", missing.length === 0 ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50")}>
                  <Icon className="size-5 shrink-0 text-slate-700" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900">{PRODUCT_LABEL[product]}</p>
                    <p className="text-[11px] font-medium text-slate-600">{missing.length === 0 ? "All required permissions granted" : `Missing: ${missing.map((m) => m.scope).join(", ")}`}</p>
                  </div>
                </div>
              );
            })}
          </div>
          {/* A list, not a table: permission rows have long text and must reflow on narrow screens instead of scrolling sideways. */}
          <ul className="divide-y divide-slate-100">
            {meta.scopes.map((scope) => (
              <li key={scope.scope} className="grid gap-x-4 gap-y-1.5 px-4 py-3 md:grid-cols-[200px_minmax(0,1fr)_120px] md:items-start">
                <div className="min-w-0">
                  <span className="block text-xs font-semibold text-slate-900">{scope.label}</span>
                  <code className="break-all text-[10.5px] text-slate-500">{scope.scope}</code>
                </div>
                <div className="min-w-0">
                  <p className="text-[11.5px] font-medium leading-snug text-slate-600">{scope.unlocks}</p>
                  <p className="mt-1.5 flex flex-wrap gap-1">
                    {scope.products.map((product) => (
                      <Pill key={product}>{PRODUCT_LABEL[product]}</Pill>
                    ))}
                  </p>
                </div>
                <div className="md:text-right">
                  {scope.state === "granted" ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="size-4" />Granted</span>
                  ) : scope.state === "declined" ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700"><XCircle className="size-4" />Declined</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500"><CircleDashed className="size-4" />{scope.essential ? "Not granted" : "Optional"}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <p className="border-t border-slate-100 px-4 py-3 text-[11px] font-medium leading-relaxed text-slate-500">
            Changed a permission in Meta? Choose Reconnect, then keep everything ticked in Meta&apos;s dialog. Optional permissions such as <code className="rounded bg-slate-100 px-1">business_management</code> are added by the server administrator through <code className="rounded bg-slate-100 px-1">META_EXTRA_SCOPES</code>.
          </p>
        </Section>
      )}

      {connected && (
        <Section
          title="Linked accounts for this Client"
          description="Pages and Instagram accounts this Client publishes to."
          action={
            <>
              <button type="button" className={btn} onClick={() => setMapKind("FACEBOOK_PAGE")}>
                <FaFacebookF className="size-3.5 text-[#1877f2]" />
                Link a Page
              </button>
              <button type="button" className={btn} onClick={() => setMapKind("INSTAGRAM_ACCOUNT")}>
                <FaInstagram className="size-3.5 text-[#d946ef]" />
                Link Instagram
              </button>
            </>
          }
          flush
        >
          <div id="pages" />
          {linked.length === 0 ? (
            <EmptyState icon={FaFacebookF} title="Nothing linked to this Client yet" description="Link a Facebook Page or Instagram account to publish and report for this Client." compact />
          ) : (
            <TableShell minWidth={520}>
              <thead>
                <tr>
                  <Th>Account</Th>
                  <Th>Type</Th>
                  <Th>ID</Th>
                </tr>
              </thead>
              <tbody>
                {linked.map((resource) => (
                  <Tr key={resource.mappingId}>
                    <Td>
                      <span className="flex items-center gap-2 font-semibold text-slate-900">
                        {resource.resourceType === "INSTAGRAM_ACCOUNT" ? <FaInstagram className="size-4 text-[#d946ef]" /> : <FaFacebookF className="size-4 text-[#1877f2]" />}
                        {(resource.resourceType === "INSTAGRAM_ACCOUNT" ? instagramNames : pageNames).get(resource.externalResourceId) ?? "Name not available"}
                      </span>
                    </Td>
                    <Td>{resource.resourceType === "INSTAGRAM_ACCOUNT" ? "Instagram" : "Facebook Page"}</Td>
                    <Td>{resource.externalResourceId}</Td>
                  </Tr>
                ))}
              </tbody>
            </TableShell>
          )}
          {social.isSuccess && social.data.pages.length === 0 && (
            <div className="border-t border-slate-100 p-4">
              <InlineNotice tone="amber" title="This Meta login manages no Facebook Page" action={<Link href={`${META_ROOT}/facebook`} className={btn}>See steps</Link>}>
                Pages are listed only when the logged-in person has a role on them. {social.data.unmanagedPages.length > 0 ? `Your ad accounts use ${social.data.unmanagedPages.map((page) => page.name).join(", ")}, which this login cannot access yet.` : ""}
              </InlineNotice>
            </div>
          )}
        </Section>
      )}

      {connected && (
        <Section title="Disconnect" description="Stop OmniPlatform from using this Meta login.">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-rose-200 bg-rose-50 p-4">
            <p className="max-w-xl text-xs font-medium leading-relaxed text-rose-900">
              Disconnecting removes the saved login and unlinks every Page and Instagram account from this Company&apos;s Clients. Nothing is deleted from Meta. You can connect again at any time.
            </p>
            <button type="button" onClick={() => setDisconnectOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-sm border border-rose-300 bg-white px-4 text-xs font-semibold text-rose-700 hover:bg-rose-100">
              <LogOut className="size-3.5" />
              Disconnect Meta
            </button>
          </div>
        </Section>
      )}

      <Section title="Help: accounts, limits and going live" description="Answers to the questions that come up when connecting Meta.">
        <div className="space-y-2">
          <HelpItem title="How do I connect a different Facebook account?">
            <ol className="list-decimal space-y-1 pl-4">
              <li>Open facebook.com in this browser and log out (or use a private window). Meta signs in with whichever account the browser already has.</li>
              <li>Come back here and choose Disconnect, then Connect Meta.</li>
              <li>Log in as the person who manages the Page or ad account, and tick the Page, Instagram account and every permission.</li>
            </ol>
          </HelpItem>
          <HelpItem title="Can any Facebook account log in?">
            <p>
              Not yet. While the Meta app is in <strong>Development mode</strong>, only people who have a role on the app can log in: add them in Meta for Developers → your app → App roles (Admin, Developer or Tester) and have them accept. To let any customer connect, the app must pass Meta&apos;s App Review for each permission and go Live.
            </p>
          </HelpItem>
          <HelpItem title="Why does Meta say it is limiting requests?">
            <p>
              Every ad account has a request budget. Apps with <strong>development access</strong> get a very small one, and a large account (hundreds of campaigns and ads) can use it up with a few page loads. OmniPlatform already keeps a copy, never asks Meta twice for the same data within a few minutes and stops calling while Meta says to wait. The permanent fix is <strong>Standard access</strong> for the Ads API: in Meta for Developers → App Review → Permissions and features, request <code className="rounded bg-slate-100 px-1">ads_read</code> (and <code className="rounded bg-slate-100 px-1">ads_management</code> if you will manage ads), complete Business Verification, and submit a short screencast.
            </p>
          </HelpItem>
          <HelpItem title="What personal-profile data can OmniPlatform show?">
            <p>
              Your name, photo, user ID, which permissions you granted, how long the login stays valid, and (with <code className="rounded bg-slate-100 px-1">business_management</code>) your Business portfolios. Friends, personal posts, likes and birthday are never available to business apps without special Meta approval, so they are not shown.
            </p>
          </HelpItem>
        </div>
      </Section>

      <DisconnectDialog open={disconnectOpen} onOpenChange={setDisconnectOpen} />
      {mapKind && <MapResourceDialog open onOpenChange={(open) => !open && setMapKind(null)} kind={mapKind} />}
    </div>
  );
}

function HelpItem({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group rounded-sm border border-slate-200 bg-white open:bg-slate-50/60">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-2.5 text-xs font-semibold text-slate-900">
        {title}
        <span className="text-slate-400 transition group-open:rotate-45" aria-hidden="true">+</span>
      </summary>
      <div className="px-3.5 pb-3 text-xs font-medium leading-relaxed text-slate-700">{children}</div>
    </details>
  );
}
