"use client";

import { UploadIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertBanner } from "@/components/shared/alert-banner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils/cn";
import { PLAN_TIER, type PlanTier } from "@/types/domain/plan";
import { INDUSTRIES } from "../data/config";
import { useCompanyMutations } from "../data/hooks";
import type { CreateCompanyInput } from "../data/types";
import { toDateInput } from "../lib/format";
import { isValidEmail, isValidWebsite } from "../lib/validation";
import { nowIso } from "../data/clock";
import { Field } from "./primitives";
import { ErrorBanner, FlowDialog, SubmitButton } from "./flows/flow-kit";

const TEMPLATE = "name,website,industry,country,ownerName,ownerEmail,plan\nAcme Foods,acmefoods.com,FMCG,India,Riya Shah,riya@acmefoods.com,growth";

interface ParsedRow {
  line: number;
  values: Record<string, string>;
  errors: string[];
}

/** Minimal RFC-4180-style parser: quoted fields, escaped quotes and CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      field = "";
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
    } else field += char;
  }
  row.push(field);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  return rows;
}

function validate(rows: string[][]): { parsed: ParsedRow[]; headerError: string | null } {
  const [header, ...body] = rows;
  if (!header) return { parsed: [], headerError: "The file is empty." };
  const columns = header.map((cell) => cell.trim().toLowerCase());
  const missing = ["name", "ownername", "owneremail"].filter((required) => !columns.includes(required));
  if (missing.length > 0) return { parsed: [], headerError: `Missing required column${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}.` };

  const parsed = body.map<ParsedRow>((cells, position) => {
    const values: Record<string, string> = {};
    columns.forEach((column, index) => {
      values[column] = (cells[index] ?? "").trim();
    });
    const errors: string[] = [];
    if (!values.name) errors.push("Company name is required");
    if (!values.ownername) errors.push("Owner name is required");
    if (!isValidEmail(values.owneremail ?? "")) errors.push("Owner email is invalid");
    if (values.website && !isValidWebsite(values.website)) errors.push("Website is invalid");
    if (values.plan && !(values.plan.toLowerCase() in PLAN_TIER)) errors.push(`Unknown plan "${values.plan}"`);
    return { line: position + 2, values, errors };
  });

  return { parsed, headerError: null };
}

export function CompanyImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return open ? <ImportBody onClose={onClose} /> : null;
}

function ImportBody({ onClose }: { onClose: () => void }) {
  const mutations = useCompanyMutations();
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { parsed, headerError } = useMemo(() => (text.trim() ? validate(parseCsv(text)) : { parsed: [], headerError: null }), [text]);
  const valid = parsed.filter((row) => row.errors.length === 0);

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    setText(await file.text());
  };

  const run = async () => {
    setPending(true);
    setError(null);
    let created = 0;
    const failures: string[] = [];

    for (const row of valid) {
      const tier = (row.values.plan?.toLowerCase() as PlanTier | undefined) ?? "growth";
      const input: CreateCompanyInput = {
        name: row.values.name ?? "",
        website: row.values.website || undefined,
        industry: INDUSTRIES.find((item) => item.toLowerCase() === (row.values.industry ?? "").toLowerCase()) ?? "Other",
        country: row.values.country || "India",
        owner: { name: row.values.ownername ?? "", email: row.values.owneremail ?? "" },
        subscription: { planTier: tier, billingCycle: "monthly", mode: "trial", startDate: toDateInput(nowIso()) },
        workspace: { timezone: "Asia/Kolkata", currency: "INR", language: "English", region: "India (Mumbai)" },
      };
      try {
        await mutations.createCompany(input);
        created += 1;
      } catch {
        failures.push(row.values.name ?? `line ${row.line}`);
      }
    }

    setPending(false);
    if (created > 0) toast.success(`Imported ${created} ${created === 1 ? "company" : "companies"} into the demo workspace`);
    if (failures.length > 0) setError(`These could not be imported: ${failures.join(", ")}.`);
    else onClose();
  };

  return (
    <FlowDialog
      open
      onOpenChange={(next) => !next && !pending && onClose()}
      size="lg"
      title="Import companies"
      description="Create several companies from a CSV file. Each starts as a trial with an owner invitation recorded (demo - no email is sent)."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <SubmitButton pending={pending} disabled={valid.length === 0 || headerError !== null} onClick={run}>
            <UploadIcon />
            Import {valid.length > 0 ? valid.length : ""} {valid.length === 1 ? "company" : "companies"}
          </SubmitButton>
        </>
      }
    >
      <ErrorBanner message={error} />
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-sm border border-border-strong bg-card px-3 text-[0.8125rem] font-medium shadow-xs hover:bg-accent">
          <UploadIcon className="size-4" aria-hidden />
          Choose CSV file
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => void readFile(event.target.files?.[0])} />
        </label>
        <Button variant="ghost" size="sm" onClick={() => setText(TEMPLATE)}>
          Use sample
        </Button>
      </div>
      <Field label="Or paste CSV" htmlFor="import-text" hint="Required columns: name, ownerName, ownerEmail. Optional: website, industry, country, plan.">
        <Textarea id="import-text" value={text} onChange={(event) => setText(event.target.value)} className="min-h-24 font-mono text-2xs" spellCheck={false} />
      </Field>

      {headerError ? <AlertBanner tone="danger" title="Cannot read this file">{headerError}</AlertBanner> : null}

      {parsed.length > 0 ? (
        <div className="overflow-hidden rounded-sm border border-border">
          <p className="border-b border-border bg-surface-sunken px-3 py-1.5 text-2xs text-muted-foreground">
            {valid.length} valid · {parsed.length - valid.length} with errors
          </p>
          <ul className="max-h-48 divide-y divide-border overflow-y-auto scrollbar-thin">
            {parsed.map((row) => (
              <li key={row.line} className={cn("flex items-start justify-between gap-3 px-3 py-1.5 text-[0.8125rem]", row.errors.length > 0 && "bg-danger-subtle/40")}>
                <span className="min-w-0 truncate text-foreground">
                  <span className="mr-2 text-2xs text-muted-foreground tabular">Line {row.line}</span>
                  {row.values.name || "(no name)"}
                </span>
                <span className={cn("shrink-0 text-2xs", row.errors.length > 0 ? "text-danger" : "text-success")}>
                  {row.errors.length > 0 ? row.errors.join("; ") : "Ready"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </FlowDialog>
  );
}
