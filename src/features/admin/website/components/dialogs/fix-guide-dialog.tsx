"use client";

/**
 * Fix guides are editorial, not automated.
 *
 * We do not have CMS, server or deploy access to these websites, so this module
 * never claims to fix anything. A guide says what is wrong, who normally fixes
 * it, and the steps — then offers a re-scan to confirm once they have.
 */

import { ExternalLink, RefreshCw, Wrench } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFixGuide } from "../../data/hooks";
import { Chip, WButton } from "../ui/kit";
import { QueryErrorState, SkeletonBlock } from "../ui/states";

export function FixGuideDialog({
  guideId,
  onClose,
  onRescan,
}: {
  guideId: string | null;
  onClose: () => void;
  onRescan?: () => void;
}) {
  const { data: guide, isLoading, error, refetch } = useFixGuide(guideId);

  return (
    <Dialog open={Boolean(guideId)} onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="max-w-xl rounded-lg border-[#E6EBF4] bg-white p-0">
        <DialogHeader className="border-b border-[#EEF2F8] p-5 pr-12">
          <span className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#6B7A94]">
            <Wrench className="size-3.5" aria-hidden /> Fix guide
          </span>
          <DialogTitle className="text-[16px] font-semibold text-[#111C3A]">
            {guide?.title ?? (isLoading ? "Loading guide…" : "Fix guide")}
          </DialogTitle>
          <DialogDescription className="text-[12px] leading-relaxed text-[#6B7A94]">
            {guide?.summary ?? "Step-by-step instructions for whoever maintains this website."}
          </DialogDescription>
        </DialogHeader>

        <div className="scrollbar-thin max-h-[52vh] overflow-y-auto px-5 py-4">
          {isLoading ? <SkeletonBlock lines={6} /> : null}
          {error ? <QueryErrorState error={error} onRetry={() => void refetch()} compact /> : null}
          {guide ? (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-1.5">
                <Chip tone={guide.impact === "high" ? "good" : guide.impact === "medium" ? "info" : "muted"}>
                  {guide.impact} impact
                </Chip>
                <Chip tone={guide.effort === "low" ? "good" : guide.effort === "medium" ? "warn" : "bad"}>
                  {guide.effort} effort
                </Chip>
                <Chip tone="muted">Owner: {guide.ownedBy}</Chip>
              </div>

              <ol className="space-y-2.5">
                {guide.steps.map((step, index) => (
                  <li key={step} className="flex gap-2.5">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#EAF2FE] text-[10.5px] font-semibold text-[#1D4ED8]">
                      {index + 1}
                    </span>
                    <p className="text-[12px] leading-relaxed text-[#334155]">{step}</p>
                  </li>
                ))}
              </ol>

              {guide.reference ? (
                <a
                  href={guide.reference.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-4 inline-flex items-center gap-1.5 rounded text-[11.5px] font-semibold text-[#2563EB] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/35"
                >
                  {guide.reference.label}
                  <ExternalLink className="size-3.5" aria-hidden />
                </a>
              ) : null}

              <p className="mt-4 rounded-md bg-[#F7F9FC] px-3 py-2 text-[11px] leading-relaxed text-[#6B7A94]">
                We observe this website from the outside only — we cannot apply this change for you. Once the fix is
                live, re-scan to confirm it cleared.
              </p>
            </>
          ) : null}
        </div>

        <DialogFooter className="border-t border-[#EEF2F8] p-4">
          <WButton onClick={onClose}>Close</WButton>
          {onRescan ? (
            <WButton
              tone="primary"
              icon={RefreshCw}
              onClick={() => {
                onRescan();
                onClose();
              }}
            >
              Re-scan to verify
            </WButton>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
