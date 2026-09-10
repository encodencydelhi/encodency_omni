export type Tone = "brand" | "success" | "warning" | "danger" | "info" | "neutral";

export interface StatusMeta {
  label: string;
  tone: Tone;
  description?: string;
}
export type StatusRegistry<TStatus extends string> = Record<TStatus, StatusMeta>;

export function toStatusOptions<TStatus extends string>(
  registry: StatusRegistry<TStatus>,
): Array<{ value: TStatus; label: string }> {
  return (Object.keys(registry) as TStatus[]).map((value) => ({
    value,
    label: registry[value].label,
  }));
}

export interface EntityRef {
  id: string;
  name: string;
}

export interface TrendPoint {
  date: string;
  value: number;
}

export interface MetricDelta {
  changePercent: number;
  direction: "up-is-good" | "down-is-good";
}

export interface DateRange {
  from: string;
  to: string;
}
