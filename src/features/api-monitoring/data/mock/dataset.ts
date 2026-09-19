/**
 * EnCodency OmniPlatform - Super Admin API Monitoring Module
 * Deterministic Mock Dataset Builder
 */

import type {
  ApiEndpoint,
  ApiErrorLog,
  ApiRequestLog,
  ProviderApiHealth,
  ApiMonitoringKpis,
  ErrorBreakdown,
  ErrorCategory,
  RequestTrendPoint,
  ApiMonitoringActivity,
} from "../types";
import { MOCK_REFERENCE_TIME } from "../config";

function seedRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function isoTime(ms: number): string {
  return new Date(ms).toISOString();
}

const ENDPOINTS: Omit<ApiEndpoint, "totalRequests24h" | "successRate" | "avgResponseMs" | "p95ResponseMs" | "p99ResponseMs" | "errorCount24h" | "rateLimitRemaining" | "lastCalledAt" | "lastErrorAt" | "lastError">[] = [
  { id: "ep_meta_publish", method: "POST", path: "/v1/meta/publish", displayName: "Meta Publish", provider: "meta", category: "Publishing", status: "healthy", rateLimitState: "normal", rateLimitMax: 200, rateLimitResetsAt: isoTime(MOCK_REFERENCE_TIME + 3600_000) },
  { id: "ep_meta_analytics", method: "GET", path: "/v1/meta/analytics", displayName: "Meta Analytics", provider: "meta", category: "Analytics", status: "healthy", rateLimitState: "normal", rateLimitMax: 500, rateLimitResetsAt: isoTime(MOCK_REFERENCE_TIME + 3600_000) },
  { id: "ep_meta_comments", method: "GET", path: "/v1/meta/comments", displayName: "Meta Comments", provider: "meta", category: "Engagement", status: "healthy", rateLimitState: "normal", rateLimitMax: 300, rateLimitResetsAt: isoTime(MOCK_REFERENCE_TIME + 3600_000) },
  { id: "ep_meta_webhook", method: "POST", path: "/v1/meta/webhook", displayName: "Meta Webhook", provider: "meta", category: "Webhooks", status: "healthy", rateLimitState: "normal", rateLimitMax: 1000, rateLimitResetsAt: isoTime(MOCK_REFERENCE_TIME + 3600_000) },
  { id: "ep_meta_insights", method: "GET", path: "/v1/meta/insights", displayName: "Meta Insights", provider: "meta", category: "Analytics", status: "degraded", rateLimitState: "approaching", rateLimitMax: 100, rateLimitResetsAt: isoTime(MOCK_REFERENCE_TIME + 1800_000) },
  { id: "ep_linkedin_publish", method: "POST", path: "/v1/linkedin/publish", displayName: "LinkedIn Publish", provider: "linkedin", category: "Publishing", status: "healthy", rateLimitState: "normal", rateLimitMax: 100, rateLimitResetsAt: isoTime(MOCK_REFERENCE_TIME + 3600_000) },
  { id: "ep_linkedin_analytics", method: "GET", path: "/v1/linkedin/analytics", displayName: "LinkedIn Analytics", provider: "linkedin", category: "Analytics", status: "healthy", rateLimitState: "normal", rateLimitMax: 200, rateLimitResetsAt: isoTime(MOCK_REFERENCE_TIME + 3600_000) },
  { id: "ep_linkedin_org", method: "GET", path: "/v1/linkedin/organizations", displayName: "LinkedIn Organizations", provider: "linkedin", category: "Sync", status: "healthy", rateLimitState: "normal", rateLimitMax: 150, rateLimitResetsAt: isoTime(MOCK_REFERENCE_TIME + 3600_000) },
  { id: "ep_gbp_posts", method: "POST", path: "/v1/gbp/posts", displayName: "GBP Create Post", provider: "google_business", category: "Publishing", status: "healthy", rateLimitState: "normal", rateLimitMax: 50, rateLimitResetsAt: isoTime(MOCK_REFERENCE_TIME + 3600_000) },
  { id: "ep_gbp_reviews", method: "GET", path: "/v1/gbp/reviews", displayName: "GBP Reviews", provider: "google_business", category: "Engagement", status: "healthy", rateLimitState: "normal", rateLimitMax: 200, rateLimitResetsAt: isoTime(MOCK_REFERENCE_TIME + 3600_000) },
  { id: "ep_gbp_insights", method: "GET", path: "/v1/gbp/insights", displayName: "GBP Insights", provider: "google_business", category: "Analytics", status: "degraded", rateLimitState: "approaching", rateLimitMax: 100, rateLimitResetsAt: isoTime(MOCK_REFERENCE_TIME + 900_000) },
  { id: "ep_gbp_locations", method: "GET", path: "/v1/gbp/locations", displayName: "GBP Locations", provider: "google_business", category: "Sync", status: "healthy", rateLimitState: "normal", rateLimitMax: 100, rateLimitResetsAt: isoTime(MOCK_REFERENCE_TIME + 3600_000) },
  { id: "ep_youtube_upload", method: "POST", path: "/v1/youtube/upload", displayName: "YouTube Upload", provider: "youtube", category: "Publishing", status: "healthy", rateLimitState: "normal", rateLimitMax: 50, rateLimitResetsAt: isoTime(MOCK_REFERENCE_TIME + 3600_000) },
  { id: "ep_youtube_analytics", method: "GET", path: "/v1/youtube/analytics", displayName: "YouTube Analytics", provider: "youtube", category: "Analytics", status: "healthy", rateLimitState: "normal", rateLimitMax: 200, rateLimitResetsAt: isoTime(MOCK_REFERENCE_TIME + 3600_000) },
  { id: "ep_youtube_comments", method: "GET", path: "/v1/youtube/comments", displayName: "YouTube Comments", provider: "youtube", category: "Engagement", status: "failing", rateLimitState: "throttled", rateLimitMax: 100, rateLimitResetsAt: isoTime(MOCK_REFERENCE_TIME + 600_000) },
  { id: "ep_x_post", method: "POST", path: "/v1/x/posts", displayName: "X Post", provider: "x", category: "Publishing", status: "healthy", rateLimitState: "normal", rateLimitMax: 300, rateLimitResetsAt: isoTime(MOCK_REFERENCE_TIME + 3600_000) },
  { id: "ep_x_analytics", method: "GET", path: "/v1/x/analytics", displayName: "X Analytics", provider: "x", category: "Analytics", status: "healthy", rateLimitState: "normal", rateLimitMax: 150, rateLimitResetsAt: isoTime(MOCK_REFERENCE_TIME + 3600_000) },
  { id: "ep_whatsapp_send", method: "POST", path: "/v1/whatsapp/send", displayName: "WhatsApp Send", provider: "whatsapp", category: "Messaging", status: "healthy", rateLimitState: "normal", rateLimitMax: 500, rateLimitResetsAt: isoTime(MOCK_REFERENCE_TIME + 3600_000) },
  { id: "ep_whatsapp_templates", method: "GET", path: "/v1/whatsapp/templates", displayName: "WhatsApp Templates", provider: "whatsapp", category: "Messaging", status: "healthy", rateLimitState: "normal", rateLimitMax: 200, rateLimitResetsAt: isoTime(MOCK_REFERENCE_TIME + 3600_000) },
  { id: "ep_ga4_report", method: "GET", path: "/v1/ga4/reports", displayName: "GA4 Reports", provider: "ga4", category: "Analytics", status: "healthy", rateLimitState: "normal", rateLimitMax: 100, rateLimitResetsAt: isoTime(MOCK_REFERENCE_TIME + 3600_000) },
  { id: "ep_gsc_search", method: "GET", path: "/v1/gsc/search-analytics", displayName: "GSC Search Analytics", provider: "gsc", category: "SEO", status: "healthy", rateLimitState: "normal", rateLimitMax: 200, rateLimitResetsAt: isoTime(MOCK_REFERENCE_TIME + 3600_000) },
  { id: "ep_gsc_sitemaps", method: "GET", path: "/v1/gsc/sitemaps", displayName: "GSC Sitemaps", provider: "gsc", category: "SEO", status: "healthy", rateLimitState: "normal", rateLimitMax: 200, rateLimitResetsAt: isoTime(MOCK_REFERENCE_TIME + 3600_000) },
  { id: "ep_cloudinary_upload", method: "POST", path: "/v1/cloudinary/upload", displayName: "Cloudinary Upload", provider: "cloudinary", category: "Media", status: "healthy", rateLimitState: "normal", rateLimitMax: 1000, rateLimitResetsAt: isoTime(MOCK_REFERENCE_TIME + 3600_000) },
  { id: "ep_cloudinary_transform", method: "GET", path: "/v1/cloudinary/transform", displayName: "Cloudinary Transform", provider: "cloudinary", category: "Media", status: "healthy", rateLimitState: "normal", rateLimitMax: 5000, rateLimitResetsAt: isoTime(MOCK_REFERENCE_TIME + 3600_000) },
  { id: "ep_internal_sync", method: "POST", path: "/v1/internal/sync", displayName: "Internal Sync", provider: "internal", category: "Sync", status: "healthy", rateLimitState: "normal", rateLimitMax: 500, rateLimitResetsAt: isoTime(MOCK_REFERENCE_TIME + 3600_000) },
  { id: "ep_internal_webhook", method: "POST", path: "/v1/internal/webhooks", displayName: "Internal Webhooks", provider: "internal", category: "Webhooks", status: "healthy", rateLimitState: "normal", rateLimitMax: 2000, rateLimitResetsAt: isoTime(MOCK_REFERENCE_TIME + 3600_000) },
];

export function buildInitialApiMonitoringDataset() {
  const rand = seedRandom(42);
  const now = MOCK_REFERENCE_TIME;

  // Generate endpoints with realistic metrics
  const endpoints: ApiEndpoint[] = ENDPOINTS.map((ep) => {
    const baseRequests = ep.status === "failing" ? 20 + Math.floor(rand() * 30) :
      ep.status === "degraded" ? 80 + Math.floor(rand() * 120) :
      ep.status === "inactive" ? 0 :
      100 + Math.floor(rand() * 900);

    const errorRate = ep.status === "failing" ? 0.4 + rand() * 0.5 :
      ep.status === "degraded" ? 0.05 + rand() * 0.15 :
      0.001 + rand() * 0.03;

    const successRate = Math.round((1 - errorRate) * 10000) / 100;
    const totalRequests = baseRequests;
    const errorCount = Math.round(totalRequests * errorRate);
    const avgMs = ep.status === "failing" ? 800 + Math.floor(rand() * 2000) :
      ep.status === "degraded" ? 300 + Math.floor(rand() * 500) :
      50 + Math.floor(rand() * 200);

    const rateLimitRemaining = ep.rateLimitState === "exceeded" ? 0 :
      ep.rateLimitState === "throttled" ? Math.floor(rand() * 5) :
      ep.rateLimitState === "approaching" ? Math.floor(ep.rateLimitMax * (0.1 + rand() * 0.2)) :
      Math.floor(ep.rateLimitMax * (0.5 + rand() * 0.4));

    return {
      ...ep,
      totalRequests24h: totalRequests,
      successRate,
      avgResponseMs: avgMs,
      p95ResponseMs: Math.round(avgMs * (1.5 + rand())),
      p99ResponseMs: Math.round(avgMs * (2 + rand() * 2)),
      errorCount24h: errorCount,
      rateLimitRemaining,
      lastCalledAt: isoTime(now - Math.floor(rand() * 3600_000)),
      lastErrorAt: errorCount > 0 ? isoTime(now - Math.floor(rand() * 1800_000)) : null,
      lastError: errorCount > 0 ? (ep.status === "failing" ? "Provider returned 503: Service temporarily unavailable" : "Intermittent timeout on upstream provider") : null,
    };
  });

  // Generate error logs
  const errorLogs: ApiErrorLog[] = [];
  let errorId = 1;
  endpoints.filter((e) => e.errorCount24h > 0).forEach((ep) => {
    const count = Math.min(ep.errorCount24h, 8);
    for (let i = 0; i < count; i++) {
      const isServerError = ep.status === "failing" && rand() > 0.3;
      const isAuth = !isServerError && rand() > 0.7;
      const isRateLimit = !isServerError && !isAuth && rand() > 0.6;
      const statusCode = isServerError ? (rand() > 0.5 ? 503 : 500) :
        isAuth ? (rand() > 0.5 ? 401 : 403) :
        isRateLimit ? 429 :
        (rand() > 0.5 ? 400 : 404);

      errorLogs.push({
        id: `err_${String(errorId++).padStart(3, "0")}`,
        timestamp: isoTime(now - Math.floor(rand() * 86400_000)),
        endpointId: ep.id,
        method: ep.method,
        path: ep.path,
        provider: ep.provider,
        statusCode,
        category: isServerError ? "server_error" :
          isAuth ? (statusCode === 401 ? "authentication" : "authorization") :
          isRateLimit ? "rate_limit" :
          statusCode === 400 ? "validation" : "not_found",
        message: isServerError ? "Internal server error from upstream provider" :
          isAuth ? "Invalid or expired access token" :
          isRateLimit ? "Rate limit exceeded for this endpoint" :
          "Request validation failed",
        requestBody: null,
        responseBody: null,
        durationMs: 100 + Math.floor(rand() * 2000),
        severity: isServerError ? "error" : isAuth ? "warning" : "info",
      });
    }
  });

  // Generate request logs
  const requestLogs: ApiRequestLog[] = [];
  let reqId = 1;
  endpoints.forEach((ep) => {
    const sampleSize = Math.min(ep.totalRequests24h, 5);
    for (let i = 0; i < sampleSize; i++) {
      const isError = rand() < (1 - ep.successRate / 100);
      requestLogs.push({
        id: `req_${String(reqId++).padStart(3, "0")}`,
        timestamp: isoTime(now - Math.floor(rand() * 86400_000)),
        endpointId: ep.id,
        method: ep.method,
        path: ep.path,
        provider: ep.provider,
        statusCode: isError ? (rand() > 0.5 ? 500 : 429) : 200,
        durationMs: 20 + Math.floor(rand() * (ep.avgResponseMs * 2)),
        requestSize: Math.floor(200 + rand() * 2000),
        responseSize: Math.floor(500 + rand() * 5000),
        severity: isError ? "error" : "info",
      });
    }
  });

  // Provider health summary
  const providerMap = new Map<string, { name: string; endpoints: typeof endpoints }>();
  const providerNames: Record<string, string> = {
    meta: "Meta (Facebook & Instagram)",
    linkedin: "LinkedIn",
    google_business: "Google Business Profile",
    youtube: "YouTube",
    x: "X (Twitter)",
    whatsapp: "WhatsApp / AiSensy",
    ga4: "Google Analytics 4",
    gsc: "Google Search Console",
    cloudinary: "Cloudinary",
    internal: "Internal Services",
  };

  endpoints.forEach((ep) => {
    if (!providerMap.has(ep.provider)) {
      providerMap.set(ep.provider, { name: providerNames[ep.provider] ?? ep.provider, endpoints: [] });
    }
    providerMap.get(ep.provider)!.endpoints.push(ep);
  });

  const providerHealth: ProviderApiHealth[] = Array.from(providerMap.entries()).map(([provider, data]) => {
    const eps = data.endpoints;
    const totalReqs = eps.reduce((s, e) => s + e.totalRequests24h, 0);
    const totalErrors = eps.reduce((s, e) => s + e.errorCount24h, 0);
    const avgMs = eps.length > 0 ? Math.round(eps.reduce((s, e) => s + e.avgResponseMs, 0) / eps.length) : 0;
    const successRate = totalReqs > 0 ? Math.round(((totalReqs - totalErrors) / totalReqs) * 10000) / 100 : 100;
    const hasFailing = eps.some((e) => e.status === "failing");
    const hasDegraded = eps.some((e) => e.status === "degraded");
    const hasThrottled = eps.some((e) => e.rateLimitState === "throttled" || e.rateLimitState === "exceeded");

    return {
      provider,
      providerName: data.name,
      status: hasFailing ? "failing" as const : hasDegraded ? "degraded" as const : "healthy" as const,
      totalRequests24h: totalReqs,
      successRate,
      avgResponseMs: avgMs,
      errorCount24h: totalErrors,
      rateLimitState: hasThrottled ? "throttled" as const : eps.some((e) => e.rateLimitState === "approaching") ? "approaching" as const : "normal" as const,
      endpointCount: eps.length,
    };
  });

  // KPIs
  const totalReqs = endpoints.reduce((s, e) => s + e.totalRequests24h, 0);
  const totalErrors = endpoints.reduce((s, e) => s + e.errorCount24h, 0);
  const avgMsAll = endpoints.length > 0 ? Math.round(endpoints.reduce((s, e) => s + e.avgResponseMs, 0) / endpoints.length) : 0;
  const p95All = endpoints.length > 0 ? Math.round(endpoints.reduce((s, e) => s + e.p95ResponseMs, 0) / endpoints.length) : 0;
  const rateLimitedReqs = endpoints.filter((e) => e.rateLimitState === "throttled" || e.rateLimitState === "exceeded").reduce((s, e) => s + e.totalRequests24h, 0);

  const kpis: ApiMonitoringKpis = {
    totalRequests24h: totalReqs,
    successRate: totalReqs > 0 ? Math.round(((totalReqs - totalErrors) / totalReqs) * 10000) / 100 : 100,
    avgResponseMs: avgMsAll,
    errorRate: totalReqs > 0 ? Math.round((totalErrors / totalReqs) * 10000) / 100 : 0,
    rateLimitedRequests: rateLimitedReqs,
    activeEndpoints: endpoints.filter((e) => e.status !== "inactive").length,
    totalEndpoints: endpoints.length,
    p95ResponseMs: p95All,
  };

  // Error breakdown
  const categoryCounts = new Map<string, number>();
  errorLogs.forEach((e) => {
    categoryCounts.set(e.category, (categoryCounts.get(e.category) ?? 0) + 1);
  });
  const totalErrorCount = errorLogs.length || 1;
  const errorBreakdown: ErrorBreakdown[] = Array.from(categoryCounts.entries())
    .map(([cat, count]) => ({
      category: cat as ErrorCategory,
      count,
      percentage: Math.round((count / totalErrorCount) * 10000) / 100,
      topMessage: errorLogs.find((e) => e.category === cat)?.message ?? "",
    }))
    .sort((a, b) => b.count - a.count);

  // Request trends (last 24h, hourly)
  const requestTrends: RequestTrendPoint[] = [];
  for (let i = 23; i >= 0; i--) {
    const hourMs = i * 3600_000;
    const baseHourly = Math.floor(totalReqs / 24);
    const variance = 0.5 + rand();
    const requests = Math.floor(baseHourly * variance);
    const errorRatio = totalReqs > 0 ? totalErrors / totalReqs : 0;
    const errors = Math.floor(requests * errorRatio * (0.5 + rand()));
    requestTrends.push({
      timestamp: isoTime(now - hourMs),
      requests,
      errors,
      avgMs: Math.floor(avgMsAll * (0.6 + rand() * 0.8)),
    });
  }

  // Activity
  const activities: ApiMonitoringActivity[] = [
    { id: "act_001", timestamp: isoTime(now - 300_000), type: "error_spike_detected", provider: "youtube", endpoint: "YouTube Comments", message: "Error rate spike detected on YouTube Comments endpoint (42% error rate).", severity: "error", actor: "System Monitor" },
    { id: "act_002", timestamp: isoTime(now - 600_000), type: "rate_limit_changed", provider: "meta", endpoint: "Meta Insights", message: "Rate limit approaching threshold on Meta Insights endpoint.", severity: "warning", actor: "System Monitor" },
    { id: "act_003", timestamp: isoTime(now - 1800_000), type: "threshold_alert", provider: "google_business", endpoint: "GBP Insights", message: "Response time exceeded 500ms threshold on GBP Insights.", severity: "warning", actor: "System Monitor" },
    { id: "act_004", timestamp: isoTime(now - 3600_000), type: "configuration_updated", provider: "internal", endpoint: null, message: "Internal sync rate limit increased from 300 to 500 req/hour.", severity: "info", actor: "Admin User" },
    { id: "act_005", timestamp: isoTime(now - 7200_000), type: "provider_health_changed", provider: "youtube", endpoint: null, message: "YouTube provider health changed from healthy to degraded.", severity: "warning", actor: "System Monitor" },
    { id: "act_006", timestamp: isoTime(now - 14400_000), type: "endpoint_enabled", provider: "cloudinary", endpoint: "Cloudinary Transform", message: "Cloudinary Transform endpoint enabled for production use.", severity: "info", actor: "Admin User" },
    { id: "act_007", timestamp: isoTime(now - 28800_000), type: "error_spike_resolved", provider: "meta", endpoint: "Meta Publish", message: "Previous error spike on Meta Publish endpoint has resolved.", severity: "info", actor: "System Monitor" },
    { id: "act_008", timestamp: isoTime(now - 43200_000), type: "threshold_alert", provider: "meta", endpoint: "Meta Insights", message: "Rate limit usage crossed 80% on Meta Insights endpoint.", severity: "warning", actor: "System Monitor" },
  ];

  return {
    endpoints,
    errorLogs: errorLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    requestLogs: requestLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    providerHealth,
    kpis,
    errorBreakdown,
    requestTrends,
    activities,
  };
}

export type ApiMonitoringDataset = ReturnType<typeof buildInitialApiMonitoringDataset>;
