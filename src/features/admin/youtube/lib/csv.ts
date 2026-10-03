/** A CSV cell. Text starting with = + - @ (or a control character) is prefixed so a spreadsheet never runs it as a formula. */
export function csvCell(cell: string | number): string {
  const text = String(cell);
  const safe = typeof cell === "string" && /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}
