/**
 * The caption editor stores HTML. Templates and ideas are plain text with line breaks, and the preview needs plain text again.
 */

const ESCAPE: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => ESCAPE[ch] ?? ch);
}

/** Blank lines separate paragraphs; a single line break stays a line break. */
export function plainTextToHtml(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

const NAMED_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/** HTML from the editor as readable plain text: block ends and <br> become line breaks, tags are dropped, entities decoded. */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/\s*(p|div|li|h[1-6])\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
      if (entity[0] === "#") {
        const code = entity[1]?.toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : match;
      }
      return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
