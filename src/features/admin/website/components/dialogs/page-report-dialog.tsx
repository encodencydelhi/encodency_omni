"use client";

/** Per-page report: the same server-side generator, preset to the "Individual Page SEO Report" for one page. */

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ReportsPanel } from "./reports-panel";

export function PageReportDialog({
  clientId,
  pageId,
  pagePath,
  open,
  onClose,
}: {
  clientId: string;
  pageId: string;
  pagePath: string;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <DialogContent className="capitalize [&_.font-mono]:normal-case max-w-2xl rounded-lg border-[#E6EBF4] bg-white p-0">
        <DialogHeader className="border-b border-[#EEF2F8] p-5 pr-12">
          <DialogTitle className="text-[15px] font-semibold text-[#111C3A]">Page report</DialogTitle>
          <DialogDescription className="text-[12px] text-[#6B7A94]">
            Technical SEO, on-page checks, links, images, schema, performance, search data and history for <span className="font-mono">{pagePath}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="scrollbar-thin max-h-[64vh] overflow-y-auto px-5 py-4">
          <ReportsPanel clientId={clientId} presetType="page" presetPageId={pageId} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
