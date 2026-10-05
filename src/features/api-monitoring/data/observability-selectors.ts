import type { ApiEndpoint, ApiMonitoringSnapshot, ApiRequest, ApiTimeRange } from "./observability-types";

export function rangeMinutes(range: ApiTimeRange) {
  return range === "15m" ? 15 : range === "1h" ? 60 : range === "24h" ? 1440 : range === "7d" ? 10080 : range === "30d" ? 43200 : 1440;
}

export function requestsInRange(snapshot: ApiMonitoringSnapshot, range: ApiTimeRange, serviceId = "all", customMinutes?: number) {
  const floor = Date.parse(snapshot.generatedAt) - (range === "custom" ? customMinutes ?? 1440 : rangeMinutes(range)) * 60_000;
  return snapshot.requests.filter((request) => Date.parse(request.startedAt) >= floor && (serviceId === "all" || request.serviceId === serviceId));
}

export function percentile(values: number[], p: number) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index] ?? null;
}

export function statusClass(statusCode: number) {
  if (statusCode === 429) return "rate_limited";
  if (statusCode >= 500) return "server_error";
  if (statusCode >= 400) return "client_error";
  if (statusCode >= 300) return "redirect";
  return "success";
}

export function kpis(snapshot: ApiMonitoringSnapshot, range: ApiTimeRange, serviceId = "all", customMinutes?: number) {
  const a = snapshot.aggregates;
  if (a) {
    const stats = endpointStats(snapshot);
    return {
      total: a.totalRequests,
      http2xxRate: a.totalRequests ? (a.success2xx / a.totalRequests) * 100 : 0,
      http5xxRate: a.totalRequests ? (a.serverErrors / a.totalRequests) * 100 : 0,
      p95: a.p95,
      throttled: a.throttled,
      observed: a.services.length,
      slow: stats.filter((row) => row.p95 !== null && row.p95 > row.endpoint.p95TargetMs).length,
      gaps: stats.filter((row) => row.endpoint.enabled && row.requests === 0).length,
    };
  }
  const rows = requestsInRange(snapshot, range, serviceId, customMinutes);
  const total = rows.length;
  const success = rows.filter((row) => row.statusCode >= 200 && row.statusCode < 300).length;
  const serverErrors = rows.filter((row) => row.statusCode >= 500).length;
  const throttled = rows.filter((row) => row.statusCode === 429).length;
  const slow = endpointStats(snapshot, rows).filter((row) => row.p95 !== null && row.p95 > row.endpoint.p95TargetMs).length;
  const observed = new Set(rows.map((row) => row.serviceId)).size;
  const p95 = percentile(rows.map((row) => row.durationMs), 95);
  return {
    total,
    http2xxRate: total ? (success / total) * 100 : 0,
    http5xxRate: total ? (serverErrors / total) * 100 : 0,
    p95,
    throttled,
    observed,
    slow,
    gaps: snapshot.endpoints.filter((endpoint) => !rows.some((row) => row.endpointId === endpoint.id)).length,
  };
}

export function endpointStats(snapshot: ApiMonitoringSnapshot, rows: ApiRequest[] = snapshot.requests) {
  const a = snapshot.aggregates;
  if (a) {
    return snapshot.endpoints.map((endpoint) => {
      const row = a.endpoints.find((item) => item.endpointId === endpoint.id);
      return {
        endpoint,
        requests: row?.requests ?? 0,
        rate5xx: row && row.requests ? (row.errors5xx / row.requests) * 100 : 0,
        throttled: row?.throttled ?? 0,
        p50: row?.p50 ?? null,
        p95: row?.p95 ?? null,
        p99: row?.p99 ?? null,
        lastSeen: row?.lastSeen ?? null,
      };
    });
  }
  return snapshot.endpoints.map((endpoint) => {
    const matching = rows.filter((row) => row.endpointId === endpoint.id);
    const total = matching.length;
    const failures5xx = matching.filter((row) => row.statusCode >= 500).length;
    const throttled = matching.filter((row) => row.statusCode === 429).length;
    return {
      endpoint,
      requests: total,
      rate5xx: total ? (failures5xx / total) * 100 : 0,
      throttled,
      p50: percentile(matching.map((row) => row.durationMs), 50),
      p95: percentile(matching.map((row) => row.durationMs), 95),
      p99: matching.length >= 30 ? percentile(matching.map((row) => row.durationMs), 99) : null,
      lastSeen: matching.map((row) => row.startedAt).sort().at(-1) ?? null,
    };
  });
}

export function serviceStats(snapshot: ApiMonitoringSnapshot, rows: ApiRequest[]) {
  const a = snapshot.aggregates;
  if (a) {
    return snapshot.services.map((service) => {
      const row = a.services.find((item) => item.serviceId === service.id);
      const requests = row?.requests ?? 0;
      return { service, requests, rate5xx: requests ? ((row?.errors5xx ?? 0) / requests) * 100 : 0, throttled: row?.throttled ?? 0, p95: row?.p95 ?? null, freshness: requests ? ("fresh" as const) : ("missing" as const) };
    });
  }
  return snapshot.services.map((service) => {
    const matching = rows.filter((row) => row.serviceId === service.id);
    const total = matching.length;
    return {
      service,
      requests: total,
      rate5xx: total ? (matching.filter((row) => row.statusCode >= 500).length / total) * 100 : 0,
      throttled: matching.filter((row) => row.statusCode === 429).length,
      p95: percentile(matching.map((row) => row.durationMs), 95),
      freshness: matching.length ? "fresh" as const : "missing" as const,
    };
  });
}

export function errorGroupMembers(snapshot: ApiMonitoringSnapshot, errorGroupId: string) {
  return snapshot.requests.filter((request) => request.errorGroupId === errorGroupId);
}

export function endpointLabel(endpoint: ApiEndpoint) {
  return `${endpoint.method} ${endpoint.path}`;
}
