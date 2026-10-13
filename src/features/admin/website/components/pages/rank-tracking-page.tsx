"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { TrendingUp, Target, Clock, Globe, Download, Activity, CheckCircle } from "lucide-react";
import { Card, WButton } from "../ui/kit";
import { useUrlState } from "../use-url-state";
import { useWebsiteWorkspace } from "../website-workspace";
import { useRankTracking } from "../../data/hooks";
import { RankTrackingData } from "../../data/types";
import { scoreBand, downloadFile, toCsv } from "../../data/selectors";
import { WEBSITE_MOCK_MODE } from "../../data/config";

const INTENT_OPTIONS = [
  { value: "all", label: "All intents" },
  { value: "informational", label: "Informational" },
  { value: "transactional", label: "Transactional" },
  { value: "navigational", label: "Navigational" },
  { value: "commercial", label: "Commercial" },
];

export function WebsiteRankTrackingPage() {
  const { clientId } = useWebsiteWorkspace();
  const { data: rankData = [], isLoading, error } = useRankTracking(clientId);
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [positionFilter, setPositionFilter] = useState<string>("all");

  const selected = useMemo(() => rankData.find((r) => r.keyword === selectedKeyword) ?? null, [
    rankData,
    selectedKeyword,
  ]);

  const filtered = useMemo(() => {
    let result = rankData;
    if (searchKeyword) {
      result = result.filter((r) => r.keyword.toLowerCase().includes(searchKeyword.toLowerCase()));
    }
    if (positionFilter !== "all") {
      const threshold = parseInt(positionFilter, 10);
      if (!isNaN(threshold)) {
        result = result.filter((r) => r.currentPosition <= threshold);
      }
    }
    return result;
  }, [rankData, searchKeyword, positionFilter]);

  const handleExport = () => {
    downloadFile(
      `rank-tracking-${new Date().toISOString().split("T")[0]}.csv`,
      toCsv(
        [
          "Keyword",
          "Current Position",
          "Previous Position",
          "Change",
          "Search Volume",
          "Difficulty",
          "Intent",
          "URL",
        ],
        filtered.map((r) => [
          r.keyword,
          r.currentPosition,
          r.previousPosition,
          r.positionChange > 0 ? `+${r.positionChange}` : r.positionChange,
          r.searchVolume ?? "",
          r.difficulty,
          r.intent,
          r.url ?? "—",
        ]),
      ),
    );
    toast.success("Rankings exported");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-[#28354C]">Rank Tracking</h1>
          <p className="text-[#6B7A94]">Monitor keyword positions and SERP visibility</p>
        </div>
        <WButton size="sm" icon={Download} onClick={handleExport} disabled={filtered.length === 0}>
          Export
        </WButton>
      </div>

      {!WEBSITE_MOCK_MODE ? (
        <p className="rounded-lg border border-[#E6EBF4] bg-[#FAFBFD] px-3 py-2 text-[11px] leading-relaxed text-[#6B7A94]">
          Current positions come from Google Search Console. Previous position, position change, difficulty
          and search volume are not tracked per keyword yet — they are estimates, and the ranking history
          chart reflects site-wide performance, not this keyword alone.
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <Card title="Keywords tracked" icon={Target} className="md:col-span-1">
          <div className="text-lg font-bold text-[#28354C]">{filtered.length}</div>
          <div className="mt-1 text-sm text-[#6B7A94]">In campaign</div>
        </Card>

        <Card title="Avg position" icon={TrendingUp} className="md:col-span-1">
          <div className="text-lg font-bold text-[#28354C]">
            {filtered.length > 0 ? (filtered.reduce((sum, r) => sum + r.currentPosition, 0) / filtered.length).toFixed(1) : "—"}
          </div>
          <div className="mt-1 text-sm text-[#6B7A94]">Current rankings</div>
        </Card>

        <Card title="Improving" icon={Activity} className="md:col-span-1">
          <div className="text-lg font-bold text-[#28354C]">
            {filtered.filter((r) => r.positionChange > 0).length}
          </div>
          <div className="mt-1 text-sm text-[#6B7A94]">Moving up</div>
        </Card>

        <Card title="Est. search volume" icon={Globe} className="md:col-span-1">
          <div className="text-lg font-bold text-[#28354C]">
            {filtered.length > 0 ? (filtered.reduce((sum, r) => sum + (r.searchVolume ?? 0), 0)).toLocaleString() : "—"}
          </div>
          <div className="mt-1 text-sm text-[#6B7A94]">Est. monthly searches</div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-1">
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Search keyword..."
              className="w-full rounded-lg border border-[#DAE1EC] px-3 py-2 text-sm"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />

            <div className="flex space-x-2">
              <select
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                className="rounded-lg border border-[#DAE1EC] px-3 py-2 text-sm"
              >
                <option value="all">All positions</option>
                <option value="1">Top 1</option>
                <option value="3">Top 3</option>
                <option value="10">Top 10</option>
                <option value="20">Top 20</option>
                <option value="50">Top 50</option>
              </select>
            </div>
          </div>

          <div className="mt-3 space-y-1">
            {filtered.map((r, idx) => (
              <button
                key={r.keyword}
                className={`w-full rounded-lg border p-2 text-left transition-colors ${selectedKeyword === r.keyword ? "border-[#4F46E5] bg-[#EEF2FF]" : "border-[#DAE1EC] hover:bg-[#F9FAFB]"}`}
                onClick={() => setSelectedKeyword(r.keyword)}
              >
                <div className="flex items-center justify-between space-x-2">
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium text-[#28354C]">{r.keyword}</div>
                    <div className="mt-0.5 text-xs text-[#6B7A94]">
                      {r.positionChange > 0 ? `+${r.positionChange}` : r.positionChange}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <div
                      className={`size-2 rounded-full ${
                        r.currentPosition <= 3
                          ? "bg-[#12A06D]"
                          : r.currentPosition <= 10
                          ? "bg-[#4F46E5]"
                          : r.currentPosition <= 20
                          ? "bg-[#E29208]"
                          : "bg-[#FEE2E2]"
                      }`}
                    />
                    <span className="text-[12px]">{r.currentPosition}</span>
                  </div>
                </div>
                <div className="mt-1 flex items-center gap-2 text-sm">
                  <span className="text-[#6B7A94]">Vol {r.searchVolume == null ? "—" : r.searchVolume.toLocaleString()}</span>
                  <span
                    title="Estimated difficulty — no keyword-difficulty API is connected"
                    className={`px-1.5 py-0.5 rounded text-xs ${scoreBand(r.difficulty) === "good" ? "bg-[#DCFCE7] text-[#166534]" : scoreBand(r.difficulty) === "warn" ? "bg-[#FEF3C7] text-[#9A5B08]" : "bg-[#FEE2E2] text-[#B91C1C]"}`}
                  >
                    Est. D{r.difficulty}
                  </span>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="py-8 text-center text-[#6B7A94]">No rankings found</div>
            )}
          </div>
        </div>

        <div className="md:col-span-2">
          {selected ? (
            <Card title={selected.keyword} icon={TrendingUp} subtitle="Ranking details and history">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-sm text-[#6B7A94]">Current position</div>
                  <div className="text-2xl font-bold text-[#28354C]">{selected.currentPosition}</div>
                </div>
                {!WEBSITE_MOCK_MODE ? (
                  <>
                    <div>
                      <div className="text-sm text-[#6B7A94]">Previous position</div>
                      <div className="text-2xl font-bold text-[#28354C]">—</div>
                    </div>
                    <div>
                      <div className="text-sm text-[#6B7A94]">Position change</div>
                      <div className="text-2xl font-bold text-[#28354C]">—</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <div className="text-sm text-[#6B7A94]">Previous position</div>
                      <div className="text-2xl font-bold text-[#28354C]">{selected.previousPosition}</div>
                    </div>
                    <div>
                      <div className="text-sm text-[#6B7A94]">Position change</div>
                      <div className="text-2xl font-bold text-[#28354C]">
                        {selected.positionChange > 0 ? `+${selected.positionChange}` : selected.positionChange}
                      </div>
                    </div>
                  </>
                )}
                <div>
                  <div className="text-sm text-[#6B7A94]">Est. search volume</div>
                  <div className="text-2xl font-bold text-[#28354C]">{selected.searchVolume == null ? "—" : selected.searchVolume.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-[#6B7A94]">Est. difficulty</div>
                  <div className="text-2xl font-bold text-[#28354C]">{selected.difficulty}</div>
                </div>
                <div>
                  <div className="text-sm text-[#6B7A94]">Intent</div>
                  <div className="text-2xl font-bold text-[#28354C]">{selected.intent}</div>
                </div>
                <div>
                  <div className="text-sm text-[#6B7A94]">URL</div>
                  <div className="text-sm break-all text-[#6B7A94]">
                    {selected.url ?? "Not ranking"}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <div className="text-sm font-medium text-[#28354C]">Ranking history</div>
                <div className="h-48 rounded border border-[#F2F5FA]">
                  <div
                    className="flex h-full items-end gap-1 p-2"
                    style={{ position: "relative" }}
                  >
                    {selected.history.map((point, idx) => (
                      <div
                        key={idx}
                        className={`h-1 w-1 rounded-full transition-all duration-300 ${
                          point.position <= 3
                            ? "bg-[#12A06D]"
                            : point.position <= 10
                            ? "bg-[#4F46E5]"
                            : point.position <= 20
                            ? "bg-[#E29208]"
                            : "bg-[#FEE2E2]"
                        }`}
                        style={{
                          bottom: `${((50 - point.position) / 50) * 100}%`,
                          left: `${(idx / (selected.history.length - 1)) * 100}%`,
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-4 text-sm text-[#6B7A94]">
                  <div className="flex items-center gap-1">
                    <div className="size-2 rounded-full bg-[#12A06D]" /> Top 3
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="size-2 rounded-full bg-[#4F46E5]" /> Top 10
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="size-2 rounded-full bg-[#E29208]" /> Top 20
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="size-2 rounded-full bg-[#FEE2E2]" /> Beyond 20
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-sm font-medium text-[#28354C]">SERP features</div>
                <div className="flex flex-wrap gap-2">
                  {selected.serpFeatures.map((feature) => (
                    <span
                      key={feature}
                      className="rounded bg-[#EEF2FF] px-2 py-0.5 text-xs text-[#4F46E5]"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-[#DAE1EC] bg-[#FAFBFD] p-12">
              <div className="text-center">
                <TrendingUp className="mx-auto mb-3 size-12 text-[#94A3B8]" />
                <p className="text-[#28354C]">Track keyword rankings</p>
                <p className="mt-1 text-sm text-[#6B7A94]">Add keywords to monitor their positions</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="rounded-lg border border-[#DAE1EC] bg-[#FAFBFD] p-8 text-center">
          <div className="inline-block size-8 animate-spin rounded-full border-4 border-solid border-[#4F46E5] border-t-transparent" />
          <p className="mt-3 text-[#6B7A94]">Loading ranking data...</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-[#FEE2E2] bg-[#FEF2F2] p-4 text-[#B91C1C]">
          Failed to load ranking data.
        </div>
      )}
    </div>
  );
}