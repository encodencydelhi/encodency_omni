import { downloadCsv } from "@/features/companies/lib/csv";
import type { Contact, Lead } from "../types";

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
