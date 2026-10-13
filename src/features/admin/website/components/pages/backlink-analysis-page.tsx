"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Link, Globe, Shield, Activity, Download, CheckCircle } from "lucide-react";
import { Card } from "@/features/admin/website/components/ui/kit";
import { WButton } from "@/features/admin/website/components/ui/wbutton";
import { useUrlState } from "../use-url-state";
import { useBacklinkAnalysis } from "../data/hooks";
import { BacklinkData } from "../data/types";

export function WebsiteBacklinkAnalysisPage() {
  const { data: backlinkData = [], isLoading, error } = useBacklinkAnalysis();
  const [selectedLink, setSelectedLink] = useState<string | null>(null);
  const [searchDomain, setSearchDomain] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const selected = useMemo(() => backlinkData.find((b) => b.url === selectedLink) ?? null, [
    backlinkData,
    selectedLink,
  ]);

  const filtered = useMemo(() => {
    let result = backlinkData;
    if (searchDomain) {
      result = result.filter((b) => b.referringDomain.toLowerCase().includes(searchDomain.toLowerCase()));
    }
    if (filterType !== "all") {
      result = result.filter((b) => b.linkType === filterType);
    }
    return result;
  }, [backlinkData, searchDomain, filterType]);

  const handleExport = () => {
    const csv = [
      ["Referring Domain", "Anchor Text", "Link Type", "URL", "First Seen", "Last Seen", "Domain Authority"],
      ...filtered.map((b) => [
        b.referringDomain,
        b.anchorText,
        b.linkType,
        b.url,
        b.firstSeen.split("T")[0],
        b.lastSeen?.split("T")[0] ?? "—",
        b.domainAuthority !== null ? b.domainAuthority : "—",
      ])
        .map((row) => row.map((cell) => String(cell)).join(","))
        .join("\n"),
    ];
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backlink-analysis-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backlinks exported");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#28354C]">Backlink Analysis</h1>
          <p className="text-[#6B7A94]">Monitor link profile health and authority signals</p>
        </div>
        <WButton size="sm" icon={Download} onClick={handleExport} disabled={filtered.length === 0}>
          Export
        </WButton>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card title="Total backlinks" icon={Link} className="md:col-span-1">
          <div className="text-3xl font-bold text-[#28354C]">{filtered.length}</div>
          <div className="mt-1 text-sm text-[#6B7A94]">Active links</div>
        </Card>

        <Card title="Unique domains" icon={Globe} className="md:col-span-1">
          <div className="text-3xl font-bold text-[#28354C]">
            {filtered.length > 0 ? new Set(filtered.map((b) => b.referringDomain)).size : "—"}
          </div>
          <div className="mt-1 text-sm text-[#6B7A94]">Referrers</div>
        </Card>

        <Card title="Avg authority" icon={Shield} className="md:col-span-1">
          <div className="text-3xl font-bold text-[#28354C]">
            {
              filtered.length > 0
                ? (
                    filtered
                      .filter((b) => b.domainAuthority !== null)
                      .reduce((sum, b) => sum + b.domainAuthority, 0) /
                    filtered.filter((b) => b.domainAuthority !== null).length
                  ).toFixed(1)
                : "—"
            }
          </div>
          <div className="mt-1 text-sm text-[#6B7A94]">Domain score</div>
        </Card>

        <Card title="DoFollow ratio" icon={Activity} className="md:col-span-1">
          <div className="text-3xl font-bold text-[#28354C]">
            {
              filtered.length > 0
                ? (
                    ((filtered.filter((b) => b.linkType === "external").length / filtered.length) * 100)
                  ).toFixed(1)
                : "—"
            }
          </div>
          <div className="mt-1 text-sm text-[#6B7A94]">Followed links</div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-1">
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Search referring domain..."
              className="w-full rounded-lg border border-[#DAE1EC] px-3 py-2 text-sm"
              value={searchDomain}
              onChange={(e) => setSearchDomain(e.target.value)}
            />

            <div className="flex space-x-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="rounded-lg border border-[#DAE1EC] px-3 py-2 text-sm"
              >
                <option value="all">All link types</option>
                <option value="internal">Internal</option>
                <option value="external">External</option>
                <option value="no-follow">No-follow</option>
                <option value="sponsored">Sponsored</option>
                <option value="ugc">UGC</option>
              </select>
            </div>
          </div>

          <div className="mt-3 space-y-1">
            {filtered.map((b, idx) => (
              <button
                key={b.url}
                className={`w-full rounded-lg border p-2 text-left transition-colors ${selectedLink === b.url ? "border-[#4F46E5] bg-[#EEF2FF]" : "border-[#DAE1EC] hover:bg-[#F9FAFB]"}`}
                onClick={() => setSelectedLink(b.url)}
              >
                <div className="flex items-center justify-between space-x-2">
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium text-[#28354C]">{b.referringDomain}</div>
                    <div className="mt-0.5 text-xs text-[#6B7A94]">{b.anchorText}</div>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <div
                      className={`size-2 rounded-full ${
                        b.linkType === "internal"
                          ? "bg-[#12A06D]"
                          : b.linkType === "external"
                          ? "bg-[#4F46E5]"
                          : b.linkType === "no-follow"
                          ? "bg-[#DC3A32]"
                          : b.linkType === "sponsored"
                          ? "bg-[#E29208]"
                          : "bg-[#9A5B08]"
                      }`}
                    />
                    <span>{b.linkType}</span>
                  </div>
                </div>
                <div className="mt-1 flex items-center gap-2 text-sm">
                  <span className="text-[#6B7A94]">DA {b.domainAuthority ?? "—"}</span>
                  <span className="text-[#6B7A94]">{new Date(b.firstSeen).toLocaleDateString()}</span>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="py-8 text-center text-[#6B7A94]">No backlinks found</div>
            )}
          </div>
        </div>

        <div className="md:col-span-2">
          {selected ? (
            <Card title={selected.referringDomain} icon={Link} subtitle="Backlink details">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-sm text-[#6B7A94]">Anchor text</div>
                  <div className="text-base font-medium text-[#28354C]">{selected.anchorText}</div>
                </div>
                <div>
                  <div className="text-sm text-[#6B7A94]">Link type</div>
                  <div className="flex items-center gap-1">
                    <div
                      className={`size-2 rounded-full ${
                        selected.linkType === "internal"
                          ? "bg-[#12A06D]"
                          : selected.linkType === "external"
                          ? "bg-[#4F46E5]"
                          : selected.linkType === "no-follow"
                          ? "bg-[#DC3A32]"
                          : selected.linkType === "sponsored"
                          ? "bg-[#E29208]"
                          : selected.linkType === "ugc"
                          ? "bg-[#9A5B08]"
                          : "bg-[#6B7A94]"
                      }`}
                    />
                    <span className="text-[12px]">{selected.linkType}</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-[#6B7A94]">URL</div>
                  <div className="text-xs break-all text-[#6B7A94]">{selected.url}</div>
                </div>
                <div>
                  <div className="text-sm text-[#6B7A94]">First seen</div>
                  <div className="text-base font-medium text-[#28354C]">{selected.firstSeen.split("T")[0]}</div>
                </div>
                <div>
                  <div className="text-sm text-[#6B7A94]">Last seen</div>
                  <div className="text-base font-medium text-[#28354C]">
                    {selected.lastSeen ? selected.lastSeen.split("T")[0] : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-[#6B7A94]">Domain authority</div>
                  <div className="text-base font-medium text-[#28354C]">
                    {selected.domainAuthority !== null ? selected.domainAuthority : "Not available"}
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-[#DAE1EC] bg-[#FAFBFD] p-12">
              <div className="text-center">
                <Link className="mx-auto mb-3 size-12 text-[#94A3B8]" />
                <p className="text-[#28354C]">Analyze link details</p>
                <p className="mt-1 text-sm text-[#6B7A94]">Select a backlink to view its properties</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="rounded-lg border border-[#DAE1EC] bg-[#FAFBFD] p-8 text-center">
          <div className="inline-block size-8 animate-spin rounded-full border-4 border-solid border-[#4F46E5] border-t-transparent" />
          <p className="mt-3 text-[#6B7A94]">Loading backlink data...</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-[#FEE2E2] bg-[#FEF2F2] p-4 text-[#B91C1C]">
          Failed to load backlink data.
        </div>
      )}
    </div>
  );
}