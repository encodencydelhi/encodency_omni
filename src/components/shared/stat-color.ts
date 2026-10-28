/**
 * Colours for stat cards across the Super Admin. One family per card: a tinted card, a matching border, an icon chip
 * and an ink colour for small graphics. Class names are written out in full so Tailwind keeps them.
 */
export const STAT_COLORS = {
  blue: { card: "border-info/25 bg-info-subtle", chip: "bg-info/15 text-info", ink: "text-info" },
  violet: { card: "border-violet/25 bg-violet-subtle", chip: "bg-violet/15 text-violet", ink: "text-violet" },
  red: { card: "border-primary/25 bg-primary-subtle", chip: "bg-primary/15 text-primary", ink: "text-primary" },
  green: { card: "border-success/25 bg-success-subtle", chip: "bg-success/15 text-success", ink: "text-success" },
  amber: { card: "border-warning/30 bg-warning-subtle", chip: "bg-warning/20 text-warning", ink: "text-warning" },
  grey: { card: "border-neutral/25 bg-neutral-subtle", chip: "bg-neutral/15 text-neutral", ink: "text-neutral" },
  danger: { card: "border-danger/25 bg-danger-subtle", chip: "bg-danger/15 text-danger", ink: "text-danger" },
} as const;

export type StatColor = keyof typeof STAT_COLORS;

/** The order colours are handed out in when cards do not choose one: neighbours never match. */
const CYCLE: readonly StatColor[] = ["blue", "violet", "green", "amber", "red", "grey"];

export function cycleStatColor(index: number): StatColor {
  return CYCLE[((index % CYCLE.length) + CYCLE.length) % CYCLE.length]!;
}

/** The colour a meaning stands for; "neutral" (or nothing) leaves the choice to the caller. */
export function statColorForTone(tone: string | undefined | null): StatColor | undefined {
  switch (tone) {
    case "success":
    case "good":
    case "positive":
    case "green":
    case "emerald":
      return "green";
    case "warning":
    case "warn":
    case "amber":
    case "orange":
    case "yellow":
      return "amber";
    case "danger":
    case "critical":
    case "error":
    case "red":
    case "rose":
      return "danger";
    case "info":
    case "blue":
    case "sky":
    case "cyan":
      return "blue";
    case "brand":
    case "primary":
      return "red";
    case "violet":
    case "purple":
    case "indigo":
      return "violet";
    default:
      return undefined;
  }
}

const LABEL_RULES: ReadonlyArray<readonly [RegExp, StatColor]> = [
  [/fail|overdue|past due|critical|error|breach|outage|incident|exception|dispute|exceed|expired|revoked|reject|block|suspend|deactivat|unhealthy|down\b/i, "danger"],
  [/pending|open|\bdue\b|waiting|queued|attention|warning|review|unpaid|outstanding|trial|expiring|inactive|retry|draft|partial|stale|degraded/i, "amber"],
  [/paid|collected|active|healthy|success|connected|resolved|complet|revenue|mrr|deliver|online|operational|verified|enabled|enrolled|good|uptime|available/i, "green"],
  [/credit|plan|subscription|admin|role|member|team|assigned|multi|permission|override/i, "violet"],
  [/total|\ball\b|invoice|account|request|ticket|user|client|compan|integration|queue|event|webhook|endpoint|job|workflow|flag|rollout|api|latency|volume|usage/i, "blue"],
];

/** A stable colour for a card that names its measurement but not a colour ("Overdue" red, "Collected" green, ...). */
export function statColorForLabel(label: string): StatColor {
  for (const [pattern, color] of LABEL_RULES) if (pattern.test(label)) return color;
  let hash = 0;
  for (const ch of label) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return cycleStatColor(hash);
}
