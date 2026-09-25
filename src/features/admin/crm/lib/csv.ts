import type { Contact, Lead } from "../types";

function escapeCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  const safe = /^[=+\-@]/.test(text) && Number.isNaN(Number(text)) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function toCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>): string {
  return [headers, ...rows].map((row) => row.map(escapeCell).join(",")).join("\r\n");
}

function downloadCsv(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>,
): void {
  const blob = new Blob([toCsv(headers, rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
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

/** Split a multi-value CSV cell ("a;b" or "a|b") into a clean list. */
export function listValues(value: string): string[] {
  return value.split(/[;|]/).map((item) => item.trim()).filter(Boolean);
}

/* ---- Export ---- */

const CONTACT_HEADERS = [
  "firstName", "lastName", "email", "phone", "company", "role", "department",
  "status", "tags", "groups", "ownerName", "location", "city", "state", "country", "website", "linkedIn",
] as const;

export function exportContactsCsv(rows: Contact[], filename = "contacts.csv"): void {
  downloadCsv(
    filename,
    [...CONTACT_HEADERS],
    rows.map((c) => [
      c.firstName, c.lastName, c.email, c.phone, c.company, c.role, c.department,
      c.status, c.tags.join(";"), c.groups.join(";"), c.ownerName, c.location, c.city, c.state, c.country, c.website, c.linkedIn,
    ]),
  );
}

const LEAD_HEADERS = [
  "firstName", "lastName", "email", "phone", "company", "jobTitle", "industry",
  "source", "stage", "leadScore", "priority", "ownerName", "estimatedDealValue",
  "tags", "location", "city", "state", "country", "notes", "nextFollowUp",
] as const;

export function exportLeadsCsv(rows: Lead[], filename = "leads.csv"): void {
  downloadCsv(
    filename,
    [...LEAD_HEADERS],
    rows.map((l) => [
      l.firstName, l.lastName, l.email, l.phone, l.company, l.jobTitle, l.industry,
      l.source, l.stage, l.leadScore, l.priority, l.ownerName, l.estimatedDealValue,
      l.tags.join(";"), l.location, l.city, l.state, l.country, l.notes, l.nextFollowUp,
    ]),
  );
}
