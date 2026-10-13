"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Link, Download } from "lucide-react";
import { Card, Chip, WButton } from "../ui/kit";
import { LockedState } from "../ui/states";
import { useWebsiteWorkspace } from "../website-workspace";
import { useSearchConsole } from "../../data/hooks";
import { downloadFile, toCsv } from "../../data/selectors";

export function WebsiteBacklinkAnalysisPage() {
  const { clientId, navigate } = useWebsiteWorkspace();
  const { data: gscPages = [], queries, trend, totals, isLoading, error } = useSearchConsole(clientId);
  const [selectedPage, setSelectedPage] = useState<null | { page: string; position?: number; clicks?: number; impressions?: number; ctr?: number }>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const previousSearchQuery = useRef<string>(searchQuery);

  // Reset page when search query changes
  useEffect(() => {
    if (previousSearchQuery.current !== searchQuery) {
      setCurrentPage(1);
    }
    previousSearchQuery.current = searchQuery;
  }, [searchQuery]);

  const filtered = useMemo(() => {
    let result = gscPages;
    if (searchQuery) {
      result = result.filter(
        (g) =>
          g.page.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (g.page || '').toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }
    return result;
  }, [gscPages, searchQuery]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(totalPages, page)));
  };

  const handleExport = () => {
    downloadFile(
      `organic-landing-pages-${new Date().toISOString().split("T")[0]}.csv`,
      toCsv(
        ["Landing Page", "Clicks", "Impressions", "CTR %", "Avg Position"],
        filtered.map((g) => [
          g.page,
          g.clicks,
          g.impressions,
          g.ctr?.toFixed(2) ?? "—",
          g.position?.toFixed(1) ?? "—",
        ]),
      ),
    );
    toast.success("Organic landing pages exported");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-[#28354C]">Organic Landing Pages</h1>
            {gscPages.length > 0 && (
              <Chip tone="good" dot>
                Live via Google Search Console
              </Chip>
            )}
          </div>
          <p className="text-[#6B7A94]">
            Monitor top-performing landing pages from Google Search - actual search
            traffic data, not estimated backlinks
          </p>
        </div>
        <WButton size="sm" icon={Download} onClick={handleExport} disabled={filtered.length === 0}>
          Export
        </WButton>
      </div>

      {!isLoading && gscPages.length === 0 ? (
        <LockedState
          title="Connect Google Search Console to view organic landing page data"
          body={
            <>
              Google Search Console provides verified search traffic data including landing
              pages, clicks, impressions, and average positions. Connect your Search Console
              property in Integrations to view real organic search performance.
            </>
          }
          ctaLabel="Open integrations"
          onCta={() => navigate("/admin/website/settings?section=integrations")}
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card title="Total landing pages" icon={Link} className="md:col-span-1">
              <div className="text-lg font-bold text-[#28354C]">{filtered.length}</div>
              <div className="mt-1 text-sm text-[#6B7A94]">Unique URLs</div>
            </Card>

            <Card title="Total clicks" icon={Link} className="md:col-span-1">
              <div className="text-lg font-bold text-[#28354C]">
                {filtered.reduce((sum, g) => sum + (g.clicks ?? 0), 0).toLocaleString()}
              </div>
              <div className="mt-1 text-sm text-[#6B7A94]">Search clicks</div>
            </Card>

            <Card title="Avg position" icon={Link} className="md:col-span-1">
              <div className="text-lg font-bold text-[#28354C]">
                {filtered.length > 0
                  ? (
                    filtered
                      .filter((g) => g.position !== null)
                      .reduce((sum, g) => sum + (g.position ?? 0), 0) /
                    Math.max(filtered.filter((g) => g.position !== null).length, 1)
                  ).toFixed(1)
                  : "—"
                }
              </div>
              <div className="mt-1 text-sm text-[#6B7A94]">Avg search position</div>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-1">
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Search landing page or query..."
                  className="w-full rounded-lg border border-[#DAE1EC] px-3 py-2 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

<div className="mt-3 space-y-1">
                {paginatedItems.map((g) => {
                  const isSelected = selectedPage?.page === g.page;
                  return (
                    <button
                      key={g.page}
                      className={`w-full rounded-lg border p-2 text-left transition-colors ${
                        isSelected ? "border-[#4F46E5] bg-[#EEF2FF]" : "border-[#DAE1EC] hover:bg-[#F9FAFB]"
                      }`}
                      onClick={() => setSelectedPage(g)}
                    >
                      <div className="flex items-center justify-between space-x-2">
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-medium text-[#28354C]">{g.page}</div>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <div
                            className={`size-2 rounded-full ${
                              g.position && g.position <= 3
                                ? "bg-[#10B981]"
                                : g.position && g.position <= 10
                                  ? "bg-[#FBBF24]"
                                  : g.position && g.position <= 20
                                    ? "bg-[#F97316]"
                                    : "bg-[#EF4444]"
                            }`}
                          />
                          <span className="text-[10px]">{g.position?.toFixed(1) ?? "—"}</span>
                        </div>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-sm">
                        <span className="text-[#6B7A94]">Clicks: {g.clicks?.toLocaleString() ?? "0"}</span>
                        <span className="text-[#6B7A94]">Impr: {g.impressions?.toLocaleString() ?? "0"}</span>
                        <span className="text-[#6B7A94]">Pos: {g.position?.toFixed(1) ?? "—"}</span>
                      </div>
                    </button>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="py-8 text-center text-[#6B7A94]">No organic landing pages found</div>
                )}
              </div>

              {/* Pagination Controls */}
              {filtered.length > 0 && (
                <div className="flex items-center justify-between px-2 py-3 border-t border-[#DAE1EC] bg-[#FAFBFD] rounded-b-lg">
                  <div className="text-sm text-[#6B7A94]">
                    Showing {paginatedItems.length} of {filtered.length} landing pages
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
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
                              onClick={() => handlePageChange(page)}
                              className={`px-3 py-1 text-sm border rounded ${currentPage === page ? "bg-[#4F46E5] text-white border-[#4F46E5]" : "bg-white text-[#28354C] border-[#DAE1EC] hover:bg-[#F9FAFB]"}`}
                            >
                              {page}
                            </button>
                            {showEllipsisAfter && <span className="px-2 text-[#6B7A94]">...</span>}
                          </div>
                        );
                      })}
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm border border-[#DAE1EC] rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#F9FAFB]"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="md:col-span-1">
              {selectedPage ? (
                <Card title={selectedPage.page} icon={Link} subtitle="Landing page details">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="text-sm text-[#6B7A94]">Landing page</div>
                      <div className="text-base font-medium text-[#28354C]">{selectedPage.page}</div>
                    </div>
                    <div>
                      <div className="text-sm text-[#6B7A94]">Search query</div>
                      <div className="text-base font-medium text-[#28354C]">
                        {"—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-[#6B7A94]">Clicks</div>
                      <div className="text-base font-bold text-[#28354C]">
                        {selectedPage.clicks?.toLocaleString() ?? "0"}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-[#6B7A94]">Impressions</div>
                      <div className="text-base font-bold text-[#28354C]">
                        {selectedPage.impressions?.toLocaleString() ?? "0"}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-[#6B7A94]">CTR</div>
                      <div className="text-base font-medium text-[#28354C]">
                        {(selectedPage.ctr ?? 0).toFixed(2)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-[#6B7A94]">Avg position</div>
                      <div className="text-base font-bold text-[#28354C]">
                        {selectedPage.position?.toFixed(1) ?? "—"}
                      </div>
                    </div>
                  </div>
                </Card>
              ) : (
                <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-[#DAE1EC] bg-[#FAFBFD] p-12">
                  <div className="text-center">
                    <Link className="mx-auto mb-3 size-12 text-[#94A3B8]" />
                    <p className="text-[#28354C]">Analyze landing page details</p>
                    <p className="mt-1 text-sm text-[#6B7A94]">Select a landing page to view its properties</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {isLoading && (
            <div className="rounded-lg border border-[#DAE1EC] bg-[#FAFBFD] p-8 text-center">
              <div className="inline-block size-8 animate-spin rounded-full border-4 border-solid border-[#4F46E5] border-t-transparent" />
              <p className="mt-3 text-[#6B7A94]">Loading organic landing page data...</p>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-[#FEE2E2] bg-[#FEF2F2] p-4 text-[#B91C1C]">
              Failed to load organic landing page data.
            </div>
          )}
        </>
      )}
    </div>
  );
}