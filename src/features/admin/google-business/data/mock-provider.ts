/**
 * Mock data source. Shapes match `types.ts` exactly, so swapping this for the
 * HTTP provider behind the repository needs no UI change. Nothing here is
 * rendered when `GBP_MOCK_MODE` is off.
 */
import { IMG } from "../lib/sample-images";
import { addDays, startOfDay, subDays, subHours, subMinutes, subMonths } from "date-fns";
import type {
  ActivityEvent,
  AttributeDefinition,
  BusinessAccount,
  Category,
  ConnectionInfo,
  DailyMetricPoint,
  GbpScope,
  GbpSnapshot,
  Location,
  LocationPerformance,
  MediaItem,
  PerformanceMetric,
  Post,
  RegularHours,
  Review,
  SearchKeyword,
  StarRating,
  TeamMember,
  WorkspaceNotification,
  WorkspaceSettings,
} from "../types";

const NOW = new Date();
const iso = (d: Date) => d.toISOString();

/** Deterministic PRNG (mulberry32) so charts do not reshuffle between renders. */
export function seeded(seed: number) {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}


/* ------------------------------------------------------------------ */
/* Account & connection                                                */
/* ------------------------------------------------------------------ */

const account: BusinessAccount = {
  name: "accounts/106884521937465210034",
  accountId: "106884521937465210034",
  accountName: "Namo Gange Trust",
  googleAccount: "profiles@namogange.org",
  type: "LOCATION_GROUP",
  verificationState: "VERIFIED",
};

const connection: ConnectionInfo = {
  state: "connected",
  lastSyncedAt: iso(subMinutes(NOW, 18)),
  nextSyncAt: iso(addDays(NOW, 0)),
  autoSync: true,
  syncFrequency: "6h",
  quotaUsed: 2_180,
  quotaLimit: 10_000,
};

const scopes: GbpScope[] = ["business.manage"];

/* ------------------------------------------------------------------ */
/* Categories & attributes                                             */
/* ------------------------------------------------------------------ */

const categories: Category[] = [
  { categoryId: "gcid:non_profit_organization", displayName: "Non-profit organization", supportsServices: true },
  { categoryId: "gcid:charity", displayName: "Charity", supportsServices: true },
  { categoryId: "gcid:community_center", displayName: "Community center", supportsServices: true },
  { categoryId: "gcid:environmental_organization", displayName: "Environmental organization", supportsServices: true },
  { categoryId: "gcid:volunteer_organization", displayName: "Volunteer organization" },
  { categoryId: "gcid:religious_organization", displayName: "Religious organization" },
  { categoryId: "gcid:tourist_information_center", displayName: "Tourist information center" },
  { categoryId: "gcid:education_center", displayName: "Education center", supportsServices: true },
  { categoryId: "gcid:social_services_organization", displayName: "Social services organization", supportsServices: true },
  { categoryId: "gcid:corporate_office", displayName: "Corporate office" },
];

const attributeDefinitions: AttributeDefinition[] = [
  { attributeId: "attributes/wi_fi", displayName: "Free Wi-Fi", group: "amenities", valueType: "BOOL" },
  { attributeId: "attributes/restroom", displayName: "Restroom", group: "amenities", valueType: "BOOL" },
  { attributeId: "attributes/has_drinking_water", displayName: "Drinking water", group: "amenities", valueType: "BOOL" },
  { attributeId: "attributes/wheelchair_accessible_entrance", displayName: "Wheelchair accessible entrance", group: "accessibility", valueType: "BOOL" },
  { attributeId: "attributes/wheelchair_accessible_parking", displayName: "Wheelchair accessible parking", group: "accessibility", valueType: "BOOL" },
  { attributeId: "attributes/wheelchair_accessible_restroom", displayName: "Wheelchair accessible restroom", group: "accessibility", valueType: "BOOL" },
  { attributeId: "attributes/pay_cash", displayName: "Accepts cash", group: "payments", valueType: "BOOL" },
  { attributeId: "attributes/pay_upi", displayName: "Accepts UPI", group: "payments", valueType: "BOOL" },
  { attributeId: "attributes/pay_credit_card", displayName: "Accepts credit cards", group: "payments", valueType: "BOOL" },
  { attributeId: "attributes/donations_accepted", displayName: "Accepts donations", group: "service_options", valueType: "BOOL" },
  { attributeId: "attributes/onsite_services", displayName: "On-site services", group: "service_options", valueType: "BOOL" },
  { attributeId: "attributes/volunteering_opportunities", displayName: "Volunteering opportunities", group: "service_options", valueType: "BOOL" },
  { attributeId: "attributes/identifies_as_women_owned", displayName: "Identifies as women-led", group: "business_features", valueType: "BOOL" },
  { attributeId: "attributes/lgbtq_friendly", displayName: "LGBTQ+ friendly", group: "business_features", valueType: "BOOL" },
  {
    attributeId: "attributes/parking_options",
    displayName: "Parking options",
    group: "amenities",
    valueType: "REPEATED_ENUM",
    options: [
      { value: "free_parking_lot", displayName: "Free parking lot" },
      { value: "free_street_parking", displayName: "Free street parking" },
      { value: "paid_parking_lot", displayName: "Paid parking lot" },
      { value: "valet_parking", displayName: "Valet parking" },
    ],
  },
  {
    attributeId: "attributes/planning_appointment_required",
    displayName: "Appointments",
    group: "service_options",
    valueType: "ENUM",
    options: [
      { value: "required", displayName: "Appointment required" },
      { value: "recommended", displayName: "Appointment recommended" },
      { value: "not_required", displayName: "Walk-ins welcome" },
    ],
  },
  {
    attributeId: "attributes/url_appointment",
    displayName: "Appointment links",
    group: "business_features",
    valueType: "ENUM",
    readOnly: true,
    options: [{ value: "managed_by_google", displayName: "Managed by Google" }],
  },
];

/* ------------------------------------------------------------------ */
/* Locations                                                           */
/* ------------------------------------------------------------------ */

function weekdayHours(open = "09:00", close = "18:00", days = [0, 1, 2, 3, 4, 5]): RegularHours {
  return { periods: days.map((day) => ({ day, open, close })), open24: [] };
}

const baseAttributes = {
  "attributes/wheelchair_accessible_entrance": true,
  "attributes/restroom": true,
  "attributes/pay_cash": true,
  "attributes/pay_upi": true,
  "attributes/donations_accepted": true,
  "attributes/volunteering_opportunities": true,
  "attributes/parking_options": ["free_street_parking"],
};

const locations: Location[] = [
  {
    name: "locations/17429558830012345001",
    locationId: "17429558830012345001",
    storeCode: "NGT-HO-DEL",
    placeId: "ChIJLbZ-NFv9DDkRQJY4FbcFcgM",
    mapsUri: "https://maps.google.com/?cid=17429558830012345001",
    newReviewUri: "https://search.google.com/local/writereview?placeid=ChIJLbZ-NFv9DDkRQJY4FbcFcgM",
    verification: "verified",
    openState: "open",
    rating: 4.8,
    reviewCount: 214,
    photoCount: 48,
    sync: { state: "synced", lastSyncedAt: iso(subMinutes(NOW, 18)) },
    labels: ["Head office", "Priority"],
    managed: true,
    profile: {
      title: "Namo Gange Trust - Head Office",
      description:
        "Namo Gange Trust works for a cleaner, healthier Ganga through river clean-up drives, awareness programmes and community participation. Visit our head office for volunteering, donations and partnership enquiries.",
      primaryCategoryId: "gcid:non_profit_organization",
      additionalCategoryIds: ["gcid:environmental_organization", "gcid:volunteer_organization"],
      phone: "+91 11 4567 8900",
      additionalPhones: ["+91 98110 22334"],
      website: "https://namogange.org",
      address: {
        addressLines: ["4th Floor, Ganga Bhawan", "Lodhi Road"],
        locality: "New Delhi",
        administrativeArea: "Delhi",
        postalCode: "110003",
        regionCode: "IN",
      },
      serviceArea: null,
      regularHours: { periods: [...weekdayHours("09:30", "18:30").periods, { day: 5, open: "10:00", close: "14:00" }], open24: [] },
      specialHours: [
        { id: "sh-1", date: iso(addDays(NOW, 12)), label: "Gandhi Jayanti", closed: true },
        { id: "sh-2", date: iso(addDays(NOW, 40)), label: "Diwali", closed: false, open: "11:00", close: "15:00" },
      ],
      attributes: { ...baseAttributes, "attributes/wi_fi": true, "attributes/pay_credit_card": true, "attributes/planning_appointment_required": "recommended" },
      services: [
        { id: "svc-1", name: "Volunteer onboarding", description: "Induction for new river clean-up volunteers.", priceLabel: "Free" },
        { id: "svc-2", name: "CSR partnership consultation", description: "Programme design for corporate partners.", priceLabel: "On request" },
      ],
      openingDate: "2014-06-12T00:00:00.000Z",
    },
  },
  {
    name: "locations/17429558830012345002",
    locationId: "17429558830012345002",
    storeCode: "NGT-VNS",
    placeId: "ChIJJ9p3NFv9DDkRQJY4FbcFcgV",
    mapsUri: "https://maps.google.com/?cid=17429558830012345002",
    newReviewUri: "https://search.google.com/local/writereview?placeid=ChIJJ9p3NFv9DDkRQJY4FbcFcgV",
    verification: "verified",
    openState: "open",
    rating: 4.6,
    reviewCount: 138,
    photoCount: 62,
    sync: { state: "synced", lastSyncedAt: iso(subMinutes(NOW, 22)) },
    labels: ["Field centre"],
    managed: true,
    profile: {
      title: "Namo Gange Trust - Varanasi Center",
      description:
        "Our Varanasi centre runs daily ghat clean-up drives, school awareness sessions and the River Guardians volunteer programme along the Ganga.",
      primaryCategoryId: "gcid:environmental_organization",
      additionalCategoryIds: ["gcid:community_center"],
      phone: "+91 542 220 1188",
      additionalPhones: [],
      website: "https://namogange.org/varanasi",
      address: {
        addressLines: ["Assi Ghat Road", "Bhadaini"],
        locality: "Varanasi",
        administrativeArea: "Uttar Pradesh",
        postalCode: "221005",
        regionCode: "IN",
      },
      serviceArea: null,
      regularHours: { periods: weekdayHours("07:00", "19:00", [0, 1, 2, 3, 4, 5, 6]).periods, open24: [] },
      specialHours: [],
      attributes: { ...baseAttributes, "attributes/has_drinking_water": true, "attributes/onsite_services": true },
      services: [
        { id: "svc-3", name: "Ghat clean-up drive", description: "Weekly volunteer-led clean-up along Assi Ghat.", priceLabel: "Free" },
      ],
      openingDate: "2017-02-20T00:00:00.000Z",
    },
  },
  {
    name: "locations/17429558830012345003",
    locationId: "17429558830012345003",
    storeCode: "NGT-HDW",
    placeId: "ChIJx8p3NFv9DDkRQJY4FbcFcgH",
    mapsUri: "https://maps.google.com/?cid=17429558830012345003",
    newReviewUri: "https://search.google.com/local/writereview?placeid=ChIJx8p3NFv9DDkRQJY4FbcFcgH",
    verification: "verified",
    openState: "open",
    rating: 4.3,
    reviewCount: 76,
    photoCount: 12,
    sync: { state: "failed", lastSyncedAt: iso(subHours(NOW, 26)), error: "Google returned PERMISSION_DENIED for this location." },
    labels: ["Field centre"],
    managed: true,
    profile: {
      title: "Namo Gange Trust - Haridwar Center",
      description: "",
      primaryCategoryId: "gcid:volunteer_organization",
      additionalCategoryIds: [],
      phone: "+91 1334 225 600",
      additionalPhones: [],
      website: "",
      address: {
        addressLines: ["Har Ki Pauri Marg"],
        locality: "Haridwar",
        administrativeArea: "Uttarakhand",
        postalCode: "249401",
        regionCode: "IN",
      },
      serviceArea: null,
      // Only three weekdays configured - drives the "incomplete hours" issue.
      regularHours: { periods: weekdayHours("10:00", "17:00", [0, 2, 4]).periods, open24: [] },
      specialHours: [],
      attributes: { "attributes/pay_cash": true, "attributes/donations_accepted": true },
      services: [],
      openingDate: null,
    },
  },
  {
    name: "locations/17429558830012345004",
    locationId: "17429558830012345004",
    storeCode: "NGT-RSH",
    placeId: "ChIJy1p3NFv9DDkRQJY4FbcFcgR",
    mapsUri: "https://maps.google.com/?cid=17429558830012345004",
    newReviewUri: "https://search.google.com/local/writereview?placeid=ChIJy1p3NFv9DDkRQJY4FbcFcgR",
    verification: "pending",
    openState: "open",
    rating: null,
    reviewCount: 0,
    photoCount: 4,
    sync: { state: "synced", lastSyncedAt: iso(subHours(NOW, 3)) },
    labels: ["New"],
    managed: true,
    profile: {
      title: "Namo Gange Trust - Rishikesh Center",
      description: "River conservation outreach centre serving Rishikesh and the surrounding hill villages.",
      primaryCategoryId: "gcid:environmental_organization",
      additionalCategoryIds: [],
      phone: "+91 135 244 7788",
      additionalPhones: [],
      website: "https://namogange.org/rishikesh",
      address: {
        addressLines: ["Tapovan Sarai"],
        locality: "Rishikesh",
        administrativeArea: "Uttarakhand",
        postalCode: "249192",
        regionCode: "IN",
      },
      serviceArea: { businessType: "CUSTOMER_AND_BUSINESS_LOCATION", places: ["Rishikesh", "Muni Ki Reti", "Swarg Ashram"], radiusKm: 25 },
      regularHours: weekdayHours("09:00", "18:00"),
      specialHours: [],
      attributes: { "attributes/donations_accepted": true, "attributes/volunteering_opportunities": true },
      services: [],
      openingDate: iso(subMonths(NOW, 2)),
    },
  },
  {
    name: "locations/17429558830012345005",
    locationId: "17429558830012345005",
    storeCode: "NGT-PRY",
    placeId: "ChIJz2p3NFv9DDkRQJY4FbcFcgP",
    mapsUri: "https://maps.google.com/?cid=17429558830012345005",
    newReviewUri: "https://search.google.com/local/writereview?placeid=ChIJz2p3NFv9DDkRQJY4FbcFcgP",
    verification: "duplicate",
    openState: "closed_temporarily",
    rating: 4.1,
    reviewCount: 24,
    photoCount: 6,
    sync: { state: "synced", lastSyncedAt: iso(subHours(NOW, 9)) },
    labels: ["Seasonal"],
    managed: true,
    profile: {
      title: "Namo Gange Trust - Prayagraj Camp",
      description: "Seasonal camp operated during Magh Mela and Kumbh.",
      primaryCategoryId: "gcid:community_center",
      additionalCategoryIds: [],
      phone: "+91 532 245 1100",
      additionalPhones: [],
      website: "https://namogange.org",
      address: {
        addressLines: ["Sector 4, Mela Ground"],
        locality: "Prayagraj",
        administrativeArea: "Uttar Pradesh",
        postalCode: "211001",
        regionCode: "IN",
      },
      serviceArea: null,
      regularHours: weekdayHours("08:00", "20:00", [0, 1, 2, 3, 4, 5, 6]),
      specialHours: [],
      attributes: { "attributes/pay_cash": true },
      services: [],
      openingDate: null,
    },
  },
];

/* ------------------------------------------------------------------ */
/* Reviews                                                             */
/* ------------------------------------------------------------------ */

const reviewerNames = [
  "Priya Sharma", "Rahul Mehta", "Amit Singh", "Neha Gupta", "Vikram Patel", "Ananya Iyer", "Sanjay Kumar",
  "Fatima Khan", "Rohan Das", "Meera Nair", "Arjun Reddy", "Kavya Joshi", "Deepak Yadav", "Sneha Kulkarni",
  "Imran Sheikh", "Lakshmi Menon", "Gaurav Chawla", "Ritu Bhatia", "Tara Dsouza", "Nikhil Rao",
];

type ReviewSeed = [locationIndex: number, rating: StarRating, comment: string, replied?: string, extra?: Partial<Review>];

const reviewSeeds: ReviewSeed[] = [
  [0, 5, "Incredible work for the river. The team explained the volunteering programme clearly and I joined the next drive.", "Thank you Priya! We are glad you joined the Sunday drive - see you at the next one."],
  [0, 5, "Very well organised office. Donation receipt and 80G certificate came within a day."],
  [0, 4, "Good initiative. Parking near the office is difficult on weekdays though."],
  [0, 2, "Called three times about a CSR proposal and nobody responded. Disappointing for an organisation this size."],
  [0, 5, "Attended their awareness session with my school group. The children loved the river model demonstration.", "Thanks for bringing the group! We can arrange a ghat visit next time as well."],
  [0, 1, "Completely wasted trip, office was closed during the hours listed on Google."],
  [0, 5, "Transparent, professional and genuinely committed to the cause."],
  [0, 4, "Helpful staff, good briefing about the plastic-free ghat programme."],
  [1, 5, "Joined the Assi Ghat clean-up. Gloves, bags and safety briefing all provided. Very well run.", "Thank you Rohan! Volunteers like you make the drives possible."],
  [1, 5, "The difference at the ghat after their drives is visible. Great team."],
  [1, 4, "Good work. Would like more weekend slots for working professionals."],
  [1, 3, "Nice initiative but the centre is hard to find, signage could be better."],
  [1, 5, "They arranged a river water quality demonstration for our college - very informative."],
  [1, 2, "Turned up at 7 am as listed but nobody was there until 8.", null as unknown as string],
  [1, 5, "Dedicated people doing real work on the ground."],
  [2, 4, "Helpful volunteers at Har Ki Pauri during the evening aarti clean-up."],
  [2, 3, "Good cause but the centre timings on Google are wrong, they are not open on Tuesdays."],
  [2, 5, "Supported us with waste segregation training for our hotel staff."],
  [2, 2, "No response to my email about donating equipment."],
  [2, 4, "Well organised drive, nice to see so many young volunteers."],
  [4, 4, "Visited during Magh Mela. The camp was clean and the volunteers were courteous."],
  [4, 3, "Useful during the mela, but closed the rest of the year."],
  [0, 5, "Our CSR team partnered with them for a plantation drive - flawless execution.", "It was a pleasure working with your team. Looking forward to the monsoon plantation."],
  [1, 1, "Fake NGO, they only take photos for social media.", undefined, { policyStatus: "under_review" }],
  [0, 5, "Best environmental organisation I have volunteered with in Delhi."],
  [1, 4, "Regular drives, sincere volunteers. Keep it up."],
  [2, 5, "Grateful for the drinking water station they set up near the ghat."],
  [0, 4, "Good experience overall. Reception could be faster during peak hours."],
];

const reviews: Review[] = reviewSeeds.map(([locationIndex, starRating, comment, replied, extra], i) => {
  const location = locations[locationIndex]!;
  const createTime = subHours(NOW, 6 + i * 19);
  return {
    name: `${account.name}/${location.name}/reviews/rev-${2000 + i}`,
    reviewId: `rev-${2000 + i}`,
    locationId: location.locationId,
    reviewer: {
      displayName: reviewerNames[i % reviewerNames.length] ?? "Google user",
      profilePhotoUrl: null,
      isAnonymous: false,
    },
    starRating,
    comment,
    createTime: iso(createTime),
    updateTime: iso(createTime),
    reply: replied
      ? { comment: replied, updateTime: iso(subHours(createTime, -5)), author: i % 2 === 0 ? "Ritika Bansal" : "Manish Sirohi" }
      : null,
    policyStatus: null,
    media: i === 8 ? [IMG.river, IMG.clean] : i === 20 ? [IMG.tourism] : [],
    ...extra,
  };
});

/* ------------------------------------------------------------------ */
/* Posts                                                               */
/* ------------------------------------------------------------------ */

const allLocationIds = locations.map((l) => l.locationId);

const posts: Post[] = [
  {
    id: "post-1001",
    locationIds: allLocationIds.slice(0, 3),
    type: "update",
    summary:
      "Our monsoon plantation drive starts this Saturday across all centres. Volunteers get saplings, gloves and refreshments - register on our website.",
    media: [IMG.tree],
    cta: { actionType: "SIGN_UP", url: "https://namogange.org/volunteer" },
    event: null,
    offer: null,
    state: "published",
    scheduledAt: null,
    publishedAt: iso(subDays(NOW, 3)),
    createdAt: iso(subDays(NOW, 4)),
    createdBy: "Ritika Bansal",
    searchUrl: "https://search.google.com/local/posts?q=namo+gange+trust",
    metrics: { views: 4820, clicks: 218 },
    approvals: [],
  },
  {
    id: "post-1002",
    locationIds: [allLocationIds[1]!],
    type: "event",
    summary: "Join 200+ volunteers for the monthly Assi Ghat clean-up. Equipment and breakfast provided.",
    media: [IMG.river],
    cta: { actionType: "LEARN_MORE", url: "https://namogange.org/events/assi-ghat" },
    event: { title: "Assi Ghat Clean-up Drive", startDate: iso(addDays(NOW, 6)), endDate: iso(addDays(NOW, 6)) },
    offer: null,
    state: "published",
    scheduledAt: null,
    publishedAt: iso(subDays(NOW, 1)),
    createdAt: iso(subDays(NOW, 2)),
    createdBy: "Aakash Verma",
    searchUrl: "https://search.google.com/local/posts?q=namo+gange+varanasi",
    metrics: { views: 1960, clicks: 143 },
    approvals: [],
  },
  {
    id: "post-1003",
    locationIds: allLocationIds.slice(0, 2),
    type: "offer",
    summary: "Donate this month and receive a River Guardian kit along with your 80G receipt.",
    media: [IMG.water],
    cta: { actionType: "LEARN_MORE", url: "https://namogange.org/donate" },
    event: null,
    offer: { couponCode: "GANGA80G", redeemOnlineUrl: "https://namogange.org/donate", termsConditions: "Valid for donations above INR 2,500 made before the end of the month." },
    state: "scheduled",
    scheduledAt: iso(addDays(startOfDay(NOW), 2)),
    publishedAt: null,
    createdAt: iso(subDays(NOW, 1)),
    createdBy: "Ritika Bansal",
    searchUrl: null,
    metrics: null,
    approvals: [
      { id: "ap-1", action: "submitted", actor: "Pooja Rawat", note: "Offer copy approved by the fundraising team.", at: iso(subDays(NOW, 2)) },
      { id: "ap-2", action: "approved", actor: "Ritika Bansal", at: iso(subDays(NOW, 1)) },
    ],
  },
  {
    id: "post-1004",
    locationIds: [allLocationIds[0]!],
    type: "cta",
    summary: "Bring your school or college group for a guided session on river ecology at our head office.",
    media: [IMG.standard],
    cta: { actionType: "BOOK", url: "https://namogange.org/school-visits" },
    event: null,
    offer: null,
    state: "pending_approval",
    scheduledAt: iso(addDays(startOfDay(NOW), 4)),
    publishedAt: null,
    createdAt: iso(subHours(NOW, 20)),
    createdBy: "Pooja Rawat",
    searchUrl: null,
    metrics: null,
    approvals: [{ id: "ap-3", action: "submitted", actor: "Pooja Rawat", note: "Ready for review.", at: iso(subHours(NOW, 20)) }],
  },
  {
    id: "post-1005",
    locationIds: allLocationIds.slice(0, 3),
    type: "update",
    summary: "World Water Day plans - draft copy to be finalised with the communications team.",
    media: [],
    cta: null,
    event: null,
    offer: null,
    state: "draft",
    scheduledAt: null,
    publishedAt: null,
    createdAt: iso(subDays(NOW, 5)),
    createdBy: "Aakash Verma",
    searchUrl: null,
    metrics: null,
    approvals: [],
  },
  {
    id: "post-1006",
    locationIds: [allLocationIds[2]!],
    type: "update",
    summary: "Har Ki Pauri evening clean-up resumes from next week after the monsoon break.",
    media: [IMG.clean],
    cta: { actionType: "LEARN_MORE", url: "https://namogange.org/haridwar" },
    event: null,
    offer: null,
    state: "failed",
    scheduledAt: iso(subHours(NOW, 8)),
    publishedAt: null,
    createdAt: iso(subDays(NOW, 1)),
    createdBy: "Ritika Bansal",
    searchUrl: null,
    metrics: null,
    approvals: [],
    failureReason: "Google rejected the post: this location is not verified for posting. Complete verification and try again.",
  },
  {
    id: "post-1007",
    locationIds: [allLocationIds[0]!, allLocationIds[1]!],
    type: "event",
    summary: "Annual River Guardians meet - talks, awards and the yearly impact report.",
    media: [IMG.wide2],
    cta: { actionType: "SIGN_UP", url: "https://namogange.org/guardians-meet" },
    event: { title: "River Guardians Annual Meet", startDate: iso(addDays(NOW, 21)), endDate: iso(addDays(NOW, 21)) },
    offer: null,
    state: "approved",
    scheduledAt: iso(addDays(startOfDay(NOW), 9)),
    publishedAt: null,
    createdAt: iso(subDays(NOW, 3)),
    createdBy: "Aakash Verma",
    searchUrl: null,
    metrics: null,
    approvals: [
      { id: "ap-4", action: "submitted", actor: "Aakash Verma", at: iso(subDays(NOW, 3)) },
      { id: "ap-5", action: "approved", actor: "Manish Sirohi", note: "Approved, publish a week before the event.", at: iso(subDays(NOW, 2)) },
    ],
  },
  {
    id: "post-1008",
    locationIds: [allLocationIds[0]!],
    type: "update",
    summary: "Photo story: what 12 months of clean-up drives changed along the ghats.",
    media: [IMG.tourism],
    cta: { actionType: "LEARN_MORE", url: "https://namogange.org/impact" },
    event: null,
    offer: null,
    state: "published",
    scheduledAt: null,
    publishedAt: iso(subDays(NOW, 12)),
    createdAt: iso(subDays(NOW, 13)),
    createdBy: "Ritika Bansal",
    searchUrl: "https://search.google.com/local/posts?q=namo+gange+impact",
    metrics: { views: 7310, clicks: 402 },
    approvals: [],
  },
  {
    id: "post-1009",
    locationIds: [allLocationIds[1]!],
    type: "update",
    summary: "Draft: weekly volunteer shout-out post for the Varanasi centre.",
    media: [],
    cta: null,
    event: null,
    offer: null,
    state: "rejected",
    scheduledAt: null,
    publishedAt: null,
    createdAt: iso(subDays(NOW, 6)),
    createdBy: "Pooja Rawat",
    searchUrl: null,
    metrics: null,
    approvals: [
      { id: "ap-6", action: "submitted", actor: "Pooja Rawat", at: iso(subDays(NOW, 6)) },
      { id: "ap-7", action: "rejected", actor: "Ritika Bansal", note: "Volunteer photos need consent before publishing.", at: iso(subDays(NOW, 5)) },
    ],
  },
  {
    id: "post-1010",
    locationIds: allLocationIds.slice(0, 2),
    type: "offer",
    summary: "Corporate volunteering slots open for the next quarter - limited dates available.",
    media: [IMG.banner],
    cta: { actionType: "SIGN_UP", url: "https://namogange.org/csr" },
    event: null,
    offer: { couponCode: "", redeemOnlineUrl: "https://namogange.org/csr", termsConditions: "Subject to availability of volunteering slots." },
    state: "published",
    scheduledAt: null,
    publishedAt: iso(subDays(NOW, 20)),
    createdAt: iso(subDays(NOW, 21)),
    createdBy: "Manish Sirohi",
    searchUrl: "https://search.google.com/local/posts?q=namo+gange+csr",
    metrics: { views: 3120, clicks: 96 },
    approvals: [],
  },
];

/* ------------------------------------------------------------------ */
/* Media                                                               */
/* ------------------------------------------------------------------ */

const mediaSeeds: [locationIndex: number, category: MediaItem["category"], url: string][] = [
  [0, "LOGO", IMG.logo],
  [0, "COVER", IMG.tourism],
  [0, "EXTERIOR", IMG.wide],
  [0, "INTERIOR", IMG.standard],
  [0, "TEAM", IMG.tree],
  [0, "AT_WORK", IMG.river],
  [0, "ADDITIONAL", IMG.water],
  [0, "VIDEO", IMG.wide2],
  [1, "COVER", IMG.river],
  [1, "EXTERIOR", IMG.clean],
  [1, "AT_WORK", IMG.water],
  [1, "AT_WORK", IMG.tree],
  [1, "TEAM", IMG.banner],
  [1, "ADDITIONAL", IMG.square],
  [2, "COVER", IMG.clean],
  [2, "EXTERIOR", IMG.wide2],
  [2, "AT_WORK", IMG.river],
  [3, "COVER", IMG.tourism],
  [3, "EXTERIOR", IMG.standard],
  [4, "COVER", IMG.banner],
  [4, "AT_WORK", IMG.water],
];

const media: MediaItem[] = mediaSeeds.map(([locationIndex, category, sourceUrl], i) => {
  const location = locations[locationIndex]!;
  const rand = seeded(i * 37 + 5);
  const old = i % 7 === 3;
  return {
    name: `${account.name}/${location.name}/media/med-${3000 + i}`,
    mediaId: `med-${3000 + i}`,
    locationId: location.locationId,
    category,
    format: category === "VIDEO" ? "VIDEO" : "PHOTO",
    sourceUrl,
    thumbnailUrl: sourceUrl,
    createTime: iso(subDays(NOW, old ? 420 + i * 3 : 5 + i * 9)),
    viewCount: Math.round(400 + rand() * 9000),
    dimensions: { widthPx: 1600, heightPx: 1200 },
    sizeBytes: Math.round((0.4 + rand() * 2.4) * 1024 * 1024),
    state: i === 5 ? "processing" : i === 11 ? "rejected" : "live",
    uploadedBy: i % 3 === 0 ? "Ritika Bansal" : "Aakash Verma",
    rejectionReason: i === 11 ? "Google rejected this photo: it appears to contain promotional text." : undefined,
  };
});

/* ------------------------------------------------------------------ */
/* Performance                                                         */
/* ------------------------------------------------------------------ */


/** 400 days of daily metrics per location, so any period and comparison can be sliced from it. */
function buildSeries(locationIndex: number, scale: number): DailyMetricPoint[] {
  return Array.from({ length: 400 }, (_, i) => {
    const daysAgo = 399 - i;
    const rand = seeded(locationIndex * 9173 + daysAgo * 31 + 7);
    const day = subDays(NOW, daysAgo);
    const weekend = day.getDay() === 0 || day.getDay() === 6;
    const growth = 1 + (400 - daysAgo) / 1100;
    const base = 1_100 * scale * growth * (weekend ? 0.78 : 1) * (0.85 + rand() * 0.3);
    const mobileShare = 0.72;
    const searchImpressions = Math.round(base);
    const mapsImpressions = Math.round(base * 0.62);
    const values = {
      BUSINESS_IMPRESSIONS_DESKTOP_SEARCH: Math.round(searchImpressions * (1 - mobileShare)),
      BUSINESS_IMPRESSIONS_MOBILE_SEARCH: Math.round(searchImpressions * mobileShare),
      BUSINESS_IMPRESSIONS_DESKTOP_MAPS: Math.round(mapsImpressions * 0.18),
      BUSINESS_IMPRESSIONS_MOBILE_MAPS: Math.round(mapsImpressions * 0.82),
      CALL_CLICKS: Math.round(base * 0.021 * (0.7 + rand() * 0.7)),
      WEBSITE_CLICKS: Math.round(base * 0.034 * (0.7 + rand() * 0.7)),
      BUSINESS_DIRECTION_REQUESTS: Math.round(base * 0.028 * (0.7 + rand() * 0.7)),
      // Bookings are only reported when a booking provider is connected.
      BUSINESS_BOOKINGS: 0,
    } satisfies Record<PerformanceMetric, number>;
    return { date: iso(startOfDay(day)), values };
  });
}

const PERFORMANCE_SCALE = [1, 0.62, 0.28, 0.12, 0.08];

const performance: LocationPerformance[] = locations.map((location, index) => ({
  locationId: location.locationId,
  series: buildSeries(index, PERFORMANCE_SCALE[index] ?? 0.2),
}));

const keywordSeeds: [query: string, impressions: number, locationIndex: number][] = [
  ["namo gange trust", 18420, 0],
  ["ngo near me", 12180, 0],
  ["river cleaning ngo delhi", 9240, 0],
  ["volunteer opportunities delhi", 7310, 0],
  ["donate for ganga", 6120, 0],
  ["ganga clean up varanasi", 11240, 1],
  ["assi ghat volunteer", 8420, 1],
  ["ngo in varanasi", 6180, 1],
  ["environmental ngo uttar pradesh", 3120, 1],
  ["har ki pauri cleaning", 4210, 2],
  ["ngo haridwar", 2980, 2],
  ["river conservation rishikesh", 1840, 3],
  ["magh mela help camp", 960, 4],
  ["80g donation receipt ngo", 720, 0],
  ["school river awareness programme", 18, 1],
];

const searchKeywords: SearchKeyword[] = keywordSeeds.map(([query, impressions, locationIndex], i) => ({
  query,
  locationId: locations[locationIndex]!.locationId,
  impressions,
  isThreshold: impressions < 20,
  previousImpressions: Math.round(impressions * (0.72 + seeded(i * 13 + 3)() * 0.45)),
}));

/* ------------------------------------------------------------------ */
/* Team, settings, activity, notifications                             */
/* ------------------------------------------------------------------ */

const team: TeamMember[] = [
  { id: "usr-admin-001", name: "Manish Sirohi", email: "manishsirohi@encodency.com", role: "owner", initials: "MS" },
  { id: "usr-002", name: "Ritika Bansal", email: "ritika@namogange.org", role: "manager", initials: "RB" },
  { id: "usr-003", name: "Aakash Verma", email: "aakash@encodency.com", role: "editor", initials: "AV" },
  { id: "usr-004", name: "Pooja Rawat", email: "pooja@encodency.com", role: "contributor", initials: "PR" },
  { id: "usr-005", name: "Nitin Chauhan", email: "nitin@namogange.org", role: "analyst", initials: "NC" },
];

const settings: WorkspaceSettings = {
  notifications: {
    newReview: { inApp: true, email: false },
    lowRatingReview: { inApp: true, email: true },
    replyNeeded: { inApp: true, email: false },
    locationUpdate: { inApp: true, email: false },
    syncFailure: { inApp: true, email: true },
    verificationChange: { inApp: true, email: true },
    permissionExpired: { inApp: true, email: true },
    duplicateLocation: { inApp: true, email: false },
  },
  defaults: {
    postCta: "LEARN_MORE",
    postLocationScope: "selected",
    replySignature: "- Team Namo Gange",
    requireApproval: true,
    timezone: "Asia/Kolkata",
  },
  rolePermissions: {
    owner: [
      "view_google_business", "view_performance", "edit_profile", "manage_locations", "reply_reviews", "delete_review_reply",
      "create_posts", "publish_posts", "approve_content", "upload_media", "delete_media", "manage_connection", "manage_settings",
    ],
    manager: [
      "view_google_business", "view_performance", "edit_profile", "manage_locations", "reply_reviews", "delete_review_reply",
      "create_posts", "publish_posts", "approve_content", "upload_media", "delete_media",
    ],
    editor: ["view_google_business", "view_performance", "edit_profile", "reply_reviews", "create_posts", "publish_posts", "upload_media"],
    contributor: ["view_google_business", "create_posts", "reply_reviews", "upload_media"],
    analyst: ["view_google_business", "view_performance"],
  },
};

const activity: ActivityEvent[] = [
  {
    id: "act-1", actor: "System", action: "location_sync", summary: "Synced 5 locations from Google", entity: { type: "account", label: "Namo Gange Trust" },
    locationId: null, source: "Google sync", at: iso(subMinutes(NOW, 18)),
  },
  {
    id: "act-2", actor: "Ritika Bansal", action: "review_reply", summary: "Replied to a 5-star review", entity: { type: "review", id: "rev-2000", label: "Priya Sharma" },
    locationId: locations[0]!.locationId, source: "OmniPlatform", at: iso(subHours(NOW, 5)),
  },
  {
    id: "act-3", actor: "Aakash Verma", action: "post_publish", summary: "Published an event post", entity: { type: "post", id: "post-1002", label: "Assi Ghat Clean-up Drive" },
    locationId: locations[1]!.locationId, source: "OmniPlatform", at: iso(subDays(NOW, 1)),
  },
  {
    id: "act-4", actor: "Ritika Bansal", action: "hours_change", summary: "Updated Friday hours", entity: { type: "location", id: locations[0]!.locationId, label: "Head Office" },
    locationId: locations[0]!.locationId, previous: "Closed", next: "10:00 - 14:00", source: "OmniPlatform", at: iso(subDays(NOW, 2)),
  },
  {
    id: "act-5", actor: "Aakash Verma", action: "media_upload", summary: "Uploaded 3 photos", entity: { type: "media", label: "Varanasi Center" },
    locationId: locations[1]!.locationId, source: "OmniPlatform", at: iso(subDays(NOW, 3)),
  },
  {
    id: "act-6", actor: "Manish Sirohi", action: "permission_change", summary: "Changed Editor permissions", entity: { type: "settings", label: "Team access" },
    locationId: null, previous: "Cannot publish posts", next: "Can publish posts", source: "OmniPlatform", at: iso(subDays(NOW, 6)),
  },
  {
    id: "act-7", actor: "System", action: "location_sync", summary: "Sync failed for Haridwar Center", entity: { type: "location", id: locations[2]!.locationId, label: "Haridwar Center" },
    locationId: locations[2]!.locationId, source: "Google sync", at: iso(subHours(NOW, 26)),
  },
  {
    id: "act-8", actor: "Manish Sirohi", action: "connection_change", summary: "Reconnected the Google account", entity: { type: "account", label: "profiles@namogange.org" },
    locationId: null, source: "OmniPlatform", at: iso(subDays(NOW, 14)),
  },
];

const notifications: WorkspaceNotification[] = [
  {
    id: "n-1", kind: "low_rating_review", title: "New 1-star review", body: "Head Office - office was closed during the hours listed on Google.",
    href: "/admin/google-business/reviews?rating=1&status=unanswered", at: iso(subHours(NOW, 4)), read: false,
  },
  {
    id: "n-2", kind: "sync_failure", title: "Sync failed", body: "Haridwar Center returned PERMISSION_DENIED during the last sync.",
    href: "/admin/google-business/locations?sync=failed", at: iso(subHours(NOW, 26)), read: false,
  },
  {
    id: "n-3", kind: "duplicate_location", title: "Possible duplicate location", body: "Google flagged Prayagraj Camp as a duplicate listing.",
    href: "/admin/google-business/locations?verification=duplicate", at: iso(subDays(NOW, 2)), read: false,
  },
  {
    id: "n-4", kind: "approval_requested", title: "Post awaiting approval", body: "Pooja Rawat submitted a call-to-action post for the head office.",
    href: "/admin/google-business/posts?status=pending_approval", at: iso(subHours(NOW, 20)), read: true,
  },
  {
    id: "n-5", kind: "post_failed", title: "Post failed to publish", body: "Haridwar update was rejected because the location is not verified.",
    href: "/admin/google-business/posts?status=failed", at: iso(subHours(NOW, 8)), read: true,
  },
  {
    id: "n-6", kind: "verification_change", title: "Verification pending", body: "Rishikesh Center is awaiting postcard verification from Google.",
    href: "/admin/google-business/locations?verification=pending", at: iso(subDays(NOW, 4)), read: true,
  },
];

export const mockSnapshot: GbpSnapshot = {
  account,
  connection,
  scopes,
  locations,
  reviews,
  posts,
  media,
  performance,
  searchKeywords,
  categories,
  attributeDefinitions,
  settings,
  team,
  activity,
  notifications,
};
