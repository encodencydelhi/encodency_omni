"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { FaFacebookF, FaInstagram, FaMeta } from "react-icons/fa6";
import { AlertTriangle, ArrowUpRight, CheckCircle2, CircleDollarSign, FileText, Megaphone, PlugZap, Settings, ShieldCheck, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ADS_ROOT } from "@/features/admin/meta-ads/components/workspace";
import { btn, btnPrimary, EmptyState, FilterBar, FilterSelect, PagedFooter, SearchInput, TableShell, Td, Th, Tr } from "@/features/admin/meta-ads/components/ui";
import type { ApiAdAccount, ApiAdsOverviewAccount } from "@/features/admin/meta-ads/live/meta-ads-api";
import { DISABLE_REASON, mapSnapshot } from "@/features/admin/meta-ads/live/meta-ads-mappers";
import { usePagination } from "@/features/admin/meta-ads/use-filters";
import { useMeta } from "../connection-context";
import { ProfileCard } from "../components/profile-card";
import { ScheduledPostsTable } from "../components/scheduled-posts";
import { defaultAdAccount, messageOf, needsMetaLogin, rememberAdAccount, useAdAccounts, useAdsOverview, useAdSnapshot, useSocialOverview } from "../live/meta-hooks";
import { missingEssential } from "../permissions";
import { ConnectionGate, DetailDialog, InlineNotice, KeyValue, META_ROOT, MetaShell, Pill, Section, Stat } from "../ui";

const ACCOUNT_TONE: Record<string, "green" | "amber" | "red" | "slate"> = { ACTIVE: "green", CLOSED: "slate", DISABLED: "red", UNSETTLED: "amber", PENDING_RISK_REVIEW: "amber", PENDING_SETTLEMENT: "amber", IN_GRACE_PERIOD: "amber" };
const titleCase = (value: string) => value.toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

export function formatMoney(amount: number | null | undefined, currency: string | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: currency ?? "INR", maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency ?? ""} ${Math.round(amount).toLocaleString("en-IN")}`.trim();
  }
}

type Attention = { id: string; tone: "red" | "amber" | "blue"; title: string; detail: string; action?: { label: string; href: string } };

export function MetaOverviewPage() {
  return (
    <MetaShell title="Meta" subtitle="Ads, Facebook and Instagram — one login, three workspaces.">
      <ConnectionGate>
        <Overview />
      </ConnectionGate>
      <Capabilities />
    </MetaShell>
  );
}

function Overview() {
  const meta = useMeta();
  const router = useRouter();
  const live = meta.state === "connected";
  const accounts = useAdAccounts(meta.companyId, live);
  const accountList = useMemo(() => accounts.data?.items ?? [], [accounts.data]);
  const current = defaultAdAccount(meta.companyId, accountList);
  const totalsQuery = useAdsOverview(meta.companyId, live);
  // The heavy snapshot is NOT loaded here: only what the Ads workspace already fetched is reused (for the issue count).
  const snapshot = useAdSnapshot(meta.companyId, current?.id ?? null, "30d", false);
  const social = useSocialOverview(meta.companyId, live);

  const ads = useMemo(() => (snapshot.data ? mapSnapshot(snapshot.data, []) : null), [snapshot.data]);
  const openIssues = ads?.issues.filter((issue) => !issue.resolved).length ?? 0;
  const totals = totalsQuery.data?.totals;
  const spend = totals ? Object.entries(totals.spendByCurrency).filter(([, amount]) => amount > 0).map(([currency, amount]) => formatMoney(amount, currency)).join(" + ") || formatMoney(0, accountList[0]?.currency) : null;
  const throttledAccounts = totalsQuery.data?.accounts.filter((account) => account.state === "rate_limited").length ?? 0;
  const overviewById = useMemo(() => new Map((totalsQuery.data?.accounts ?? []).map((account) => [account.id, account] as const)), [totalsQuery.data]);
  const pages = social.data?.pages ?? [];
  const instagramAccounts = pages.filter((page) => page.instagram);
  const mappedPages = meta.meta?.mappedResourceCount ?? 0;
  const mappedInstagram = meta.instagram?.mappedResourceCount ?? 0;
  const activeAccounts = accountList.filter((account) => account.status === "ACTIVE").length;

  const attention: Attention[] = [];
  const adsMissing = missingEssential(meta.scopes, "ads");
  const fbMissing = missingEssential(meta.scopes, "facebook");
  const igMissing = missingEssential(meta.scopes, "instagram");
  for (const [product, missing] of [["Meta Ads", adsMissing], ["Facebook", fbMissing], ["Instagram", igMissing]] as const) {
    if (missing.length > 0) {
      attention.push({ id: `scope-${product}`, tone: "red", title: `${product} is missing ${missing.length === 1 ? "a permission" : "permissions"}`, detail: `${missing.map((m) => m.scope).join(", ")} ${missing.length === 1 ? "was" : "were"} not granted. Reconnect Meta and approve ${missing.length === 1 ? "it" : "them"}.`, action: { label: "Review permissions", href: `${META_ROOT}/settings` } });
    }
  }
  if (meta.connection && (meta.connection.health === "expiring_soon" || meta.connection.health === "expired")) {
    attention.push({ id: "token", tone: meta.connection.health === "expired" ? "red" : "amber", title: meta.connection.health === "expired" ? "Meta login expired" : "Meta login expires soon", detail: "Reconnect so Ads, Facebook and Instagram keep loading and scheduled posts keep publishing.", action: { label: "Reconnect", href: `${META_ROOT}/settings` } });
  }
  if (social.isSuccess && pages.length === 0) {
    const unmanaged = social.data?.unmanagedPages ?? [];
    attention.push({
      id: "no-pages",
      tone: "amber",
      title: "This Meta login manages no Facebook Page",
      detail: unmanaged.length > 0 ? `Meta shows ${unmanaged.map((page) => page.name).join(", ")} through your ad accounts, but this login has no role on ${unmanaged.length === 1 ? "it" : "them"}, so posts and Instagram cannot be read.` : "Give this login access to a Page in Meta Business Settings, then reconnect and tick the Page.",
      action: { label: "How to fix", href: `${META_ROOT}/settings#pages` },
    });
  }
  if (social.isError && !needsMetaLogin(social.error)) attention.push({ id: "social-error", tone: "amber", title: "Facebook and Instagram could not be loaded", detail: messageOf(social.error, "Meta did not answer."), action: { label: "Open Facebook", href: `${META_ROOT}/facebook` } });
  if (pages.length > 0 && mappedPages === 0) attention.push({ id: "unmapped", tone: "blue", title: "No Facebook Page is linked to this Client", detail: "Link a Page to publish and report for this Client.", action: { label: "Link a Page", href: `${META_ROOT}/facebook` } });
  if (openIssues > 0) attention.push({ id: "ad-issues", tone: "red", title: `${openIssues} ad ${openIssues === 1 ? "issue needs" : "issues need"} attention`, detail: "Rejected ads or campaigns with delivery problems on the selected ad account.", action: { label: "Open issues", href: `${ADS_ROOT}/issues` } });
  const closed = accountList.filter((account) => account.status !== "ACTIVE").length;
  if (closed > 0) attention.push({ id: "closed", tone: "blue", title: `${closed} of ${accountList.length} ad accounts are not active`, detail: "Closed or restricted accounts cannot run ads. They stay listed so old campaigns remain readable.", action: { label: "See accounts", href: "#ad-accounts" } });
  if (accounts.isError && !needsMetaLogin(accounts.error)) attention.push({ id: "accounts-error", tone: "amber", title: "Ad accounts could not be loaded", detail: messageOf(accounts.error, "Meta did not answer."), action: { label: "Open Meta Ads", href: ADS_ROOT } });
  const attentionPaged = usePagination(attention, 4);

  const openAds = (account: ApiAdAccount) => {
    rememberAdAccount(meta.companyId, account.id);
    router.push(ADS_ROOT);
  };

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-2 gap-1 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Ad accounts" value={accounts.isLoading ? "…" : accountList.length} sub={`${activeAccounts} active`} icon={FaMeta} />
        <Stat label="Total spend" value={totalsQuery.isLoading ? "…" : (spend ?? "—")} sub={throttledAccounts > 0 ? `${throttledAccounts} account(s) limited by Meta, totals may be low` : "All time, every ad account"} icon={CircleDollarSign} tone={throttledAccounts > 0 ? "amber" : undefined} />
        <Stat label="Total leads" value={totalsQuery.isLoading ? "…" : (totals?.leads ?? 0).toLocaleString("en-IN")} sub="All time, from instant forms" icon={UsersRound} />
        <Stat label="Active campaigns" value={totalsQuery.isLoading ? "…" : (totals?.activeCampaigns ?? 0)} sub={`${totals?.campaigns ?? 0} campaigns in total`} icon={Megaphone} />
        <Stat label="Facebook Pages" value={social.isLoading ? "…" : pages.length} sub={`${mappedPages} linked to this Client`} icon={FaFacebookF} tone={social.isSuccess && pages.length === 0 ? "amber" : undefined} />
        <Stat label="Instagram accounts" value={social.isLoading ? "…" : instagramAccounts.length} sub={`${mappedInstagram} linked to this Client`} icon={FaInstagram} tone={social.isSuccess && instagramAccounts.length === 0 ? "amber" : undefined} />
      </div>

      <div className="grid gap-1 lg:grid-cols-3">
        <ProductCard
          href={ADS_ROOT}
          icon={<FaMeta className="size-6 text-[#0866ff]" />}
          title="Meta Ads"
          blurb="Campaigns, ad sets, ads, leads, audiences and performance."
          status={accounts.isError ? <Pill tone="amber">Needs attention</Pill> : accountList.length > 0 ? <Pill tone="green">{activeAccounts} active account{activeAccounts === 1 ? "" : "s"}</Pill> : <Pill tone="slate">No ad account</Pill>}
          facts={[
            [String(totals?.campaigns ?? "—"), "Campaigns"],
            [String(totals?.activeCampaigns ?? "—"), "Active"],
            [totals ? totals.leads.toLocaleString("en-IN") : "—", "Leads"],
          ]}
          cta="Open Ads Manager"
        />
        <ProductCard
          href={`${META_ROOT}/facebook`}
          icon={<FaFacebookF className="size-6 text-[#1877f2]" />}
          title="Facebook"
          blurb="Page profile, posts with engagement, and what is scheduled."
          status={pages.length > 0 ? <Pill tone="green">{pages.length} Page{pages.length === 1 ? "" : "s"}</Pill> : social.isLoading ? <Pill>Checking…</Pill> : <Pill tone="amber">No Page access</Pill>}
          facts={[
            [String(pages.length), "Pages"],
            [String(mappedPages), "Linked"],
            [pages.reduce((sum, page) => sum + (page.followers ?? 0), 0).toLocaleString("en-IN"), "Followers"],
          ]}
          cta="Open Facebook"
        />
        <ProductCard
          href={`${META_ROOT}/instagram`}
          icon={<FaInstagram className="size-6 text-[#d946ef]" />}
          title="Instagram"
          blurb="Profile, recent posts and reels, and what is scheduled."
          status={instagramAccounts.length > 0 ? <Pill tone="green">{instagramAccounts.length} account{instagramAccounts.length === 1 ? "" : "s"}</Pill> : social.isLoading ? <Pill>Checking…</Pill> : <Pill tone="amber">None linked to a Page</Pill>}
          facts={[
            [String(instagramAccounts.length), "Accounts"],
            [String(mappedInstagram), "Linked"],
            [instagramAccounts.reduce((sum, page) => sum + (page.instagram?.followers ?? 0), 0).toLocaleString("en-IN"), "Followers"],
          ]}
          cta="Open Instagram"
        />
      </div>

      <Section
        title="Needs attention"
        description={attention.length === 0 ? "Everything Meta related looks healthy." : `${attention.length} item${attention.length === 1 ? "" : "s"} to look at`}
        action={
          <Link href={`${META_ROOT}/settings`} className={btn}>
            <Settings className="size-3.5" />
            Settings
          </Link>
        }
        flush
      >
        {attention.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="All clear" description="Permissions, connection and linked accounts are in good shape." compact />
        ) : (
          <>
            <ul className="divide-y divide-slate-100">
              {attentionPaged.visible.map((item) => (
                <li key={item.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
                  <span className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-sm", item.tone === "red" ? "bg-rose-50 text-rose-600" : item.tone === "amber" ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600")}>
                    <AlertTriangle className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-[220px] flex-1">
                    <p className="text-xs font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-0.5 text-[11.5px] font-medium leading-relaxed text-slate-600">{item.detail}</p>
                  </div>
                  {item.action && (
                    <Link href={item.action.href} className={btn}>
                      {item.action.label}
                      <ArrowUpRight className="size-3.5" />
                    </Link>
                  )}
                </li>
              ))}
            </ul>
            <PagedFooter paged={attentionPaged} noun="items" />
          </>
        )}
      </Section>

      <ProfileCard compact />

      <AdAccountsSection accounts={accountList} totals={overviewById} loading={accounts.isLoading} onOpenAds={openAds} />

      <Section title="Scheduled & published posts" description="Facebook and Instagram posts scheduled from OmniPlatform for this Client." flush>
        <ScheduledPostsTable />
      </Section>
    </div>
  );
}

function ProductCard({ href, icon, title, blurb, status, facts, cta }: { href: string; icon: ReactNode; title: string; blurb: string; status: ReactNode; facts: Array<[string, string]>; cta: string }) {
  return (
    <Link href={href} className="group flex flex-col rounded-sm border border-slate-200/90 bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-[0_8px_30px_rgba(15,23,42,0.1)]">
      <div className="flex items-start justify-between gap-2">
        <span className="flex size-11 items-center justify-center rounded-sm border border-slate-200 bg-slate-50">{icon}</span>
        {status}
      </div>
      <h3 className="mt-3 text-[15px] font-semibold text-slate-900">{title}</h3>
      <p className="mt-0.5 text-xs font-medium leading-relaxed text-slate-600">{blurb}</p>
      <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
        {facts.map(([value, label]) => (
          <div key={label}>
            <dd className="text-base font-semibold text-slate-900">{value}</dd>
            <dt className="text-[10.5px] font-semibold text-slate-500">{label}</dt>
          </div>
        ))}
      </dl>
      <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 group-hover:underline">
        {cta}
        <ArrowUpRight className="size-3.5" />
      </span>
    </Link>
  );
}

function AdAccountsSection({ accounts, totals, loading, onOpenAds }: { accounts: ApiAdAccount[]; totals: Map<string, ApiAdsOverviewAccount>; loading: boolean; onOpenAds: (account: ApiAdAccount) => void }) {
  const [status, setStatus] = useState("All statuses");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const statuses = useMemo(() => ["All statuses", ...Array.from(new Set(accounts.map((account) => titleCase(account.status ?? "Unknown"))))], [accounts]);
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return accounts
      .filter((account) => (status === "All statuses" || titleCase(account.status ?? "Unknown") === status) && (!q || account.name.toLowerCase().includes(q) || account.id.includes(q)))
      .sort((a, b) => Number(b.status === "ACTIVE") - Number(a.status === "ACTIVE") || a.name.localeCompare(b.name));
  }, [accounts, status, search]);
  const paged = usePagination(rows, 6);
  const open = accounts.find((account) => account.id === openId) ?? null;
  const filtered = status !== "All statuses" || search !== "";

  return (
    <Section title="Ad accounts" description="Every ad account this Meta login can see. Open one to work in Ads Manager." flush>
      <div id="ad-accounts" />
      {accounts.length > 0 && (
        <FilterBar>
          <FilterSelect label="Status" value={status} onChange={setStatus} options={statuses} minWidth={160} />
          <SearchInput placeholder="Search by name or ID…" value={search} onChange={setSearch} />
          {filtered && (
            <button
              type="button"
              className={btn}
              onClick={() => {
                setStatus("All statuses");
                setSearch("");
              }}
            >
              Clear
            </button>
          )}
        </FilterBar>
      )}
      {loading ? (
        <div className="h-32 animate-pulse bg-slate-50" role="status" aria-label="Loading ad accounts" />
      ) : rows.length === 0 ? (
        <EmptyState icon={FileText} title={filtered ? "No ad accounts match" : "No ad accounts found"} description={filtered ? "Try another status or clear the search." : "Add this Meta login to an ad account in Meta Business Settings, then refresh."} compact />
      ) : (
        <TableShell minWidth={860}>
          <thead>
            <tr>
              <Th>Account</Th>
              <Th>Status</Th>
              <Th>Currency</Th>
              <Th>Time zone</Th>
              <Th numeric>Lifetime spend</Th>
              <Th numeric>Campaigns</Th>
              <Th numeric>Leads</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {paged.visible.map((account) => (
              <Tr key={account.id}>
                <Td>
                  <button type="button" onClick={() => setOpenId(account.id)} className="block max-w-[260px] truncate text-left font-semibold text-blue-700 hover:underline">
                    {account.name}
                  </button>
                  <span className="block text-[10px] font-medium text-slate-500">{account.id}</span>
                </Td>
                <Td>
                  <Pill tone={ACCOUNT_TONE[account.status ?? ""] ?? "amber"}>{titleCase(account.status ?? "Unknown")}</Pill>
                </Td>
                <Td>{account.currency ?? "—"}</Td>
                <Td>{account.timezone ?? "—"}</Td>
                <Td numeric>{formatMoney(account.amountSpent, account.currency)}</Td>
                <Td numeric>{totals.get(account.id)?.state === "rate_limited" ? "Limited" : totals.has(account.id) ? `${totals.get(account.id)!.campaigns.active} / ${totals.get(account.id)!.campaigns.total}` : "…"}</Td>
                <Td numeric>{totals.get(account.id)?.state === "rate_limited" ? "Limited" : totals.has(account.id) ? totals.get(account.id)!.metrics.leads.toLocaleString("en-IN") : "…"}</Td>
                <Td>
                  <div className="flex gap-1.5">
                    <button type="button" onClick={() => setOpenId(account.id)} className={btn}>
                      Details
                    </button>
                    <button type="button" onClick={() => onOpenAds(account)} className={btnPrimary} style={{ height: 30, padding: "0 12px" }}>
                      Open in Ads
                    </button>
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableShell>
      )}
      <PagedFooter paged={paged} noun="ad accounts" />

      <DetailDialog
        open={Boolean(open)}
        onOpenChange={(next) => !next && setOpenId(null)}
        title={open?.name ?? "Ad account"}
        description={open?.id}
        footer={
          open && (
            <>
              <button type="button" className={btn} onClick={() => setOpenId(null)}>
                Close
              </button>
              <button type="button" className={btnPrimary} onClick={() => onOpenAds(open)}>
                Open in Ads Manager
              </button>
            </>
          )
        }
      >
        {open && (
          <dl>
            <KeyValue label="Status">
              <Pill tone={ACCOUNT_TONE[open.status ?? ""] ?? "amber"}>{titleCase(open.status ?? "Unknown")}</Pill>
            </KeyValue>
            {open.disableReason ? <KeyValue label="Reason">{DISABLE_REASON[open.disableReason] ?? `Code ${open.disableReason}`}</KeyValue> : null}
            <KeyValue label="Account ID">{open.accountId ?? open.id}</KeyValue>
            <KeyValue label="Currency">{open.currency ?? "—"}</KeyValue>
            <KeyValue label="Time zone">{open.timezone ?? "—"}</KeyValue>
            <KeyValue label="Lifetime spend">{formatMoney(open.amountSpent, open.currency)}</KeyValue>
          </dl>
        )}
        {open && open.status !== "ACTIVE" && <div className="mt-3"><InlineNotice tone="amber" title="This account cannot run ads right now">Fix it in Meta Business Settings. Its past campaigns stay readable here.</InlineNotice></div>}
      </DetailDialog>
    </Section>
  );
}

/** Shown while Meta is not connected: what connecting unlocks, so the page is never an empty wall. */
function Capabilities() {
  const meta = useMeta();
  if (meta.state === "connected" || meta.state === "loading") return null;
  const items = [
    { icon: <FaMeta className="size-5 text-[#0866ff]" />, title: "Meta Ads", body: "Campaigns, ad sets, ads, instant-form leads, audiences, creatives and daily performance — read live from your ad accounts." },
    { icon: <FaFacebookF className="size-5 text-[#1877f2]" />, title: "Facebook", body: "Your Page profile, recent posts with reactions, comments and shares, and what OmniPlatform has scheduled for it." },
    { icon: <FaInstagram className="size-5 text-[#d946ef]" />, title: "Instagram", body: "Profile, followers, recent posts and reels with likes and comments, plus scheduled publishing." },
  ];
  return (
    <div className="mt-1 grid gap-1 lg:grid-cols-3">
      {items.map((item) => (
        <div key={item.title} className="rounded-sm border border-slate-200 bg-white p-5 shadow-2xs">
          <span className="flex size-10 items-center justify-center rounded-sm border border-slate-200 bg-slate-50">{item.icon}</span>
          <h3 className="mt-3 text-sm font-semibold text-slate-900">{item.title}</h3>
          <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600">{item.body}</p>
        </div>
      ))}
      <p className="flex items-center gap-2 text-[11px] font-medium text-slate-500 lg:col-span-3">
        <CheckCircle2 className="size-3.5 text-emerald-600" />
        Connecting is read-only for ads and never posts anything by itself.
        <PlugZap className="ml-2 size-3.5 text-slate-400" />
      </p>
    </div>
  );
}
