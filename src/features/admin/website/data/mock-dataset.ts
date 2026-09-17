/**
 * Deterministic mock dataset for the Website module.
 *
 * Nothing here is random at render time: every number is either hand-authored
 * or derived from a seeded PRNG and a fixed reference clock, so the server and
 * the client always agree and screenshots stay stable between reloads.
 *
 * This file is an implementation detail of `mock-provider.ts`. UI components
 * must never import it directly — they go through the repository.
 */

import { WEBSITE_REFERENCE_NOW } from "./config";
import type {
  AnalyticsData,
  ChangeRecord,
  ContactLinkRecord,
  CtaRecord,
  ErrorSample,
  FixGuide,
  FormRecord,
  FormsData,
  IntegrationKey,
  IntegrationState,
  IssueCategory,
  IssueRecord,
  MonitoringData,
  PageAudit,
  PageRecord,
  PageType,
  PerformanceData,
  ScanRecord,
  ScoreSet,
  SeoData,
  Severity,
  TechnologyDetection,
  TrendPoint,
  UptimeIncident,
  WebsiteCapability,
  WebsiteCapabilityState,
  WebsiteSettings,
  WebsiteSummary,
  WebsiteTarget,
} from "./types";

/* ------------------------------------------------------------------ */
/* Clock + deterministic helpers                                       */
/* ------------------------------------------------------------------ */

const NOW = new Date(WEBSITE_REFERENCE_NOW).getTime();
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const shift = (ms: number) => new Date(NOW + ms).toISOString();
export const daysAgo = (days: number, hours = 0) => shift(-(days * DAY + hours * HOUR));
export const hoursAgo = (hours: number) => shift(-hours * HOUR);
export const hoursAhead = (hours: number) => shift(hours * HOUR);
export const daysAhead = (days: number) => shift(days * DAY);

function seedFrom(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — small, fast, and identical on every platform. */
function makeRng(text: string): () => number {
  let a = seedFrom(text);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function at<T>(items: readonly T[], index: number): T {
  return items[((index % items.length) + items.length) % items.length] as T;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round = (value: number, digits = 0) => {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
};

/* ------------------------------------------------------------------ */
/* Client → website directory (stands in for the Client Profile service) */
/* ------------------------------------------------------------------ */

export interface ClientWebsiteProfile {
  clientId: string;
  clientName: string;
  /** Null models a client saved without a website URL. */
  domain: string | null;
  /** How many of the page seeds this site actually has. */
  pageCount: number;
  /** Shifts every score, so the two demo sites do not look identical. */
  scoreOffset: number;
  verified: boolean;
  status: WebsiteTarget["status"];
  integrations: Record<IntegrationKey, IntegrationState["status"]>;
}

export const CLIENT_WEBSITE_DIRECTORY: ClientWebsiteProfile[] = [
  {
    clientId: "moksha-sewa",
    clientName: "Moksha Sewa",
    domain: "mokshasewa.org",
    pageCount: 26,
    scoreOffset: 0,
    verified: true,
    status: "live",
    integrations: {
      ga4: "connected",
      searchConsole: "connected",
      omniTracking: "not-installed",
      ownership: "connected",
    },
  },
  {
    clientId: "ganga-aarti",
    clientName: "Ganga Aarti",
    domain: "gangaaarti.org",
    pageCount: 17,
    scoreOffset: -9,
    verified: false,
    status: "degraded",
    integrations: {
      ga4: "not-connected",
      searchConsole: "not-connected",
      omniTracking: "not-installed",
      ownership: "not-connected",
    },
  },
  {
    // Saved without a website URL — drives the "No website configured" state.
    clientId: "green-ghats",
    clientName: "Green Ghats",
    domain: null,
    pageCount: 0,
    scoreOffset: 0,
    verified: false,
    status: "unknown",
    integrations: {
      ga4: "not-connected",
      searchConsole: "not-connected",
      omniTracking: "not-installed",
      ownership: "not-connected",
    },
  },
];

export function findClientProfile(clientId: string): ClientWebsiteProfile | undefined {
  return CLIENT_WEBSITE_DIRECTORY.find((entry) => entry.clientId === clientId);
}

/* ------------------------------------------------------------------ */
/* Page seeds                                                          */
/* ------------------------------------------------------------------ */

interface PageSeed {
  path: string;
  title: string;
  type: PageType;
  httpStatus?: number;
  seo: number;
  perf: number;
  a11y: number;
  words: number;
  weightKb: number;
  loadMs: number;
  depth: number;
  indexable?: boolean;
}

const PAGE_SEEDS: PageSeed[] = [
  { path: "/", title: "Moksha Sewa — Restoring the Ganga, Together", type: "standard", seo: 91, perf: 74, a11y: 88, words: 1240, weightKb: 2180, loadMs: 2600, depth: 0 },
  { path: "/about", title: "About Moksha Sewa", type: "standard", seo: 86, perf: 81, a11y: 90, words: 980, weightKb: 1420, loadMs: 2100, depth: 1 },
  { path: "/our-work", title: "Our Work & Impact", type: "standard", seo: 84, perf: 69, a11y: 82, words: 1560, weightKb: 2890, loadMs: 3200, depth: 1 },
  { path: "/programs/river-cleanup", title: "River Cleanup Programme", type: "standard", seo: 78, perf: 71, a11y: 79, words: 1180, weightKb: 2340, loadMs: 2950, depth: 2 },
  { path: "/programs/tree-plantation", title: "Tree Plantation Drive", type: "standard", seo: 81, perf: 76, a11y: 84, words: 1040, weightKb: 1980, loadMs: 2480, depth: 2 },
  { path: "/donate", title: "Donate — Support Clean Ganga", type: "landing", seo: 94, perf: 66, a11y: 74, words: 640, weightKb: 3120, loadMs: 3900, depth: 1 },
  { path: "/campaigns/clean-ganga-2026", title: "Clean Ganga 2026 Campaign", type: "landing", seo: 72, perf: 58, a11y: 71, words: 520, weightKb: 3860, loadMs: 4600, depth: 2 },
  { path: "/volunteer", title: "Volunteer With Us", type: "landing", seo: 88, perf: 79, a11y: 68, words: 720, weightKb: 1760, loadMs: 2300, depth: 1 },
  { path: "/events/ganga-aarti-drive", title: "Ganga Aarti Clean-Up Drive", type: "standard", seo: 69, perf: 73, a11y: 80, words: 480, weightKb: 2020, loadMs: 2700, depth: 2 },
  { path: "/impact-report-2025", title: "Impact Report 2025", type: "landing", seo: 64, perf: 52, a11y: 66, words: 2150, weightKb: 5240, loadMs: 5400, depth: 1 },
  { path: "/blog", title: "News & Field Notes", type: "standard", seo: 82, perf: 77, a11y: 86, words: 380, weightKb: 1640, loadMs: 2200, depth: 1 },
  { path: "/blog/why-river-restoration-matters", title: "Why River Restoration Matters", type: "blog", seo: 89, perf: 84, a11y: 91, words: 1820, weightKb: 1180, loadMs: 1900, depth: 2 },
  { path: "/blog/volunteer-diaries-varanasi", title: "Volunteer Diaries: Varanasi", type: "blog", seo: 76, perf: 80, a11y: 88, words: 1340, weightKb: 1520, loadMs: 2050, depth: 2 },
  { path: "/blog/plastic-free-ghats", title: "Towards Plastic-Free Ghats", type: "blog", seo: 71, perf: 82, a11y: 87, words: 1120, weightKb: 1360, loadMs: 1980, depth: 2 },
  { path: "/blog/monsoon-plantation-guide", title: "A Monsoon Plantation Guide", type: "blog", seo: 58, perf: 78, a11y: 83, words: 290, weightKb: 1240, loadMs: 1870, depth: 2 },
  { path: "/media/press", title: "Press & Media", type: "standard", seo: 74, perf: 83, a11y: 85, words: 620, weightKb: 1280, loadMs: 1920, depth: 2 },
  { path: "/gallery", title: "Photo Gallery", type: "standard", seo: 56, perf: 47, a11y: 58, words: 140, weightKb: 6380, loadMs: 6100, depth: 1 },
  { path: "/contact", title: "Contact Moksha Sewa", type: "standard", seo: 87, perf: 85, a11y: 76, words: 410, weightKb: 1180, loadMs: 1840, depth: 1 },
  { path: "/privacy-policy", title: "Privacy Policy", type: "legal", seo: 79, perf: 91, a11y: 92, words: 1680, weightKb: 640, loadMs: 1320, depth: 1 },
  { path: "/terms", title: "Terms of Use", type: "legal", seo: 77, perf: 92, a11y: 93, words: 1420, weightKb: 610, loadMs: 1290, depth: 1 },
  { path: "/refund-policy", title: "Donation & Refund Policy", type: "legal", seo: 73, perf: 90, a11y: 91, words: 860, weightKb: 620, loadMs: 1310, depth: 2 },
  { path: "/search", title: "Search", type: "utility", seo: 42, perf: 88, a11y: 74, words: 60, weightKb: 720, loadMs: 1400, depth: 1, indexable: false },
  { path: "/thank-you", title: "Thank You", type: "utility", seo: 48, perf: 93, a11y: 89, words: 120, weightKb: 580, loadMs: 1220, depth: 2, indexable: false },
  { path: "/old-donate", title: "Old Donate (redirects to /donate)", type: "redirect", httpStatus: 301, seo: 0, perf: 0, a11y: 0, words: 0, weightKb: 0, loadMs: 240, depth: 1, indexable: false },
  { path: "/programs/water-testing", title: "Water Testing Lab — Not Found", type: "error", httpStatus: 404, seo: 0, perf: 0, a11y: 0, words: 0, weightKb: 0, loadMs: 310, depth: 2, indexable: false },
  { path: "/newsletter-archive", title: "Newsletter Archive", type: "utility", seo: 51, perf: 86, a11y: 81, words: 240, weightKb: 880, loadMs: 1560, depth: 2 },
];

/* ------------------------------------------------------------------ */
/* Issue + fix-guide seeds                                             */
/* ------------------------------------------------------------------ */

interface IssueSeed {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  category: IssueCategory;
  /** Page paths, or `"site"` for a site-wide finding. */
  paths: string[] | "site";
  detectedDaysAgo: number;
  recommendation: string;
  fixGuideId: string;
  evidence: string | null;
  resolvedDaysAgo?: number;
}

const ISSUE_SEEDS: IssueSeed[] = [
  {
    id: "iss-404-internal",
    title: "Internal links point to a 404 page",
    description:
      "Three pages link to /programs/water-testing, which returns a 404. Visitors who follow the link reach a dead end and crawl budget is wasted on a missing URL.",
    severity: "critical",
    category: "links",
    paths: ["/our-work", "/programs/river-cleanup", "/"],
    detectedDaysAgo: 2,
    recommendation:
      "Either restore the page or update the three source links to the correct destination, then re-scan.",
    fixGuideId: "fg-broken-links",
    evidence: "3 internal links → 404",
  },
  {
    id: "iss-donate-form-consent",
    title: "Donation form has no consent checkbox",
    description:
      "The donation form on /donate collects name, email, phone and amount but no consent field was detected. Consent is expected for marketing follow-up under Indian and EU privacy rules.",
    severity: "critical",
    category: "forms",
    paths: ["/donate"],
    detectedDaysAgo: 5,
    recommendation:
      "Add an explicit, unticked consent checkbox with a link to the privacy policy before the submit button.",
    fixGuideId: "fg-form-consent",
    evidence: "0 consent inputs detected in 6 fields",
  },
  {
    id: "iss-lcp-campaign",
    title: "Largest Contentful Paint above 4 seconds",
    description:
      "The campaign landing page renders its hero image at full resolution and blocks paint on two third-party scripts. LCP measured at 4.8s on a simulated 4G connection.",
    severity: "critical",
    category: "performance",
    paths: ["/campaigns/clean-ganga-2026", "/impact-report-2025"],
    detectedDaysAgo: 1,
    recommendation:
      "Serve the hero image in WebP at the displayed size, preload it, and defer the non-critical third-party scripts.",
    fixGuideId: "fg-lcp",
    evidence: "LCP 4.8s (target ≤ 2.5s)",
  },
  {
    id: "iss-ssl-expiry",
    title: "SSL certificate expires in 24 days",
    description:
      "The certificate for the domain expires soon. If auto-renewal is not configured, visitors will see a browser warning the moment it lapses.",
    severity: "high",
    category: "ssl",
    paths: "site",
    detectedDaysAgo: 1,
    recommendation:
      "Confirm auto-renewal with the hosting provider, or schedule a manual renewal at least 7 days before expiry.",
    fixGuideId: "fg-ssl-renewal",
    evidence: "Valid to 11 Oct 2026",
  },
  {
    id: "iss-missing-meta",
    title: "Missing meta descriptions",
    description:
      "Six pages have no meta description. Search engines will generate their own snippet, which usually reads worse than a written one and lowers click-through rate.",
    severity: "high",
    category: "seo",
    paths: ["/gallery", "/search", "/thank-you", "/newsletter-archive", "/events/ganga-aarti-drive", "/media/press"],
    detectedDaysAgo: 4,
    recommendation:
      "Write a unique 140–160 character description for each page, leading with the page's primary benefit.",
    fixGuideId: "fg-meta-description",
    evidence: "6 of 24 indexable pages",
  },
  {
    id: "iss-duplicate-title",
    title: "Duplicate title tags",
    description:
      "Two blog posts share the title 'News & Field Notes — Moksha Sewa'. Duplicate titles make it harder for search engines to tell the pages apart.",
    severity: "high",
    category: "seo",
    paths: ["/blog/plastic-free-ghats", "/blog/monsoon-plantation-guide"],
    detectedDaysAgo: 4,
    recommendation: "Give each post a distinct, descriptive title under 60 characters.",
    fixGuideId: "fg-duplicate-title",
    evidence: "2 pages share 1 title",
  },
  {
    id: "iss-images-alt",
    title: "Images missing alt text",
    description:
      "34 images across the site have no alt attribute. Screen-reader users get no description, and the images cannot rank in image search.",
    severity: "high",
    category: "accessibility",
    paths: ["/gallery", "/our-work", "/impact-report-2025", "/campaigns/clean-ganga-2026"],
    detectedDaysAgo: 6,
    recommendation:
      "Add descriptive alt text to content images and an empty alt (alt=\"\") to purely decorative ones.",
    fixGuideId: "fg-image-alt",
    evidence: "34 images without alt",
  },
  {
    id: "iss-redirect-chain",
    title: "Redirect chain on donation URL",
    description:
      "/old-donate redirects to /donate-now, which redirects again to /donate. Every hop costs a round trip and dilutes link signals.",
    severity: "medium",
    category: "technical",
    paths: ["/old-donate"],
    detectedDaysAgo: 8,
    recommendation: "Point /old-donate straight at /donate with a single 301.",
    fixGuideId: "fg-redirect-chain",
    evidence: "2 hops",
  },
  {
    id: "iss-thin-content",
    title: "Thin content detected",
    description:
      "Two pages have under 300 words of unique body copy. Thin pages rarely rank and can dilute the site's topical authority.",
    severity: "medium",
    category: "seo",
    paths: ["/blog/monsoon-plantation-guide", "/gallery"],
    detectedDaysAgo: 7,
    recommendation:
      "Expand these pages to at least 600 words of useful content, or consolidate them into a stronger related page.",
    fixGuideId: "fg-thin-content",
    evidence: "290 and 140 words",
  },
  {
    id: "iss-cta-label",
    title: "CTA buttons with non-descriptive labels",
    description:
      "Five buttons read 'Click Here' or 'Read More'. Out of context these tell neither a visitor nor a screen reader where the link goes.",
    severity: "medium",
    category: "forms",
    paths: ["/our-work", "/blog", "/media/press"],
    detectedDaysAgo: 9,
    recommendation: "Rewrite each label to name the destination, e.g. 'Read the 2025 impact report'.",
    fixGuideId: "fg-cta-label",
    evidence: "5 CTAs",
  },
  {
    id: "iss-csp-missing",
    title: "Content-Security-Policy header not set",
    description:
      "No CSP header was returned. A policy limits which scripts a browser will execute and is one of the cheapest defences against injected third-party code.",
    severity: "medium",
    category: "security",
    paths: "site",
    detectedDaysAgo: 12,
    recommendation:
      "Start with a report-only policy covering scripts and frames, review the reports, then enforce it.",
    fixGuideId: "fg-security-headers",
    evidence: "Header absent on all sampled responses",
  },
  {
    id: "iss-mixed-content",
    title: "Mixed content on one page",
    description:
      "The gallery page loads two images over http://. Browsers block or downgrade these, and the padlock disappears for visitors.",
    severity: "medium",
    category: "security",
    paths: ["/gallery"],
    detectedDaysAgo: 6,
    recommendation: "Update the two image URLs to https:// and add an upgrade-insecure-requests directive.",
    fixGuideId: "fg-mixed-content",
    evidence: "2 insecure subresources",
  },
  {
    id: "iss-unused-js",
    title: "Large unused JavaScript bundle",
    description:
      "412 KB of JavaScript is downloaded on every page, of which roughly 61% is never executed on the home page.",
    severity: "medium",
    category: "performance",
    paths: ["/", "/our-work", "/donate"],
    detectedDaysAgo: 3,
    recommendation: "Split the bundle per route and load the slider and map libraries only where they are used.",
    fixGuideId: "fg-unused-js",
    evidence: "251 KB unused",
  },
  {
    id: "iss-h1-missing",
    title: "Missing H1 heading",
    description: "Two pages have no H1. The H1 is the strongest on-page signal of what a page is about.",
    severity: "medium",
    category: "seo",
    paths: ["/gallery", "/thank-you"],
    detectedDaysAgo: 7,
    recommendation: "Add exactly one H1 per page that states the page's subject.",
    fixGuideId: "fg-heading-structure",
    evidence: "2 pages",
  },
  {
    id: "iss-form-label",
    title: "Form fields without labels",
    description:
      "The newsletter form uses placeholder text instead of labels. Placeholders vanish on focus and are not reliably announced by screen readers.",
    severity: "medium",
    category: "accessibility",
    paths: ["/blog", "/newsletter-archive"],
    detectedDaysAgo: 10,
    recommendation: "Add a visible <label for=…> to every input, keeping the placeholder only as an example.",
    fixGuideId: "fg-form-labels",
    evidence: "3 unlabelled inputs",
  },
  {
    id: "iss-contrast",
    title: "Low colour contrast on secondary text",
    description:
      "Muted grey captions render at a 3.1:1 contrast ratio against white, below the 4.5:1 minimum for body text.",
    severity: "low",
    category: "accessibility",
    paths: ["/", "/about", "/our-work", "/blog"],
    detectedDaysAgo: 11,
    recommendation: "Darken the caption colour until it reaches at least 4.5:1 against its background.",
    fixGuideId: "fg-contrast",
    evidence: "3.1:1 measured",
  },
  {
    id: "iss-sitemap-stale",
    title: "Sitemap contains a removed URL",
    description:
      "sitemap.xml still lists /programs/water-testing, which now returns 404. Search engines repeatedly re-request it.",
    severity: "low",
    category: "seo",
    paths: "site",
    detectedDaysAgo: 5,
    recommendation: "Regenerate the sitemap so it only lists URLs that return 200.",
    fixGuideId: "fg-sitemap",
    evidence: "1 of 24 entries",
  },
  {
    id: "iss-cache-headers",
    title: "Static assets served without cache headers",
    description:
      "Images and fonts come back with no Cache-Control, so repeat visitors re-download them on every page view.",
    severity: "low",
    category: "performance",
    paths: "site",
    detectedDaysAgo: 14,
    recommendation: "Set a long max-age with immutable on fingerprinted assets, and a short one on HTML.",
    fixGuideId: "fg-caching",
    evidence: "18 assets",
  },
  {
    id: "iss-og-missing",
    title: "Open Graph tags missing",
    description:
      "Four pages have no og:title or og:image, so links shared on WhatsApp and Facebook preview as a bare URL.",
    severity: "low",
    category: "seo",
    paths: ["/search", "/thank-you", "/newsletter-archive", "/refund-policy"],
    detectedDaysAgo: 9,
    recommendation: "Add og:title, og:description and a 1200×630 og:image to every public page.",
    fixGuideId: "fg-open-graph",
    evidence: "4 pages",
  },
  {
    id: "iss-font-loading",
    title: "Web fonts block first paint",
    description:
      "Three font files load without font-display, leaving text invisible for up to 900 ms on a slow connection.",
    severity: "low",
    category: "performance",
    paths: "site",
    detectedDaysAgo: 13,
    recommendation: "Add font-display: swap and preload only the one weight used above the fold.",
    fixGuideId: "fg-fonts",
    evidence: "3 font files",
  },
  {
    id: "iss-uptime-degraded",
    title: "Elevated response time during evening peak",
    description:
      "Median response time rose from 420 ms to 1.9 s between 19:00 and 21:00 IST on three days this month.",
    severity: "medium",
    category: "monitoring",
    paths: "site",
    detectedDaysAgo: 3,
    recommendation:
      "Review server resources at peak and consider a CDN in front of the origin for static responses.",
    fixGuideId: "fg-ttfb",
    evidence: "3 occurrences, peak 2.4 s",
  },
  {
    id: "iss-resolved-canonical",
    title: "Canonical pointed to the staging domain",
    description:
      "Two pages carried a canonical tag pointing at staging.mokshasewa.org. This was corrected after the last deploy.",
    severity: "critical",
    category: "technical",
    paths: ["/donate", "/volunteer"],
    detectedDaysAgo: 21,
    resolvedDaysAgo: 12,
    recommendation: "Keep canonicals absolute and environment-aware so a staging build cannot leak them.",
    fixGuideId: "fg-canonical",
    evidence: "2 pages",
  },
  {
    id: "iss-resolved-robots",
    title: "robots.txt disallowed the whole site",
    description:
      "A deploy shipped a robots.txt with Disallow: / for six hours. Search engines paused crawling until it was reverted.",
    severity: "critical",
    category: "seo",
    paths: "site",
    detectedDaysAgo: 34,
    resolvedDaysAgo: 34,
    recommendation: "Add a deploy check that fails the build when robots.txt disallows the root path.",
    fixGuideId: "fg-robots",
    evidence: "Disallow: /",
  },
  {
    id: "iss-resolved-broken-cta",
    title: "WhatsApp CTA used an invalid number format",
    description:
      "The floating WhatsApp button linked to wa.me/98110XXXXX without a country code, so it failed on desktop.",
    severity: "high",
    category: "forms",
    paths: ["/", "/contact"],
    detectedDaysAgo: 26,
    resolvedDaysAgo: 19,
    recommendation: "Use the full international format in wa.me links, e.g. wa.me/919811012345.",
    fixGuideId: "fg-cta-link",
    evidence: "2 pages",
  },
];

const FIX_GUIDES: FixGuide[] = [
  {
    id: "fg-broken-links",
    title: "Fixing broken internal links",
    summary:
      "A broken internal link sends a visitor to a dead end and tells search engines the site is poorly maintained. The fix is always at the source of the link, not at the destination.",
    impact: "high",
    effort: "low",
    ownedBy: "Website developer or content editor",
    steps: [
      "Open the affected pages list and note every page that contains the broken link.",
      "Decide whether the destination should exist. If it should, restore it at the same URL.",
      "If it should not exist, update each source link to the correct destination — do not rely on a catch-all redirect.",
      "If the page moved permanently, add a 301 from the old URL to the new one.",
      "Re-scan the affected pages to confirm the link now returns 200.",
    ],
    reference: null,
  },
  {
    id: "fg-form-consent",
    title: "Adding consent to a lead or donation form",
    summary:
      "Consent has to be explicit, specific and recorded. A pre-ticked box or a line of small print under the button does not qualify.",
    impact: "high",
    effort: "low",
    ownedBy: "Website developer",
    steps: [
      "Add an unticked checkbox immediately above the submit button.",
      "Word it plainly: what you will send, and how often.",
      "Link the words 'privacy policy' to the live policy page.",
      "Store the consent text and timestamp with the submission, not just a boolean.",
      "Re-scan the page so the consent field is picked up by detection.",
    ],
    reference: null,
  },
  {
    id: "fg-lcp",
    title: "Bringing Largest Contentful Paint under 2.5s",
    summary:
      "LCP is almost always the hero image or the headline block. Two changes — right-sized modern images and unblocking the critical path — fix the majority of cases.",
    impact: "high",
    effort: "medium",
    ownedBy: "Website developer",
    steps: [
      "Identify the LCP element in the page audit's Performance tab.",
      "Export the hero image as WebP or AVIF at the size it is actually displayed.",
      "Add <link rel=\"preload\"> for that image and remove any lazy-loading from it.",
      "Defer analytics, chat and marketing scripts until after first paint.",
      "Re-scan and confirm LCP has dropped below 2.5 s.",
    ],
    reference: { label: "web.dev — Optimize LCP", url: "https://web.dev/articles/optimize-lcp" },
  },
  {
    id: "fg-ssl-renewal",
    title: "Renewing an SSL certificate before it lapses",
    summary:
      "An expired certificate takes the whole site down for every visitor with a full-page browser warning. Renewal is routine — the failure is almost always a missed reminder.",
    impact: "high",
    effort: "low",
    ownedBy: "Hosting provider or client IT",
    steps: [
      "Confirm with the host whether the certificate auto-renews (Let's Encrypt usually does, at 30 days remaining).",
      "If it does not, request a renewal now — do not wait for the final week.",
      "After renewal, confirm the new expiry date in Monitoring → SSL.",
      "Set the SSL expiry warning in Settings → Monitoring to at least 30 days.",
    ],
    reference: null,
  },
  {
    id: "fg-meta-description",
    title: "Writing meta descriptions that earn clicks",
    summary:
      "The description does not affect ranking directly, but it is the sales line under the result. A written one almost always outperforms a generated snippet.",
    impact: "medium",
    effort: "low",
    ownedBy: "Content editor",
    steps: [
      "Keep it between 140 and 160 characters so it is not truncated.",
      "Lead with the outcome for the reader, not the organisation's name.",
      "Include the page's primary search term naturally, once.",
      "Make every description on the site unique.",
      "Re-scan to confirm each page now reports a description.",
    ],
    reference: null,
  },
  {
    id: "fg-duplicate-title",
    title: "Resolving duplicate title tags",
    summary:
      "When two pages share a title, search engines have to guess which one to show, and often show neither prominently.",
    impact: "medium",
    effort: "low",
    ownedBy: "Content editor",
    steps: [
      "List the pages sharing the title from the affected pages view.",
      "Give each a title that names what is specific to that page.",
      "Keep titles under 60 characters so they are not cut off.",
      "Re-scan the pages.",
    ],
    reference: null,
  },
  {
    id: "fg-image-alt",
    title: "Adding alt text that actually helps",
    summary:
      "Alt text is read aloud in place of the image. It should describe what the image conveys, not what it literally contains.",
    impact: "medium",
    effort: "low",
    ownedBy: "Content editor",
    steps: [
      "For content images, describe the information the image carries in one sentence.",
      "For decorative images, use alt=\"\" so screen readers skip them.",
      "Never start with 'image of' — the screen reader already says that.",
      "Do not stuff keywords; it reads badly and helps nothing.",
      "Re-scan the pages to confirm the count drops.",
    ],
    reference: { label: "W3C — Alt text decision tree", url: "https://www.w3.org/WAI/tutorials/images/decision-tree/" },
  },
  {
    id: "fg-redirect-chain",
    title: "Flattening redirect chains",
    summary:
      "Each hop in a chain costs a network round trip and loses a little link equity. Chains appear naturally as a site is reorganised over years.",
    impact: "medium",
    effort: "low",
    ownedBy: "Website developer",
    steps: [
      "Trace the full chain from the original URL to the final 200 response.",
      "Replace the first redirect so it points straight at the final URL.",
      "Remove intermediate rules that no longer have inbound traffic.",
      "Re-scan to confirm a single hop.",
    ],
    reference: null,
  },
  {
    id: "fg-thin-content",
    title: "Dealing with thin pages",
    summary:
      "A thin page is not penalised on its own, but a site full of them dilutes topical strength. Merge or expand — do not pad.",
    impact: "medium",
    effort: "medium",
    ownedBy: "Content editor",
    steps: [
      "Decide whether the page has a reason to exist separately.",
      "If it does, expand it with genuinely useful detail — process, numbers, photos with captions.",
      "If it does not, merge it into the closest strong page and 301 the old URL.",
      "Re-scan after publishing.",
    ],
    reference: null,
  },
  {
    id: "fg-cta-label",
    title: "Writing CTA labels that stand alone",
    summary:
      "Screen-reader users often navigate by pulling up a list of links. 'Click here' × 5 is useless in that list.",
    impact: "medium",
    effort: "low",
    ownedBy: "Content editor",
    steps: [
      "Rewrite each label so it names the destination or the action.",
      "Keep it under about five words.",
      "Where the visual design demands short text, add an aria-label with the full phrasing.",
      "Re-scan the pages.",
    ],
    reference: null,
  },
  {
    id: "fg-security-headers",
    title: "Adding baseline security headers",
    summary:
      "These headers are set once at the server or CDN and protect every response. This is hygiene, not penetration testing.",
    impact: "medium",
    effort: "medium",
    ownedBy: "Hosting provider or client IT",
    steps: [
      "Start with Content-Security-Policy-Report-Only so nothing breaks.",
      "Review the reports for a week and fold legitimate sources into the policy.",
      "Switch to the enforcing header once the reports are quiet.",
      "Add X-Frame-Options, Referrer-Policy and X-Content-Type-Options at the same time.",
      "Re-scan to confirm the headers appear.",
    ],
    reference: null,
  },
  {
    id: "fg-mixed-content",
    title: "Removing mixed content",
    summary:
      "One http:// image on an https:// page is enough for the browser to drop the padlock or block the resource outright.",
    impact: "medium",
    effort: "low",
    ownedBy: "Website developer",
    steps: [
      "Find the insecure resources listed in the page audit's Technical tab.",
      "Change each URL to https:// — or to a protocol-relative path served by your own domain.",
      "Add upgrade-insecure-requests to the CSP as a safety net.",
      "Re-scan the page.",
    ],
    reference: null,
  },
  {
    id: "fg-unused-js",
    title: "Reducing unused JavaScript",
    summary:
      "Unused JavaScript still has to be downloaded, parsed and compiled. It is usually one or two libraries loaded site-wide for a single page.",
    impact: "high",
    effort: "medium",
    ownedBy: "Website developer",
    steps: [
      "Use the coverage report to find the largest unused chunks.",
      "Load page-specific libraries (sliders, maps, charts) only on the pages that use them.",
      "Replace heavyweight plugins with lighter equivalents where the feature is small.",
      "Re-scan and compare the performance score.",
    ],
    reference: null,
  },
  {
    id: "fg-heading-structure",
    title: "Getting heading structure right",
    summary:
      "Headings are the page's table of contents. One H1, then H2s and H3s in order, with no levels skipped.",
    impact: "medium",
    effort: "low",
    ownedBy: "Content editor",
    steps: [
      "Add exactly one H1 stating the page subject.",
      "Demote any decorative headings to styled text.",
      "Do not skip from H2 to H4.",
      "Re-scan the page.",
    ],
    reference: null,
  },
  {
    id: "fg-form-labels",
    title: "Labelling form fields properly",
    summary:
      "A placeholder is a hint, not a label. It disappears the moment the user types, and assistive technology treats it inconsistently.",
    impact: "medium",
    effort: "low",
    ownedBy: "Website developer",
    steps: [
      "Add a visible <label for=\"fieldId\"> to every input, select and textarea.",
      "Keep the placeholder only where it shows an example format.",
      "Set an appropriate autocomplete attribute so browsers can fill the field.",
      "Re-scan the page.",
    ],
    reference: null,
  },
  {
    id: "fg-contrast",
    title: "Meeting colour contrast minimums",
    summary: "4.5:1 for body text, 3:1 for large text and for the visible edge of interactive controls.",
    impact: "low",
    effort: "low",
    ownedBy: "Designer",
    steps: [
      "Measure the failing pairs with any contrast checker.",
      "Darken the foreground rather than lightening the background where possible.",
      "Check the result in both the light and any dark presentation of the site.",
      "Re-scan the pages.",
    ],
    reference: null,
  },
  {
    id: "fg-sitemap",
    title: "Keeping the sitemap accurate",
    summary:
      "A sitemap is a set of recommendations. Listing URLs that 404 or redirect wastes crawl budget and erodes trust in the file.",
    impact: "low",
    effort: "low",
    ownedBy: "Website developer",
    steps: [
      "Regenerate the sitemap from the live route list rather than by hand.",
      "Include only canonical URLs that return 200 and are indexable.",
      "Keep lastmod honest — a false date trains crawlers to ignore it.",
      "Re-submit in Search Console and re-scan.",
    ],
    reference: null,
  },
  {
    id: "fg-caching",
    title: "Setting cache headers on static assets",
    summary: "Repeat visits should not re-download unchanged images, fonts and scripts.",
    impact: "medium",
    effort: "low",
    ownedBy: "Hosting provider",
    steps: [
      "Give fingerprinted assets Cache-Control: public, max-age=31536000, immutable.",
      "Give HTML a short max-age with must-revalidate.",
      "Confirm the CDN is not stripping the headers.",
      "Re-scan to confirm.",
    ],
    reference: null,
  },
  {
    id: "fg-open-graph",
    title: "Adding Open Graph tags",
    summary: "These control how a link looks when it is shared — which is where most social traffic decides to click.",
    impact: "low",
    effort: "low",
    ownedBy: "Website developer",
    steps: [
      "Add og:title, og:description, og:url and og:type to every public page.",
      "Add an og:image at 1200×630 with readable text at small sizes.",
      "Mirror them with twitter:card=summary_large_image.",
      "Re-scan, then test with a share preview tool.",
    ],
    reference: null,
  },
  {
    id: "fg-fonts",
    title: "Stopping web fonts from blocking paint",
    summary: "Without font-display, the browser hides text until the font arrives — the 'flash of invisible text'.",
    impact: "low",
    effort: "low",
    ownedBy: "Website developer",
    steps: [
      "Add font-display: swap to every @font-face rule.",
      "Preload only the weight used above the fold.",
      "Subset the font to the characters the site actually uses.",
      "Re-scan and check the performance score.",
    ],
    reference: null,
  },
  {
    id: "fg-ttfb",
    title: "Reducing server response time",
    summary:
      "TTFB is everything before the first byte: DNS, connection, and the server's own work. Peaks under load usually mean uncached dynamic rendering.",
    impact: "high",
    effort: "high",
    ownedBy: "Hosting provider or client IT",
    steps: [
      "Check whether the slow window matches a traffic peak or a scheduled job.",
      "Put a CDN in front of the origin and cache anonymous HTML responses.",
      "Add page caching at the application level for pages that rarely change.",
      "Review database queries on the slowest routes.",
      "Watch the response-time trend in Monitoring for a week after the change.",
    ],
    reference: null,
  },
  {
    id: "fg-canonical",
    title: "Getting canonical tags right",
    summary: "A canonical tells search engines which URL is the real one. Pointing it at staging removes the page from results.",
    impact: "high",
    effort: "low",
    ownedBy: "Website developer",
    steps: [
      "Make canonicals absolute and derived from the runtime host, never hard-coded.",
      "Ensure every page self-canonicalises unless it is a genuine duplicate.",
      "Add a build check that fails when a canonical contains a non-production host.",
      "Re-scan.",
    ],
    reference: null,
  },
  {
    id: "fg-robots",
    title: "Protecting robots.txt from bad deploys",
    summary: "A stray Disallow: / can deindex an entire site within days, and recovery is slow.",
    impact: "high",
    effort: "low",
    ownedBy: "Website developer",
    steps: [
      "Keep robots.txt in version control, not generated per environment by accident.",
      "Add a deploy check that fails when the production file disallows /.",
      "Enable the 'robots.txt changed' notification in Settings → Notifications.",
      "Re-scan after any deploy that touches it.",
    ],
    reference: null,
  },
  {
    id: "fg-cta-link",
    title: "Fixing broken or malformed CTA links",
    summary:
      "Contact CTAs fail silently: nobody reports a WhatsApp button that does nothing, they just leave.",
    impact: "high",
    effort: "low",
    ownedBy: "Content editor",
    steps: [
      "Use full international format in wa.me and tel: links, including the country code.",
      "Test each contact CTA on both mobile and desktop.",
      "Prefer a single source of truth for the phone number across the site.",
      "Re-scan to confirm the CTA resolves.",
    ],
    reference: null,
  },
];

export function listFixGuides(): FixGuide[] {
  return FIX_GUIDES;
}

/* ------------------------------------------------------------------ */
/* Capability defaults                                                 */
/* ------------------------------------------------------------------ */

const URL_ONLY_CAPABILITIES: WebsiteCapability[] = [
  "canCrawlWebsite",
  "canAuditSEO",
  "canAuditPerformance",
  "canAuditAccessibility",
  "canDetectForms",
  "canDetectCTAs",
  "canMonitorUptime",
  "canCheckSSL",
  "canDetectTechnologies",
  "canCheckSecurityHygiene",
  "canCaptureScreenshots",
  "canDetectChanges",
];

const INTEGRATION_META: Record<
  IntegrationKey,
  { name: string; unlocks: string[]; detailByStatus: Partial<Record<IntegrationState["status"], string>> }
> = {
  ga4: {
    name: "Google Analytics 4",
    unlocks: ["Users", "Sessions", "Traffic sources", "Engagement", "Conversions", "Events"],
    detailByStatus: {
      connected: "Reporting API linked. Data refreshes every 4 hours.",
      "not-connected": "Connect GA4 to see who actually visits this website.",
      "needs-attention": "The linked property returned a permission error on the last sync.",
    },
  },
  searchConsole: {
    name: "Google Search Console",
    unlocks: ["Queries", "Clicks", "Impressions", "CTR", "Average position"],
    detailByStatus: {
      connected: "Property verified. Search data available for the last 16 months.",
      "not-connected": "Connect Search Console to unlock real organic search performance.",
      "needs-attention": "Verification expired — re-verify the property to resume syncing.",
    },
  },
  omniTracking: {
    name: "Omni Tracking",
    unlocks: ["CTA clicks", "Form starts", "Form submits", "Scroll depth", "Custom events", "Heatmaps"],
    detailByStatus: {
      "not-installed": "Add the tracking snippet to the website to capture on-page behaviour.",
      installed: "Snippet detected and receiving events.",
      "pending-verification": "Snippet found but no events received in the last 24 hours.",
    } as Partial<Record<IntegrationState["status"], string>>,
  },
  ownership: {
    name: "Ownership Verification",
    unlocks: ["Search Console linking", "Change alerts on ownership records"],
    detailByStatus: {
      connected: "Verified via DNS TXT record.",
      "not-connected": "Verify ownership to link search data and unlock change alerts.",
      "pending-verification": "DNS record added — waiting for propagation.",
    },
  },
};

function buildIntegrations(
  profile: ClientWebsiteProfile,
  domain: string,
): Record<IntegrationKey, IntegrationState> {
  const build = (key: IntegrationKey, property: string | null, lastSyncAt: string | null): IntegrationState => {
    const status = profile.integrations[key];
    const meta = INTEGRATION_META[key];
    return {
      key,
      name: meta.name,
      status,
      detail: meta.detailByStatus[status] ?? "Not configured for this website.",
      property: status === "connected" || status === "needs-attention" ? property : null,
      lastSyncAt: status === "connected" ? lastSyncAt : null,
      unlocks: meta.unlocks,
    };
  };

  return {
    ga4: build("ga4", `GA4 · properties/418${seedFrom(domain) % 900000}`, hoursAgo(3)),
    searchConsole: build("searchConsole", `sc-domain:${domain}`, hoursAgo(9)),
    omniTracking: build("omniTracking", `omni-${profile.clientId}`, null),
    ownership: build("ownership", `TXT @ ${domain}`, daysAgo(41)),
  };
}

/* ------------------------------------------------------------------ */
/* Dataset assembly                                                    */
/* ------------------------------------------------------------------ */

export interface WebsiteDataset {
  profile: ClientWebsiteProfile;
  target: WebsiteTarget;
  capabilities: WebsiteCapabilityState;
  summary: WebsiteSummary;
  trend90: TrendPoint[];
  technologies: TechnologyDetection[];
  scans: ScanRecord[];
  pages: PageRecord[];
  audits: Record<string, PageAudit>;
  issues: IssueRecord[];
  seo: SeoData;
  performance: PerformanceData;
  analytics: AnalyticsData | null;
  forms: FormsData;
  monitoring: MonitoringData;
  settings: WebsiteSettings;
}

function pageIdFor(clientId: string, path: string): string {
  const slug = path === "/" ? "home" : path.replace(/^\//, "").replace(/\//g, "-");
  return `${clientId}--${slug}`;
}

function buildPages(profile: ClientWebsiteProfile, domain: string): PageRecord[] {
  const rng = makeRng(`${profile.clientId}:pages`);
  const seeds = PAGE_SEEDS.slice(0, profile.pageCount);
  return seeds.map((seed, index) => {
    const offset = profile.scoreOffset;
    const jitter = Math.round((rng() - 0.5) * 6);
    const isLive = (seed.httpStatus ?? 200) === 200;
    const title =
      profile.clientId === "moksha-sewa"
        ? seed.title
        : seed.title.replace("Moksha Sewa", profile.clientName);
    return {
      id: pageIdFor(profile.clientId, seed.path),
      title,
      path: seed.path,
      url: `https://${domain}${seed.path === "/" ? "" : seed.path}`,
      type: seed.type,
      httpStatus: seed.httpStatus ?? 200,
      seoScore: isLive ? clamp(seed.seo + offset + jitter, 12, 99) : null,
      performanceScore: isLive ? clamp(seed.perf + offset + jitter, 12, 99) : null,
      accessibilityScore: isLive ? clamp(seed.a11y + offset + jitter, 12, 99) : null,
      wordCount: seed.words,
      issueCount: 0,
      criticalIssueCount: 0,
      indexable: seed.indexable ?? isLive,
      lastScannedAt: hoursAgo(4 + (index % 3)),
      pageWeightKb: seed.weightKb,
      loadTimeMs: seed.loadMs,
      depth: seed.depth,
    } satisfies PageRecord;
  });
}

function buildIssues(profile: ClientWebsiteProfile, pages: PageRecord[]): IssueRecord[] {
  const byPath = new Map(pages.map((page) => [page.path, page.id]));
  return ISSUE_SEEDS.flatMap((seed) => {
    const affectedPageIds =
      seed.paths === "site"
        ? []
        : seed.paths.map((path) => byPath.get(path)).filter((id): id is string => Boolean(id));

    // Drop page-scoped issues whose pages this smaller site does not have.
    if (seed.paths !== "site" && affectedPageIds.length === 0) return [];

    const resolved = seed.resolvedDaysAgo !== undefined;
    return [
      {
        id: `${profile.clientId}--${seed.id}`,
        title: seed.title,
        description: seed.description,
        severity: seed.severity,
        category: seed.category,
        status: resolved ? "resolved" : "open",
        detectedAt: daysAgo(seed.detectedDaysAgo),
        resolvedAt: resolved ? daysAgo(seed.resolvedDaysAgo ?? 0) : null,
        affectedPageIds,
        affectedCount: seed.paths === "site" ? pages.length : affectedPageIds.length,
        recommendation: seed.recommendation,
        fixGuideId: seed.fixGuideId,
        evidence: seed.evidence,
      } satisfies IssueRecord,
    ];
  });
}

function applyIssueCounts(pages: PageRecord[], issues: IssueRecord[]): PageRecord[] {
  const counts = new Map<string, { total: number; critical: number }>();
  for (const issue of issues) {
    if (issue.status !== "open") continue;
    for (const pageId of issue.affectedPageIds) {
      const entry = counts.get(pageId) ?? { total: 0, critical: 0 };
      entry.total += 1;
      if (issue.severity === "critical") entry.critical += 1;
      counts.set(pageId, entry);
    }
  }
  return pages.map((page) => {
    const entry = counts.get(page.id) ?? { total: 0, critical: 0 };
    return { ...page, issueCount: entry.total, criticalIssueCount: entry.critical };
  });
}

function averageScore(pages: PageRecord[], key: "seoScore" | "performanceScore" | "accessibilityScore"): number {
  const values = pages.map((page) => page[key]).filter((value): value is number => value !== null);
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function buildTrend(profile: ClientWebsiteProfile, scores: ScoreSet): TrendPoint[] {
  const rng = makeRng(`${profile.clientId}:trend`);
  const points: TrendPoint[] = [];
  for (let i = 89; i >= 0; i -= 1) {
    const progress = (89 - i) / 89;
    const drift = (value: number, swing: number) =>
      clamp(Math.round(value - swing * (1 - progress) + (rng() - 0.5) * 3), 20, 100);
    points.push({
      date: daysAgo(i),
      health: drift(scores.health, 11),
      seo: drift(scores.seo, 9),
      performance: drift(scores.performance, 14),
      uptime: round(clamp(99.98 - rng() * (i % 11 === 0 ? 1.6 : 0.08), 96, 100), 2),
    });
  }
  return points;
}

function buildTechnologies(profile: ClientWebsiteProfile): TechnologyDetection[] {
  const shared: TechnologyDetection[] = [
    { name: "Next.js", category: "Framework", confidence: "high", evidence: "__NEXT_DATA__ global object" },
    { name: "Node.js", category: "Server", confidence: "high", evidence: "x-powered-by header" },
    { name: "React", category: "UI Library", confidence: "high", evidence: "React components detected" },
    { name: "Tailwind CSS", category: "Styling", confidence: "high", evidence: "Tailwind utility classes" },
    { name: "TypeScript", category: "Language", confidence: "medium", evidence: "Inferred from stack" },
    { name: "Vercel", category: "Hosting", confidence: "high", evidence: "x-vercel-cache header" },
    { name: "Google Analytics 4", category: "Analytics", confidence: "high", evidence: "gtag.js measurement call" },
    { name: "Google Tag Manager", category: "Tag manager", confidence: "high", evidence: "gtm.js container" },
    { name: "Clerk", category: "Authentication", confidence: "high", evidence: "clerk.js window object" },
    { name: "Lucide", category: "Icons", confidence: "medium", evidence: "SVG class signatures" },
  ];
  if (profile.integrations.ga4 !== "connected") {
    return shared.filter((tech) => tech.name !== "Google Analytics 4");
  }
  return shared;
}

function buildScans(profile: ClientWebsiteProfile, pages: PageRecord[], issues: IssueRecord[]): ScanRecord[] {
  const open = issues.filter((issue) => issue.status === "open").length;
  const rng = makeRng(`${profile.clientId}:scans`);
  const rows: ScanRecord[] = [
    { id: "scan-1", type: "full-crawl", startedAt: hoursAgo(4), durationSeconds: 182, pagesScanned: pages.length, issuesFound: open, status: "completed", note: null },
    { id: "scan-2", type: "uptime", startedAt: hoursAgo(1), durationSeconds: 3, pagesScanned: 1, issuesFound: 0, status: "completed", note: null },
    { id: "scan-3", type: "performance", startedAt: daysAgo(1, 2), durationSeconds: 96, pagesScanned: Math.min(10, pages.length), issuesFound: 4, status: "completed", note: null },
    { id: "scan-4", type: "seo-audit", startedAt: daysAgo(2, 5), durationSeconds: 141, pagesScanned: pages.length, issuesFound: 11, status: "completed", note: null },
    { id: "scan-5", type: "full-crawl", startedAt: daysAgo(4), durationSeconds: 64, pagesScanned: Math.round(pages.length * 0.4), issuesFound: 3, status: "partial", note: "Crawl stopped early — origin returned 429 after 11 requests." },
    { id: "scan-6", type: "full-crawl", startedAt: daysAgo(7), durationSeconds: 12, pagesScanned: 0, issuesFound: 0, status: "failed", note: "Connection timed out after 10s. The origin did not respond." },
    { id: "scan-7", type: "seo-audit", startedAt: daysAgo(9, 3), durationSeconds: 138, pagesScanned: pages.length, issuesFound: 14, status: "completed", note: null },
  ];
  return rows.map((row) => ({
    ...row,
    id: `${profile.clientId}--${row.id}`,
    durationSeconds: row.durationSeconds + Math.round(rng() * 8),
  }));
}

function buildSeo(profile: ClientWebsiteProfile, domain: string, pages: PageRecord[], issues: IssueRecord[]): SeoData {
  const openSeo = issues.filter((issue) => issue.status === "open" && issue.category === "seo");
  const indexable = pages.filter((page) => page.indexable);
  const score = averageScore(pages, "seoScore");
  const healthy = pages.filter((page) => (page.seoScore ?? 0) >= 80).length;
  const warning = pages.filter((page) => (page.seoScore ?? 0) >= 60 && (page.seoScore ?? 0) < 80).length;
  const critical = pages.filter((page) => page.seoScore !== null && page.seoScore < 60).length;

  const categories = [
    { key: "metadata", label: "Metadata", score: clamp(score - 4, 10, 100), passed: 41, warnings: 7, errors: 2 },
    { key: "headings", label: "Headings", score: clamp(score + 2, 10, 100), passed: 38, warnings: 4, errors: 2 },
    { key: "images", label: "Images", score: clamp(score - 14, 10, 100), passed: 26, warnings: 12, errors: 6 },
    { key: "links", label: "Links", score: clamp(score - 6, 10, 100), passed: 33, warnings: 5, errors: 3 },
    { key: "indexability", label: "Indexability", score: clamp(score + 6, 10, 100), passed: 44, warnings: 2, errors: 1 },
    { key: "technical", label: "Technical", score: clamp(score - 2, 10, 100), passed: 36, warnings: 6, errors: 2 },
    { key: "schema", label: "Schema", score: clamp(score - 11, 10, 100), passed: 18, warnings: 5, errors: 1 },
  ];

  const sitemapEntries = pages
    .filter((page) => page.type !== "redirect")
    .map((page) => ({
      loc: page.url,
      lastModified: daysAgo(page.depth * 4 + 3),
      status: page.httpStatus,
      valid: page.httpStatus === 200,
      note: page.httpStatus === 404 ? "Listed in sitemap but returns 404" : null,
    }));

  const hasSearchConsole = profile.integrations.searchConsole === "connected";
  const scRng = makeRng(`${profile.clientId}:sc`);

  const searchConsole: SeoData["searchConsole"] = hasSearchConsole
    ? {
        totals: { clicks: 12482, impressions: 248914, ctr: 5.01, position: 14.6 },
        deltas: { clicks: 18.4, impressions: 12.1, ctr: 0.6, position: -1.8 },
        trend: Array.from({ length: 28 }, (_, i) => ({
          date: daysAgo(27 - i),
          clicks: Math.round(380 + i * 6 + scRng() * 90),
          impressions: Math.round(7600 + i * 110 + scRng() * 1400),
          position: round(16.4 - i * 0.07 + scRng() * 0.6, 1),
        })),
        queries: [
          { query: "clean ganga ngo", clicks: 1842, impressions: 28410, ctr: 6.5, position: 4.2 },
          { query: "river restoration india", clicks: 1204, impressions: 31280, ctr: 3.8, position: 8.1 },
          { query: "donate for ganga cleaning", clicks: 986, impressions: 12480, ctr: 7.9, position: 3.4 },
          { query: "volunteer river cleanup varanasi", clicks: 764, impressions: 9840, ctr: 7.8, position: 5.6 },
          { query: "tree plantation ngo varanasi", clicks: 612, impressions: 18420, ctr: 3.3, position: 11.2 },
          { query: "ganga aarti timings", clicks: 548, impressions: 42180, ctr: 1.3, position: 18.4 },
          { query: "environmental ngo india 80g", clicks: 421, impressions: 8640, ctr: 4.9, position: 9.8 },
          { query: "plastic free ghats campaign", clicks: 386, impressions: 6210, ctr: 6.2, position: 6.1 },
          { query: "ngo impact report 2025", clicks: 294, impressions: 11420, ctr: 2.6, position: 14.7 },
          { query: "water testing ganga river", clicks: 218, impressions: 9860, ctr: 2.2, position: 16.9 },
        ],
        pages: pages.slice(0, 8).map((page, index) => ({
          page: page.path,
          clicks: Math.round(2400 / (index + 1.2)),
          impressions: Math.round(41000 / (index + 1.1)),
          ctr: round(4.2 + scRng() * 3, 1),
          position: round(6 + index * 1.6, 1),
        })),
        countries: [
          { country: "India", clicks: 9284, impressions: 184210, ctr: 5.0 },
          { country: "United States", clicks: 1420, impressions: 28640, ctr: 4.9 },
          { country: "United Kingdom", clicks: 684, impressions: 14280, ctr: 4.8 },
          { country: "Canada", clicks: 412, impressions: 9120, ctr: 4.5 },
          { country: "Australia", clicks: 286, impressions: 6480, ctr: 4.4 },
        ].map(({ country, clicks, impressions }) => ({ country, clicks, impressions })),
        devices: [
          { device: "Mobile", clicks: 8642, impressions: 176420 },
          { device: "Desktop", clicks: 3128, impressions: 58240 },
          { device: "Tablet", clicks: 712, impressions: 14254 },
        ],
      }
    : null;

  return {
    overview: {
      score,
      pagesCrawled: pages.length,
      indexablePages: indexable.length,
      errors: categories.reduce((sum, c) => sum + c.errors, 0),
      warnings: categories.reduce((sum, c) => sum + c.warnings, 0),
      passedChecks: categories.reduce((sum, c) => sum + c.passed, 0),
      healthyPages: healthy,
      warningPages: warning,
      criticalPages: critical,
      categories,
    },
    sitemap: {
      detected: true,
      url: `https://${domain}/sitemap.xml`,
      fetchedAt: hoursAgo(4),
      childSitemaps: [
        { url: `https://${domain}/page-sitemap.xml`, urlCount: Math.round(pages.length * 0.6) },
        { url: `https://${domain}/post-sitemap.xml`, urlCount: Math.round(pages.length * 0.3) },
        { url: `https://${domain}/category-sitemap.xml`, urlCount: 4 },
      ],
      urlsDiscovered: sitemapEntries.length,
      invalidUrls: sitemapEntries.filter((entry) => !entry.valid).length,
      entries: sitemapEntries,
    },
    robots: {
      detected: true,
      url: `https://${domain}/robots.txt`,
      fetchedAt: hoursAgo(4),
      raw: [
        "User-agent: *",
        "Disallow: /wp-admin/",
        "Disallow: /search",
        "Disallow: /thank-you",
        "Allow: /wp-admin/admin-ajax.php",
        "",
        `Sitemap: https://${domain}/sitemap.xml`,
      ].join("\n"),
      allowedPaths: ["/", "/wp-admin/admin-ajax.php"],
      blockedPaths: ["/wp-admin/", "/search", "/thank-you"],
      sitemapReferences: [`https://${domain}/sitemap.xml`],
      warnings: openSeo.some((issue) => issue.id.includes("robots"))
        ? ["A previous deploy shipped Disallow: / — keep the notification enabled."]
        : [],
    },
    schema: {
      detectedTypes: [
        { type: "Organization", pages: 1, status: "pass", issues: [] },
        { type: "WebSite", pages: 1, status: "pass", issues: [] },
        { type: "BreadcrumbList", pages: Math.max(1, pages.length - 6), status: "warning", issues: ["Missing on 6 pages"] },
        { type: "Article", pages: pages.filter((page) => page.type === "blog").length, status: "warning", issues: ["author missing on 2 articles"] },
        { type: "NGO", pages: 1, status: "pass", issues: [] },
        { type: "FAQPage", pages: 1, status: "error", issues: ["acceptedAnswer missing on 1 question"] },
        { type: "LocalBusiness", pages: 1, status: "warning", issues: ["openingHours not specified"] },
      ],
      valid: 3,
      warnings: 3,
      errors: 1,
    },
    links: {
      internalLinks: 486,
      externalLinks: 92,
      brokenLinks: 5,
      redirectChains: 3,
      nofollowLinks: 28,
      orphanPages: 2,
      broken: [
        { from: "/our-work", to: "/programs/water-testing", status: 404, text: "Water testing lab" },
        { from: "/programs/river-cleanup", to: "/programs/water-testing", status: 404, text: "Read about testing" },
        { from: "/", to: "/programs/water-testing", status: 404, text: "Water testing" },
        { from: "/media/press", to: "https://timesofindia.example/article-8842", status: 404, text: "TOI coverage" },
        { from: "/blog/plastic-free-ghats", to: "https://plasticfree.example/report", status: 410, text: "2024 report" },
      ],
      redirects: [
        { from: "/old-donate", to: "/donate", hops: 2 },
        { from: "/programmes", to: "/programs/river-cleanup", hops: 2 },
        { from: "/join", to: "/volunteer", hops: 1 },
      ],
    },
    searchConsole,
  };
}

function buildPerformance(profile: ClientWebsiteProfile, pages: PageRecord[]): PerformanceData {
  const rng = makeRng(`${profile.clientId}:perf`);
  const livePages = pages.filter((page) => page.performanceScore !== null);
  const score = averageScore(pages, "performanceScore");

  const vitals: PerformanceData["vitals"] = [
    {
      key: "lcp",
      label: "Largest Contentful Paint",
      value: 3.1,
      display: "3.1 s",
      band: "needs-improvement",
      thresholds: { good: 2.5, poor: 4 },
      distribution: { good: 42, needsImprovement: 39, poor: 19 },
    },
    {
      key: "inp",
      label: "Interaction to Next Paint",
      value: 186,
      display: "186 ms",
      band: "good",
      thresholds: { good: 200, poor: 500 },
      distribution: { good: 71, needsImprovement: 22, poor: 7 },
    },
    {
      key: "cls",
      label: "Cumulative Layout Shift",
      value: 0.14,
      display: "0.14",
      band: "needs-improvement",
      thresholds: { good: 0.1, poor: 0.25 },
      distribution: { good: 54, needsImprovement: 33, poor: 13 },
    },
    {
      key: "ttfb",
      label: "Time to First Byte",
      value: 0.74,
      display: "740 ms",
      band: "needs-improvement",
      thresholds: { good: 0.8, poor: 1.8 },
      distribution: { good: 61, needsImprovement: 28, poor: 11 },
    },
  ];

  return {
    score,
    scoreDelta: 4,
    vitals,
    avgPageWeightKb: Math.round(
      livePages.reduce((sum, page) => sum + page.pageWeightKb, 0) / Math.max(1, livePages.length),
    ),
    avgRequests: 68,
    trend: Array.from({ length: 30 }, (_, i) => ({
      date: daysAgo(29 - i),
      score: clamp(Math.round(score - 6 + (i / 29) * 6 + (rng() - 0.5) * 4), 20, 100),
      lcp: round(3.6 - (i / 29) * 0.6 + (rng() - 0.5) * 0.3, 2),
      inp: Math.round(210 - (i / 29) * 30 + (rng() - 0.5) * 20),
      cls: round(0.18 - (i / 29) * 0.05 + (rng() - 0.5) * 0.02, 3),
    })),
    pages: livePages.map((page) => ({
      pageId: page.id,
      path: page.path,
      score: page.performanceScore ?? 0,
      lcpMs: Math.round(page.loadTimeMs * 0.82),
      inpMs: Math.round(120 + (100 - (page.performanceScore ?? 60)) * 2.4),
      cls: round(0.04 + (100 - (page.performanceScore ?? 60)) / 420, 3),
      ttfbMs: Math.round(320 + (100 - (page.performanceScore ?? 60)) * 6),
      pageWeightKb: page.pageWeightKb,
    })),
    resources: [
      { label: "Images", weightKb: 1284, requests: 31, share: 54 },
      { label: "JavaScript", weightKb: 412, requests: 18, share: 17 },
      { label: "CSS", weightKb: 186, requests: 7, share: 8 },
      { label: "Fonts", weightKb: 248, requests: 4, share: 10 },
      { label: "Third-party", weightKb: 224, requests: 8, share: 9 },
      { label: "Document", weightKb: 42, requests: 1, share: 2 },
    ],
    thirdParty: [
      { name: "Google Tag Manager", weightKb: 86, blockingMs: 240, pages: pages.length },
      { name: "Meta Pixel", weightKb: 54, blockingMs: 180, pages: pages.length },
      { name: "Razorpay Checkout", weightKb: 62, blockingMs: 120, pages: 3 },
      { name: "Font Awesome CDN", weightKb: 22, blockingMs: 90, pages: pages.length },
    ],
    recommendations: [
      { id: "rec-images", title: "Serve images in a modern format", description: "31 images are served as JPEG or PNG. WebP or AVIF at the same visual quality would cut roughly 640 KB from the average page.", impact: "high", effort: "low", estimatedSavingMs: 1200, affectedPages: Math.min(18, pages.length), fixGuideId: "fg-lcp" },
      { id: "rec-compress", title: "Compress oversized images", description: "Six images are served far larger than they are displayed — the gallery hero is 2400px wide in a 780px container.", impact: "high", effort: "low", estimatedSavingMs: 900, affectedPages: 6, fixGuideId: "fg-lcp" },
      { id: "rec-lazy", title: "Lazy-load below-the-fold images", description: "Images further down the page are fetched eagerly, competing with the hero image for bandwidth.", impact: "medium", effort: "low", estimatedSavingMs: 480, affectedPages: Math.min(12, pages.length), fixGuideId: "fg-lcp" },
      { id: "rec-js", title: "Reduce unused JavaScript", description: "251 KB of the 412 KB bundle is never executed on the home page.", impact: "high", effort: "medium", estimatedSavingMs: 760, affectedPages: pages.length, fixGuideId: "fg-unused-js" },
      { id: "rec-css", title: "Remove unused CSS", description: "The theme stylesheet ships rules for four page templates that this site does not use.", impact: "medium", effort: "medium", estimatedSavingMs: 210, affectedPages: pages.length, fixGuideId: "fg-unused-js" },
      { id: "rec-fonts", title: "Optimise font loading", description: "Three font files load without font-display, hiding text for up to 900 ms.", impact: "medium", effort: "low", estimatedSavingMs: 420, affectedPages: pages.length, fixGuideId: "fg-fonts" },
      { id: "rec-cache", title: "Improve caching policy", description: "18 static assets return without Cache-Control, so repeat visits re-download them.", impact: "medium", effort: "low", estimatedSavingMs: 640, affectedPages: pages.length, fixGuideId: "fg-caching" },
      { id: "rec-third-party", title: "Defer third-party scripts", description: "Tag Manager and the Meta Pixel block the main thread for a combined 420 ms during load.", impact: "medium", effort: "low", estimatedSavingMs: 420, affectedPages: pages.length, fixGuideId: "fg-unused-js" },
      { id: "rec-ttfb", title: "Reduce server response time", description: "TTFB averages 740 ms and peaks above 1.9 s during the evening window.", impact: "high", effort: "high", estimatedSavingMs: 380, affectedPages: pages.length, fixGuideId: "fg-ttfb" },
    ],
  };
}

function buildAnalytics(profile: ClientWebsiteProfile, pages: PageRecord[]): AnalyticsData | null {
  if (profile.integrations.ga4 !== "connected") return null;
  const rng = makeRng(`${profile.clientId}:ga4`);
  const hasTracking = profile.integrations.omniTracking === "installed";

  const trend = Array.from({ length: 28 }, (_, i) => {
    const base = 620 + i * 9;
    const weekendDip = [0, 6].includes((i + 2) % 7) ? 0.78 : 1;
    const users = Math.round((base + rng() * 140) * weekendDip);
    return {
      date: daysAgo(27 - i),
      users,
      sessions: Math.round(users * 1.28),
      views: Math.round(users * 2.42),
    };
  });

  const totalUsers = trend.reduce((sum, point) => sum + point.users, 0);
  const totalSessions = trend.reduce((sum, point) => sum + point.sessions, 0);
  const totalViews = trend.reduce((sum, point) => sum + point.views, 0);

  const funnel: AnalyticsData["funnel"] = [
    { key: "visitor", label: "Visitor", value: totalUsers, conversionPct: 100, available: true, unavailableReason: null },
    { key: "page-view", label: "Page View", value: totalViews, conversionPct: round((totalViews / totalUsers) * 100, 1), available: true, unavailableReason: null },
    {
      key: "cta-click",
      label: "CTA Click",
      value: hasTracking ? Math.round(totalUsers * 0.21) : null,
      conversionPct: hasTracking ? 21 : null,
      available: hasTracking,
      unavailableReason: hasTracking ? null : "Requires Omni Tracking on the website",
    },
    {
      key: "form-start",
      label: "Form Start",
      value: hasTracking ? Math.round(totalUsers * 0.086) : null,
      conversionPct: hasTracking ? 41 : null,
      available: hasTracking,
      unavailableReason: hasTracking ? null : "Requires Omni Tracking on the website",
    },
    {
      key: "form-submit",
      label: "Form Submit",
      value: Math.round(totalUsers * 0.032),
      conversionPct: round(3.2, 1),
      available: true,
      unavailableReason: null,
    },
  ];

  return {
    period: "28d",
    kpis: [
      { key: "users", label: "Users", value: totalUsers.toLocaleString("en-IN"), raw: totalUsers, delta: 14.2 },
      { key: "sessions", label: "Sessions", value: totalSessions.toLocaleString("en-IN"), raw: totalSessions, delta: 11.8 },
      { key: "views", label: "Views", value: totalViews.toLocaleString("en-IN"), raw: totalViews, delta: 9.4 },
      { key: "engagement-rate", label: "Engagement Rate", value: "58.4%", raw: 58.4, delta: 3.1 },
      { key: "engagement-time", label: "Avg Engagement Time", value: "1m 42s", raw: 102, delta: 6.8 },
      { key: "events", label: "Events", value: "84,120", raw: 84120, delta: 12.6 },
      { key: "conversions", label: "Conversions", value: "612", raw: 612, delta: 18.9 },
    ],
    trend,
    acquisition: [
      { channel: "Organic Search", users: Math.round(totalUsers * 0.42), sessions: Math.round(totalSessions * 0.41), engagementRate: 61.2 },
      { channel: "Direct", users: Math.round(totalUsers * 0.21), sessions: Math.round(totalSessions * 0.22), engagementRate: 54.8 },
      { channel: "Organic Social", users: Math.round(totalUsers * 0.16), sessions: Math.round(totalSessions * 0.15), engagementRate: 48.4 },
      { channel: "Referral", users: Math.round(totalUsers * 0.09), sessions: Math.round(totalSessions * 0.09), engagementRate: 57.1 },
      { channel: "Paid Search", users: Math.round(totalUsers * 0.07), sessions: Math.round(totalSessions * 0.08), engagementRate: 66.3 },
      { channel: "Email", users: Math.round(totalUsers * 0.05), sessions: Math.round(totalSessions * 0.05), engagementRate: 72.4 },
    ],
    topPages: pages.slice(0, 9).map((page, index) => ({
      path: page.path,
      views: Math.round(totalViews / (index + 1.6)),
      users: Math.round(totalUsers / (index + 1.9)),
      avgEngagementSec: Math.round(140 - index * 9 + rng() * 20),
    })),
    landingPages: pages.slice(0, 7).map((page, index) => ({
      path: page.path,
      sessions: Math.round(totalSessions / (index + 1.7)),
      bounceRate: round(38 + index * 2.4 + rng() * 6, 1),
      conversions: Math.max(0, Math.round(180 / (index + 1.4))),
    })),
    devices: [
      { device: "Mobile", users: Math.round(totalUsers * 0.68), share: 68 },
      { device: "Desktop", users: Math.round(totalUsers * 0.27), share: 27 },
      { device: "Tablet", users: Math.round(totalUsers * 0.05), share: 5 },
    ],
    geography: [
      { country: "India", users: Math.round(totalUsers * 0.74), share: 74 },
      { country: "United States", users: Math.round(totalUsers * 0.09), share: 9 },
      { country: "United Kingdom", users: Math.round(totalUsers * 0.05), share: 5 },
      { country: "United Arab Emirates", users: Math.round(totalUsers * 0.04), share: 4 },
      { country: "Canada", users: Math.round(totalUsers * 0.03), share: 3 },
      { country: "Australia", users: Math.round(totalUsers * 0.02), share: 2 },
      { country: "Other", users: Math.round(totalUsers * 0.03), share: 3 },
    ],
    newVsReturning: [
      { label: "New", users: Math.round(totalUsers * 0.71), share: 71 },
      { label: "Returning", users: Math.round(totalUsers * 0.29), share: 29 },
    ],
    events: [
      { name: "page_view", count: totalViews, users: totalUsers, source: "ga4" },
      { name: "scroll", count: Math.round(totalViews * 0.54), users: Math.round(totalUsers * 0.61), source: "ga4" },
      { name: "click", count: Math.round(totalViews * 0.21), users: Math.round(totalUsers * 0.34), source: "ga4" },
      { name: "session_start", count: totalSessions, users: totalUsers, source: "ga4" },
      { name: "form_submit", count: Math.round(totalUsers * 0.032), users: Math.round(totalUsers * 0.03), source: "ga4" },
      { name: "file_download", count: 842, users: 684, source: "ga4" },
    ],
    conversions: [
      { name: "Donation completed", count: 214, value: 486200, delta: 22.4 },
      { name: "Volunteer signup", count: 168, value: null, delta: 14.1 },
      { name: "Contact form submitted", count: 142, value: null, delta: 8.6 },
      { name: "Newsletter signup", count: 88, value: null, delta: -4.2 },
    ],
    funnel,
  };
}

function buildForms(profile: ClientWebsiteProfile, pages: PageRecord[], issues: IssueRecord[]): FormsData {
  const byPath = new Map(pages.map((page) => [page.path, page]));
  const pageFor = (path: string) => byPath.get(path);

  const formSeeds: {
    path: string;
    type: string;
    method: "GET" | "POST";
    action: string;
    secure: boolean;
    consent: boolean;
    captcha: boolean;
    fields: FormRecord["fields"];
    findings: string[];
  }[] = [
    {
      path: "/donate",
      type: "Donation",
      method: "POST",
      action: "https://mokshasewa.org/wp-json/donations/v1/create",
      secure: true,
      consent: false,
      captcha: true,
      fields: [
        { name: "donor_name", label: "Full name", type: "text", required: true, hasLabel: true, autocomplete: "name" },
        { name: "email", label: "Email address", type: "email", required: true, hasLabel: true, autocomplete: "email" },
        { name: "phone", label: "Mobile number", type: "tel", required: true, hasLabel: true, autocomplete: "tel" },
        { name: "amount", label: "Amount (₹)", type: "number", required: true, hasLabel: true, autocomplete: null },
        { name: "pan", label: "PAN (for 80G receipt)", type: "text", required: false, hasLabel: true, autocomplete: null },
        { name: "message", label: "Message", type: "textarea", required: false, hasLabel: true, autocomplete: null },
      ],
      findings: ["No consent checkbox detected before submit"],
    },
    {
      path: "/contact",
      type: "Contact",
      method: "POST",
      action: "/wp-admin/admin-ajax.php?action=contact_submit",
      secure: true,
      consent: true,
      captcha: true,
      fields: [
        { name: "name", label: "Your name", type: "text", required: true, hasLabel: true, autocomplete: "name" },
        { name: "email", label: "Email", type: "email", required: true, hasLabel: true, autocomplete: "email" },
        { name: "subject", label: "Subject", type: "text", required: false, hasLabel: true, autocomplete: null },
        { name: "message", label: "How can we help?", type: "textarea", required: true, hasLabel: true, autocomplete: null },
        { name: "consent", label: "I agree to the privacy policy", type: "checkbox", required: true, hasLabel: true, autocomplete: null },
      ],
      findings: [],
    },
    {
      path: "/volunteer",
      type: "Volunteer registration",
      method: "POST",
      action: "/volunteer/submit",
      secure: true,
      consent: true,
      captcha: false,
      fields: [
        { name: "name", label: "Full name", type: "text", required: true, hasLabel: true, autocomplete: "name" },
        { name: "email", label: "Email", type: "email", required: true, hasLabel: true, autocomplete: "email" },
        { name: "phone", label: "Phone", type: "tel", required: true, hasLabel: true, autocomplete: "tel" },
        { name: "city", label: "City", type: "text", required: true, hasLabel: true, autocomplete: "address-level2" },
        { name: "availability", label: "Availability", type: "select", required: true, hasLabel: true, autocomplete: null },
        { name: "skills", label: "Skills", type: "textarea", required: false, hasLabel: true, autocomplete: null },
        { name: "consent", label: "I agree to be contacted", type: "checkbox", required: true, hasLabel: true, autocomplete: null },
      ],
      findings: ["No CAPTCHA on a public form that writes to the volunteer database"],
    },
    {
      path: "/blog",
      type: "Newsletter",
      method: "POST",
      action: "http://newsletter.mokshasewa.org/subscribe",
      secure: false,
      consent: false,
      captcha: false,
      fields: [
        { name: "email", label: null, type: "email", required: true, hasLabel: false, autocomplete: null },
      ],
      findings: ["Form action is http:// — submitted data would leave the secure context", "Input has no associated label"],
    },
    {
      path: "/campaigns/clean-ganga-2026",
      type: "Lead capture",
      method: "POST",
      action: "/campaigns/lead",
      secure: true,
      consent: true,
      captcha: false,
      fields: [
        { name: "name", label: "Name", type: "text", required: true, hasLabel: true, autocomplete: "name" },
        { name: "email", label: "Email", type: "email", required: true, hasLabel: true, autocomplete: "email" },
        { name: "pledge", label: "Pledge amount", type: "number", required: false, hasLabel: true, autocomplete: null },
        { name: "consent", label: "Keep me updated", type: "checkbox", required: false, hasLabel: true, autocomplete: null },
      ],
      findings: [],
    },
    {
      path: "/search",
      type: "Site search",
      method: "GET",
      action: "/search",
      secure: true,
      consent: false,
      captcha: false,
      fields: [{ name: "s", label: null, type: "search", required: false, hasLabel: false, autocomplete: null }],
      findings: ["Search input relies on placeholder text instead of a label"],
    },
  ];

  const forms: FormRecord[] = formSeeds.flatMap((seed, index) => {
    const page = pageFor(seed.path);
    if (!page) return [];
    return [
      {
        id: `${profile.clientId}--form-${index + 1}`,
        pageId: page.id,
        pagePath: seed.path,
        formType: seed.type,
        fields: seed.fields,
        method: seed.method,
        action: seed.action,
        actionSecure: seed.secure,
        requiredFields: seed.fields.filter((field) => field.required).length,
        consentDetected: seed.consent,
        captchaDetected: seed.captcha,
        httpsPage: true,
        accessibilityFindings: seed.findings,
        issueIds: issues
          .filter((issue) => issue.category === "forms" && issue.affectedPageIds.includes(page.id))
          .map((issue) => issue.id),
        detectedAt: hoursAgo(4),
      } satisfies FormRecord,
    ];
  });

  const ctaSeeds: { path: string; text: string; kind: CtaRecord["kind"]; destination: string; placement: CtaRecord["placement"]; status: CtaRecord["status"]; note: string | null }[] = [
    { path: "/", text: "Donate Now", kind: "donation", destination: "/donate", placement: "above-fold", status: "pass", note: null },
    { path: "/", text: "Chat on WhatsApp", kind: "whatsapp", destination: "https://wa.me/919811012345", placement: "below-fold", status: "pass", note: null },
    { path: "/", text: "Read More", kind: "button", destination: "/our-work", placement: "below-fold", status: "warning", note: "Label does not describe the destination" },
    { path: "/donate", text: "Give ₹1000", kind: "donation", destination: "https://checkout.razorpay.com/v1/pay/xyz", placement: "above-fold", status: "pass", note: null },
    { path: "/donate", text: "Donate monthly", kind: "external-checkout", destination: "https://checkout.razorpay.com/v1/subscribe/abc", placement: "above-fold", status: "pass", note: null },
    { path: "/volunteer", text: "Register as volunteer", kind: "button", destination: "#volunteer-form", placement: "above-fold", status: "pass", note: null },
    { path: "/contact", text: "Call +91 98110 12345", kind: "phone", destination: "tel:+919811012345", placement: "above-fold", status: "pass", note: null },
    { path: "/contact", text: "Email us", kind: "email", destination: "mailto:hello@mokshasewa.org", placement: "above-fold", status: "pass", note: null },
    { path: "/our-work", text: "Click Here", kind: "button", destination: "/impact-report-2025", placement: "below-fold", status: "warning", note: "Label does not describe the destination" },
    { path: "/blog", text: "Read More", kind: "link", destination: "/blog/plastic-free-ghats", placement: "below-fold", status: "warning", note: "Repeated 6 times on the same page" },
    { path: "/events/ganga-aarti-drive", text: "Book your slot", kind: "booking", destination: "https://forms.example/ganga-drive", placement: "above-fold", status: "pass", note: null },
    { path: "/media/press", text: "Click Here", kind: "link", destination: "https://timesofindia.example/article-8842", placement: "below-fold", status: "error", note: "Destination returns 404" },
    { path: "/campaigns/clean-ganga-2026", text: "Pledge support", kind: "button", destination: "#pledge", placement: "above-fold", status: "pass", note: null },
    { path: "/impact-report-2025", text: "Download the report (PDF, 8.4 MB)", kind: "button", destination: "/files/impact-2025.pdf", placement: "above-fold", status: "warning", note: "8.4 MB download with no size warning on mobile" },
  ];

  const ctas: CtaRecord[] = ctaSeeds.flatMap((seed, index) => {
    const page = pageFor(seed.path);
    if (!page) return [];
    return [
      {
        id: `${profile.clientId}--cta-${index + 1}`,
        pageId: page.id,
        pagePath: seed.path,
        text: seed.text,
        kind: seed.kind,
        destination: seed.destination,
        placement: seed.placement,
        status: seed.status,
        note: seed.note,
      } satisfies CtaRecord,
    ];
  });

  const contactLinks: ContactLinkRecord[] = [
    { id: `${profile.clientId}--contact-wa`, kind: "whatsapp", value: "+91 98110 12345", pages: pages.length, status: "pass", note: "Floating button on every page" },
    { id: `${profile.clientId}--contact-phone`, kind: "phone", value: "+91 98110 12345", pages: 4, status: "pass", note: null },
    { id: `${profile.clientId}--contact-phone-2`, kind: "phone", value: "0542-2451234", pages: 1, status: "warning", note: "Landline without country code — will not dial from abroad" },
    { id: `${profile.clientId}--contact-email`, kind: "email", value: "hello@mokshasewa.org", pages: 3, status: "pass", note: null },
    { id: `${profile.clientId}--contact-email-2`, kind: "email", value: "donate@mokshasewa.org", pages: 2, status: "pass", note: null },
  ];

  return {
    counts: {
      forms: forms.length,
      ctas: ctas.length,
      whatsappLinks: ctas.filter((cta) => cta.kind === "whatsapp").length,
      phoneLinks: contactLinks.filter((link) => link.kind === "phone").length,
      emailLinks: contactLinks.filter((link) => link.kind === "email").length,
      donationLinks: ctas.filter((cta) => cta.kind === "donation" || cta.kind === "external-checkout").length,
      bookingLinks: ctas.filter((cta) => cta.kind === "booking").length,
    },
    forms,
    ctas,
    contactLinks,
    issueIds: issues.filter((issue) => issue.category === "forms").map((issue) => issue.id),
  };
}

function buildMonitoring(profile: ClientWebsiteProfile, domain: string, pages: PageRecord[]): MonitoringData {
  const rng = makeRng(`${profile.clientId}:monitoring`);
  const degraded = profile.status === "degraded";

  const dailyStatus = Array.from({ length: 90 }, (_, i) => {
    const day = 89 - i;
    const incidentDay = day === 12 || day === 41 || (degraded && day === 2);
    return {
      date: daysAgo(day),
      uptimePct: incidentDay ? round(96.4 + rng() * 2, 2) : round(99.92 + rng() * 0.08, 2),
      incidents: incidentDay ? 1 : 0,
    };
  });

  return {
    uptime: {
      status: profile.status,
      uptimePct30d: 99.94,
      uptimePct90d: 99.81,
      avgResponseMs: degraded ? 1240 : 486,
      lastCheckedAt: hoursAgo(0.2),
      lastDowntimeAt: daysAgo(12, 6),
      checkIntervalMinutes: 5,
      responseTrend: Array.from({ length: 30 }, (_, i) => ({
        date: daysAgo(29 - i),
        responseMs: Math.round(420 + rng() * 180 + (i > 26 && degraded ? 900 : 0)),
        uptimePct: round(99.7 + rng() * 0.3, 2),
      })),
      dailyStatus,
      incidents: ([
        { id: "inc-1", startedAt: daysAgo(2, 10), endedAt: daysAgo(2, 8), durationMinutes: 124, kind: "degraded", httpStatus: 200, note: "Response time above 2 s during evening peak." },
        { id: "inc-2", startedAt: daysAgo(12, 6), endedAt: daysAgo(12, 5), durationMinutes: 47, kind: "down", httpStatus: 503, note: "Origin returned 503 during a hosting maintenance window." },
        { id: "inc-3", startedAt: daysAgo(41, 3), endedAt: daysAgo(41, 2), durationMinutes: 38, kind: "timeout", httpStatus: null, note: "Request timed out after 10 s from two check regions." },
        { id: "inc-4", startedAt: daysAgo(63, 9), endedAt: daysAgo(63, 9), durationMinutes: 12, kind: "ssl", httpStatus: null, note: "Certificate chain incomplete after a renewal; resolved on reissue." },
      ] satisfies UptimeIncident[]).map((incident) => ({ ...incident, id: `${profile.clientId}--${incident.id}` })),
    },
    ssl: {
      httpsEnabled: true,
      certificateValid: true,
      issuer: "Let's Encrypt R3",
      subject: domain,
      validFrom: daysAgo(66),
      validTo: daysAhead(24),
      daysRemaining: 24,
      protocol: "TLS 1.3",
      hstsEnabled: false,
      mixedContentPages: 1,
    },
    dns: {
      resolves: true,
      resolvedIps: ["104.21.38.142", "172.67.194.88"],
      nameservers: ["dara.ns.cloudflare.com", "rex.ns.cloudflare.com"],
      records: [
        { type: "A", name: "@", value: "104.21.38.142", status: "pass" },
        { type: "A", name: "@", value: "172.67.194.88", status: "pass" },
        { type: "CNAME", name: "www", value: domain, status: "pass" },
        { type: "MX", name: "@", value: "10 mx.zoho.in", status: "pass" },
        { type: "TXT", name: "@", value: "v=spf1 include:zoho.in ~all", status: "pass" },
        { type: "TXT", name: "_dmarc", value: "v=DMARC1; p=none", status: "warning" },
        { type: "TXT", name: "@", value: `omniplatform-verification=${seedFrom(domain) % 99999}`, status: profile.verified ? "pass" : "warning" },
      ],
      registrarDataAvailable: false,
      registrarNote:
        "Registrar and domain expiry need a WHOIS/RDAP provider, which is not connected. We will not show a guessed expiry date.",
    },
    securityHeaders: [
      { header: "Strict-Transport-Security", present: false, value: null, status: "warning", recommendation: "Add HSTS with a 6-month max-age once HTTPS is stable everywhere." },
      { header: "Content-Security-Policy", present: false, value: null, status: "error", recommendation: "Start with a report-only policy, then enforce." },
      { header: "X-Frame-Options", present: true, value: "SAMEORIGIN", status: "pass", recommendation: "No action needed." },
      { header: "X-Content-Type-Options", present: true, value: "nosniff", status: "pass", recommendation: "No action needed." },
      { header: "Referrer-Policy", present: true, value: "strict-origin-when-cross-origin", status: "pass", recommendation: "No action needed." },
      { header: "Permissions-Policy", present: false, value: null, status: "warning", recommendation: "Declare the browser features the site actually uses." },
    ],
    errors: ([
      { id: "err-1", path: "/programs/water-testing", status: 404, occurrences: 184, firstSeenAt: daysAgo(14), lastSeenAt: hoursAgo(2), referrer: "/our-work" },
      { id: "err-2", path: "/wp-content/uploads/2024/hero-old.jpg", status: 404, occurrences: 96, firstSeenAt: daysAgo(22), lastSeenAt: hoursAgo(5), referrer: "/gallery" },
      { id: "err-3", path: "/api/newsletter", status: 500, occurrences: 41, firstSeenAt: daysAgo(6), lastSeenAt: hoursAgo(9), referrer: "/blog" },
      { id: "err-4", path: "/donate?utm_source=whatsapp", status: "timeout", occurrences: 18, firstSeenAt: daysAgo(3), lastSeenAt: hoursAgo(14), referrer: null },
      { id: "err-5", path: "/programmes", status: "redirect-loop", occurrences: 12, firstSeenAt: daysAgo(9), lastSeenAt: daysAgo(1), referrer: "/" },
      { id: "err-6", path: "/files/impact-2024.pdf", status: 404, occurrences: 9, firstSeenAt: daysAgo(30), lastSeenAt: daysAgo(2), referrer: "/media/press" },
    ] satisfies ErrorSample[]).map((error) => ({ ...error, id: `${profile.clientId}--${error.id}` })),
    changes: ([
      { id: "chg-1", path: "/donate", field: "Title", previous: "Donate | Moksha Sewa", current: "Donate — Support Clean Ganga", detectedAt: daysAgo(1, 4), impact: "positive" },
      { id: "chg-2", path: "/", field: "Meta description", previous: "Moksha Sewa is an NGO working on the Ganga.", current: "Moksha Sewa restores the Ganga through community clean-ups, plantation drives and water testing.", detectedAt: daysAgo(3), impact: "positive" },
      { id: "chg-3", path: "/campaigns/clean-ganga-2026", field: "H1", previous: "Clean Ganga 2026", current: "Join Clean Ganga 2026", detectedAt: daysAgo(5, 7), impact: "neutral" },
      { id: "chg-4", path: "site", field: "robots.txt", previous: "Disallow: /wp-admin/", current: "Disallow: /wp-admin/\nDisallow: /search\nDisallow: /thank-you", detectedAt: daysAgo(8), impact: "neutral" },
      { id: "chg-5", path: "site", field: "sitemap.xml", previous: "23 URLs", current: `${pages.length} URLs`, detectedAt: daysAgo(8, 2), impact: "positive" },
      { id: "chg-6", path: "/volunteer", field: "Canonical", previous: "https://staging.mokshasewa.org/volunteer", current: "https://mokshasewa.org/volunteer", detectedAt: daysAgo(12), impact: "positive" },
      { id: "chg-7", path: "/", field: "Homepage content", previous: "Hero headline: 'Save the Ganga'", current: "Hero headline: 'Restoring the Ganga, together'", detectedAt: daysAgo(15, 5), impact: "neutral" },
      { id: "chg-8", path: "/gallery", field: "Meta description", previous: "Photos from our drives across Varanasi and Prayagraj.", current: "", detectedAt: daysAgo(19), impact: "negative" },
    ] satisfies ChangeRecord[]).map((change) => ({ ...change, id: `${profile.clientId}--${change.id}` })),
  };
}

function buildSettings(profile: ClientWebsiteProfile, domain: string): WebsiteSettings {
  return {
    crawl: {
      frequency: "weekly",
      depth: 4,
      maxPages: 250,
      includePaths: ["/"],
      excludePaths: ["/wp-admin/", "/search", "/?s="],
      respectRobots: true,
      crawlJs: false,
    },
    monitoring: {
      enabled: true,
      intervalMinutes: 5,
      responseTimeThresholdMs: 2000,
      sslExpiryWarningDays: 21,
      uptimeAlertThresholdPct: 99.5,
    },
    notifications: [
      { key: "website-down", label: "Website Down", description: "Two consecutive failed checks from different regions.", email: true, inApp: true },
      { key: "ssl-expiring", label: "SSL Expiring", description: "Certificate expires within the warning window.", email: true, inApp: true },
      { key: "critical-seo", label: "Critical SEO Issue", description: "Noindex, robots block or canonical pointing off-domain.", email: true, inApp: true },
      { key: "broken-links", label: "Broken Links Spike", description: "Broken internal links increase by more than 20% in one scan.", email: false, inApp: true },
      { key: "performance-drop", label: "Performance Drop", description: "Performance score falls more than 10 points between scans.", email: false, inApp: true },
      { key: "crawl-failure", label: "Crawl Failure", description: "A scheduled crawl fails or completes only partially.", email: true, inApp: true },
      { key: "tracking-disconnected", label: "Tracking Disconnected", description: "GA4, Search Console or Omni Tracking stops reporting.", email: true, inApp: false },
    ],
    team: [
      { id: "tm-1", name: "Priya Sharma", email: "priya@encodency.com", role: "Account Manager", permissions: ["View Website", "Run Scan", "View SEO", "View Analytics", "Export"] },
      { id: "tm-2", name: "Amit Singh", email: "amit@encodency.com", role: "SEO Lead", permissions: ["View Website", "Run Scan", "View SEO", "View Analytics", "Export", "Manage Monitoring", "Manage Settings"] },
      { id: "tm-3", name: "Neha Verma", email: "neha@encodency.com", role: "Web Developer", permissions: ["View Website", "Run Scan", "View SEO", "Manage Monitoring", "Manage Integrations"] },
      { id: "tm-4", name: "Rohit Kumar", email: "rohit@encodency.com", role: "Analyst", permissions: ["View Website", "View SEO", "View Analytics", "Export"] },
      { id: "tm-5", name: `${profile.clientName} (client)`, email: `admin@${domain}`, role: "Client Viewer", permissions: ["View Website", "View SEO", "Export"] },
    ],
    reports: {
      scheduleEnabled: true,
      frequency: "monthly",
      recipients: ["priya@encodency.com", `admin@${domain}`],
      sections: ["Health summary", "SEO", "Performance", "Issues", "Uptime"],
      format: "pdf",
    },
    monitoringArchived: false,
  };
}

/* ------------------------------------------------------------------ */
/* Page audits                                                         */
/* ------------------------------------------------------------------ */

function buildAudit(page: PageRecord, domain: string, issues: IssueRecord[], performance: PerformanceData): PageAudit {
  const rng = makeRng(`audit:${page.id}`);
  const pageIssues = issues.filter((issue) => issue.affectedPageIds.includes(page.id));
  const perfRow = performance.pages.find((row) => row.pageId === page.id);
  const isLive = page.httpStatus === 200;
  const titleLength = page.title.length;
  const hasDescription = !pageIssues.some((issue) => issue.id.includes("missing-meta"));
  const hasH1 = !pageIssues.some((issue) => issue.id.includes("h1-missing"));
  const missingAlt = pageIssues.some((issue) => issue.id.includes("images-alt")) ? Math.round(6 + rng() * 10) : 0;

  const check = (
    id: string,
    label: string,
    status: PageAudit["seoChecks"][number]["status"],
    value: string | null,
    detail: string,
    recommendation: string | null = null,
  ) => ({ id, label, status, value, detail, recommendation });

  const seoChecks = [
    check("title", "Title tag", titleLength > 60 ? "warning" : "pass", page.title, `${titleLength} characters`, titleLength > 60 ? "Shorten to under 60 characters so it is not truncated in results." : null),
    check("title-length", "Title length", titleLength >= 30 && titleLength <= 60 ? "pass" : "warning", `${titleLength} chars`, "Recommended range is 30–60 characters.", titleLength < 30 ? "Expand the title with the page's primary term." : null),
    check("description", "Meta description", hasDescription ? "pass" : "error", hasDescription ? `Auto-detected, 152 characters` : null, hasDescription ? "Within the 140–160 character range." : "No meta description found on this page.", hasDescription ? null : "Write a unique 140–160 character description."),
    check("h1", "H1 heading", hasH1 ? "pass" : "error", hasH1 ? page.title : null, hasH1 ? "Exactly one H1 found." : "No H1 element found.", hasH1 ? null : "Add exactly one H1 stating the page subject."),
    check("headings", "Heading structure", "pass", "H1 → H2 → H3", "No skipped levels detected."),
    check("canonical", "Canonical tag", "pass", page.url, "Self-referencing and absolute."),
    check("robots", "Robots directive", page.indexable ? "pass" : "warning", page.indexable ? "index, follow" : "noindex", page.indexable ? "Page is open to indexing." : "Page is deliberately excluded from search.", page.indexable ? null : "Confirm this exclusion is intended."),
    check("og", "Open Graph tags", pageIssues.some((issue) => issue.id.includes("og-missing")) ? "warning" : "pass", null, pageIssues.some((issue) => issue.id.includes("og-missing")) ? "og:title and og:image missing." : "og:title, og:description and og:image present.", "Add og:title, og:description and a 1200×630 og:image."),
    check("twitter", "Twitter card", "warning", null, "twitter:card not declared — platforms fall back to Open Graph.", "Add twitter:card=summary_large_image."),
    check("schema", "Structured data", "pass", "Organization, BreadcrumbList", "Parsed without errors."),
    check("image-alt", "Image alt text", missingAlt > 0 ? "error" : "pass", missingAlt > 0 ? `${missingAlt} missing` : "All images described", missingAlt > 0 ? `${missingAlt} images have no alt attribute.` : "Every image carries an alt attribute.", missingAlt > 0 ? "Describe content images; use alt=\"\" for decorative ones." : null),
    check("indexability", "Indexability", page.indexable ? "pass" : "warning", page.indexable ? "Indexable" : "Excluded", page.indexable ? "Not blocked by robots.txt, meta robots or canonical." : "Blocked by meta robots."),
  ];

  const technicalChecks = [
    check("status", "HTTP status", isLive ? "pass" : page.httpStatus === 301 ? "warning" : "error", String(page.httpStatus), isLive ? "Returns 200 OK." : `Returns ${page.httpStatus}.`),
    check("redirect", "Redirect chain", page.type === "redirect" ? "warning" : "pass", page.type === "redirect" ? "2 hops" : "None", page.type === "redirect" ? "Redirects through an intermediate URL." : "Resolved in a single request.", page.type === "redirect" ? "Point the first redirect straight at the final URL." : null),
    check("compression", "Compression", "pass", "br", "Brotli negotiated on the document response."),
    check("cache", "Cache headers", "warning", "no-cache", "Static assets return without Cache-Control.", "Set a long max-age on fingerprinted assets."),
    check("https", "HTTPS", "pass", "TLS 1.3", "Served over a valid TLS 1.3 connection."),
    check("security-headers", "Security headers", "warning", "3 of 6 present", "CSP, HSTS and Permissions-Policy are absent.", "Add the three missing headers at the server or CDN."),
    check("mixed-content", "Mixed content", page.path === "/gallery" ? "error" : "pass", page.path === "/gallery" ? "2 resources" : "None", page.path === "/gallery" ? "Two images load over http://." : "All subresources load over HTTPS.", page.path === "/gallery" ? "Update the two image URLs to https://." : null),
    check("robots-txt", "robots.txt", page.indexable ? "pass" : "warning", page.indexable ? "Allowed" : "Disallowed", page.indexable ? "Not blocked by robots.txt." : "Path matches a Disallow rule."),
    check("viewport", "Viewport meta", "pass", "width=device-width, initial-scale=1", "Responsive viewport declared."),
    check("lang", "Language attribute", "pass", "en-IN", "Declared on the <html> element."),
  ];

  const accessibilityChecks = [
    check("alt", "Image alt text", missingAlt > 0 ? "error" : "pass", missingAlt > 0 ? `${missingAlt} missing` : "0 missing", missingAlt > 0 ? "Screen readers announce these images as unlabelled." : "All images carry alt text."),
    check("labels", "Form labels", page.path === "/blog" || page.path === "/search" ? "error" : "pass", null, page.path === "/blog" || page.path === "/search" ? "An input relies on placeholder text only." : "All inputs have associated labels.", "Add a visible <label for=…> to each input."),
    check("contrast", "Colour contrast", "warning", "3.1:1", "Muted caption text falls below the 4.5:1 minimum.", "Darken the caption colour."),
    check("headings-order", "Heading order", hasH1 ? "pass" : "error", hasH1 ? "Sequential" : "No H1", hasH1 ? "Levels follow in order." : "Document starts at H2."),
    check("names", "Accessible names", "warning", "2 controls", "Two icon-only buttons have no accessible name.", "Add aria-label to icon-only controls."),
    check("aria", "ARIA usage", "pass", "No invalid roles", "No invalid or conflicting ARIA attributes found."),
    check("keyboard", "Keyboard access", "warning", "1 trap", "The mobile menu cannot be dismissed with Escape.", "Return focus and close the menu on Escape."),
    check("focus", "Focus visibility", "pass", "Visible", "A visible focus ring is present on interactive elements."),
  ];

  return {
    page,
    canonical: isLive ? page.url : null,
    indexabilityNote: page.indexable
      ? "Indexable — not blocked by robots.txt, meta robots or a cross-domain canonical."
      : "Excluded from search by a meta robots noindex directive.",
    screenshots: {
      available: false,
      capturedAt: null,
      note: "Visual snapshots need a screenshot worker, which is not connected yet. Layout below is a placeholder frame.",
    },
    seoChecks,
    technicalChecks,
    accessibilityChecks,
    content: {
      wordCount: page.wordCount,
      thinContent: page.wordCount > 0 && page.wordCount < 300,
      duplicateSimilarityPct: page.type === "blog" ? 18 : 6,
      duplicateOf: null,
      headings: [
        { level: 1, text: page.title },
        { level: 2, text: "What we do" },
        { level: 2, text: "How your support helps" },
        { level: 3, text: "Where the money goes" },
        { level: 2, text: "Get involved" },
      ].slice(0, isLive ? 5 : 0),
      images: { total: Math.round(6 + rng() * 22), missingAlt, oversized: Math.round(rng() * 4) },
      videos: page.path === "/" ? 1 : 0,
      ctas: [
        { text: "Donate Now", kind: "donation" as const, destination: "/donate" },
        { text: "Chat on WhatsApp", kind: "whatsapp" as const, destination: "https://wa.me/919811012345" },
      ].slice(0, isLive ? 2 : 0),
      readability: {
        label: page.wordCount > 1200 ? "Fairly difficult" : "Plain English",
        score: page.wordCount > 1200 ? 52 : 64,
        note: "Flesch reading-ease heuristic — indicative only, not a graded assessment.",
      },
    },
    links: {
      internal: Math.round(18 + rng() * 26),
      external: Math.round(2 + rng() * 9),
      broken: pageIssues.some((issue) => issue.category === "links") ? 1 : 0,
      redirected: page.type === "redirect" ? 1 : 0,
      orphanRisk: page.depth >= 2 && page.type !== "blog",
      samples: [
        { href: "/donate", text: "Donate now", kind: "internal", status: 200, redirectsTo: null },
        { href: "/our-work", text: "Our work", kind: "internal", status: 200, redirectsTo: null },
        { href: "/programs/water-testing", text: "Water testing", kind: "internal", status: 404, redirectsTo: null },
        { href: "/old-donate", text: "Support us", kind: "internal", status: 301, redirectsTo: "/donate" },
        { href: `https://twitter.com/${domain.split(".")[0]}`, text: "Follow us", kind: "external", status: 200, redirectsTo: null },
        { href: "https://timesofindia.example/article-8842", text: "Press coverage", kind: "external", status: 404, redirectsTo: null },
      ],
    },
    performance: {
      score: page.performanceScore,
      lcpMs: perfRow?.lcpMs ?? 0,
      inpMs: perfRow?.inpMs ?? 0,
      cls: perfRow?.cls ?? 0,
      ttfbMs: perfRow?.ttfbMs ?? 0,
      pageWeightKb: page.pageWeightKb,
      requests: Math.round(28 + rng() * 60),
      breakdown: [
        { label: "Images", requests: Math.round(8 + rng() * 22), weightKb: Math.round(page.pageWeightKb * 0.54) },
        { label: "JavaScript", requests: Math.round(6 + rng() * 12), weightKb: Math.round(page.pageWeightKb * 0.18) },
        { label: "CSS", requests: Math.round(2 + rng() * 5), weightKb: Math.round(page.pageWeightKb * 0.08) },
        { label: "Fonts", requests: 4, weightKb: Math.round(page.pageWeightKb * 0.1) },
        { label: "Third-party", requests: Math.round(3 + rng() * 6), weightKb: Math.round(page.pageWeightKb * 0.09) },
        { label: "Document", requests: 1, weightKb: Math.round(page.pageWeightKb * 0.01) },
      ],
      thirdParty: [
        { name: "Google Tag Manager", weightKb: 86, blocking: true },
        { name: "Meta Pixel", weightKb: 54, blocking: true },
        { name: "Font Awesome CDN", weightKb: 22, blocking: false },
      ],
    },
    issueIds: pageIssues.map((issue) => issue.id),
  };
}

/* ------------------------------------------------------------------ */
/* Public builder                                                      */
/* ------------------------------------------------------------------ */

export function buildDataset(profile: ClientWebsiteProfile): WebsiteDataset | null {
  if (!profile.domain) return null;
  const domain = profile.domain;

  const basePages = buildPages(profile, domain);
  const issues = buildIssues(profile, basePages);
  const pages = applyIssueCounts(basePages, issues);

  const scores: ScoreSet = {
    seo: averageScore(pages, "seoScore"),
    performance: averageScore(pages, "performanceScore"),
    accessibility: averageScore(pages, "accessibilityScore"),
    bestPractices: clamp(averageScore(pages, "accessibilityScore") - 4 + profile.scoreOffset, 10, 100),
    health: 0,
  };
  scores.health = Math.round(
    scores.seo * 0.32 + scores.performance * 0.28 + scores.accessibility * 0.22 + scores.bestPractices * 0.18,
  );

  const openIssues = issues.filter((issue) => issue.status === "open");
  const target: WebsiteTarget = {
    clientId: profile.clientId,
    clientName: profile.clientName,
    domain,
    url: `https://${domain}`,
    https: true,
    status: profile.status,
    verified: profile.verified,
    lastScannedAt: hoursAgo(4),
    nextScanAt: hoursAhead(20),
    sourceLabel: "Client Profile → Website URL",
  };

  const capabilities: WebsiteCapabilityState = {
    capabilities: URL_ONLY_CAPABILITIES.reduce(
      (acc, key) => ({ ...acc, [key]: true }),
      {} as Record<WebsiteCapability, boolean>,
    ),
    integrations: buildIntegrations(profile, domain),
  };

  const performance = buildPerformance(profile, pages);
  const audits: Record<string, PageAudit> = {};
  for (const page of pages) {
    audits[page.id] = buildAudit(page, domain, issues, performance);
  }

  return {
    profile,
    target,
    capabilities,
    summary: {
      target,
      scores,
      scoreDeltas: { health: 3, seo: 2, performance: 4, accessibility: -1, bestPractices: 1 },
      uptimePct: 99.94,
      pagesDiscovered: pages.length,
      criticalIssues: openIssues.filter((issue) => issue.severity === "critical").length,
      openIssues: openIssues.length,
    },
    trend90: buildTrend(profile, scores),
    technologies: buildTechnologies(profile),
    scans: buildScans(profile, pages, issues),
    pages,
    audits,
    issues,
    seo: buildSeo(profile, domain, pages, issues),
    performance,
    analytics: buildAnalytics(profile, pages),
    forms: buildForms(profile, pages, issues),
    monitoring: buildMonitoring(profile, domain, pages),
    settings: buildSettings(profile, domain),
  };
}

/** Re-exported so the provider can rebuild scan-adjusted timestamps. */
export { at, clamp, makeRng, round };
