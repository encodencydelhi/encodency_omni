"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Target, Users, Globe, Download, Shield } from "lucide-react";
import { Card, WButton } from "../ui/kit";
import { LockedState } from "../ui/states";
import { useWebsiteWorkspace } from "../website-workspace";
import { useCompetitorAnalysis } from "../../data/hooks";
import { downloadFile, toCsv } from "../../data/selectors";
import { WEBSITE_MOCK_MODE } from "../../data/config";

export function WebsiteCompetitorAnalysisPage() {
  const { clientId, navigate } = useWebsiteWorkspace();
  const { data: competitorData = [], isLoading, error } = useCompetitorAnalysis(clientId);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [searchDomain, setSearchDomain] = useState("");
  const [focusArea, setFocusArea] = useState<string | null>("traffic");

  const selected = useMemo(() => competitorData.find((c) => c.domain === selectedDomain) ?? null, [
    competitorData,
    selectedDomain,
  ]);

  const filtered = useMemo(() => {
    let result = competitorData;
    if (searchDomain) {
      result = result.filter((c) => c.domain.toLowerCase().includes(searchDomain.toLowerCase()));
    }
    return result;
  }, [competitorData, searchDomain]);

  const handleExport = () => {
    downloadFile(
      "competitor-analysis.csv",
      toCsv(
        ["Domain", "Traffic Share", "Keyword Overlap", "Content Gap", "Referring Domains", "Total Backlinks", "Backlink Growth"],
        filtered.map((c) => [
          c.domain,
          `${c.trafficShare}%`,
          `${c.keywordOverlap}%`,
          `${c.contentGap}%`,
          c.backlinkProfile.referringDomains,
          c.backlinkProfile.totalBacklinks,
          `${c.backlinkProfile.growthRate}%`,
        ]),
      ),
    );
    toast.success("Competitor analysis exported");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-[#28354C]">Competitor Analysis</h1>
          <p className="text-[#6B7A94]">Benchmark against key competitors in your market</p>
        </div>
        {!WEBSITE_MOCK_MODE ? null : (
          <WButton size="sm" icon={Download} onClick={handleExport} disabled={filtered.length === 0}>
            Export
          </WButton>
        )}
      </div>

      {!WEBSITE_MOCK_MODE && competitorData.length === 0 ? (
        <LockedState
          title="Competitor data is not connected"
          body={
            <>
              No competitor SEO data source (Ahrefs, Semrush or similar) is connected to this workspace yet.
              Rather than show estimated traffic share or keyword-overlap numbers as if they were real, this
              panel stays empty.
            </>
          }
          ctaLabel="Open integrations"
          onCta={() => navigate("/admin/website/settings?section=integrations")}
        />
      ) : (
        <>
      <div className="grid gap-4 md:grid-cols-4">
        <Card title="Competitors tracked" icon={Users} className="md:col-span-1">
          <div className="text-lg font-bold text-[#28354C]">{filtered.length}</div>
          <div className="mt-1 text-sm text-[#6B7A94]">Competitors in monitoring</div>
        </Card>

        <Card title="Avg traffic share" icon={Globe} className="md:col-span-1">
          <div className="text-lg font-bold text-[#28354C]">
            {filtered.length > 0 ? (filtered.reduce((sum, c) => sum + c.trafficShare, 0) / filtered.length).toFixed(1) : "—"}
          </div>
          <div className="mt-1 text-sm text-[#6B7A94]">Of target market</div>
        </Card>

        <Card title="Avg keyword overlap" icon={Target} className="md:col-span-1">
          <div className="text-lg font-bold text-[#28354C]">
            {filtered.length > 0 ? (filtered.reduce((sum, c) => sum + c.keywordOverlap, 0) / filtered.length).toFixed(1) : "—"}
          </div>
          <div className="mt-1 text-sm text-[#6B7A94]">Shared keywords</div>
        </Card>

        <Card title="Content gap %" icon={Shield} className="md:col-span-1">
          <div className="text-lg font-bold text-[#28354C]">
            {filtered.length > 0 ? (filtered.reduce((sum, c) => sum + c.contentGap, 0) / filtered.length).toFixed(1) : "—"}
          </div>
          <div className="mt-1 text-sm text-[#6B7A94]">Unique opportunities</div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-1">
          <input
            type="text"
            placeholder="Search domain..."
            className="w-full rounded-lg border border-[#DAE1EC] px-3 py-2 text-sm"
            value={searchDomain}
            onChange={(e) => setSearchDomain(e.target.value)}
          />

          <div className="mt-3 space-y-1">
            {filtered.map((c, idx) => (
              <button
                key={c.domain}
                className={`w-full rounded-lg border p-2 text-left transition-colors ${selectedDomain === c.domain ? "border-[#4F46E5] bg-[#EEF2FF]" : "border-[#DAE1EC] hover:bg-[#F9FAFB]"}`}
                onClick={() => setSelectedDomain(c.domain)}
              >
                <div className="flex items-center justify-between">
                  <div className="truncate font-medium text-[#28354C]">{c.domain}</div>
                  <div className="text-sm text-[#6B7A94]">#{idx + 1}</div>
                </div>
                <div className="mt-1 flex items-center gap-2 text-sm">
                  <span className="text-[#6B7A94]">{c.trafficShare}% traffic</span>
                  <span className="text-[#6B7A94]">#{c.keywordOverlap}% overlap</span>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="py-8 text-center text-[#6B7A94]">No competitors found</div>
            )}
          </div>
        </div>

        <div className="md:col-span-2">
          {selected ? (
            <Card title={selected.domain} icon={Target} subtitle="Competitor benchmark details">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-sm text-[#6B7A94]">Traffic share</div>
                  <div className="text-base font-bold text-[#28354C]">{selected.trafficShare}%</div>
                </div>
                <div>
                  <div className="text-sm text-[#6B7A94]">Keyword overlap</div>
                  <div className="text-base font-bold text-[#28354C]">{selected.keywordOverlap}%</div>
                </div>
                <div>
                  <div className="text-sm text-[#6B7A94]">Content gap</div>
                  <div className="text-base font-bold text-[#28354C]">{selected.contentGap}%</div>
                </div>
                <div>
                  <div className="text-sm text-[#6B7A94]">Referring domains</div>
                  <div className="text-base font-bold text-[#28354C]">{selected.backlinkProfile.referringDomains}</div>
                </div>
                <div>
                  <div className="text-sm text-[#6B7A94]">Total backlinks</div>
                  <div className="text-base font-bold text-[#28354C]">{selected.backlinkProfile.totalBacklinks}</div>
                </div>
                <div>
                  <div className="text-sm text-[#6B7A94]">Backlink growth</div>
                  <div className="text-base font-bold text-[#28354C]">{selected.backlinkProfile.growthRate}%</div>
                </div>
              </div>

              <div className="mt-6">
                <div className="text-sm font-medium text-[#28354C]">Focus area</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFocusArea("traffic")}
                    className={`flex-1 rounded border ${
                      focusArea === "traffic"
                        ? "border-[#4F46E5] bg-[#EEF2FF] text-[#28354C]"
                        : "border-[#DAE1EC] text-[#6B7A94]"
                    }`}
                  >
                    Traffic
                  </button>
                  <button
                    onClick={() => setFocusArea("backlinks")}
                    className={`flex-1 rounded border ${
                      focusArea === "backlinks"
                        ? "border-[#4F46E5] bg-[#EEF2FF] text-[#28354C]"
                        : "border-[#DAE1EC] text-[#6B7A94]"
                    }`}
                  >
                    Backlinks
                  </button>
                  <button
                    onClick={() => setFocusArea("keywords")}
                    className={`flex-1 rounded border ${
                      focusArea === "keywords"
                        ? "border-[#4F46E5] bg-[#EEF2FF] text-[#28354C]"
                        : "border-[#DAE1EC] text-[#6B7A94]"
                    }`}
                  >
                    Keywords
                  </button>
                </div>
              </div>

              {focusArea === "traffic" && (
                <div className="mt-4">
                  <div className="text-sm font-medium text-[#28354C]">Traffic distribution</div>
                  <div className="h-4 rounded bg-[#F2F5FA] overflow-hidden mt-2">
                    <div
                      className="h-full bg-gradient-to-r from-[#4F46E5] to-[#12A06D] rounded-full"
                      style={{ width: `${selected.trafficShare}%` }}
                    />
                  </div>
                  <div className="text-xs text-[#6B7A94] mt-1">{selected.trafficShare}% of target market</div>
                </div>
              )}

              {focusArea === "backlinks" && (
                <div className="mt-4">
                  <div className="text-sm font-medium text-[#28354C]">Referring domains</div>
                  <div className="h-4 rounded bg-[#F2F5FA] overflow-hidden mt-2">
                    <div
                      className="h-full bg-gradient-to-r from-[#4F46E5] to-[#12A06D] rounded-full"
                      style={{ width: `${selected.backlinkProfile.referringDomains / Math.max(1, selected.backlinkProfile.totalBacklinks) * 100}%` }}
                    />
                  </div>
                  <div className="text-xs text-[#6B7A94] mt-1">{selected.backlinkProfile.referringDomains} unique domains</div>
                </div>
              )}

              {focusArea === "keywords" && (
                <div className="mt-4">
                  <div className="text-sm font-medium text-[#28354C]">Keyword overlap</div>
                  <div className="h-4 rounded bg-[#F2F5FA] overflow-hidden mt-2">
                    <div
                      className="h-full bg-gradient-to-r from-[#4F46E5] to-[#12A06D] rounded-full"
                      style={{ width: `${selected.keywordOverlap}%` }}
                    />
                  </div>
                  <div className="text-xs text-[#6B7A94] mt-1">{selected.keywordOverlap}% shared keywords</div>
                </div>
              )}
            </Card>
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-[#DAE1EC] bg-[#FAFBFD] p-12">
              <div className="text-center">
                <Target className="mx-auto mb-3 size-12 text-[#94A3B8]" />
                <p className="text-[#28354C]">Add competitor domains</p>
                <p className="mt-1 text-sm text-[#6B7A94]">Enter domains to benchmark against your market</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="rounded-lg border border-[#DAE1EC] bg-[#FAFBFD] p-8 text-center">
          <div className="inline-block size-8 animate-spin rounded-full border-4 border-solid border-[#4F46E5] border-t-transparent" />
          <p className="mt-3 text-[#6B7A94]">Loading competitor data...</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-[#FEE2E2] bg-[#FEF2F2] p-4 text-[#B91C1C]">
          Failed to load competitor data.
        </div>
      )}
        </>
      )}
    </div>
  );
}