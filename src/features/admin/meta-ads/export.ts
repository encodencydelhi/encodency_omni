type Cell = string | number | boolean | null | undefined;
export function csvText(headers: string[], rows: Cell[][]): string {
  const escape = (value: Cell): string => {
    let text = String(value ?? "");
    // Names and answers may start with spreadsheet formulas: export them as text.
    if (typeof value === "string" && /^[\s]*[=+@-]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  return [headers, ...rows].map(row => row.map(escape).join(",")).join("\r\n");
}
export function downloadCsv(name: string, headers: string[], rows: Cell[][]): void {
  const url = URL.createObjectURL(new Blob(["\uFEFF", csvText(headers, rows)], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Exports the currently loaded, filtered rows; provider limits are disclosed in the workspace. */
export function downloadRecords(name: string, rows: object[]): void {
  const flatten = (row: object): Record<string, Cell> => Object.fromEntries(Object.entries(row).flatMap(([key, value]) => {
    if (key === "metrics" && value && typeof value === "object") return Object.entries(value).map(([field, cell]) => [field === "spend" ? "spend_minor_units" : field, cell as Cell]);
    return [[key === "budget" ? "budget_minor_units" : key, Array.isArray(value) || (value && typeof value === "object") ? JSON.stringify(value) : value as Cell]];
  }));
  const values = rows.map(flatten);
  const headers = [...new Set(values.flatMap(row => Object.keys(row)))];
  downloadCsv(name, headers.length ? headers : ["No Loaded Results"], values.map(row => headers.map(key => row[key])));
}
