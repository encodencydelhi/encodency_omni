"use client";

import Link from "next/link";
import { FaFacebookF, FaInstagram, FaMeta } from "react-icons/fa6";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  KeyRound,
  Plug,
  RefreshCw,
  ShieldCheck,
  Unplug,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { connectedAssets } from "@/features/admin/meta-ads/data";
import { date, dateTime, relative } from "@/features/admin/meta-ads/format";
import {
  btn,
  btnPrimary,
  Field,
  KpiCard,
  Panel,
  StateNotice,
  Tag,
  ToneChip,
} from "@/features/admin/meta-ads/components/ui";
import {
  ADS_ROOT,
  AdsWorkspace,
} from "@/features/admin/meta-ads/components/workspace";
import type { ConnectedAsset } from "@/features/admin/meta-ads/types";
import type { StatusTone } from "@/features/admin/meta-ads/format";

const STATUS_TONE: Record<ConnectedAsset["status"], StatusTone> = {
  Connected: "green",
  Syncing: "blue",
  "Needs Reauthorization": "amber",
  "Permission Missing": "amber",
  "Sync Failed": "red",
  Disconnected: "red",
};

const GROUP_META: Record<
  ConnectedAsset["group"],
  { anchor: string; icon: React.ReactNode; blurb: string }
> = {
  "Ad Account": {
    anchor: "ad-account",
    icon: <FaMeta className="size-4 text-[#0866ff]" />,
    blurb: "Where your campaigns are billed and where spend limits are set.",
  },
  "Facebook Page": {
    anchor: "facebook-page",
    icon: <FaFacebookF className="size-4 text-[#1877f2]" />,
    blurb: "The identity your Facebook ads are published under.",
  },
  "Instagram Business": {
    anchor: "instagram",
    icon: <FaInstagram className="size-4 text-[#d946ef]" />,
    blurb: "Required for Instagram Feed, Reels and Stories placements.",
  },
  "Pixel / Data Source": {
    anchor: "pixel",
    icon: <Database className="size-4 text-[#7c3aed]" />,
    blurb: "Sends website and offline conversion events back to Meta.",
  },
};

const GROUPS: ConnectedAsset["group"][] = [
  "Ad Account",
  "Facebook Page",
  "Instagram Business",
  "Pixel / Data Source",
];

export default function AssetsPage() {
  const needsAttention = connectedAssets.filter(
    (a) => a.status !== "Connected" && a.status !== "Syncing",
  );
  const healthy = connectedAssets.filter((a) => a.status === "Connected").length;

  return (
    <AdsWorkspace
      showDateRange={false}
      actions={
        <button
          type="button"
          onClick={() => toast.success("Re-checking every Meta connection…")}
          className={cn(btn, "h-10")}
        >
          <RefreshCw className="size-3.5" />
          Refresh All
        </button>
      }
    >
      {needsAttention.length > 0 && (
        <div className="mb-3 space-y-2">
          {needsAttention.map((asset) => (
            <StateNotice
              key={asset.id}
              tone={asset.status === "Needs Reauthorization" ? "amber" : "red"}
              icon={AlertTriangle}
              title={
                asset.status === "Needs Reauthorization"
                  ? `${asset.name} authorization expired`
                  : `${asset.name} — ${asset.status.toLowerCase()}`
              }
              description={
                asset.status === "Needs Reauthorization"
                  ? `The access token for ${asset.handle} expired on ${date(asset.lastSync)}. Reconnect to keep Instagram placements delivering.`
                  : `${asset.name} is not sending data. Reconnect the asset or check its permissions.`
              }
              action={{ label: "Reconnect", href: `${ADS_ROOT}/assets#${asset.id}` }}
              secondary={{ label: "Connection help", href: `${ADS_ROOT}/help/permission-missing` }}
            />
          ))}
        </div>
      )}

      <section className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <KpiCard label="Connected Assets" value={connectedAssets.length} icon={Plug} />
        <KpiCard label="Healthy" value={healthy} icon={CheckCircle2} tone="green" />
        <KpiCard
          label="Need Attention"
          value={needsAttention.length}
          icon={AlertTriangle}
          tone={needsAttention.length > 0 ? "amber" : "green"}
        />
        <KpiCard
          label="Last Full Sync"
          value={relative(
            [...connectedAssets].sort((a, b) => b.lastSync.localeCompare(a.lastSync))[0]!.lastSync,
          )}
          icon={RefreshCw}
        />
      </section>

      <div className="space-y-3">
        {GROUPS.map((group) => {
          const assets = connectedAssets.filter((a) => a.group === group);
          if (assets.length === 0) return null;
          const meta = GROUP_META[group];
          return (
            <Panel
              key={group}
              title={group}
              icon={meta.icon}
              action={<span className="text-[10px] text-[#64748b]">{meta.blurb}</span>}
            >
              <ul className="grid gap-2.5 lg:grid-cols-2">
                {assets.map((asset) => (
                  <li key={asset.id} id={asset.id} className="scroll-mt-24">
                    <article
                      className={cn(
                        "flex h-full flex-col rounded-xl border p-4 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5",
                        asset.status === "Connected" || asset.status === "Syncing"
                          ? "border-slate-200/60 bg-white/70 hover:shadow-md hover:border-slate-300/50"
                          : "border-amber-200/60 bg-amber-50/50 hover:shadow-md",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate text-[12px] font-semibold">{asset.name}</h3>
                          <p className="truncate text-[10px] text-[#64748b]">{asset.handle}</p>
                        </div>
                        <ToneChip tone={STATUS_TONE[asset.status]}>{asset.status}</ToneChip>
                      </div>

                      <dl className="mt-2.5">
                        <Field label="Asset ID" value={<code className="text-[10px]">{asset.assetId}</code>} />
                        <Field label="Connected on" value={date(asset.connectedOn)} />
                        <Field
                          label="Last sync"
                          value={<span title={dateTime(asset.lastSync)}>{relative(asset.lastSync)}</span>}
                        />
                      </dl>

                      <div className="mt-2.5">
                        <p className="flex items-center gap-1.5 text-[10px] font-semibold text-[#475569]">
                          <ShieldCheck className="size-3.5 text-[#10b981]" aria-hidden="true" />
                          Granted permissions
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {asset.permissions.map((p) => (
                            <Tag key={p}>{p}</Tag>
                          ))}
                        </div>
                      </div>

                      {asset.missingPermissions.length > 0 && (
                        <div className="mt-2.5">
                          <p className="flex items-center gap-1.5 text-[10px] font-semibold text-[#b45309]">
                            <KeyRound className="size-3.5" aria-hidden="true" />
                            Missing permissions
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {asset.missingPermissions.map((p) => (
                              <span
                                key={p}
                                className="inline-flex items-center rounded-md border border-[#fae0a6] bg-white px-2 py-0.5 text-[10px] font-medium text-[#b45309]"
                              >
                                {p}
                              </span>
                            ))}
                          </div>
                          <p className="mt-1.5 text-[9px] leading-relaxed text-[#b45309]">
                            Without {asset.missingPermissions[0]}, some reporting will be
                            unavailable for this asset.
                          </p>
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap gap-1.5 pt-1">
                        {asset.status !== "Connected" && asset.status !== "Syncing" ? (
                          <button
                            type="button"
                            onClick={() => toast.success(`Reconnecting ${asset.name}…`)}
                            className={btnPrimary}
                          >
                            Reconnect
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => toast.success(`Syncing ${asset.name}…`)}
                            className={btn}
                          >
                            <RefreshCw className="size-3.5" />
                            Sync
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => toast.success(`Refreshing permissions for ${asset.name}…`)}
                          className={btn}
                        >
                          Refresh Permissions
                        </button>
                        <button
                          type="button"
                          onClick={() => toast.success(`Opening ${asset.name} in Meta Business Suite`)}
                          className={btn}
                        >
                          Manage
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            toast.warning(`Disconnect ${asset.name}?`, {
                              description:
                                "Campaigns using this asset will stop delivering until it is reconnected.",
                            })
                          }
                          className={cn(btn, "text-[#b42318]")}
                        >
                          <Unplug className="size-3.5" />
                          Disconnect
                        </button>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            </Panel>
          );
        })}
      </div>

      <Panel
        title="Connection Health"
        icon={<Plug className="size-4 text-[#1877f2]" />}
        className="mt-3"
      >
        <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {(
            [
              ["Connected", "Everything is authorised and syncing normally."],
              ["Syncing", "Meta is refreshing data for this asset right now."],
              ["Needs Reauthorization", "The access token expired. Reconnect to restore delivery."],
              ["Permission Missing", "A scope is missing, so some features are unavailable."],
              ["Sync Failed", "Meta returned an error on the last sync. Retry it."],
              ["Disconnected", "The asset was removed and campaigns using it cannot run."],
            ] as [ConnectedAsset["status"], string][]
          ).map(([status, description]) => (
            <li key={status} className="rounded-xl border border-slate-200/60 bg-white/60 p-3.5 shadow-sm backdrop-blur-md transition-all hover:-translate-y-0.5 hover:shadow-md">
              <ToneChip tone={STATUS_TONE[status]}>{status}</ToneChip>
              <p className="mt-1.5 text-[10px] leading-relaxed text-[#64748b]">{description}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[10px] leading-relaxed text-[#94a3b8]">
          Access tokens are never shown here. Reconnecting opens Meta&apos;s own authorisation flow.
          Problems detected automatically also appear in{" "}
          <Link href={`${ADS_ROOT}/issues?tab=connection`} className="font-semibold text-[#0671e9] hover:underline">
            Issues &amp; Warnings
          </Link>
          .
        </p>
      </Panel>
    </AdsWorkspace>
  );
}
