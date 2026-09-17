"use client";

/**
 * Forms & CTAs — the conversion points we can see in the public HTML.
 *
 * Detection only. There are no submissions here and there never will be from a
 * crawl: reading a form's markup tells us nothing about who filled it in. That
 * needs Omni Tracking or a real integration, and the screen says so.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarCheck,
  CheckCircle2,
  Download,
  ExternalLink,
  FileSearch,
  HandCoins,
  Mail,
  MessageSquare,
  MousePointerClick,
  Phone,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  SquareStack,
  TriangleAlert,
  Wrench,
  XCircle,
} from "lucide-react";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils/cn";
import { useWebsiteCapabilities, useWebsiteForms, useWebsiteIssues } from "../../data/hooks";
import { evaluateFeature } from "../../data/capability-provider";
import {
  checkTone,
  downloadFile,
  formatRelative,
  severityLabel,
  severityTone,
  sortIssues,
  toCsv,
} from "../../data/selectors";
import type { CtaRecord, FormRecord } from "../../data/types";
import {
  Card,
  Chip,
  DataTable,
  FilterSelect,
  KeyValue,
  SearchInput,
  StatTile,
  SubTabs,
  Toolbar,
  WButton,
  type Column,
} from "../ui/kit";
import { EmptyState, QueryErrorState, SkeletonBlock, SkeletonStats } from "../ui/states";
import { useUrlState } from "../use-url-state";
import { useWebsiteWorkspace } from "../website-workspace";

type FormsTab = "overview" | "forms" | "ctas" | "contact" | "issues";

const TABS: { value: FormsTab; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "forms", label: "Forms" },
  { value: "ctas", label: "CTAs" },
  { value: "contact", label: "Contact links" },
  { value: "issues", label: "Issues" },
];

const CTA_KIND_LABEL: Record<CtaRecord["kind"], string> = {
  button: "Button",
  whatsapp: "WhatsApp",
  phone: "Phone",
  email: "Email",
  donation: "Donation",
  booking: "Booking",
  "external-checkout": "External checkout",
  link: "Link",
};

export function WebsiteFormsPage() {
  const router = useRouter();
  const { clientId, runScan, scan, openIssue, openFixGuide, openIntegration } = useWebsiteWorkspace();
  const forms = useWebsiteForms(clientId);
  const issues = useWebsiteIssues(clientId);
  const capabilities = useWebsiteCapabilities(clientId);

  const [tab, setTab] = useUrlState<FormsTab>("tab", "overview", TABS.map((entry) => entry.value));
  const [search, setSearch] = useState("");
  const [ctaKind, setCtaKind] = useState("all");
  const [openForm, setOpenForm] = useState<FormRecord | null>(null);

  const behaviour = evaluateFeature(capabilities.data, "behaviour-events");

  const formIssues = useMemo(
    () => sortIssues((issues.data ?? []).filter((issue) => issue.status === "open" && issue.category === "forms")),
    [issues.data],
  );

  const data = forms.data;

  const filteredForms = useMemo(
    () =>
      (data?.forms ?? []).filter((form) =>
        `${form.formType} ${form.pagePath}`.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [data?.forms, search],
  );

  const filteredCtas = useMemo(
    () =>
      (data?.ctas ?? []).filter((cta) => {
        if (ctaKind !== "all" && cta.kind !== ctaKind) return false;
        return `${cta.text} ${cta.pagePath} ${cta.destination}`.toLowerCase().includes(search.trim().toLowerCase());
      }),
    [data?.ctas, ctaKind, search],
  );

  const formColumns: Column<FormRecord>[] = [
    {
      key: "page",
      header: "Page",
      primary: true,
      sortValue: (form) => form.pagePath,
      cell: (form) => (
        <div className="min-w-0">
          <p className="truncate text-[11.5px] font-semibold text-[#28354C]">{form.formType}</p>
          <p className="truncate font-mono text-[10.5px] text-[#6B7A94]">{form.pagePath}</p>
        </div>
      ),
    },
    { key: "fields", header: "Fields", align: "center", sortValue: (form) => form.fields.length, cell: (form) => form.fields.length },
    { key: "required", header: "Required", align: "center", cell: (form) => form.requiredFields },
    { key: "method", header: "Method", align: "center", cell: (form) => <Chip tone="muted">{form.method}</Chip> },
    {
      key: "action",
      header: "Action",
      hideOnMobile: true,
      cell: (form) => (
        <span className="inline-flex items-center gap-1.5">
          <span className="max-w-[220px] truncate font-mono text-[10.5px] text-[#6B7A94]">{form.action}</span>
          <Chip tone={form.actionSecure ? "good" : "bad"}>{form.actionSecure ? "HTTPS" : "Insecure"}</Chip>
        </span>
      ),
    },
    {
      key: "consent",
      header: "Consent",
      align: "center",
      cell: (form) => <BoolChip value={form.consentDetected} yes="Detected" no="Missing" invertTone />,
    },
    {
      key: "captcha",
      header: "Captcha",
      align: "center",
      cell: (form) => <BoolChip value={form.captchaDetected} yes="Detected" no="None" />,
    },
    {
      key: "issues",
      header: "Findings",
      align: "center",
      cell: (form) =>
        form.accessibilityFindings.length === 0 ? (
          <Chip tone="good">Clean</Chip>
        ) : (
          <Chip tone="warn">{form.accessibilityFindings.length}</Chip>
        ),
    },
  ];

  const ctaColumns: Column<CtaRecord>[] = [
    {
      key: "text",
      header: "CTA",
      primary: true,
      sortValue: (cta) => cta.text,
      cell: (cta) => (
        <div className="min-w-0">
          <p className="truncate text-[11.5px] font-semibold text-[#28354C]">{cta.text}</p>
          <p className="truncate font-mono text-[10.5px] text-[#6B7A94]">{cta.destination}</p>
        </div>
      ),
    },
    { key: "kind", header: "Type", cell: (cta) => <Chip tone="muted">{CTA_KIND_LABEL[cta.kind]}</Chip> },
    {
      key: "page",
      header: "Page",
      sortValue: (cta) => cta.pagePath,
      cell: (cta) => <span className="truncate font-mono text-[10.5px] text-[#6B7A94]">{cta.pagePath}</span>,
    },
    {
      key: "placement",
      header: "Visibility",
      cell: (cta) => (
        <Chip tone={cta.placement === "above-fold" ? "good" : "muted"}>
          {cta.placement === "above-fold" ? "Above the fold" : cta.placement.replace("-", " ")}
        </Chip>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (cta) => (
        <span className="inline-flex flex-col items-center gap-0.5">
          <Chip tone={checkTone[cta.status]}>
            {cta.status === "pass" ? "OK" : cta.status === "warning" ? "Review" : "Broken"}
          </Chip>
          {cta.note ? <span className="max-w-[180px] truncate text-[9.5px] text-[#94A3B8]">{cta.note}</span> : null}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E6EBF4] bg-white p-2 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <SubTabs
          ariaLabel="Forms and CTA sections"
          value={tab}
          onChange={setTab}
          options={TABS.map((entry) => ({
            value: entry.value,
            label: entry.label,
            ...(entry.value === "forms" ? { count: data?.forms.length } : {}),
            ...(entry.value === "ctas" ? { count: data?.ctas.length } : {}),
            ...(entry.value === "issues" ? { count: formIssues.length } : {}),
          }))}
        />
        <WButton
          size="sm"
          icon={RefreshCw}
          disabled={scan.isRunning}
          disabledReason="A scan is already running"
          onClick={() => runScan("full-crawl")}
        >
          Re-detect
        </WButton>
      </div>

      {forms.isLoading ? (
        <>
          <SkeletonStats count={4} />
          <SkeletonBlock lines={6} />
        </>
      ) : forms.error ? (
        <Card title="Forms & CTAs">
          <QueryErrorState error={forms.error} onRetry={() => void forms.refetch()} />
        </Card>
      ) : data ? (
        <>
          {tab === "overview" ? (
            <div className="space-y-1">
              <div className="grid grid-cols-2 gap-1 lg:grid-cols-4 2xl:grid-cols-7">
                <StatTile label="Forms" value={data.counts.forms} icon={SquareStack} tone="info" onClick={() => setTab("forms")} />
                <StatTile label="CTA buttons" value={data.counts.ctas} icon={MousePointerClick} tone="violet" onClick={() => setTab("ctas")} />
                <StatTile label="WhatsApp links" value={data.counts.whatsappLinks} icon={MessageSquare} tone="good" onClick={() => setTab("contact")} />
                <StatTile label="Phone links" value={data.counts.phoneLinks} icon={Phone} tone="info" onClick={() => setTab("contact")} />
                <StatTile label="Email links" value={data.counts.emailLinks} icon={Mail} tone="info" onClick={() => setTab("contact")} />
                <StatTile label="Donation links" value={data.counts.donationLinks} icon={HandCoins} tone="good" onClick={() => setTab("ctas")} />
                <StatTile label="Booking links" value={data.counts.bookingLinks} icon={CalendarCheck} tone="muted" onClick={() => setTab("ctas")} />
              </div>

              <div className="grid gap-1 lg:grid-cols-2">
                <Card title="Conversion readiness" icon={ShieldCheck}>
                  <ul className="space-y-2">
                    <ReadinessRow
                      ok={data.forms.every((form) => form.actionSecure)}
                      label="All form actions use HTTPS"
                      detail={`${data.forms.filter((form) => !form.actionSecure).length} form(s) post to an insecure URL`}
                    />
                    <ReadinessRow
                      ok={data.forms.every((form) => form.consentDetected)}
                      label="Every form captures consent"
                      detail={`${data.forms.filter((form) => !form.consentDetected).length} form(s) without a consent field`}
                    />
                    <ReadinessRow
                      ok={data.forms.every((form) => form.accessibilityFindings.length === 0)}
                      label="All fields are labelled"
                      detail={`${data.forms.filter((form) => form.accessibilityFindings.length > 0).length} form(s) with accessibility findings`}
                    />
                    <ReadinessRow
                      ok={data.ctas.every((cta) => cta.status !== "error")}
                      label="No broken CTA destinations"
                      detail={`${data.ctas.filter((cta) => cta.status === "error").length} CTA(s) point at a URL that fails`}
                    />
                  </ul>
                </Card>

                <Card title="Submissions & interactions" icon={MousePointerClick}>
                  <div className="rounded-lg border border-dashed border-[#DAE1EC] bg-[#FAFBFD] p-4 text-center">
                    <p className="text-[12px] font-semibold text-[#28354C]">
                      {behaviour.available ? "Tracking installed" : "Not available from a crawl"}
                    </p>
                    <p className="mx-auto mt-1 max-w-sm text-[11px] leading-relaxed text-[#6B7A94]">
                      {behaviour.available
                        ? "Omni Tracking is installed. Form starts, submits and CTA clicks appear in Analytics; per-form breakdowns ship with the tracking backend."
                        : "Reading a form's HTML tells us it exists, not who filled it in. Submission counts need Omni Tracking on the website or a form-backend integration — we will not invent them."}
                    </p>
                    {!behaviour.available ? (
                      <WButton className="mt-2.5" tone="primary" onClick={() => openIntegration("omniTracking")}>
                        Set up Omni Tracking
                      </WButton>
                    ) : null}
                  </div>
                </Card>
              </div>
            </div>
          ) : null}

          {tab === "forms" ? (
            <Card
              title={`Detected forms (${filteredForms.length})`}
              icon={SquareStack}
              action={
                <>
                  <SearchInput className="w-44" label="Search forms" placeholder="Search forms…" value={search} onChange={setSearch} />
                  <WButton
                    size="sm"
                    icon={Download}
                    disabled={filteredForms.length === 0}
                    disabledReason="Nothing to export"
                    onClick={() => {
                      downloadFile(
                        "detected-forms.csv",
                        toCsv(
                          ["Page", "Type", "Fields", "Required", "Method", "Action", "Secure", "Consent", "Captcha"],
                          filteredForms.map((form) => [
                            form.pagePath,
                            form.formType,
                            form.fields.length,
                            form.requiredFields,
                            form.method,
                            form.action,
                            form.actionSecure ? "Yes" : "No",
                            form.consentDetected ? "Yes" : "No",
                            form.captchaDetected ? "Yes" : "No",
                          ]),
                        ),
                      );
                      toast.success("Forms exported");
                    }}
                  >
                    Export
                  </WButton>
                </>
              }
              bodyClassName="p-0"
            >
              <DataTable
                columns={formColumns}
                rows={filteredForms}
                getRowId={(form) => form.id}
                onRowClick={setOpenForm}
                empty={
                  <EmptyState
                    title="No forms detected"
                    body="The crawl found no <form> elements on this website. If the site uses an embedded third-party form, it may render after JavaScript — enable JS crawling in Settings."
                    actions={
                      <WButton tone="primary" icon={RefreshCw} onClick={() => runScan("full-crawl")}>
                        Re-detect
                      </WButton>
                    }
                  />
                }
                rowActions={(form) => (
                  <div className="flex justify-end gap-1">
                    <WButton size="sm" onClick={() => setOpenForm(form)}>
                      Details
                    </WButton>
                    <WButton
                      size="sm"
                      icon={FileSearch}
                      onClick={() => router.push(`/admin/website/pages/${encodeURIComponent(form.pageId)}`)}
                    >
                      Page
                    </WButton>
                  </div>
                )}
              />
            </Card>
          ) : null}

          {tab === "ctas" ? (
            <Card
              title={`Detected CTAs (${filteredCtas.length})`}
              icon={MousePointerClick}
              action={
                <Toolbar>
                  <SearchInput className="w-44" label="Search CTAs" placeholder="Search CTAs…" value={search} onChange={setSearch} />
                  <FilterSelect
                    label="CTA type"
                    value={ctaKind}
                    onChange={setCtaKind}
                    options={[
                      { value: "all", label: "All types" },
                      ...Object.entries(CTA_KIND_LABEL).map(([value, label]) => ({ value, label })),
                    ]}
                  />
                </Toolbar>
              }
              bodyClassName="p-0"
            >
              <DataTable
                columns={ctaColumns}
                rows={filteredCtas}
                getRowId={(cta) => cta.id}
                onRowClick={(cta) => router.push(`/admin/website/pages/${encodeURIComponent(cta.pageId)}?tab=content`)}
                empty={
                  <EmptyState
                    title="No CTAs match"
                    body="Try a different type filter, or clear the search."
                    actions={
                      <WButton
                        onClick={() => {
                          setSearch("");
                          setCtaKind("all");
                        }}
                      >
                        Clear filters
                      </WButton>
                    }
                  />
                }
                rowActions={(cta) => (
                  <WButton
                    size="sm"
                    icon={ExternalLink}
                    disabled={cta.destination.startsWith("#")}
                    disabledReason="This CTA scrolls to a section on the same page"
                    onClick={() =>
                      window.open(
                        cta.destination.startsWith("http") ? cta.destination : `${cta.pagePath}${cta.destination}`,
                        "_blank",
                        "noopener,noreferrer",
                      )
                    }
                  >
                    Open
                  </WButton>
                )}
              />
            </Card>
          ) : null}

          {tab === "contact" ? (
            <Card title="Contact links" icon={Phone} subtitle="Phone, email and WhatsApp links found across the site" bodyClassName="p-0">
              <DataTable
                columns={[
                  {
                    key: "value",
                    header: "Contact",
                    primary: true,
                    cell: (row: (typeof data.contactLinks)[number]) => (
                      <div className="flex items-center gap-2">
                        <span className="grid size-7 place-items-center rounded-md bg-[#F1F4F9] text-[#4A5A73]">
                          {row.kind === "whatsapp" ? (
                            <MessageSquare className="size-3.5" aria-hidden />
                          ) : row.kind === "phone" ? (
                            <Phone className="size-3.5" aria-hidden />
                          ) : (
                            <Mail className="size-3.5" aria-hidden />
                          )}
                        </span>
                        <span className="truncate text-[11.5px] font-semibold text-[#28354C]">{row.value}</span>
                      </div>
                    ),
                  },
                  {
                    key: "kind",
                    header: "Type",
                    cell: (row: (typeof data.contactLinks)[number]) => <Chip tone="muted">{CTA_KIND_LABEL[row.kind]}</Chip>,
                  },
                  {
                    key: "pages",
                    header: "On pages",
                    align: "center",
                    cell: (row: (typeof data.contactLinks)[number]) => row.pages,
                  },
                  {
                    key: "status",
                    header: "Status",
                    align: "center",
                    cell: (row: (typeof data.contactLinks)[number]) => (
                      <span className="inline-flex flex-col items-center gap-0.5">
                        <Chip tone={checkTone[row.status]}>{row.status === "pass" ? "OK" : "Review"}</Chip>
                        {row.note ? <span className="text-[9.5px] text-[#94A3B8]">{row.note}</span> : null}
                      </span>
                    ),
                  },
                ]}
                rows={data.contactLinks}
                getRowId={(row) => row.id}
                empty={<EmptyState title="No contact links found" body="No tel:, mailto: or wa.me links were detected." />}
              />
            </Card>
          ) : null}

          {tab === "issues" ? (
            <Card title={`Form & CTA issues (${formIssues.length})`} icon={TriangleAlert} bodyClassName="p-0">
              {formIssues.length === 0 ? (
                <EmptyState
                  title="No conversion issues"
                  body="Forms and CTAs passed every check in the last scan."
                  icon={ShieldCheck}
                />
              ) : (
                <ul className="divide-y divide-[#F2F5FA]">
                  {formIssues.map((issue) => (
                    <li key={issue.id} className="flex items-start gap-2.5 px-3.5 py-3">
                      <Chip tone={severityTone[issue.severity]} className="mt-0.5" dot>
                        {severityLabel[issue.severity]}
                      </Chip>
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => openIssue(issue.id)}
                          className="cursor-pointer text-left text-[12.5px] font-semibold text-[#28354C] hover:text-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/35"
                        >
                          {issue.title}
                        </button>
                        <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#6B7A94]">{issue.description}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          <WButton size="sm" onClick={() => openIssue(issue.id)}>
                            View issue
                          </WButton>
                          <WButton size="sm" icon={Wrench} onClick={() => openFixGuide(issue.fixGuideId)}>
                            Fix guide
                          </WButton>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ) : null}
        </>
      ) : null}

      <FormDetailSheet
        form={openForm}
        onClose={() => setOpenForm(null)}
        onOpenPage={(pageId) => {
          setOpenForm(null);
          router.push(`/admin/website/pages/${encodeURIComponent(pageId)}`);
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function BoolChip({
  value,
  yes,
  no,
  invertTone = false,
}: {
  value: boolean;
  yes: string;
  no: string;
  invertTone?: boolean;
}) {
  return <Chip tone={value ? "good" : invertTone ? "bad" : "muted"}>{value ? yes : no}</Chip>;
}

function ReadinessRow({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 shrink-0">
        {ok ? (
          <CheckCircle2 className="size-4 text-[#12A06D]" aria-hidden />
        ) : (
          <XCircle className="size-4 text-[#DC3A32]" aria-hidden />
        )}
      </span>
      <div>
        <p className={cn("text-[12px] font-semibold", ok ? "text-[#28354C]" : "text-[#C0261F]")}>{label}</p>
        {!ok ? <p className="text-[11px] text-[#6B7A94]">{detail}</p> : null}
      </div>
    </li>
  );
}

function FormDetailSheet({
  form,
  onClose,
  onOpenPage,
}: {
  form: FormRecord | null;
  onClose: () => void;
  onOpenPage: (pageId: string) => void;
}) {
  return (
    <Sheet open={Boolean(form)} onOpenChange={(open) => (open ? undefined : onClose())}>
      <SheetContent className="w-full max-w-lg border-[#E6EBF4] bg-white p-0 sm:max-w-lg">
        <SheetHeader className="border-[#EEF2F8] px-5 py-4 pr-12">
          <SheetTitle className="text-[15px] font-semibold text-[#111C3A]">
            {form?.formType ?? "Form"} form
          </SheetTitle>
          <p className="font-mono text-[11px] text-[#6B7A94]">{form?.pagePath}</p>
        </SheetHeader>

        <SheetBody className="px-5 py-4">
          {form ? (
            <div className="space-y-4">
              <dl className="divide-y divide-[#F2F5FA] rounded-xl border border-[#E6EBF4] px-3">
                <KeyValue label="Method">{form.method}</KeyValue>
                <KeyValue label="Action">
                  <span className="break-all font-mono text-[10.5px]">{form.action}</span>
                </KeyValue>
                <KeyValue label="Action secure">
                  <Chip tone={form.actionSecure ? "good" : "bad"} icon={form.actionSecure ? ShieldCheck : ShieldAlert}>
                    {form.actionSecure ? "HTTPS" : "Insecure — data would leave the secure context"}
                  </Chip>
                </KeyValue>
                <KeyValue label="Page served over HTTPS">
                  <Chip tone={form.httpsPage ? "good" : "bad"}>{form.httpsPage ? "Yes" : "No"}</Chip>
                </KeyValue>
                <KeyValue label="Consent field">
                  <Chip tone={form.consentDetected ? "good" : "bad"}>
                    {form.consentDetected ? "Detected" : "Not detected"}
                  </Chip>
                </KeyValue>
                <KeyValue label="Captcha">
                  <Chip tone={form.captchaDetected ? "good" : "warn"}>
                    {form.captchaDetected ? "Detected" : "Not detected"}
                  </Chip>
                </KeyValue>
                <KeyValue label="Detected">{formatRelative(form.detectedAt)}</KeyValue>
              </dl>

              <div>
                <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6B7A94]">
                  Fields ({form.fields.length})
                </h3>
                <ul className="divide-y divide-[#F2F5FA] rounded-xl border border-[#E6EBF4]">
                  {form.fields.map((field) => (
                    <li key={field.name} className="flex items-start justify-between gap-2 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-[11.5px] font-semibold text-[#28354C]">
                          {field.label ?? field.name}
                        </p>
                        <p className="truncate font-mono text-[10.5px] text-[#6B7A94]">
                          name={field.name} · type={field.type}
                          {field.autocomplete ? ` · autocomplete=${field.autocomplete}` : ""}
                        </p>
                      </div>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <Chip tone={field.required ? "info" : "muted"}>{field.required ? "Required" : "Optional"}</Chip>
                        <Chip tone={field.hasLabel ? "good" : "bad"}>{field.hasLabel ? "Labelled" : "No label"}</Chip>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6B7A94]">
                  Accessibility findings
                </h3>
                {form.accessibilityFindings.length === 0 ? (
                  <p className="rounded-md bg-[#E6F6EF] px-3 py-2 text-[11.5px] text-[#0B7A55]">
                    No accessibility problems were detected on this form.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {form.accessibilityFindings.map((finding) => (
                      <li
                        key={finding}
                        className="rounded-md bg-[#FDF3E3] px-3 py-2 text-[11.5px] leading-relaxed text-[#9A5B08]"
                      >
                        {finding}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <p className="rounded-md bg-[#F7F9FC] px-3 py-2 text-[11px] leading-relaxed text-[#6B7A94]">
                Submissions are not shown here. We read this form&rsquo;s markup from the public page — that tells us nothing
                about who filled it in.
              </p>
            </div>
          ) : null}
        </SheetBody>

        <SheetFooter className="gap-2 border-t border-[#EEF2F8] px-5 py-3">
          <WButton onClick={onClose}>Close</WButton>
          {form ? (
            <WButton tone="primary" icon={FileSearch} onClick={() => onOpenPage(form.pageId)}>
              Open page audit
            </WButton>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
