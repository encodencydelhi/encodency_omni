"use client";

import { Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { AlertBanner } from "@/components/shared/alert-banner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { parseCsv } from "../lib/csv";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

interface ParsedRow {
  line: number;
  values: Record<string, string>;
  errors: string[];
}

interface CrmImportDialogProps {
  open: boolean;
  onClose: () => void;
  /** Plural entity name for copy, e.g. "contacts" or "leads". */
  entityLabel: string;
  /** Required column names (lowercase, matched against the CSV header). */
  requiredColumns: string[];
  /** Optional extra row validation (e.g. enum checks). */
  validate?: (values: Record<string, string>) => string[];
  /** Sample CSV the "Use sample" button inserts. */
  sample: string;
  /** Hint shown under the textarea, e.g. required/optional columns. */
  columnsHint: string;
  onImport: (rows: Record<string, string>[]) => void;
}

function validateRows(
  text: string,
  requiredColumns: string[],
  extraValidate?: (values: Record<string, string>) => string[],
): { parsed: ParsedRow[]; headerError: string | null } {
  const rows = parseCsv(text);
  const [header, ...body] = rows;
  if (!header) return { parsed: [], headerError: "The file is empty." };

  const columns = header.map((cell) => cell.trim().toLowerCase());
  const missing = requiredColumns.filter((required) => !columns.includes(required));
  if (missing.length > 0) {
    return {
      parsed: [],
      headerError: `Missing required column${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}.`,
    };
  }

  const parsed = body.map<ParsedRow>((cells, position) => {
    const values: Record<string, string> = {};
    columns.forEach((column, index) => {
      values[column] = (cells[index] ?? "").trim();
    });
    const errors: string[] = [];
    for (const required of requiredColumns) {
      if (!values[required]) errors.push(`${required} is required`);
    }
    if (values.email && !isValidEmail(values.email)) errors.push("Email is invalid");
    if (extraValidate) errors.push(...extraValidate(values));
    return { line: position + 2, values, errors };
  });

  return { parsed, headerError: null };
}

export function CrmImportDialog(props: CrmImportDialogProps) {
  return props.open ? <ImportBody {...props} /> : null;
}

function ImportBody({
  onClose, entityLabel, requiredColumns, validate, sample, columnsHint, onImport,
}: Omit<CrmImportDialogProps, "open">) {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);

  const { parsed, headerError } = useMemo(
    () => (text.trim() ? validateRows(text, requiredColumns, validate) : { parsed: [], headerError: null }),
    [text, requiredColumns, validate],
  );
  const valid = parsed.filter((row) => row.errors.length === 0);

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    setText(await file.text());
  };

  const run = () => {
    onImport(valid.map((row) => row.values));
    onClose();
  };

  return (
    <Dialog open onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="sm:max-w-xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b border-slate-100">
          <DialogTitle className="text-xl font-semibold text-slate-800">Import {entityLabel}</DialogTitle>
          <DialogDescription>
            Upload a CSV file or paste CSV data to add {entityLabel} in bulk.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 shadow-sm hover:bg-slate-50">
              <Upload className="size-3.5" aria-hidden />
              {fileName ?? "Choose CSV file"}
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(event) => void readFile(event.target.files?.[0])}
              />
            </label>
            <Button variant="ghost" size="sm" onClick={() => { setText(sample); setFileName(null); }}>
              Use sample
            </Button>
          </div>

          <div>
            <p className="mb-1.5 text-[12px] font-medium text-slate-700">Or paste CSV</p>
            <p className="mb-1.5 text-[12px] text-slate-500">{columnsHint}</p>
            <Textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              className="min-h-24 rounded-lg font-mono text-[12px]"
              spellCheck={false}
              placeholder="firstName,lastName,email,..."
            />
          </div>

          {headerError ? (
            <AlertBanner tone="danger" title="Cannot read this file">{headerError}</AlertBanner>
          ) : null}

          {parsed.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <p className="border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-[12px] text-slate-500">
                {valid.length} valid · {parsed.length - valid.length} with errors
              </p>
              <ul className="max-h-48 divide-y divide-slate-100 overflow-y-auto">
                {parsed.map((row) => (
                  <li
                    key={row.line}
                    className={`flex items-start justify-between gap-3 px-3 py-1.5 text-[13px] ${row.errors.length > 0 ? "bg-red-50/50" : ""}`}
                  >
                    <span className="min-w-0 truncate text-slate-700">
                      <span className="mr-2 text-[12px] text-slate-400 tabular-nums">Line {row.line}</span>
                      {row.values.firstname || row.values.lastname
                        ? `${row.values.firstname ?? ""} ${row.values.lastname ?? ""}`.trim()
                        : row.values.email || "(no name)"}
                    </span>
                    <span className={`shrink-0 text-[12px] ${row.errors.length > 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {row.errors.length > 0 ? row.errors.join("; ") : "Ready"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <DialogFooter className="pt-4 border-t border-slate-100">
          <Button variant="outline" onClick={onClose} className="rounded-lg">Cancel</Button>
          <Button
            onClick={run}
            disabled={valid.length === 0 || headerError !== null}
            className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Upload className="size-3.5" />
            Import {valid.length > 0 ? `${valid.length} ` : ""}{valid.length === 1 ? entityLabel.replace(/s$/, "") : entityLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
