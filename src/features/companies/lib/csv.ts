/** Client-side CSV export. The file is built in the browser from data already on screen. */

function escapeCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  // Neutralise spreadsheet formula injection in exported text.
  const safe = /^[=+\-@]/.test(text) && Number.isNaN(Number(text)) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>): string {
  return [headers, ...rows].map((row) => row.map(escapeCell).join(",")).join("\r\n");
}

export function downloadTextFile(filename: string, content: string, mime = "text/csv;charset=utf-8"): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>,
): void {
  downloadTextFile(filename, toCsv(headers, rows));
}
