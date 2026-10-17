"use client";

import { AlertTriangle, Eye } from "lucide-react";

export interface ActionPreviewData {
  label: string;
  action: string;
  summary: string;
  fields: Record<string, unknown>;
  warnings: Array<{ code: string; severity: "error" | "warning"; message: string; fix?: string }>;
}

/** Reads a preview out of a step/planned-action output, if the server attached one. */
export function previewOf(output: unknown): ActionPreviewData | null {
  const p = output && typeof output === "object" ? (output as { preview?: unknown }).preview : null;
  return p && typeof p === "object" && typeof (p as ActionPreviewData).summary === "string" ? (p as ActionPreviewData) : null;
}

const FIELD_LABELS: Record<string, string> = {
  recipient: "To", recipientSource: "Recipient from", subject: "Subject", body: "Body", sender: "Sent via", recordNote: "Note",
  title: "Task title", description: "Description", priority: "Priority", dueDate: "Due date", assignee: "Assignee", phoneEnding: "Phone ends with",
};
const HIDDEN = new Set(["recipientSource"]);

function show(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") {
    const v = value as Record<string, unknown>;
    if ("via" in v) return `${v.via === "company" ? "Company SMTP" : v.via === "platform" ? "Platform mail" : String(v.via)}${v.detail ? ` — ${String(v.detail)}` : ""}`;
    if ("name" in v || "id" in v) return String(v.name || v.id || "—");
    return JSON.stringify(value);
  }
  return String(value);
}

/** What a skipped side-effect step WOULD do. Purely informational: nothing here was executed. */
export function ActionPreviewCard({ preview }: { preview: ActionPreviewData }) {
  const rows = Object.entries(preview.fields).filter(([k]) => !HIDDEN.has(k));
  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50/60 p-2.5 text-[11.5px] text-[#111C3A]" data-testid="action-preview">
      <p className="mb-1 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide text-sky-800"><Eye className="size-3" /> {preview.label}</p>
      <p className="mb-1.5 text-[#334155]">{preview.summary}</p>
      {rows.length ? (
        <dl className="grid grid-cols-[6.5rem_1fr] gap-x-2 gap-y-1">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-[#64748B]">{FIELD_LABELS[k] ?? k}</dt>
              <dd className="whitespace-pre-wrap break-words">{show(v)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {preview.warnings.length ? (
        <ul className="mt-2 space-y-1">
          {preview.warnings.map((w) => (
            <li key={w.code} className={`flex items-start gap-1.5 rounded border px-2 py-1 ${w.severity === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
              <AlertTriangle className="mt-0.5 size-3 shrink-0" />
              <span>{w.message}{w.fix ? <span className="block text-[11px] opacity-80">Fix: {w.fix}</span> : null}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
