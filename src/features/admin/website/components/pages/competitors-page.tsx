"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Archive, BarChart3, Globe2, Plus, RefreshCw, ShieldAlert } from "lucide-react";
import { useCompetitorAnalysis, useCompetitorMutations } from "../../data/hooks";
import { formatDateTime, formatNumber, formatRelative } from "../../data/selectors";
import type { CompetitorData } from "../../data/types";
import { Card, Chip, DataTable, WButton, type Column } from "../ui/kit";
import { EmptyState, QueryErrorState, SkeletonBlock } from "../ui/states";
import { useWebsiteWorkspace } from "../website-workspace";
import { BusinessLookup } from "../business-lookup";
import { CompetitorAiPanel } from "../competitor-ai-panel";
import { SheetsExportButton } from "../google-sheets-export";

function domainInput(value: string) {
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return url.hostname.includes(".") ? url.origin : null;
  } catch {
    return null;
  }
}

export function WebsiteCompetitorsPage() {
  const { clientId } = useWebsiteWorkspace();
  const query = useCompetitorAnalysis(clientId);
  const mutations = useCompetitorMutations(clientId);
  const [url, setUrl] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const normalized = domainInput(url);

  const rows = query.data ?? [];
  // Look the selected row up on every render so it shows fresh data after Analyze or an AI run.
  const selected = rows.find((row) => (row.id ?? row.domain) === selectedKey) ?? null;
  const columns = useMemo<Column<CompetitorData>[]>(() => [
    { key: "domain", header: "Competitor", cell: (row) => <button className="font-semibold text-[#111C3A] hover:text-[#2563EB]" onClick={() => setSelectedKey(row.id ?? row.domain)}>{row.domain}</button> },
    { key: "status", header: "Status", cell: (row) => <Chip tone={row.status === "measured" ? "good" : row.status === "failed" ? "bad" : "muted"} dot>{row.status ?? "not analyzed"}</Chip> },
    { key: "contentGap", header: "Content Gap", align: "right", cell: (row) => row.contentGap == null ? "Unavailable" : `${formatNumber(row.contentGap)} words` },
    { key: "trafficShare", header: "Traffic", align: "right", cell: () => "Unavailable" },
    { key: "analyzedAt", header: "Freshness", cell: (row) => row.analyzedAt ? formatRelative(row.analyzedAt) : "Never" },
    { key: "actions", header: "", align: "right", cell: (row) => (
      <div className="flex justify-end gap-1.5">
        <WButton size="sm" icon={RefreshCw} disabled={!row.id || mutations.analyze.isPending} onClick={() => row.id && mutations.analyze.mutate(row.id, { onSuccess: () => toast.success("Competitor analysis refreshed"), onError: () => toast.error("Analysis failed") })}>Analyze</WButton>
        <WButton size="sm" tone="danger" icon={Archive} disabled={!row.id || mutations.archive.isPending} onClick={() => row.id && mutations.archive.mutate(row.id, { onSuccess: () => toast.success("Competitor archived") })}>Archive</WButton>
      </div>
    ) },
  ], [mutations.analyze, mutations.archive]);

  if (query.isLoading) return <SkeletonBlock lines={8} />;
  if (query.isError) return <QueryErrorState error={query.error} onRetry={() => { void query.refetch(); }} />;

  return (
    <div className="space-y-3">
      <BusinessLookup clientId={clientId} />
      <Card title="Competitor Intelligence" subtitle="Measured from public homepage fetches. Traffic, backlinks and rankings stay unavailable until real providers are connected." icon={BarChart3}
        action={<div className="flex items-center gap-2"><SheetsExportButton clientId={clientId} dataset="competitors" /><input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://competitor.com" className="h-8 w-56 rounded-md border border-[#DAE1EC] px-2.5 text-[12px] outline-none focus:border-[#2563EB]" /><WButton tone="primary" icon={Plus} disabled={!normalized || mutations.add.isPending} disabledReason="Enter a valid public domain" onClick={() => normalized && mutations.add.mutate(normalized, { onSuccess: (row) => { setUrl(""); setSelectedKey(row.id ?? row.domain); toast.success("Competitor added and analyzed"); }, onError: () => toast.error("Could not add competitor") })}>Add</WButton></div>}>
        <DataTable
          columns={columns}
          rows={rows}
          getRowId={(row) => row.id ?? row.domain}
          caption="Competitor analysis"
          empty={<EmptyState icon={Globe2} title="No competitors yet" body="Add a public competitor domain to store measured SEO evidence and compare it with this client website." />}
        />
      </Card>

      {selected ? (
        <Card title={selected.domain} subtitle={selected.analyzedAt ? `Last analyzed ${formatDateTime(selected.analyzedAt)}` : "Not analyzed yet"} icon={Globe2}
          action={<WButton size="sm" onClick={() => setSelectedKey(null)}>Close</WButton>}>
          <div className="grid gap-3 md:grid-cols-3">
            <Evidence label="HTTP status" value={String((selected.technical?.httpStatus as number | undefined) ?? "Unavailable")} />
            <Evidence label="Words" value={String((selected.technical?.wordCount as number | undefined) ?? "Unavailable")} />
            <Evidence label="Missing alt text" value={String((selected.technical?.missingAlt as number | undefined) ?? "Unavailable")} />
          </div>
          <div className="mt-3 rounded-md border border-[#E6EBF4] bg-[#F8FAFD] p-3 text-[12px] leading-relaxed text-[#4B5872]">
            <div className="mb-1 flex items-center gap-2 font-semibold text-[#111C3A]"><ShieldAlert className="size-4 text-[#2563EB]" /> Data honesty</div>
            {selected.note ?? "Only measured public-page evidence is displayed. Missing third-party metrics are not estimated."}
          </div>
          <CompetitorAiPanel clientId={clientId} competitorId={selected.id} domain={selected.domain} ai={selected.ai} />
          {selected.suggestions?.length ? <ul className="mt-3 space-y-2">{selected.suggestions.map((item) => <li key={item.title} className="rounded-md border border-[#E6EBF4] p-3 text-[12px]"><strong>{item.title}</strong><br /><span className="text-[#6B7A94]">{item.evidence}</span></li>)}</ul> : null}
        </Card>
      ) : null}
    </div>
  );
}

function Evidence({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-[#E6EBF4] p-3"><p className="text-[10px] font-semibold uppercase text-[#6B7A94]">{label}</p><p className="mt-1 text-[18px] font-semibold text-[#111C3A]">{value}</p></div>;
}
