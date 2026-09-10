import type { CompanyStatus } from "@/types/domain/company";
import type { PlanTier } from "@/types/domain/plan";

/**
 * Hand-authored fixture inputs.
 *
 * Names, industries and lifecycle states are curated rather than generated so
 * that the panel reads like a real tenant base: a healthy majority, a handful
 * of trials, a few payment problems and some churn.
 */

export interface CompanySeed {
  name: string;
  slug: string;
  industry: string;
  country: string;
  timezone: string;
  tier: PlanTier;
  status: CompanyStatus;
  /** Brands or business units managed under this organisation. */
  Clients: string[];
  websiteDomain: string;
}

export const COMPANY_SEEDS: CompanySeed[] = [
  { name: "Namo Gange Trust", slug: "namo-gange-trust", industry: "Non-profit", country: "India", timezone: "Asia/Kolkata", tier: "growth", status: "active", Clients: ["Moksha Sewa", "Ganga Aarti Live"], websiteDomain: "namogange.org" },
  { name: "Bharat Organic Foods", slug: "bharat-organic-foods", industry: "FMCG", country: "India", timezone: "Asia/Kolkata", tier: "growth", status: "active", Clients: ["Bharat Organic", "Bharat Kitchen"], websiteDomain: "bharatorganic.in" },
  { name: "Meridian Digital", slug: "meridian-digital", industry: "Marketing Agency", country: "United Kingdom", timezone: "Europe/London", tier: "agency", status: "active", Clients: ["Northstar Bank", "Halo Fitness", "Verde Living", "Cinder Coffee"], websiteDomain: "meridiandigital.co.uk" },
  { name: "Sattva Wellness Group", slug: "sattva-wellness", industry: "Healthcare", country: "India", timezone: "Asia/Kolkata", tier: "growth", status: "trial", Clients: ["Sattva Ayurveda", "Sattva Retreats"], websiteDomain: "sattvawellness.in" },
  { name: "Craftline Interiors", slug: "craftline-interiors", industry: "Retail", country: "United Arab Emirates", timezone: "Asia/Dubai", tier: "starter", status: "active", Clients: ["Craftline Studio"], websiteDomain: "craftline.ae" },
  { name: "Blue Harbour Logistics", slug: "blue-harbour-logistics", industry: "Logistics", country: "Singapore", timezone: "Asia/Singapore", tier: "growth", status: "past_due", Clients: ["Blue Harbour Freight", "Harbour Express"], websiteDomain: "blueharbour.sg" },
  { name: "Auric Jewels", slug: "auric-jewels", industry: "Retail", country: "India", timezone: "Asia/Kolkata", tier: "starter", status: "suspended", Clients: ["Auric Flagship"], websiteDomain: "auricjewels.in" },
  { name: "Nordwind Studios", slug: "nordwind-studios", industry: "Media", country: "Germany", timezone: "Europe/Berlin", tier: "growth", status: "active", Clients: ["Nordwind Originals", "Nordwind Shorts"], websiteDomain: "nordwind.de" },
  { name: "Peak & Pine Outdoors", slug: "peak-and-pine", industry: "Retail", country: "Canada", timezone: "America/Toronto", tier: "starter", status: "trial", Clients: ["Peak & Pine"], websiteDomain: "peakandpine.ca" },
  { name: "Vantage Realty Partners", slug: "vantage-realty", industry: "Real Estate", country: "United States", timezone: "America/New_York", tier: "agency", status: "active", Clients: ["Vantage Residential", "Vantage Commercial", "Vantage Rentals"], websiteDomain: "vantagerealty.com" },
  { name: "Kaveri Institute of Technology", slug: "kaveri-institute", industry: "Education", country: "India", timezone: "Asia/Kolkata", tier: "growth", status: "active", Clients: ["Kaveri Admissions", "Kaveri Alumni"], websiteDomain: "kaveri.edu.in" },
  { name: "Lumen Health Systems", slug: "lumen-health", industry: "Healthcare", country: "United States", timezone: "America/Chicago", tier: "enterprise", status: "active", Clients: ["Lumen Primary Care", "Lumen Specialty", "Lumen Pharmacy", "Lumen Labs"], websiteDomain: "lumenhealth.com" },
  { name: "Casa Verde Hospitality", slug: "casa-verde", industry: "Hospitality", country: "Spain", timezone: "Europe/Madrid", tier: "starter", status: "churned", Clients: ["Casa Verde Resorts"], websiteDomain: "casaverde.es" },
  { name: "Trident Manufacturing", slug: "trident-manufacturing", industry: "Manufacturing", country: "India", timezone: "Asia/Kolkata", tier: "growth", status: "active", Clients: ["Trident Industrial", "Trident Exports"], websiteDomain: "tridentmfg.in" },
  { name: "Orchid Skin Clinics", slug: "orchid-skin-clinics", industry: "Healthcare", country: "India", timezone: "Asia/Kolkata", tier: "starter", status: "active", Clients: ["Orchid Aesthetics"], websiteDomain: "orchidskin.in" },
  { name: "Waypoint Travel Co", slug: "waypoint-travel", industry: "Travel", country: "Australia", timezone: "Australia/Sydney", tier: "growth", status: "past_due", Clients: ["Waypoint Holidays", "Waypoint Business"], websiteDomain: "waypoint.com.au" },
  { name: "Ironwood Legal", slug: "ironwood-legal", industry: "Professional Services", country: "United States", timezone: "America/Los_Angeles", tier: "starter", status: "active", Clients: ["Ironwood Counsel"], websiteDomain: "ironwoodlegal.com" },
  { name: "Solace Home Decor", slug: "solace-home-decor", industry: "Retail", country: "India", timezone: "Asia/Kolkata", tier: "starter", status: "trial", Clients: ["Solace Living"], websiteDomain: "solacedecor.in" },
  { name: "Cobalt Fintech", slug: "cobalt-fintech", industry: "Financial Services", country: "United Kingdom", timezone: "Europe/London", tier: "enterprise", status: "active", Clients: ["Cobalt Pay", "Cobalt Lend", "Cobalt Business"], websiteDomain: "cobaltfintech.io" },
  { name: "Green Meadows Dairy", slug: "green-meadows-dairy", industry: "FMCG", country: "India", timezone: "Asia/Kolkata", tier: "starter", status: "active", Clients: ["Green Meadows"], websiteDomain: "greenmeadows.in" },
  { name: "Helix Sports Academy", slug: "helix-sports-academy", industry: "Sports & Fitness", country: "India", timezone: "Asia/Kolkata", tier: "growth", status: "active", Clients: ["Helix Cricket", "Helix Football"], websiteDomain: "helixsports.in" },
  { name: "Marchetti Autoworks", slug: "marchetti-autoworks", industry: "Automotive", country: "Italy", timezone: "Europe/Rome", tier: "starter", status: "churned", Clients: ["Marchetti Service"], websiteDomain: "marchetti.it" },
  { name: "Sunrise Charitable Foundation", slug: "sunrise-foundation", industry: "Non-profit", country: "India", timezone: "Asia/Kolkata", tier: "growth", status: "active", Clients: ["Sunrise Education", "Sunrise Health"], websiteDomain: "sunrisefoundation.org" },
  { name: "Pixelforge Interactive", slug: "pixelforge-interactive", industry: "Gaming", country: "Poland", timezone: "Europe/Warsaw", tier: "growth", status: "active", Clients: ["Pixelforge Studio", "Forge Arcade"], websiteDomain: "pixelforge.gg" },
  { name: "Amberline Cosmetics", slug: "amberline-cosmetics", industry: "Beauty", country: "France", timezone: "Europe/Paris", tier: "agency", status: "active", Clients: ["Amberline Paris", "Amberline Pro", "Amberline Home"], websiteDomain: "amberline.fr" },
  { name: "Sierra Nutrition Labs", slug: "sierra-nutrition", industry: "Health & Nutrition", country: "United States", timezone: "America/Denver", tier: "growth", status: "suspended", Clients: ["Sierra Supplements"], websiteDomain: "sierranutrition.com" },
  { name: "Everbright Solar", slug: "everbright-solar", industry: "Energy", country: "India", timezone: "Asia/Kolkata", tier: "growth", status: "active", Clients: ["Everbright Residential", "Everbright Commercial"], websiteDomain: "everbrightsolar.in" },
  { name: "Quill & Co Publishing", slug: "quill-and-co", industry: "Media", country: "United Kingdom", timezone: "Europe/London", tier: "starter", status: "active", Clients: ["Quill Press"], websiteDomain: "quillandco.uk" },
];

export const FIRST_NAMES = [
  "Aarav", "Priya", "Rohan", "Ananya", "Vikram", "Meera", "Karthik", "Divya",
  "Ishaan", "Nandini", "Rahul", "Sneha", "Arjun", "Kavya", "Siddharth", "Tara",
  "James", "Emma", "Oliver", "Sophie", "Lucas", "Chloe", "Daniel", "Hannah",
  "Mateo", "Isabella", "Noah", "Amelia", "Felix", "Lena", "Marcus", "Nadia",
  "Yusuf", "Zara", "Ravi", "Anjali", "Thomas", "Clara", "Adrian", "Maya",
] as const;

export const LAST_NAMES = [
  "Sharma", "Iyer", "Nair", "Patel", "Reddy", "Gupta", "Menon", "Rao",
  "Kulkarni", "Desai", "Bhat", "Chopra", "Verma", "Sinha", "Joshi", "Pillai",
  "Whitfield", "Bennett", "Hartley", "Lindqvist", "Moreau", "Weber", "Rossi",
  "Kowalski", "Okafor", "Silva", "Novak", "Andersen", "Fontaine", "Marsh",
] as const;

export const DEPARTMENTS = [
  "Platform Engineering",
  "Customer Success",
  "Revenue Operations",
  "Support",
  "Finance",
  "Trust & Safety",
] as const;

export const SUPPORT_SUBJECTS = [
  "LinkedIn page reconnection keeps failing",
  "Scheduled Instagram reel did not publish",
  "SEO crawl stuck at 40% for two days",
  "Invoice shows an unexpected overage charge",
  "Need to raise the AI credit limit this month",
  "WhatsApp template rejected without a reason",
  "Google Business reviews are not syncing",
  "Cannot invite a new team member to a project",
  "Analytics numbers differ from Search Console",
  "Request to export all leads before renewal",
  "Automation workflow fires twice per lead",
  "YouTube upload fails for videos over 2 GB",
  "Report PDF is missing the campaign section",
  "Requesting SAML single sign-on setup",
  "Meta lead form stopped delivering leads",
  "Billing contact needs to be changed",
] as const;

export const AUDIT_ACTIONS = [
  { action: "user.login", category: "auth", resource: "session" },
  { action: "user.login_failed", category: "security", resource: "session" },
  { action: "company.suspended", category: "company", resource: "company" },
  { action: "company.reactivated", category: "company", resource: "company" },
  { action: "company.plan_changed", category: "billing", resource: "subscription" },
  { action: "user.invited", category: "user", resource: "user" },
  { action: "user.role_changed", category: "user", resource: "user" },
  { action: "user.suspended", category: "user", resource: "user" },
  { action: "integration.connected", category: "integration", resource: "integration" },
  { action: "integration.disconnected", category: "integration", resource: "integration" },
  { action: "integration.token_refreshed", category: "integration", resource: "integration" },
  { action: "billing.refund_issued", category: "billing", resource: "transaction" },
  { action: "billing.payment_failed", category: "billing", resource: "transaction" },
  { action: "feature_flag.toggled", category: "platform", resource: "feature_flag" },
  { action: "queue.paused", category: "platform", resource: "queue" },
  { action: "settings.updated", category: "platform", resource: "settings" },
  { action: "report.exported", category: "company", resource: "report" },
  { action: "admin.permission_denied", category: "security", resource: "route" },
] as const;
