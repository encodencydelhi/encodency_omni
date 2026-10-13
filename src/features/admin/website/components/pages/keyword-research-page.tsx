"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Search, TrendingUp, Target, Globe, FileText, Download } from "lucide-react";
import { Card, WButton } from "../ui/kit";
import { useWebsiteWorkspace } from "../website-workspace";
import { useKeywordResearch } from "../../data/hooks";
import { scoreBand, downloadFile, toCsv } from "../../data/selectors";
import { WEBSITE_MOCK_MODE } from "../../data/config";

export function WebsiteKeywordResearchPage() {
  const { clientId } = useWebsiteWorkspace();
  const { data: keywordData = [], isLoading, error } = useKeywordResearch(clientId);
  const [selectedQuery, setSelectedQuery] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const previousSearchQuery = useRef<string>(searchQuery);

  // Reset page when search query changes
  useEffect(() => {
    if (previousSearchQuery.current !== searchQuery) {
      setCurrentPage(1);
    }
    previousSearchQuery.current = searchQuery;
  }, [searchQuery]);

  const selected = useMemo(() => keywordData.find((k) => k.query === selectedQuery) ?? null, [keywordData, selectedQuery]);

  const filtered = useMemo(() => {
    let result = keywordData;
    if (searchQuery) {
      result = result.filter((k) => k.query.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return result;
  }, [keywordData, searchQuery]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const hasRank = (intent: string) => filtered.some((k) => k.intent === intent && k.position > 0);

  const handleExport = () => {
    downloadFile(
      "keyword-research.csv",
      toCsv(
        ["Query", "Position", "Impressions", "Clicks", "CTR", "Difficulty", "Intent"],
        filtered.map((k) => [k.query, k.position, k.impressions, k.clicks, `${k.ctr}%`, k.difficulty, k.intent]),
      ),
    );
    toast.success("Keywords exported");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-[#28354C]">Keyword Research</h1>
          <p className="text-[#6B7A94]">Track search performance, volume, and competitive gaps</p>
        </div>
        <WButton size="sm" icon={Download} onClick={handleExport} disabled={filtered.length === 0}>
          Export
        </WButton>
      </div>

      {!WEBSITE_MOCK_MODE ? (
        <p className="rounded-lg border border-[#E6EBF4] bg-[#FAFBFD] px-3 py-2 text-[11px] leading-relaxed text-[#6B7A94]">
          Positions, impressions, clicks and CTR come from Google Search Console. Difficulty and search
          volume are rough estimates derived from that data — not from a keyword research API.
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <Card title="Total keywords" icon={Search} className="md:col-span-1">
          <div className="text-lg font-bold text-[#28354C]">{filtered.length}</div>
          <div className="mt-1 text-sm text-[#6B7A94]">Tracked queries</div>
        </Card>

        <Card title="Avg position" icon={TrendingUp} className="md:col-span-1">
          <div className="text-lg font-bold text-[#28354C]">
            {filtered.length > 0 ? (filtered.reduce((sum, k) => sum + k.position, 0) / filtered.length).toFixed(1) : "—"}
          </div>
          <div className="mt-1 text-sm text-[#6B7A94]">Current rankings</div>
        </Card>

        <Card title="Est. search volume" icon={Globe} className="md:col-span-1">
          <div className="text-lg font-bold text-[#28354C]">
            {filtered.length > 0 ? (filtered.reduce((sum, k) => sum + (k.searchVolume || 0), 0)).toLocaleString() : "—"}
          </div>
          <div className="mt-1 text-sm text-[#6B7A94]">Est. monthly searches</div>
        </Card>

        <Card title="Intent distribution" icon={Target} className="md:col-span-1">
          <div className="text-lg font-bold text-[#28354C]">
            {
              Object.entries(
                filtered.reduce<Record<string, number>>(
                  (acc, k) => ({ ...acc, [k.intent]: (acc[k.intent] || 0) + 1 }),
                  {},
                ),
              )
                .sort((a, b) => b[1] - a[1])[0]?.[1] ?? 0
            }
          </div>
          <div className="mt-1 text-sm text-[#6B7A94]">Top intent</div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-1">
          <input
            type="text"
            placeholder="Search keywords..."
            className="w-full rounded-lg border border-[#DAE1EC] px-3 py-2 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <div className="mt-3 space-y-1">
            {paginatedItems.map((k, idx) => (
               <button
                 key={k.query}
                 className={`w-full rounded-lg border p-2 text-left transition-colors ${selectedQuery === k.query ? "border-[#4F46E5] bg-[#EEF2FF]" : "border-[#DAE1EC] hover:bg-[#F9FAFB]"}`}
                 onClick={() => setSelectedQuery(k.query)}
               >
                 <div className="flex items-center justify-between">
                   <div className="truncate font-medium text-[#28354C]">{k.query}</div>
                   <div className="text-sm text-[#6B7A94]">#{((currentPage - 1) * itemsPerPage) + idx + 1}</div>
                 </div>
                 <div className="mt-1 flex items-center gap-2 text-sm">
                   <span className="text-[#6B7A94]">Pos {k.position}</span>
                   <span
                     title="Estimated difficulty — no keyword-difficulty API is connected"
                     className={`px-1.5 py-0.5 rounded text-xs ${scoreBand(k.difficulty) === "good" ? "bg-[#DCFCE7] text-[#166534]" : scoreBand(k.difficulty) === "warn" ? "bg-[#FEF3C7] text-[#9A5B08]" : "bg-[#FEE2E2] text-[#B91C1C]"}`}
                   >
                     Est. D{k.difficulty}
                   </span>
                 </div>
               </button>
             ))}
             {filtered.length === 0 && (
               <div className="py-8 text-center text-[#6B7A94]">No keywords found</div>
             )}
           </div>

           {/* Pagination Controls */}
           {filtered.length > 0 && (
             <div className="flex items-center justify-between px-2 py-3 border-t border-[#DAE1EC] bg-[#FAFBFD] rounded-b-lg">
               <div className="text-sm text-[#6B7A94]">
                 Showing {paginatedItems.length} of {filtered.length} keywords
               </div>
               <div className="flex items-center gap-2">
                 <select
                   value={itemsPerPage}
                   onChange={(e) => {
                     setItemsPerPage(Number(e.target.value));
                     setCurrentPage(1);
                   }}
                   className="text-sm border border-[#DAE1EC] rounded px-2 py-1 bg-white"
                 >
                   <option value={5}>5 per page</option>
                   <option value={10}>10 per page</option>
                   <option value={20}>20 per page</option>
                   <option value={50}>50 per page</option>
                 </select>
                 <div className="flex gap-1">
                   <button
                     onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                     disabled={currentPage === 1}
                     className="px-3 py-1 text-sm border border-[#DAE1EC] rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#F9FAFB]"
                   >
                     Previous
                   </button>
                   {Array.from({ length: totalPages }, (_, i) => i + 1)
                     .filter(page => 
                       page === 1 || 
                       page === totalPages || 
                       Math.abs(page - currentPage) <= 1
                     )
                     .map((page, idx, filteredPages) => {
                       const showEllipsisBefore = idx > 0 && filteredPages[idx - 1] !== page - 1;
                       const showEllipsisAfter = idx < filteredPages.length - 1 && filteredPages[idx + 1] !== page + 1;
                       
                       return (
                         <div key={page} className="flex items-center">
                           {showEllipsisBefore && <span className="px-2 text-[#6B7A94]">...</span>}
                           <button
                             onClick={() => setCurrentPage(page)}
                             className={`px-3 py-1 text-sm border rounded ${currentPage === page ? "bg-[#4F46E5] text-white border-[#4F46E5]" : "bg-white text-[#28354C] border-[#DAE1EC] hover:bg-[#F9FAFB]"}`}
                           >
                             {page}
                           </button>
                           {showEllipsisAfter && <span className="px-2 text-[#6B7A94]">...</span>}
                         </div>
                       );
                     })}
                   <button
                     onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                     disabled={currentPage === totalPages}
                     className="px-3 py-1 text-sm border border-[#DAE1EC] rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#F9FAFB]"
                   >
                     Next
                   </button>
                 </div>
               </div>
             </div>
           )}
        </div>

        <div className="md:col-span-2">
          {selected ? (
            <Card title={selected.query} icon={FileText} subtitle="Keyword details and performance">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <div className="text-sm text-[#6B7A94]">Position</div>
                  <div className="text-base font-bold text-[#28354C]">{selected.position}</div>
                </div>
                <div>
                  <div className="text-sm text-[#6B7A94]">Impressions</div>
                  <div className="text-base font-bold text-[#28354C]">{selected.impressions.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-[#6B7A94]">Clicks</div>
                  <div className="text-base font-bold text-[#28354C]">{selected.clicks.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-[#6B7A94]">CTR</div>
                  <div className="text-base font-bold text-[#28354C]">{selected.ctr}%</div>
                </div>
                <div>
                  <div className="text-sm text-[#6B7A94]">Est. volume</div>
                  <div className="text-base font-bold text-[#28354C]">
                    {(selected.searchVolume || 0).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-[#6B7A94]">Intent</div>
                  <div className="text-base font-bold text-[#28354C]">{selected.intent}</div>
                </div>
              </div>

              <div className="mt-6">
                <div className="mb-2 text-sm font-medium text-[#28354C]">Intent breakdown</div>
                <div className="flex items-center gap-4">
                  {hasRank("informational") && (
                    <div className="flex items-center gap-1">
                      <div className="size-2 rounded-full bg-[#12A06D]" /> Informational
                    </div>
                  )}
                  {hasRank("transactional") && (
                    <div className="flex items-center gap-1">
                      <div className="size-2 rounded-full bg-[#E29208]" /> Transactional
                    </div>
                  )}
                  {hasRank("commercial") && (
                    <div className="flex items-center gap-1">
                      <div className="size-2 rounded-full bg-[#4F46E5]" /> Commercial
                    </div>
                  )}
                  {hasRank("navigational") && (
                    <div className="flex items-center gap-1">
                      <div className="size-2 rounded-full bg-[#DC3A32]" /> Navigational
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-[#DAE1EC] bg-[#FAFBFD] p-12">
              <div className="text-center">
                <Search className="mx-auto mb-3 size-12 text-[#94A3B8]" />
                <p className="text-[#28354C]">Select a keyword to view details</p>
                <p className="mt-1 text-sm text-[#6B7A94]">Choose from the list to analyze performance</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="rounded-lg border border-[#DAE1EC] bg-[#FAFBFD] p-8 text-center">
          <div className="inline-block size-8 animate-spin rounded-full border-4 border-solid border-[#4F46E5] border-t-transparent" />
          <p className="mt-3 text-[#6B7A94]">Loading keyword data...</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-[#FEE2E2] bg-[#FEF2F2] p-4 text-[#B91C1C]">
          Failed to load keyword data.
        </div>
      )}
    </div>
  );
}