/**
 * Shared chart configuration.
 *
 * Colours come from design tokens so charts stay part of the same system as
 * the rest of the UI, and axis/grid styling is defined once.
 */
export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

export const CHART_AXIS_PROPS = {
  stroke: "var(--muted-foreground)",
  tickLine: false,
  axisLine: false,
  tick: { fontSize: 11, fill: "var(--muted-foreground)" },
} as const;

export const CHART_GRID_PROPS = {
  stroke: "var(--border)",
  strokeDasharray: "3 3",
  vertical: false,
} as const;

export const CHART_TOOLTIP_STYLE = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "0.5rem",
  boxShadow: "var(--shadow-md)",
  fontSize: "0.75rem",
  padding: "0.5rem 0.75rem",
} as const;

export const CHART_TOOLTIP_LABEL_STYLE = {
  color: "var(--muted-foreground)",
  fontSize: "0.6875rem",
  marginBottom: "0.25rem",
} as const;

/** Chart x-axis labels: "9 Sep" rather than a full ISO date. */
export function formatAxisDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short" });
}
