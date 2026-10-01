/**
 * Variable extraction for the Add-WhatsApp-Template form.
 *
 * Two paths fill a template's `variables` list, and they have different rules:
 *
 *  1. Autofill from AiSensy — whatever the provider returns is trusted, so a
 *     WhatsApp-native body (`{{1}}, {{2}}`) is accepted as-is.
 *  2. Body typed by the operator — only named placeholders are accepted, so we
 *     detect numbered ones and the form can explain how to fix the body.
 *
 * Order matters. `template.variables` is stored as an ordered array and
 * `WhatsAppService.executeSend` maps it positionally onto AiSensy's
 * `templateParams[]`, so first-appearance order in the body is the contract.
 */

const PLACEHOLDER = /\{\{\s*([^{}]+?)\s*\}\}/g;

/** A WhatsApp/AiSensy template body resolves to exactly one of these. */
export interface TemplateVariableExtraction {
  /** Named variables, trimmed, de-duplicated, in first-appearance order. */
  variables: string[];
  /** Numbered tokens found (`{{1}}` → `"1"`), in text order. Non-empty means
   *  the body cannot be saved through the manual path. */
  numericTokens: string[];
  /** Every `{{…}}` token found, named and numbered, in text order. */
  tokens: string[];
}

function isNumericToken(token: string): boolean {
  return /^\d+$/.test(token);
}

/**
 * Reads the placeholders out of a template body.
 *
 * `{{ first_name }}` is tolerated (trimmed), `{{}}` is ignored, and a name
 * repeated in the body is reported once — the send modal renders one input per
 * entry, so a duplicate would otherwise ask for the same value twice.
 */
export function extractTemplateVariables(body: string): TemplateVariableExtraction {
  const tokens: string[] = [];
  const numericTokens: string[] = [];
  const variables: string[] = [];
  const seen = new Set<string>();

  for (const match of body.matchAll(PLACEHOLDER)) {
    const token = match[1]?.trim() ?? "";
    if (!token) continue;
    tokens.push(token);
    if (isNumericToken(token)) {
      numericTokens.push(token);
      continue;
    }
    if (!seen.has(token)) {
      seen.add(token);
      variables.push(token);
    }
  }

  return { variables, numericTokens, tokens };
}

/** True when the body uses `{{1}}`-style placeholders the manual path rejects. */
export function hasNumericPlaceholders(body: string): boolean {
  return extractTemplateVariables(body).numericTokens.length > 0;
}

/**
 * Every placeholder in text order, de-duplicated — named and numbered together.
 *
 * This is the list to store as `template.variables`: `executeSend` maps it
 * positionally onto AiSensy's `templateParams[]`, so it must line up with the
 * order the placeholders appear in the body.
 */
export function extractAllVariables(body: string): string[] {
  const { tokens } = extractTemplateVariables(body);
  return [...new Set(tokens)];
}

/** Number of detected placeholders, for the form's "N detected" badge. */
export function countTemplateVariables(body: string): number {
  const { variables, numericTokens } = extractTemplateVariables(body);
  return variables.length + numericTokens.length;
}

/** Human copy shown when a manually typed body uses numbered placeholders. */
export function describeNumericPlaceholders(numericTokens: string[]): string {
  const listed = numericTokens.map((token) => `{{${token}}}`).join(", ");
  return `Numbered placeholders (${listed}) aren't supported here. Use named placeholders like {{first_name}} instead.`;
}
