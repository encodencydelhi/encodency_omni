"use client";

import Link from "next/link";
import { ADS_ROOT, AdsWorkspace } from "./workspace";
import { btn, btnPrimary } from "./ui";

/**
 * Shown in live mode where the demo flow would pretend to create or publish
 * something on Meta. The Ads workspace only reads from the Marketing API.
 */
export function ReadOnlyNotice({ what }: { what: string }) {
  return (
    <AdsWorkspace actions={<span />} showDateRange={false}>
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-2xs">
        <h1 className="text-base font-semibold text-slate-900">{what} is not available yet</h1>
        <p className="mt-1.5 text-xs font-medium text-slate-600">
          This workspace reads your real campaigns, ad sets, ads, audiences, forms and leads from Meta. Creating or changing them is not
          connected, so nothing here would reach Meta. Use Meta Ads Manager to make changes; they appear here after a refresh.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Link href={`${ADS_ROOT}/campaigns`} className={btnPrimary}>
            View campaigns
          </Link>
          <a href="https://adsmanager.facebook.com" target="_blank" rel="noopener noreferrer" className={btn}>
            Open Meta Ads Manager
          </a>
        </div>
      </div>
    </AdsWorkspace>
  );
}
