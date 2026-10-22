"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy, ExternalLink, FileSpreadsheet, Unlink } from "lucide-react";
import { ApiError } from "@/types/api";
import { useSheets } from "../data/hooks";
import { formatDateTime } from "../data/selectors";
import type { SearchPeriod, SheetsDataset } from "../data/types";
import { Card, Chip, WButton } from "./ui/kit";
import { SkeletonBlock } from "./ui/states";
import { useWebsiteWorkspace } from "./website-workspace";

const SETTINGS_HREF = "/admin/website/settings?section=integrations";
const errorText = (err: unknown, fallback: string) => (ApiError.isApiError(err) ? err.message : fallback);

function CopyEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(email).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-[#DAE1EC] bg-[#F8FAFD] px-2 py-1 font-mono text-[11px] normal-case text-[#28354C] hover:border-[#2563EB]"
      title="Copy email"
    >
      <span className="truncate">{email}</span>
      {copied ? <Check className="size-3 shrink-0 text-[#12A06D]" /> : <Copy className="size-3 shrink-0" />}
    </button>
  );
}

/** Settings → Integrations: connect the customer's own Google Sheet for exports. */
export function GoogleSheetsCard({ clientId }: { clientId: string }) {
  const { status, connect, disconnect } = useSheets(clientId);
  const [link, setLink] = useState("");
  const data = status.data;

  return (
    <Card
      title="Google Sheets export"
      icon={FileSpreadsheet}
      action={<Chip tone={data?.connected ? "good" : "muted"} dot>{data?.connected ? "Connected" : "Not connected"}</Chip>}
    >
      {status.isLoading ? (
        <SkeletonBlock lines={4} />
      ) : data?.connected ? (
        <div className="space-y-2.5 text-[12px] normal-case">
          <a href={data.url ?? "#"} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 font-semibold text-[#2563EB] hover:underline">
            <FileSpreadsheet className="size-4" aria-hidden /> {data.title ?? "Spreadsheet"} <ExternalLink className="size-3" aria-hidden />
          </a>
          {data.lastExport ? (
            <div className="rounded-md bg-[#F8FAFD] p-2.5 text-[11px] text-[#4B5872]">
              <p className="font-semibold text-[#111C3A]">Last export {formatDateTime(data.lastExport.at)}</p>
              <p className="mt-1 flex flex-wrap gap-x-2 gap-y-1">
                {data.lastExport.tabs.map((tab) => (
                  <a key={tab.title} href={tab.url} target="_blank" rel="noopener noreferrer" className="text-[#2563EB] hover:underline">
                    {tab.title} ({tab.rows})
                  </a>
                ))}
              </p>
            </div>
          ) : (
            <p className="text-[11px] text-[#6B7A94]">No export yet. Use “Export to Sheets” on SEO → Search performance, Keyword Research, Rank Tracking or Competitors.</p>
          )}
          <p className="text-[11px] leading-relaxed text-[#6B7A94]">Each export replaces the tabs it writes (for example “Search queries”), so charts built on them stay up to date. Your other tabs are not touched.</p>
          <WButton
            tone="danger"
            icon={Unlink}
            disabled={disconnect.isPending}
            onClick={() => disconnect.mutate(undefined, { onSuccess: () => toast.success("Google Sheet disconnected"), onError: (e) => toast.error(errorText(e, "Could not disconnect")) })}
          >
            Disconnect
          </WButton>
        </div>
      ) : (
        <div className="space-y-2.5 text-[12px] normal-case text-[#4B5872]">
          <ol className="list-decimal space-y-1.5 pl-4">
            <li>Create a Google Sheet (or open an existing one) in your Google account.</li>
            <li>
              Click <strong>Share</strong> and add this email as <strong>Editor</strong>:
              <div className="mt-1">{data?.serviceAccountEmail ? <CopyEmail email={data.serviceAccountEmail} /> : <span className="text-[#C0261F]">The Google service account is not configured on the server.</span>}</div>
            </li>
            <li>Paste the sheet link below.</li>
          </ol>
          <div className="flex gap-2">
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/…"
              className="h-8 min-w-0 flex-1 rounded-md border border-[#DAE1EC] px-2.5 text-[12px] outline-none focus:border-[#2563EB]"
            />
            <WButton
              tone="primary"
              disabled={!link.trim() || connect.isPending || !data?.serviceAccountEmail}
              onClick={() =>
                connect.mutate(link.trim(), {
                  onSuccess: (res) => {
                    setLink("");
                    toast.success(`Connected “${res.title ?? "spreadsheet"}”`);
                  },
                  onError: (e) => toast.error(errorText(e, "Could not open that sheet"), { duration: 10_000 }),
                })
              }
            >
              {connect.isPending ? "Checking…" : "Connect"}
            </WButton>
          </div>
          <p className="text-[11px] text-[#6B7A94]">Free: no Google approval or extra login needed. Only this sheet is shared; we cannot see your other files.</p>
        </div>
      )}
    </Card>
  );
}

/** Writes the given data to the connected sheet; without one, it points to the Settings card. */
export function SheetsExportButton({ clientId, dataset, period = "28d" }: { clientId: string; dataset: SheetsDataset; period?: SearchPeriod }) {
  const { status, exportTo } = useSheets(clientId);
  const { navigate } = useWebsiteWorkspace();
  const run = () => {
    if (!status.data?.connected) {
      toast.info("Connect a Google Sheet first", { description: "Website → Settings → Integrations → Google Sheets export", action: { label: "Open settings", onClick: () => navigate(SETTINGS_HREF) } });
      return;
    }
    exportTo.mutate(
      { dataset, period },
      {
        onSuccess: (res) => {
          const first = res.lastExport?.tabs.find((t) => t.title !== "About this export") ?? res.lastExport?.tabs[0];
          toast.success(`Exported ${res.lastExport?.tabs.length ?? 0} tabs to “${res.title ?? "Google Sheets"}”`, {
            action: first ? { label: "Open sheet", onClick: () => window.open(first.url, "_blank", "noopener,noreferrer") } : undefined,
          });
        },
        onError: (e) => toast.error(errorText(e, "Export to Google Sheets failed"), { duration: 10_000 }),
      },
    );
  };
  return (
    <WButton size="sm" icon={FileSpreadsheet} onClick={run} disabled={exportTo.isPending || status.isLoading}>
      {exportTo.isPending ? "Exporting…" : "Export to Sheets"}
    </WButton>
  );
}
