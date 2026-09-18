import {
  addDays,
  addHours,
  addMinutes,
  startOfDay,
  subDays,
  subHours,
  subMinutes,
} from "date-fns";
import type {
  ActivityEvent,
  ApprovalEvent,
  AudienceData,
  AudienceMember,
  Campaign,
  ConnectionInfo,
  GeographyRow,
  SeriesPoint,
  TeamMember,
  WorkspaceNotification,
  XAccount,
  XMention,
  XPost,
  XScope,
  XSettings,
} from "./types";

const NOW = new Date();
const iso = (d: Date) => d.toISOString();

/** mulberry32 — scrambles nearby seeds so consecutive rows are not correlated. */
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

const IMG = {
  river: "/campaigns/river-cleanup.jpg",
  water: "/campaigns/water-conservation.jpg",
  tree: "/campaigns/tree-planting.jpg",
  clean: "/campaigns/clean-river.jpg",
  tourism: "/campaigns/ganga-tourism.jpg",
  wide: "/campaigns/save-rivers/wide.png",
  wide2: "/campaigns/save-rivers/wide-2.png",
  standard: "/campaigns/save-rivers/standard.png",
  banner: "/campaigns/save-rivers/banner.png",
  portrait: "/campaigns/save-rivers/portrait.png",
  square: "/campaigns/save-rivers/square.png",
};

export const MEDIA_LIBRARY = Object.values(IMG);

/* ------------------------------------------------------------------ */
/* Account & connection                                                */
/* ------------------------------------------------------------------ */

export const mockAccount: XAccount = {
  id: "1487320045128704001",
  name: "Namo Gange Trust",
  handle: "@NamoGangeTrust",
  avatarUrl: "/namogange.webp",
  bannerUrl: IMG.tourism,
  bio: "Working for a cleaner, healthier Ganga through awareness, action and community participation. River clean-ups, school programmes and field reports from the ghats.",
  location: "Varanasi, India",
  website: "namogange.org",
  verified: "business",
  protected: false,
  joinedAt: "2017-04-18T00:00:00.000Z",
  followers: 48_920,
  following: 1_264,
  posts: 3_487,
  listed: 214,
  authorisedBy: "media@namogange.org",
};

export const mockConnection: ConnectionInfo = {
  state: "connected",
  lastSyncedAt: iso(subMinutes(NOW, 9)),
  nextSyncAt: iso(addMinutes(NOW, 51)),
  rateLimitResetAt: null,
  requestsUsed: 1_840,
  requestsLimit: 10_000,
  lastError: null,
};

export const mockScopes: XScope[] = [
  "tweet.read",
  "tweet.write",
  "users.read",
  "follows.read",
  "like.read",
  "offline.access",
];

/* ------------------------------------------------------------------ */
/* Team & campaigns                                                    */
/* ------------------------------------------------------------------ */

export const mockTeam: TeamMember[] = [
  { id: "u-anita", name: "Anita Desai", handle: "@anita_ng", email: "anita@namogange.org", role: "owner" },
  { id: "u-rohit", name: "Rohit Verma", handle: "@rohit_ng", email: "rohit@namogange.org", role: "manager" },
  { id: "u-sara", name: "Sara Thomas", handle: "@sara_ng", email: "sara@namogange.org", role: "editor" },
  { id: "u-imran", name: "Imran Qureshi", handle: "@imran_ng", email: "imran@namogange.org", role: "contributor" },
  { id: "u-divya", name: "Divya Menon", handle: "@divya_ng", email: "divya@namogange.org", role: "analyst" },
];

export const mockCampaigns: Campaign[] = [
  { id: "cmp-clean", name: "Clean Ganga Drive 2026" },
  { id: "cmp-water", name: "World Water Day" },
  { id: "cmp-school", name: "River Guardians (Schools)" },
  { id: "cmp-donor", name: "Donor Relations" },
  { id: "cmp-always", name: "Always-on Awareness" },
];

/* ------------------------------------------------------------------ */
/* Posts                                                               */
/* ------------------------------------------------------------------ */

type PostSeed = Pick<XPost, "id" | "text" | "type" | "status"> & Partial<XPost>;

function media(kind: "image" | "video", url: string, altText: string, durationSec?: number) {
  return [{ id: `m-${url.slice(-12)}`, kind, url, altText, state: "ready" as const, progress: 100, durationSec }];
}

/**
 * Hours a real social team actually posts at — the morning commute, lunch and
 * the evening scroll. Evening slots also earn a small engagement premium, so
 * the "best time to post" insight has something true to find rather than noise.
 */
const PUBLISH_HOURS = [8, 9, 10, 11, 13, 17, 18, 19, 19, 20, 20, 21];

function hourPremium(hour: number) {
  if (hour >= 18 && hour <= 21) return 1.3;
  if (hour >= 9 && hour <= 11) return 1.1;
  return 0.85;
}

function buildPost(seed: PostSeed, index: number): XPost {
  const rand = seeded(index * 131 + 29);
  const published = seed.status === "published";
  const base = 18_000 + rand() * 62_000;
  // The first few rows are the "hero" posts so Top Content has a clear shape.
  const boost = index === 0 ? 3.4 : index === 1 ? 2.1 : index === 2 ? 1.6 : 1;
  const impressions = published ? Math.round(base * boost) : 0;

  const hour = PUBLISH_HOURS[Math.floor(rand() * PUBLISH_HOURS.length)]!;
  const publishedAt = (() => {
    const date = subDays(NOW, index + 1);
    date.setHours(hour, Math.floor(rand() * 12) * 5, 0, 0);
    return date;
  })();

  const engagementRate = (0.8 + rand() * 2.6) * hourPremium(hour);
  const engagements = published ? Math.round(impressions * (engagementRate / 100)) : 0;
  const likes = Math.round(engagements * (0.42 + rand() * 0.14));
  const reposts = Math.round(engagements * (0.11 + rand() * 0.05));

  return {
    thread: [],
    media: [],
    poll: null,
    linkUrl: null,
    publishedAt: published ? iso(publishedAt) : null,
    scheduledAt: null,
    createdAt: iso(subHours(publishedAt, 26)),
    updatedAt: iso(subHours(publishedAt, 1)),
    failure: null,
    approval: "none",
    ownerId: mockTeam[index % mockTeam.length]!.id,
    campaignId: mockCampaigns[index % mockCampaigns.length]!.id,
    internalTags: [],
    archivedAt: null,
    ...seed,
    metrics: {
      impressions,
      engagements,
      likes,
      replies: Math.round(engagements * (0.06 + rand() * 0.04)),
      reposts,
      quotes: Math.round(reposts * (0.15 + rand() * 0.2)),
      bookmarks: Math.round(engagements * (0.04 + rand() * 0.05)),
      linkClicks: seed.linkUrl || seed.type === "link" ? Math.round(engagements * (0.18 + rand() * 0.12)) : Math.round(engagements * 0.02),
      profileVisits: Math.round(impressions * (0.004 + rand() * 0.006)),
      videoViews: seed.type === "video" ? Math.round(impressions * (0.28 + rand() * 0.22)) : null,
      ...seed.metrics,
    },
  };
}

const postSeeds: PostSeed[] = [
  {
    id: "1798452013874120001",
    text: "12 tonnes of plastic. 340 volunteers. One morning at Assi Ghat.\n\nThis is what a clean-up looks like when a whole city shows up. 🧹🌊\n\n#CleanGanga #NamoGange",
    type: "image",
    status: "published",
    media: media("image", IMG.river, "Volunteers in blue vests collecting plastic waste along the steps of Assi Ghat at sunrise."),
    internalTags: ["clean-up", "hero"],
    campaignId: "cmp-clean",
  },
  {
    id: "1798452013874120002",
    text: "Why does the Ganga matter to 400 million people? A short thread on the river that feeds a quarter of India. 🧵",
    thread: [
      "1/ The Ganga basin covers 26% of India's land area and supports more than 400 million people — the most densely populated river basin on earth.",
      "2/ It irrigates the fields that grow a third of the country's food, and provides drinking water to hundreds of cities and towns along its 2,525 km course.",
      "3/ But it also receives close to 3 billion litres of sewage every day, and less than half of that is treated before it reaches the water.",
      "4/ The good news: river stretches where local clean-up programmes have run for 3+ years show measurable improvement in dissolved oxygen. Change is slow, but it is real.",
      "5/ That is the work we do every week. If you want to be part of it, start here → namogange.org/volunteer",
    ],
    type: "thread",
    status: "published",
    internalTags: ["education", "evergreen"],
    campaignId: "cmp-always",
  },
  {
    id: "1798452013874120003",
    text: "Watch what 90 seconds at the riverbank looks like through a volunteer's eyes. 🎥",
    type: "video",
    status: "published",
    media: media("video", IMG.wide, "Handheld footage following a volunteer along the riverbank during a morning clean-up.", 94),
    internalTags: ["field-report"],
    campaignId: "cmp-clean",
  },
  {
    id: "1798452013874120004",
    text: "Our 2025 Annual Impact Report is out. 41 drives, 9 districts, 128 tonnes of waste removed, and 14,000 schoolchildren in the River Guardians programme.\n\nRead it here → https://namogange.org/impact-2025",
    type: "link",
    status: "published",
    linkUrl: "https://namogange.org/impact-2025",
    internalTags: ["report", "donor"],
    campaignId: "cmp-donor",
  },
  {
    id: "1798452013874120005",
    text: "Which part of river conservation should we cover next on this account?",
    type: "poll",
    status: "published",
    poll: {
      question: "Which part of river conservation should we cover next on this account?",
      options: ["Water quality data", "Volunteer stories", "Policy explainers", "Wildlife of the Ganga"],
      durationMinutes: 1440,
      votes: [412, 689, 244, 971],
      endsAt: iso(subHours(NOW, 18)),
    },
    internalTags: ["community"],
    campaignId: "cmp-always",
  },
  {
    id: "1798452013874120006",
    text: "World Water Day is not a day. It is a habit.\n\nFour things you can do this week that actually move the needle 👇\n\n#WorldWaterDay #EveryDropCounts",
    type: "image",
    status: "published",
    media: media("image", IMG.water, "Infographic listing four household water conservation actions."),
    campaignId: "cmp-water",
    internalTags: ["awareness"],
  },
  {
    id: "1798452013874120007",
    text: "We spotted a Gangetic dolphin near Chausa today. Fewer than 4,000 remain in the wild — every sighting is a reminder of what is at stake. 🐬",
    type: "image",
    status: "published",
    media: media("image", IMG.clean, "A river dolphin surfacing in the middle of the Ganga at dusk."),
    internalTags: ["wildlife", "hero"],
    campaignId: "cmp-always",
  },
  {
    id: "1798452013874120008",
    text: "Meet Kavita. She has led 27 clean-up drives in Haridwar and trained over 600 volunteers.\n\nOur Volunteer Spotlight series continues. 🙏",
    type: "image",
    status: "published",
    media: media("image", IMG.tree, "Portrait of a volunteer coordinator standing by the river holding a collection bag."),
    internalTags: ["people"],
    campaignId: "cmp-clean",
  },
  {
    id: "1798452013874120009",
    text: "River Guardians is now running in 46 schools across Patna and Kanpur. Children who learn the river young protect it for life.",
    type: "image",
    status: "published",
    media: media("image", IMG.standard, "Schoolchildren attending a river education session in a classroom."),
    campaignId: "cmp-school",
    internalTags: ["education"],
  },
  {
    id: "1798452013874120010",
    text: "Monsoon readiness briefing for riverbank villages starts Monday. If you are in Ballia or Ghazipur, our field team will be at the community centre from 9am.",
    type: "text",
    status: "published",
    campaignId: "cmp-always",
  },
  {
    id: "1798452013874120011",
    text: "Wetlands are the Ganga's kidneys. Lose them and no amount of clean-up will hold. A short explainer on why we keep fighting for them. 🌾",
    type: "image",
    status: "published",
    media: media("image", IMG.wide2, "Aerial view of wetlands adjoining the river."),
    internalTags: ["education"],
    campaignId: "cmp-always",
  },
  {
    id: "1798452013874120012",
    text: "Thank you to the 2,400 donors who funded this year's work. Your 80G receipts are on their way to your inbox today.",
    type: "text",
    status: "published",
    campaignId: "cmp-donor",
    internalTags: ["donor"],
  },
  {
    id: "1798452013874120013",
    text: "Flower waste at temples is one of the most overlooked sources of river pollution. Three fixes that temples in Varanasi are already using 👇",
    type: "image",
    status: "published",
    media: media("image", IMG.banner, "Marigold flower waste collected in baskets outside a temple."),
    campaignId: "cmp-always",
  },
  {
    id: "1798452013874120014",
    text: "Sunrise at Dashashwamedh. Some mornings the work is easy to love. 🌅",
    type: "image",
    status: "published",
    media: media("image", IMG.tourism, "Sunrise over the ghats with boats on the water."),
    campaignId: "cmp-always",
  },
  {
    id: "1798452013874120015",
    text: "Water quality readings from last week's sampling run at 6 stations, now public. Transparency matters more than good news.\n\nhttps://namogange.org/water-data",
    type: "link",
    status: "published",
    linkUrl: "https://namogange.org/water-data",
    campaignId: "cmp-always",
    internalTags: ["data"],
  },

  /* Scheduled ------------------------------------------------------- */
  {
    id: "draft-sch-01",
    text: "Kanpur volunteer drive — registrations open tomorrow at 10am. 200 slots, and they went in under an hour last time. ⏰\n\n#NamoGange #Volunteer",
    type: "image",
    status: "scheduled",
    media: media("image", IMG.river, "Poster announcing the Kanpur volunteer drive with date and time."),
    scheduledAt: iso(addHours(startOfDay(addDays(NOW, 1)), 10)),
    approval: "approved",
    campaignId: "cmp-clean",
    ownerId: "u-sara",
    metrics: undefined,
  },
  {
    id: "draft-sch-02",
    text: "Five minutes of your morning. One bucket less of plastic in the river. Here is how to start a clean-up on your own street. 🧵",
    thread: [
      "1/ Pick a stretch you walk past every day. Familiar ground means you will actually go back.",
      "2/ Gloves, two bags (wet and dry waste), and one other person. That is the whole kit.",
      "3/ Photograph before and after. It is the single best recruitment tool you have.",
    ],
    type: "thread",
    status: "scheduled",
    scheduledAt: iso(addHours(startOfDay(addDays(NOW, 2)), 18)),
    approval: "approved",
    campaignId: "cmp-always",
    ownerId: "u-imran",
  },
  {
    id: "draft-sch-03",
    text: "World Water Day is next week. We are running a live field report from Har Ki Pauri at 7pm — set a reminder.",
    type: "text",
    status: "scheduled",
    scheduledAt: iso(addHours(startOfDay(addDays(NOW, 2)), 18)),
    approval: "pending",
    campaignId: "cmp-water",
    ownerId: "u-sara",
  },
  {
    id: "draft-sch-04",
    text: "Which of these should we make next? Your vote decides this month's explainer.",
    type: "poll",
    status: "scheduled",
    poll: {
      question: "Which of these should we make next? Your vote decides this month's explainer.",
      options: ["Sewage treatment, explained", "How to read water quality data", "The Ganga's wildlife"],
      durationMinutes: 4320,
      votes: null,
      endsAt: null,
    },
    scheduledAt: iso(addHours(startOfDay(addDays(NOW, 4)), 13)),
    approval: "approved",
    campaignId: "cmp-always",
    ownerId: "u-rohit",
  },
  {
    id: "draft-sch-05",
    text: "Field notes from the Ghazipur sampling run — dissolved oxygen is up for the third quarter running. Slow, real progress. 📈",
    type: "image",
    status: "scheduled",
    media: media("image", IMG.square, "Chart showing dissolved oxygen readings improving over three quarters."),
    scheduledAt: iso(addHours(startOfDay(addDays(NOW, 6)), 11)),
    approval: "approved",
    campaignId: "cmp-always",
    ownerId: "u-divya",
  },

  /* Drafts ---------------------------------------------------------- */
  {
    id: "draft-dr-01",
    text: "Draft: announcement copy for the Patna school programme expansion. Needs the final school count from the field team before this goes out.",
    type: "text",
    status: "draft",
    approval: "pending",
    campaignId: "cmp-school",
    ownerId: "u-imran",
  },
  {
    id: "draft-dr-02",
    text: "Thank you post for the 2026 donor cohort — waiting on the final figure from finance.",
    type: "text",
    status: "draft",
    approval: "changes_requested",
    campaignId: "cmp-donor",
    ownerId: "u-sara",
  },
  {
    id: "draft-dr-03",
    text: "",
    type: "text",
    status: "draft",
    ownerId: "u-rohit",
    campaignId: null,
  },

  /* Failed ---------------------------------------------------------- */
  {
    id: "draft-fail-01",
    text: "Behind the scenes at the River Lab — how we test 6 stations in a single day. 🔬",
    type: "video",
    status: "failed",
    media: [
      {
        id: "m-failed-video",
        kind: "video",
        url: IMG.wide2,
        altText: "Laboratory technicians processing river water samples.",
        state: "failed",
        progress: 68,
        error: "Transcoding stopped at 68%.",
        durationSec: 132,
      },
    ],
    scheduledAt: iso(subHours(NOW, 5)),
    failure: {
      code: "media_processing",
      message: "X could not process the attached video. The file stopped transcoding at 68%.",
      hint: "Re-encode the clip to H.264 / MP4 under 512 MB and upload it again.",
      at: iso(subHours(NOW, 5)),
      retryCount: 2,
      lastAttemptAt: iso(subHours(NOW, 2)),
    },
    approval: "approved",
    campaignId: "cmp-always",
    ownerId: "u-imran",
  },
  {
    id: "draft-fail-02",
    text: "Reminder: the Ballia monsoon briefing starts in one hour at the community centre.",
    type: "text",
    status: "failed",
    scheduledAt: iso(subHours(NOW, 26)),
    failure: {
      code: "rate_limit",
      message: "X rejected the request — the app had reached its posting limit for the 15 minute window.",
      hint: "Retry now; the limit has since reset. Spread scheduled posts further apart to avoid this.",
      at: iso(subHours(NOW, 26)),
      retryCount: 1,
      lastAttemptAt: iso(subHours(NOW, 26)),
    },
    campaignId: "cmp-always",
    ownerId: "u-rohit",
  },
  {
    id: "draft-fail-03",
    text: "12 tonnes of plastic. 340 volunteers. One morning at Assi Ghat.\n\nThis is what a clean-up looks like when a whole city shows up. 🧹🌊\n\n#CleanGanga #NamoGange",
    type: "text",
    status: "failed",
    scheduledAt: iso(subHours(NOW, 49)),
    failure: {
      code: "duplicate_content",
      message: "X blocked this post because identical text was published from this account in the last 24 hours.",
      hint: "Edit the text so it differs from the original post, then reschedule.",
      at: iso(subHours(NOW, 49)),
      retryCount: 3,
      lastAttemptAt: iso(subHours(NOW, 30)),
    },
    campaignId: "cmp-clean",
    ownerId: "u-sara",
  },

  /* Archived -------------------------------------------------------- */
  {
    id: "1798452013874120090",
    text: "Registrations for the 2025 Haridwar drive are now closed. Thank you to everyone who signed up.",
    type: "text",
    status: "archived",
    archivedAt: iso(subDays(NOW, 40)),
    campaignId: "cmp-clean",
  },
  {
    id: "1798452013874120091",
    text: "Our old donation link is no longer active. Please use namogange.org/donate instead.",
    type: "text",
    status: "archived",
    archivedAt: iso(subDays(NOW, 61)),
    campaignId: "cmp-donor",
  },
];

export const mockPosts: XPost[] = postSeeds.map(buildPost);

/* ------------------------------------------------------------------ */
/* Mentions                                                            */
/* ------------------------------------------------------------------ */

const PEOPLE: [string, string, string, number, boolean][] = [
  ["Priya Sharma", "priyasharma_", "Environment reporter. Words in The Hindu, Scroll.", 18_400, true],
  ["Rahul Mehta", "rahulmehta", "Civil engineer. Water infrastructure nerd.", 2_140, true],
  ["Dr. Ananya Iyer", "dr_ananyaiyer", "Freshwater ecologist, IIT Kanpur.", 31_200, true],
  ["Vikram Patel", "vikrampatel", "Runs a plastics recycling unit in Kanpur.", 860, false],
  ["Neha Gupta", "nehagupta_ind", "Teacher. River Guardians volunteer.", 412, true],
  ["Ganga Watch", "gangawatch", "Independent river monitoring collective.", 64_800, false],
  ["Sanjay Kumar", "sanjaykumar", "Boatman at Dashashwamedh. 30 years on this river.", 1_920, true],
  ["Fatima Khan", "fatimakhan", "Law student. Environmental policy.", 3_380, true],
  ["Rohan Das", "rohandas", "Documentary photographer.", 9_140, true],
  ["Meera Nair", "meeranair", "CSR lead. Looking for partners.", 5_620, false],
  ["Arjun Reddy", "arjunreddy_", "", 128, false],
  ["Kavya Joshi", "kavyajoshi", "Student. NSS unit coordinator, BHU.", 740, true],
  ["Deepak Yadav", "deepakyadav", "Farmer, Ballia. Riverbank since 1998.", 302, false],
  ["Water Policy India", "waterpolicyin", "Policy research and commentary.", 42_100, false],
  ["Sneha Kulkarni", "snehakulkarni", "Marketing. Cares about rivers.", 1_180, true],
];

type MentionSeed = {
  person: number;
  text: string;
  hoursAgo: number;
  kind?: XMention["kind"];
  sentiment?: XMention["sentiment"];
  status?: XMention["status"];
  priority?: XMention["priority"];
  relatedPostId?: string;
  assigneeId?: string | null;
  conversation?: { text: string; isUs: boolean; hoursAgo: number }[];
  notes?: { author: string; text: string; hoursAgo: number }[];
  responseMinutes?: number;
};

const mentionSeeds: MentionSeed[] = [
  {
    person: 2,
    text: "@NamoGangeTrust Your dissolved oxygen figures for Ghazipur do not match the CPCB station readings for the same week. Can you share the sampling methodology? Happy to be wrong, but this needs clarifying publicly.",
    hoursAgo: 2,
    sentiment: "question",
    status: "unanswered",
    priority: "urgent",
    relatedPostId: "1798452013874120015",
    assigneeId: "u-divya",
    notes: [
      { author: "Rohit Verma", text: "This is a credible academic account with 31k followers. We should answer today with the actual method note, not a generic reply.", hoursAgo: 1 },
    ],
  },
  {
    person: 5,
    text: "@NamoGangeTrust We have been tracking the same stretch independently and our numbers broadly agree with yours. Would you be open to publishing a joint dataset next quarter?",
    hoursAgo: 5,
    sentiment: "positive",
    status: "unanswered",
    priority: "high",
    relatedPostId: "1798452013874120015",
    assigneeId: "u-rohit",
  },
  {
    person: 9,
    text: "Hi @NamoGangeTrust — our company wants to fund a clean-up drive as part of our CSR budget this year. Who should I talk to? Budget is approved, we just need a partner.",
    hoursAgo: 7,
    sentiment: "positive",
    status: "unanswered",
    priority: "urgent",
    assigneeId: "u-anita",
    notes: [{ author: "Anita Desai", text: "Potential 6-figure CSR partner. I will take this one personally — do not send a template reply.", hoursAgo: 6 }],
  },
  {
    person: 0,
    text: "Reporting on river restoration this month and would love to quote @NamoGangeTrust on the Assi Ghat programme. Is there a press contact?",
    hoursAgo: 11,
    sentiment: "question",
    status: "unanswered",
    priority: "high",
    relatedPostId: "1798452013874120001",
  },
  {
    person: 11,
    text: "@NamoGangeTrust Our NSS unit at BHU wants to join the next drive. We can bring around 40 students. How do we register?",
    hoursAgo: 14,
    sentiment: "question",
    status: "unanswered",
    priority: "normal",
    relatedPostId: "1798452013874120001",
  },
  {
    person: 3,
    text: "@NamoGangeTrust We run a recycling unit in Kanpur and can take the PET you collect, free of charge. Seems silly for it to go to landfill.",
    hoursAgo: 19,
    sentiment: "positive",
    status: "unanswered",
    priority: "high",
  },
  {
    person: 6,
    text: "@NamoGangeTrust Thirty years I have rowed this river. This year the water near the ghat is the clearest I have seen it since my father's time. Whatever you are doing, keep doing it. 🙏",
    hoursAgo: 22,
    sentiment: "positive",
    status: "replied",
    priority: "normal",
    relatedPostId: "1798452013874120001",
    responseMinutes: 46,
    conversation: [
      { text: "This means more to us than any metric we publish. Thank you, Sanjay ji. 🙏", isUs: true, hoursAgo: 21 },
      { text: "Come find me at the ghat any morning. Chai is on me.", isUs: false, hoursAgo: 20 },
    ],
  },
  {
    person: 4,
    text: "@NamoGangeTrust My class did the River Guardians module last term and my students now correct ME about plastic. Thank you for building it. 😊",
    hoursAgo: 27,
    sentiment: "positive",
    status: "replied",
    priority: "normal",
    relatedPostId: "1798452013874120009",
    responseMinutes: 88,
    conversation: [{ text: "That is exactly the outcome we hoped for. Thank you for teaching it, Neha!", isUs: true, hoursAgo: 25 }],
  },
  {
    person: 13,
    text: "Useful transparency from @NamoGangeTrust here — publishing raw water data is rarer than it should be in this sector.",
    hoursAgo: 31,
    kind: "quote",
    sentiment: "positive",
    status: "replied",
    priority: "normal",
    relatedPostId: "1798452013874120015",
    responseMinutes: 120,
    conversation: [{ text: "Thank you — we think the sector improves faster when the numbers are public, good or bad.", isUs: true, hoursAgo: 29 }],
  },
  {
    person: 7,
    text: "@NamoGangeTrust Is there a written policy position on the proposed riverfront construction at Ghazipur? Writing a paper and would like to cite you accurately.",
    hoursAgo: 36,
    sentiment: "question",
    status: "replied",
    priority: "high",
    responseMinutes: 210,
    conversation: [{ text: "We have a position note — sending it to you by DM now. Short version: we oppose construction inside the active floodplain.", isUs: true, hoursAgo: 32 }],
  },
  {
    person: 8,
    text: "Spent the morning shooting the @NamoGangeTrust drive at Assi Ghat. Photos to follow. The scale of it is hard to convey.",
    hoursAgo: 44,
    kind: "quote",
    sentiment: "positive",
    status: "resolved",
    priority: "normal",
    relatedPostId: "1798452013874120001",
    responseMinutes: 65,
    conversation: [{ text: "Thank you for documenting it, Rohan. Tag us when they are up and we will share.", isUs: true, hoursAgo: 43 }],
  },
  {
    person: 12,
    text: "@NamoGangeTrust The briefing at Ballia was useful but nobody came to our side of the embankment. Three villages there were not told.",
    hoursAgo: 50,
    sentiment: "negative",
    status: "resolved",
    priority: "high",
    responseMinutes: 95,
    conversation: [
      { text: "That is our mistake and we are sorry. Our field lead will be there Thursday — can we get your village name?", isUs: true, hoursAgo: 48 },
      { text: "Sherpur, near the old pump house. Thank you for listening.", isUs: false, hoursAgo: 47 },
      { text: "Noted and added to Thursday's route. Thank you for telling us.", isUs: true, hoursAgo: 46 },
    ],
    notes: [{ author: "Rohit Verma", text: "Added Sherpur to the Thursday route sheet. Closing this out.", hoursAgo: 45 }],
  },
  {
    person: 14,
    text: "@NamoGangeTrust Love the dolphin post! Shared it with my whole office. 🐬",
    hoursAgo: 58,
    sentiment: "positive",
    status: "resolved",
    priority: "low",
    relatedPostId: "1798452013874120007",
    responseMinutes: 140,
    conversation: [{ text: "Thank you for spreading it! Every person who knows they exist is one more person protecting them.", isUs: true, hoursAgo: 55 }],
  },
  {
    person: 10,
    text: "@NamoGangeTrust FOLLOW BACK PLS 🔥🔥 CHECK MY PROFILE FOR CRYPTO SIGNALS 100X GUARANTEED",
    hoursAgo: 63,
    sentiment: "neutral",
    status: "ignored",
    priority: "low",
  },
  {
    person: 10,
    text: "@NamoGangeTrust dm me for promotion services cheap rates best engagement",
    hoursAgo: 70,
    sentiment: "neutral",
    status: "ignored",
    priority: "low",
  },
  {
    person: 1,
    text: "@NamoGangeTrust Any plans to extend the programme upstream toward Rishikesh? Happy to help coordinate on that stretch.",
    hoursAgo: 77,
    sentiment: "question",
    status: "resolved",
    priority: "normal",
    responseMinutes: 180,
    conversation: [{ text: "It is on the 2026 plan. We will come back to you when the Rishikesh stretch is scoped — thank you for offering.", isUs: true, hoursAgo: 74 }],
  },
  {
    person: 3,
    text: "@NamoGangeTrust Following up on the recycling offer from last month — the unit is still ready when you are.",
    hoursAgo: 90,
    sentiment: "question",
    status: "unanswered",
    priority: "normal",
  },
  {
    person: 13,
    text: "@NamoGangeTrust The claim of '128 tonnes removed' in your impact report — is that wet weight or dry weight? It materially changes the comparison to other programmes.",
    hoursAgo: 103,
    sentiment: "question",
    status: "unanswered",
    priority: "high",
    relatedPostId: "1798452013874120004",
    assigneeId: "u-divya",
  },
];

export const mockMentions: XMention[] = mentionSeeds.map((seed, i) => {
  const [name, handle, bio, followers, isFollower] = PEOPLE[seed.person]!;
  const rand = seeded(i * 61 + 11);
  const at = subHours(NOW, seed.hoursAgo);
  const conversation = (seed.conversation ?? []).map((m, j) => ({
    id: `conv-${i}-${j}`,
    authorHandle: m.isUs ? mockAccount.handle : `@${handle}`,
    authorName: m.isUs ? mockAccount.name : name,
    isUs: m.isUs,
    text: m.text,
    at: iso(subHours(NOW, m.hoursAgo)),
  }));

  return {
    id: `mention-${1000 + i}`,
    user: {
      id: `xu-${handle}`,
      name,
      handle: `@${handle}`,
      avatarUrl: null,
      verified: followers > 25_000 ? "blue" : "none",
      bio,
      followers,
      following: Math.round(followers * (0.05 + rand() * 0.4)),
      location: ["Varanasi, India", "New Delhi, India", "Kanpur, India", "Patna, India", "Mumbai, India"][i % 5]!,
      isFollower,
    },
    text: seed.text,
    at: iso(at),
    kind: seed.kind ?? "mention",
    relatedPostId: seed.relatedPostId ?? null,
    conversation,
    sentiment: seed.sentiment ?? "neutral",
    metrics: {
      likes: Math.round(rand() * 180),
      replies: Math.round(rand() * 14),
      reposts: Math.round(rand() * 40),
    },
    repliedAt: conversation.find((c) => c.isUs)?.at ?? null,
    responseMinutes: seed.responseMinutes ?? null,
    status: seed.status ?? "unanswered",
    priority: seed.priority ?? "normal",
    assigneeId: seed.assigneeId ?? null,
    notes: (seed.notes ?? []).map((n, j) => ({
      id: `note-${i}-${j}`,
      author: n.author,
      text: n.text,
      at: iso(subHours(NOW, n.hoursAgo)),
    })),
  };
});
export function buildSeries(days: number, offset = 0): SeriesPoint[] {
  return Array.from({ length: days }, (_, i) => {
    const daysAgo = offset + days - 1 - i;
    const rand = seeded(20_000 - daysAgo * 13);
    const day = subDays(NOW, daysAgo);
    // Gentle upward trend, with weekday peaks — X engagement dips at weekends.
    const trend = 1 + (180 - daysAgo) / 1400;
    const weekday = day.getDay();
    const weekly = weekday === 0 || weekday === 6 ? 0.78 : 1 + (weekday === 2 || weekday === 3 ? 0.12 : 0);
    const impressions = Math.round(42_000 * trend * weekly * (0.84 + rand() * 0.34));
    const engagementRate = 1.6 + rand() * 2.1;
    const engagements = Math.round(impressions * (engagementRate / 100));
    const likes = Math.round(engagements * (0.44 + rand() * 0.1));
    const reposts = Math.round(engagements * (0.12 + rand() * 0.04));
    const replies = Math.round(engagements * (0.07 + rand() * 0.03));
    const linkClicks = Math.round(engagements * (0.14 + rand() * 0.06));
    return {
      date: iso(startOfDay(day)),
      impressions,
      engagements,
      engagementRate: Number(engagementRate.toFixed(2)),
      likes,
      replies,
      reposts,
      linkClicks,
      profileVisits: Math.round(impressions * (0.005 + rand() * 0.004)),
      followerGrowth: Math.round((impressions / 1000) * (0.9 + rand() * 1.6) - rand() * 12),
      videoViews: Math.round(impressions * (0.06 + rand() * 0.05)),
    };
  });
}

/* ------------------------------------------------------------------ */
/* Audience                                                            */
/* ------------------------------------------------------------------ */

const AUDIENCE_NAMES: [string, string, string][] = [
  ["Ishaan Bhatt", "ishaanbhatt", "Hydrology postgrad, IIT Roorkee."],
  ["Lakshmi Rao", "lakshmirao", "Sustainability consultant."],
  ["Farhan Sheikh", "farhansheikh", "Journalist covering environment and health."],
  ["Nandini Bose", "nandinibose", "Wildlife photographer. Gangetic plains."],
  ["Aditya Kulkarni", "adityakulkarni", "Runs a composting startup in Pune."],
  ["Zara Ahmed", "zaraahmed", "Climate policy analyst."],
  ["Gaurav Singh", "gauravsingh", "NGO operations. Bihar."],
  ["Tanvi Shah", "tanvishah", "Product designer. Weekend volunteer."],
  ["Harsh Malhotra", "harshmalhotra", "Water utility engineer, Lucknow."],
  ["Ritu Chawla", "rituchawla", "Schoolteacher, River Guardians partner."],
  ["Kabir Nanda", "kabirnanda", "Documentary editor."],
  ["Sonal Deshpande", "sonaldeshpande", "CSR manager."],
];

function audienceMember(index: number, kind: "recent" | "engaging" | "mentioner"): AudienceMember {
  const rand = seeded(index * 173 + (kind === "recent" ? 5 : kind === "engaging" ? 55 : 155));
  const [name, handle, bio] = AUDIENCE_NAMES[index % AUDIENCE_NAMES.length]!;
  const followers = Math.round(200 + rand() * 48_000);
  return {
    id: `xa-${kind}-${handle}-${index}`,
    name,
    handle: `@${handle}`,
    avatarUrl: null,
    verified: followers > 30_000 ? "blue" : "none",
    bio,
    followers,
    following: Math.round(followers * (0.08 + rand() * 0.5)),
    location: ["Varanasi, India", "New Delhi, India", "Kanpur, India", "Patna, India", "Mumbai, India", "Lucknow, India"][index % 6]!,
    isFollower: kind !== "mentioner" || rand() > 0.4,
    followedAt: kind === "recent" ? iso(subHours(NOW, index * 9 + 2)) : iso(subDays(NOW, 30 + index * 11)),
    engagements: kind === "engaging" ? Math.round(120 - index * 7 + rand() * 12) : Math.round(rand() * 24),
    mentions: kind === "mentioner" ? Math.round(24 - index * 1.6 + rand() * 3) : Math.round(rand() * 3),
    lastEngagedAt: iso(subHours(NOW, Math.round(rand() * 90) + 1)),
    internalTags: [],
    note: "",
    ownerId: null,
    lists: [],
  };
}

const geography: GeographyRow[] = [
  { code: "IN", country: "India", lat: 22, lon: 79, followers: 38_420, engagements: 74_200 },
  { code: "US", country: "United States", lat: 39, lon: -98, followers: 3_210, engagements: 5_840 },
  { code: "GB", country: "United Kingdom", lat: 54, lon: -2, followers: 1_840, engagements: 3_120 },
  { code: "AE", country: "United Arab Emirates", lat: 24, lon: 54, followers: 1_460, engagements: 2_410 },
  { code: "CA", country: "Canada", lat: 56, lon: -106, followers: 980, engagements: 1_620 },
  { code: "AU", country: "Australia", lat: -25, lon: 133, followers: 760, engagements: 1_180 },
  { code: "SG", country: "Singapore", lat: 1, lon: 104, followers: 640, engagements: 990 },
  { code: "DE", country: "Germany", lat: 51, lon: 10, followers: 520, engagements: 810 },
];

export const mockAudience: AudienceData = {
  followerSeries: Array.from({ length: 90 }, (_, i) => {
    const daysAgo = 89 - i;
    const rand = seeded(30_000 - daysAgo * 17);
    const gained = Math.round(120 + rand() * 180);
    const lost = Math.round(18 + rand() * 46);
    return {
      date: iso(startOfDay(subDays(NOW, daysAgo))),
      followers: mockAccount.followers - Math.round(daysAgo * 88),
      gained,
      lost,
    };
  }),
  recentFollowers: Array.from({ length: 12 }, (_, i) => audienceMember(i, "recent")),
  topEngaging: Array.from({ length: 10 }, (_, i) => audienceMember(i + 2, "engaging")).sort((a, b) => b.engagements - a.engagements),
  frequentMentioners: Array.from({ length: 8 }, (_, i) => audienceMember(i + 4, "mentioner")).sort((a, b) => b.mentions - a.mentions),
  activity: Array.from({ length: 7 }, (_, d) =>
    Array.from({ length: 24 }, (_, h) => {
      const rand = seeded(d * 100 + h);
      // Two clear peaks: the morning commute and the evening scroll.
      const morning = Math.exp(-((h - 9) ** 2) / 8);
      const evening = Math.exp(-((h - 20) ** 2) / 10) * 1.25;
      const weekendDip = d >= 5 ? 0.72 : 1;
      return Math.round((morning + evening) * 100 * weekendDip * (0.82 + rand() * 0.36));
    }),
  ),
  byDay: [
    { label: "Mon", value: 3.1 },
    { label: "Tue", value: 3.6 },
    { label: "Wed", value: 3.8 },
    { label: "Thu", value: 3.3 },
    { label: "Fri", value: 2.9 },
    { label: "Sat", value: 2.2 },
    { label: "Sun", value: 2.4 },
  ],
  geography,
  followerSplit: [
    { label: "Followers", value: 62.4 },
    { label: "Non-followers", value: 37.6 },
  ],
  profileVisits: 41_280,
  previousProfileVisits: 36_940,
  engagedFollowers: 9_840,
  previousEngagedFollowers: 8_610,
};

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

export const mockSettings: XSettings = {
  sync: {
    auto: true,
    frequency: "hourly",
    includeContent: true,
    includeMentions: true,
    includeAudience: true,
    includeAnalytics: true,
  },
  publishing: {
    timezone: "Asia/Kolkata",
    defaultCampaignId: "cmp-always",
    defaultTags: ["namogange"],
    urlTracking: { enabled: true, source: "x", medium: "social" },
    defaultTime: "18:30",
    minimumGapMinutes: 30,
  },
  notifications: {
    newMention: { inApp: true, email: false, slack: false },
    highPriorityMention: { inApp: true, email: true, slack: true },
    failedPost: { inApp: true, email: true, slack: false },
    publishingFailure: { inApp: true, email: true, slack: true },
    connectionIssue: { inApp: true, email: true, slack: false },
    dailySummary: { inApp: false, email: true, slack: false },
  },
  rolePermissions: {
    owner: [
      "view_x", "create_content", "publish_content", "schedule_content", "reply_mentions",
      "delete_content", "view_analytics", "approve_content", "manage_connection", "manage_settings",
    ],
    manager: [
      "view_x", "create_content", "publish_content", "schedule_content", "reply_mentions",
      "delete_content", "view_analytics", "approve_content", "manage_settings",
    ],
    editor: ["view_x", "create_content", "schedule_content", "reply_mentions", "view_analytics"],
    contributor: ["view_x", "create_content"],
    analyst: ["view_x", "view_analytics"],
  },
  contentRules: {
    brandVoice:
      "Calm, factual, never alarmist. Lead with the number or the image, not the appeal. Credit volunteers by name where possible. Never claim results we have not measured.",
    blockedWords: ["guaranteed", "miracle", "100% clean", "cheapest"],
    requiredTags: ["namogange"],
    requireAltText: true,
    maxMedia: 4,
    requireTrackedLinks: true,
    blockShorteners: true,
  },
  approvals: {
    required: true,
    reviewerIds: ["u-anita", "u-rohit"],
    publisherIds: ["u-anita", "u-rohit"],
  },
};

/* ------------------------------------------------------------------ */
/* Approvals, activity & notifications                                 */
/* ------------------------------------------------------------------ */

export const mockApprovals: ApprovalEvent[] = [
  { id: "ap-1", postId: "draft-sch-01", action: "submitted", actor: "Sara Thomas", at: iso(subHours(NOW, 30)), note: "Ready for the Kanpur drive announcement." },
  { id: "ap-2", postId: "draft-sch-01", action: "approved", actor: "Rohit Verma", at: iso(subHours(NOW, 28)) },
  { id: "ap-3", postId: "draft-dr-01", action: "submitted", actor: "Imran Qureshi", at: iso(subHours(NOW, 12)), note: "School count still provisional." },
  { id: "ap-4", postId: "draft-dr-02", action: "submitted", actor: "Sara Thomas", at: iso(subHours(NOW, 52)) },
  {
    id: "ap-5",
    postId: "draft-dr-02",
    action: "changes_requested",
    actor: "Anita Desai",
    at: iso(subHours(NOW, 48)),
    note: "Hold until finance confirms the final donor figure — we cannot publish an estimate.",
  },
  { id: "ap-6", postId: "draft-sch-03", action: "submitted", actor: "Sara Thomas", at: iso(subHours(NOW, 6)), note: "Needs sign-off before Water Day." },
  { id: "ap-7", postId: "draft-sch-02", action: "submitted", actor: "Imran Qureshi", at: iso(subHours(NOW, 40)) },
  { id: "ap-8", postId: "draft-sch-02", action: "approved", actor: "Anita Desai", at: iso(subHours(NOW, 38)) },
];

export const mockActivity: ActivityEvent[] = [
  { id: "ac-1", actor: "Sara Thomas", action: "post_scheduled", summary: "Scheduled for tomorrow, 10:00", entity: { type: "post", id: "draft-sch-01", label: "Kanpur volunteer drive" }, source: "OmniPlatform", at: iso(subHours(NOW, 28)) },
  { id: "ac-2", actor: "Rohit Verma", action: "approval", summary: "Approved for publishing", entity: { type: "post", id: "draft-sch-01", label: "Kanpur volunteer drive" }, source: "OmniPlatform", at: iso(subHours(NOW, 28)) },
  { id: "ac-3", actor: "Divya Menon", action: "owner_assigned", summary: "Assigned to Divya Menon", entity: { type: "mention", id: "mention-1000", label: "@rahulmehta — methodology question" }, source: "OmniPlatform", at: iso(subHours(NOW, 1)) },
  { id: "ac-4", actor: "X sync", action: "post_published", summary: "Published to X", entity: { type: "post", id: "1798452013874120001", label: "12 tonnes of plastic…" }, source: "X sync", at: iso(subHours(NOW, 3)) },
  { id: "ac-5", actor: "Rohit Verma", action: "reply_sent", summary: "Replied to @sanjaykumar", entity: { type: "mention", id: "mention-1006", label: "Boatman at Dashashwamedh" }, source: "OmniPlatform", at: iso(subHours(NOW, 21)) },
  { id: "ac-6", actor: "Anita Desai", action: "settings_updated", summary: "Turned on approval requirement", entity: { type: "settings", label: "Approvals" }, source: "OmniPlatform", at: iso(subDays(NOW, 4)) },
  { id: "ac-7", actor: "X sync", action: "post_published", summary: "Publishing failed — rate limit", entity: { type: "post", id: "draft-fail-02", label: "Ballia monsoon briefing reminder" }, source: "X sync", at: iso(subHours(NOW, 26)) },
  { id: "ac-8", actor: "Rohit Verma", action: "mention_resolved", summary: "Marked resolved", entity: { type: "mention", id: "mention-1011", label: "@deepakyadav — Sherpur briefing" }, source: "OmniPlatform", at: iso(subHours(NOW, 45)) },
  { id: "ac-9", actor: "Anita Desai", action: "connection_refreshed", summary: "Reconnected the X account", entity: { type: "account", label: "@NamoGangeTrust" }, source: "OmniPlatform", at: iso(subDays(NOW, 11)) },
  { id: "ac-10", actor: "Imran Qureshi", action: "post_created", summary: "Created a draft", entity: { type: "post", id: "draft-dr-01", label: "Patna school programme expansion" }, source: "OmniPlatform", at: iso(subHours(NOW, 12)) },
];

export const mockNotifications: WorkspaceNotification[] = [
  {
    id: "n-1",
    kind: "high_priority_mention",
    title: "Urgent mention needs a reply",
    body: "@rahulmehta is questioning the Ghazipur dissolved oxygen figures publicly.",
    href: "/admin/x/mentions?mention=mention-1000",
    at: iso(subHours(NOW, 2)),
    read: false,
  },
  {
    id: "n-2",
    kind: "post_failed",
    title: "Scheduled post failed",
    body: "Behind the scenes at the River Lab — media processing failed after 2 retries.",
    href: "/admin/x/content/draft-fail-01",
    at: iso(subHours(NOW, 5)),
    read: false,
  },
  {
    id: "n-3",
    kind: "approval_requested",
    title: "Approval requested",
    body: "Sara Thomas submitted the World Water Day live report post.",
    href: "/admin/x/content/draft-sch-03",
    at: iso(subHours(NOW, 6)),
    read: false,
  },
  {
    id: "n-4",
    kind: "post_published",
    title: "Post published",
    body: "12 tonnes of plastic. 340 volunteers. One morning at Assi Ghat.",
    href: "/admin/x/content/1798452013874120001",
    at: iso(subHours(NOW, 3)),
    read: true,
  },
  {
    id: "n-5",
    kind: "rate_limit",
    title: "Rate limit hit yesterday",
    body: "One scheduled post was rejected because three posts were queued in the same window.",
    href: "/admin/x/scheduling?view=failed",
    at: iso(subHours(NOW, 26)),
    read: true,
  },
];
