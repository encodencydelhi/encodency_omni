"use client";

import { useEffect, useMemo, useState } from "react";
import { usePublicAnnouncement } from "../live/public-identity";
import { bannerFor } from "../data/selectors";
import { BannerView } from "./maintenance-banner-host";

/**
 * The maintenance announcement for companies (Admin shell) or public visitors (sign-in page). It reads the public
 * announcement endpoint, which only ever carries an announcement that is switched on and meant for them.
 */
export function PublicAnnouncementBanner({ audience, className }: { audience: "all_companies" | "public_visitors"; className?: string }) {
  const { data } = usePublicAnnouncement();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const banner = useMemo(() => (data ? bannerFor(data, now, audience) : null), [data, now, audience]);
  return banner ? <BannerView banner={banner} className={className} /> : null;
}
