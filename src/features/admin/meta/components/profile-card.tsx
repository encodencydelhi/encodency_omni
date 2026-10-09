"use client";

import Link from "next/link";
import { BadgeCheck, Building2, KeyRound, ShieldAlert, UserRound } from "lucide-react";
import { FaFacebookF } from "react-icons/fa6";
import { useMeta } from "../connection-context";
import { messageOf, useMetaProfile } from "../live/meta-hooks";
import { Avatar, InlineNotice, KeyValue, META_ROOT, Pill, Section } from "../ui";

const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : null);

const VERIFICATION: Record<string, { label: string; tone: "green" | "amber" | "slate" }> = {
  verified: { label: "Verified", tone: "green" },
  not_verified: { label: "Not verified", tone: "slate" },
  pending: { label: "Pending", tone: "amber" },
};

/**
 * The personal Facebook profile behind the Meta login: who it is, whether the login still works and until when
 * Meta lets us read data, and the Business portfolios it can see. Friends, posts and likes are not offered: Meta
 * releases those only to apps that passed App Review for them.
 */
export function ProfileCard({ compact = false }: { compact?: boolean }) {
  const meta = useMeta();
  const profile = useMetaProfile(meta.companyId, meta.state === "connected");
  const data = profile.data;

  if (profile.isLoading) return <div className="h-40 animate-pulse rounded-sm border border-slate-200 bg-white" role="status" aria-label="Loading Facebook profile" />;
  if (profile.isError) {
    return (
      <InlineNotice tone="amber" title="The connected Facebook profile could not be loaded">
        {messageOf(profile.error, "Meta did not answer. Try again in a moment.")}
      </InlineNotice>
    );
  }
  if (!data) return null;

  const business = data.businesses;
  const verification = (status: string | null) => VERIFICATION[status ?? ""] ?? { label: status ? status.replace(/_/g, " ") : "Unknown", tone: "slate" as const };
  const declined = data.permissions.filter((p) => p.status !== "granted").length;

  return (
    <Section
      title="Connected Facebook profile"
      description="The personal account OmniPlatform signed in with. Pages, ad accounts and Instagram are reached through it."
      action={
        !compact && (
          <Link href={`${META_ROOT}/settings`} className="text-xs font-semibold text-blue-700 hover:underline">
            Manage connection
          </Link>
        )
      }
    >
      {data.freshness?.source === "stale" && <p className="mb-3 text-[11px] font-semibold text-amber-800">Showing the last data Meta gave us; Meta is limiting requests right now.</p>}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,320px)_1fr]">
        <div className="flex items-start gap-3.5">
          <Avatar src={data.pictureUrl} name={data.name ?? "Facebook"} size={64} />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-base font-semibold text-slate-900">
              <FaFacebookF className="size-3.5 shrink-0 text-[#1877f2]" aria-hidden="true" />
              <span className="truncate">{data.name ?? "Name not shared"}</span>
            </p>
            <p className="text-[11px] font-medium text-slate-500">Facebook user ID {data.id}</p>
            <p className="mt-2 flex flex-wrap gap-1.5">
              {data.token.isValid === false ? <Pill tone="red"><ShieldAlert className="size-3" />Login not valid</Pill> : <Pill tone="green"><BadgeCheck className="size-3" />Login valid</Pill>}
              {declined > 0 && <Pill tone="amber">{declined} permission{declined === 1 ? "" : "s"} not granted</Pill>}
            </p>
          </div>
        </div>

        <dl className="grid gap-x-8 sm:grid-cols-2">
          <div>
            <KeyValue label="Connected since">{day(data.token.issuedAt) ?? "—"}</KeyValue>
            <KeyValue label="Login expires">{data.token.expiresAt ? day(data.token.expiresAt) : "Does not expire"}</KeyValue>
          </div>
          <div>
            <KeyValue label="Data access until">{day(data.token.dataAccessExpiresAt) ?? "—"}</KeyValue>
            <KeyValue label="Permissions granted">{data.permissions.filter((p) => p.status === "granted").length}</KeyValue>
          </div>
        </dl>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-4">
        <h3 className="flex items-center gap-2 text-xs font-semibold text-slate-900">
          <Building2 className="size-3.5 text-slate-500" />
          Business portfolios
        </h3>
        {business.state === "live" ? (
          <ul className="mt-2 flex flex-wrap gap-2">
            {business.items.map((item) => (
              <li key={item.id} className="flex items-center gap-2 rounded-sm border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-800">
                {item.name}
                <Pill tone={verification(item.verificationStatus).tone}>{verification(item.verificationStatus).label}</Pill>
              </li>
            ))}
          </ul>
        ) : business.state === "empty" ? (
          <p className="mt-1.5 text-xs font-medium text-slate-500">This profile is not part of any Business portfolio.</p>
        ) : business.state === "permission_required" ? (
          <p className="mt-1.5 flex items-start gap-2 text-xs font-medium leading-relaxed text-slate-600">
            <KeyRound className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
            <span>
              Not shown: Meta shares Business portfolios only with the <code className="rounded bg-slate-100 px-1">business_management</code> permission. If your Pages or ad accounts belong to a Business portfolio, enable it (Settings explains how).
            </span>
          </p>
        ) : (
          <p className="mt-1.5 flex items-center gap-2 text-xs font-medium text-slate-500">
            <UserRound className="size-3.5" />
            Business portfolios could not be loaded right now.
          </p>
        )}
      </div>
    </Section>
  );
}
