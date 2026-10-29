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
      <div className="mx-auto max-w-xl rounded-sm border border-slate-200 bg-white p-8 text-center shadow-2xs">
        <h1 className="text-base font-semibold text-slate-900">{what} is not available yet</h1>
        <p className="mt-1.5 text-xs font-medium text-slate-600">
          This Particular Workflow Is Managed In Meta Ads Manager. Supported Campaign, Ad Set And Ad Edits Are Available In Their
          Respective Lists. For This Operation, Open Meta Below And Refresh The Workspace After Saving.
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
