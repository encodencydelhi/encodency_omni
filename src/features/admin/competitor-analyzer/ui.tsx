"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { SERIES_COLORS } from "@/features/admin/website/components/ui/charts";

/** One fixed colour per site, by its position in the study (your site first), never by rank. */
export const SITE_COLORS = SERIES_COLORS;

export function SiteFavicon({ domain, size = 18 }: { domain: string; size?: number }) {
  const [broken, setBroken] = useState(false);
  if (!domain || broken) {
    return (
      <span className="grid shrink-0 place-items-center rounded bg-[#EFF4FC] text-[10px] font-bold uppercase text-[#3B69B8]" style={{ width: size, height: size }} aria-hidden>
        {domain.slice(0, 1) || "?"}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- the site's own favicon
    <img src={`https://${domain}/favicon.ico`} alt="" width={size} height={size} loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} className="shrink-0 rounded object-contain" />
  );
}

export function pagePath(url: string) {
  try {
    const u = new URL(url);
    return u.pathname === "/" ? "Home page" : u.pathname.replace(/\/$/, "");
  } catch {
    return url;
  }
}

export function SourceLink({ url }: { url: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-0.5 truncate text-[10.5px] normal-case text-[#2563EB] hover:underline">
      {pagePath(url)} <ArrowUpRight className="size-3 shrink-0" aria-hidden />
    </a>
  );
}

export function SiteLabel({ domain, color, own }: { domain: string; color: string; own?: boolean }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 normal-case">
      <span className="size-2 shrink-0 rounded-[2px]" style={{ background: color }} aria-hidden />
      <SiteFavicon domain={domain} size={14} />
      <span className={own ? "truncate font-semibold text-[#1D4ED8]" : "truncate text-[#28354C]"}>{domain}</span>
      {own ? <span className="shrink-0 rounded bg-[#2563EB] px-1 text-[9.5px] font-semibold uppercase text-white">You</span> : null}
    </span>
  );
}
