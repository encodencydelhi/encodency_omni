"use client";

/**
 * Report export.
 *
 * The file is assembled in the browser from data already loaded through the
 * repository — there is no export service and no server round trip. Sections
 * the current client cannot provide (GA4, Search Console) are disabled with the
 * reason shown, rather than exporting empty columns.
 */

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, FileJson, FileSpreadsheet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils/cn";
import {
  useWebsiteForms,
  useWebsiteIssues,
  useWebsiteMonitoring,
  useWebsitePages,
  useWebsitePerformance,
  useWebsiteSeo,
  useWebsiteSummary,
} from "../../data/hooks";
import {
  categoryLabel,
  downloadFile,
  formatDate,
  pageTypeLabel,
  severityLabel,
  slugForFile,
  toCsv,
} from "../../data/selectors";
import { SegmentedControl, WButton } from "../ui/kit";

type SectionKey = "summary" | "pages" | "issues" | "seo" | "performance" | "forms" | "monitoring";

interface SectionSpec {
  key: SectionKey;
  label: string;
  description: string;
  headers: string[];
  rows: (string | number | null)[][];
  available: boolean;
  unavailableReason?: string;
}

export function ExportDialog({
  clientId,
  clientName,
  domain,
  open,
  onClose,
}: {
  clientId: string;
  clientName: string;
  domain: string;
  open: boolean;
  onClose: () => void;
}) {
  const summary = useWebsiteSummary(clientId, open);
  const pages = useWebsitePages(clientId, open);
  const issues = useWebsiteIssues(clientId, open);
  const seo = useWebsiteSeo(clientId, open);
  const performance = useWebsitePerformance(clientId, open);
  const forms = useWebsiteForms(clientId, open);
  const monitoring = useWebsiteMonitoring(clientId, open);

  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [selected, setSelected] = useState<SectionKey[]>(["summary", "pages", "issues"]);

  const sections = useMemo<SectionSpec[]>(() => {
    const summaryData = summary.data;
    const pageRows = pages.data ?? [];
    const issueRows = issues.data ?? [];
    const seoData = seo.data;
    const perfData = performance.data;
    const formsData = forms.data;
    const monitoringData = monitoring.data;

    return [
      {
        key: "summary",
        label: "Health summary",
        description: "Scores, uptime, page count and open issue counts.",
        headers: ["Metric", "Value"],
        rows: summaryData
          ? [
              ["Website", summaryData.target.url],
              ["Status", summaryData.target.status],
              ["OmniPlatform Website Health", summaryData.scores.health],
              ["OmniPlatform SEO Score", summaryData.scores.seo],
              ["OmniPlatform Performance Score", summaryData.scores.performance],
              ["OmniPlatform Accessibility Score", summaryData.scores.accessibility],
              ["OmniPlatform Best Practices Score", summaryData.scores.bestPractices],
              ["Uptime (30d %)", summaryData.uptimePct],
              ["Pages discovered", summaryData.pagesDiscovered],
              ["Open issues", summaryData.openIssues],
              ["Critical issues", summaryData.criticalIssues],
              ["Last scanned", formatDate(summaryData.target.lastScannedAt)],
            ]
          : [],
        available: Boolean(summaryData),
        unavailableReason: "Summary data has not loaded.",
      },
      {
        key: "pages",
        label: "Pages",
        description: `${pageRows.length} discovered pages with scores and issue counts.`,
        headers: ["Title", "Path", "Type", "HTTP", "SEO", "Performance", "Accessibility", "Words", "Issues", "Indexable"],
        rows: pageRows.map((page) => [
          page.title,
          page.path,
          pageTypeLabel[page.type],
          page.httpStatus,
          page.seoScore,
          page.performanceScore,
          page.accessibilityScore,
          page.wordCount,
          page.issueCount,
          page.indexable ? "Yes" : "No",
        ]),
        available: pageRows.length > 0,
        unavailableReason: "No pages discovered yet.",
      },
      {
        key: "issues",
        label: "Issues",
        description: `${issueRows.length} issues across every category.`,
        headers: ["Severity", "Category", "Issue", "Status", "Affected", "Detected", "Recommendation"],
        rows: issueRows.map((issue) => [
          severityLabel[issue.severity],
          categoryLabel[issue.category],
          issue.title,
          issue.status,
          issue.affectedCount,
          formatDate(issue.detectedAt),
          issue.recommendation,
        ]),
        available: issueRows.length > 0,
        unavailableReason: "No issues recorded.",
      },
      {
        key: "seo",
        label: "SEO categories",
        description: "Category scores with pass, warning and error counts.",
        headers: ["Category", "Score", "Passed", "Warnings", "Errors"],
        rows: (seoData?.overview.categories ?? []).map((category) => [
          category.label,
          category.score,
          category.passed,
          category.warnings,
          category.errors,
        ]),
        available: Boolean(seoData),
        unavailableReason: "SEO audit data has not loaded.",
      },
      {
        key: "performance",
        label: "Performance",
        description: "Per-page Core Web Vitals and page weight.",
        headers: ["Path", "Score", "LCP (ms)", "INP (ms)", "CLS", "TTFB (ms)", "Weight (KB)"],
        rows: (perfData?.pages ?? []).map((row) => [
          row.path,
          row.score,
          row.lcpMs,
          row.inpMs,
          row.cls,
          row.ttfbMs,
          row.pageWeightKb,
        ]),
        available: Boolean(perfData),
        unavailableReason: "Performance data has not loaded.",
      },
      {
        key: "forms",
        label: "Forms & CTAs",
        description: "Detected forms with consent, captcha and security findings.",
        headers: ["Page", "Form type", "Fields", "Required", "Method", "Action secure", "Consent", "Captcha"],
        rows: (formsData?.forms ?? []).map((form) => [
          form.pagePath,
          form.formType,
          form.fields.length,
          form.requiredFields,
          form.method,
          form.actionSecure ? "Yes" : "No",
          form.consentDetected ? "Yes" : "No",
          form.captchaDetected ? "Yes" : "No",
        ]),
        available: (formsData?.forms.length ?? 0) > 0,
        unavailableReason: "No forms detected.",
      },
      {
        key: "monitoring",
        label: "Monitoring",
        description: "Uptime, SSL and recent incidents.",
        headers: ["Metric", "Value"],
        rows: monitoringData
          ? [
              ["Status", monitoringData.uptime.status],
              ["Uptime 30d (%)", monitoringData.uptime.uptimePct30d],
              ["Uptime 90d (%)", monitoringData.uptime.uptimePct90d],
              ["Average response (ms)", monitoringData.uptime.avgResponseMs],
              ["Certificate issuer", monitoringData.ssl.issuer],
              ["Certificate expires", formatDate(monitoringData.ssl.validTo)],
              ["Days remaining", monitoringData.ssl.daysRemaining],
              ["Incidents (90d)", monitoringData.uptime.incidents.length],
            ]
          : [],
        available: Boolean(monitoringData),
        unavailableReason: "Monitoring data has not loaded.",
      },
    ];
  }, [summary.data, pages.data, issues.data, seo.data, performance.data, forms.data, monitoring.data]);

  const chosen = sections.filter((section) => selected.includes(section.key) && section.available);

  const handleExport = () => {
    if (chosen.length === 0) return;
    const stamp = new Date().toISOString().slice(0, 10);
    const base = `${slugForFile(clientName)}-website-report-${stamp}`;

    if (format === "json") {
      const payload = {
        generatedAt: new Date().toISOString(),
        client: clientName,
        website: domain,
        note: "Generated in the browser from data already loaded in the Website module.",
        sections: Object.fromEntries(
          chosen.map((section) => [
            section.key,
            section.rows.map((row) =>
              Object.fromEntries(row.map((cell, index) => [section.headers[index] ?? `col${index}`, cell])),
            ),
          ]),
        ),
      };
      downloadFile(`${base}.json`, JSON.stringify(payload, null, 2), "application/json;charset=utf-8;");
    } else {
      const body = chosen
        .map((section) => `# ${section.label}\n${toCsv(section.headers, section.rows)}`)
        .join("\n\n");
      downloadFile(`${base}.csv`, `# ${clientName} — ${domain}\n# Generated ${stamp}\n\n${body}`);
    }

    toast.success("Report exported", {
      description: `${chosen.length} section${chosen.length === 1 ? "" : "s"} saved as ${format.toUpperCase()}.`,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <DialogContent className="max-w-lg rounded-lg border-[#E6EBF4] bg-white p-0">
        <DialogHeader className="border-b border-[#EEF2F8] p-5 pr-12">
          <DialogTitle className="text-[15px] font-semibold text-[#111C3A]">Export website report</DialogTitle>
          <DialogDescription className="text-[12px] text-[#6B7A94]">
            {clientName} · {domain} — built in your browser from the data on screen.
          </DialogDescription>
        </DialogHeader>

        <div className="scrollbar-thin max-h-[52vh] space-y-3 overflow-y-auto px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6B7A94]">Format</span>
            <SegmentedControl
              ariaLabel="Export format"
              value={format}
              onChange={setFormat}
              options={[
                { value: "csv", label: "CSV" },
                { value: "json", label: "JSON" },
              ]}
            />
          </div>

          <ul className="space-y-1.5">
            {sections.map((section) => {
              const checked = selected.includes(section.key);
              return (
                <li key={section.key}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition-colors",
                      section.available
                        ? checked
                          ? "border-[#BFD5F7] bg-[#F5F9FF]"
                          : "border-[#E6EBF4] hover:bg-[#FAFBFD]"
                        : "cursor-not-allowed border-[#EEF2F8] bg-[#FAFBFD] opacity-70",
                    )}
                  >
                    <Checkbox
                      className="mt-0.5"
                      checked={checked}
                      disabled={!section.available}
                      onCheckedChange={(value) =>
                        setSelected((current) =>
                          value === true
                            ? [...current, section.key]
                            : current.filter((key) => key !== section.key),
                        )
                      }
                    />
                    <span className="min-w-0">
                      <span className="block text-[12px] font-semibold text-[#28354C]">{section.label}</span>
                      <span className="block text-[11px] text-[#6B7A94]">
                        {section.available ? section.description : section.unavailableReason}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>

        <DialogFooter className="border-t border-[#EEF2F8] p-4">
          <WButton onClick={onClose}>Cancel</WButton>
          <WButton
            tone="primary"
            icon={format === "csv" ? FileSpreadsheet : FileJson}
            disabled={chosen.length === 0}
            disabledReason="Select at least one available section"
            onClick={handleExport}
          >
            <Download className="size-3.5" aria-hidden />
            Export {chosen.length > 0 ? `${chosen.length} section${chosen.length === 1 ? "" : "s"}` : ""}
          </WButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
