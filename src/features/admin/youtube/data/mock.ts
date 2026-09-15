import { addDays, addHours, addMinutes, startOfDay, subDays, subHours, subMinutes } from "date-fns";
import type {
  ApprovalEvent,
  AudienceData,
  AuditEvent,
  BreakdownRow,
  Channel,
  ChannelFeatures,
  CommentThread,
  ConnectionInfo,
  LiveEvent,
  Playlist,
  RevenueData,
  SeriesPoint,
  TeamMember,
  Video,
  VersionEntry,
  WorkspaceNotification,
  WorkspaceSettings,
  YouTubeScope,
} from "../types";

const NOW = new Date();
const iso = (d: Date) => d.toISOString();

/** Deterministic PRNG so charts don't reshuffle between renders. */
export function seeded(seed: number) {
  // Scramble nearby seeds (mulberry32) so consecutive seeds don't produce correlated values.
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
};

export const THUMBNAIL_LIBRARY = Object.values(IMG);

export const mockChannel: Channel = {
  id: "UCq8N4m2GangeTrust01",
  title: "Namo Gange Trust",
  handle: "@NamoGangeTrust",
  description:
    "Working towards a cleaner, healthier Ganga through awareness, action and community participation. New stories from the riverbanks every week.",
  customUrl: "youtube.com/@NamoGangeTrust",
  avatarUrl: "/namogange.webp",
  bannerUrl: IMG.tourism,
  isVerified: true,
  subscriberCount: 12_480,
  videoCount: 482,
  viewCount: 3_864_210,
  country: "India",
  createdAt: "2017-06-12T00:00:00.000Z",
  keywords: ["Nonprofit", "Environment", "River conservation", "Education"],
  googleAccount: "media@namogange.org",
};

export const mockConnection: ConnectionInfo = {
  state: "connected",
  lastSyncedAt: iso(subMinutes(NOW, 12)),
  nextSyncAt: iso(addMinutes(NOW, 48)),
  autoSync: true,
  syncFrequency: "hourly",
  quotaUsed: 3_420,
  quotaLimit: 10_000,
};

export const mockScopes: YouTubeScope[] = [
  "youtube.readonly",
  "youtube.upload",
  "youtube",
  "youtube.force-ssl",
  "yt-analytics.readonly",
  "yt-analytics-monetary.readonly",
];

export const mockFeatures: ChannelFeatures = {
  liveStreamingEnabled: true,
  monetizationEnabled: true,
  customThumbnailsEnabled: true,
  longUploadsEnabled: true,
};

/* ------------------------------------------------------------------ */
/* Videos                                                              */
/* ------------------------------------------------------------------ */

type Seed = Partial<Video> & Pick<Video, "id" | "title" | "type" | "status" | "thumbnailUrl">;

const DESC =
  "Join Namo Gange Trust volunteers on the ghats of Varanasi as we remove plastic waste, plant native trees and speak with families whose lives depend on the river.\n\nVolunteer: namogange.org/volunteer\nDonate: namogange.org/donate";

function video(seed: Seed, index: number): Video {
  const rand = seeded(index * 97 + 13);
  const published = seed.status === "published";
  const views = published ? Math.round((seed.type === "short" ? 14_000 : 38_000) * (0.4 + rand() * 3.2) * (index < 3 ? 2.2 : 1)) : 0;
  return {
    description: DESC,
    visibility: published ? "public" : "private",
    publishedAt: published ? iso(subDays(NOW, index * 3 + 1)) : null,
    scheduledAt: null,
    durationSec: seed.type === "short" ? 30 + Math.round(rand() * 29) : 240 + Math.round(rand() * 600),
    tags: ["namo gange", "clean ganga", "river conservation", "varanasi"],
    categoryId: "29",
    language: "en",
    madeForKids: false,
    ageRestricted: false,
    license: "youtube",
    embeddable: true,
    commentsEnabled: true,
    paidPromotion: false,
    recordingDate: null,
    playlistIds: [],
    approval: "none",
    updatedAt: iso(subDays(NOW, index)),
    ...seed,
    stats: {
      views,
      watchTimeHours: published ? Math.round(views * (seed.type === "short" ? 0.008 : 0.06)) : 0,
      likes: published ? Math.round(views * (0.03 + rand() * 0.04)) : 0,
      comments: published ? Math.round(views * (0.002 + rand() * 0.003)) : 0,
      ctr: published ? Number((3.5 + rand() * 6).toFixed(1)) : null,
      impressions: published ? Math.round(views * (8 + rand() * 10)) : null,
      avgViewDurationSec: published ? (seed.type === "short" ? 22 + Math.round(rand() * 20) : 150 + Math.round(rand() * 160)) : null,
      subscribersGained: published ? Math.round(views * 0.004) : null,
      ...seed.stats,
    },
  };
}

const seeds: Seed[] = [
  { id: "vGng8a2KpQe", title: "Clean Ganga Drive | A Step Towards a Cleaner Tomorrow", type: "video", status: "published", thumbnailUrl: IMG.river, playlistIds: ["PLclean01", "PLstories02"] },
  { id: "vWtr22Day25", title: "World Water Day 2026 | Every Drop Counts", type: "video", status: "published", thumbnailUrl: IMG.water, playlistIds: ["PLwater03"] },
  { id: "sPlstc60sec", title: "60 seconds: how plastic reaches the river", type: "short", status: "published", thumbnailUrl: IMG.portrait, playlistIds: ["PLshorts04"] },
  { id: "vVolSpot318", title: "Volunteer Spotlight – Real Change Makers of Haridwar", type: "video", status: "published", thumbnailUrl: IMG.tree, playlistIds: ["PLstories02"] },
  { id: "sGhatClean1", title: "Before & after: Assi Ghat clean-up", type: "short", status: "published", thumbnailUrl: IMG.clean, playlistIds: ["PLshorts04", "PLclean01"] },
  { id: "vJoinMove10", title: "Join the Movement for a Cleaner Ganga", type: "video", status: "published", thumbnailUrl: IMG.clean, playlistIds: ["PLclean01"] },
  { id: "lQnaTeam221", title: "Live Q&A with Our River Scientists", type: "live", status: "published", thumbnailUrl: IMG.wide, playlistIds: ["PLstories02"] },
  { id: "vTourism228", title: "Ganga Tourism – Culture, Nature, Home", type: "video", status: "published", thumbnailUrl: IMG.tourism, playlistIds: [] },
  { id: "sDolphin045", title: "We spotted a Gangetic dolphin!", type: "short", status: "published", thumbnailUrl: IMG.standard, playlistIds: ["PLshorts04"] },
  { id: "vSchoolPrg7", title: "River Guardians: our school programme in Patna", type: "video", status: "published", thumbnailUrl: IMG.wide2, playlistIds: ["PLwater03"] },
  { id: "sCompost221", title: "3 ways to stop flower waste at temples", type: "short", status: "published", thumbnailUrl: IMG.banner, playlistIds: [] },
  { id: "vAnnualRpt5", title: "Annual Impact Report 2025 – What your support achieved", type: "video", status: "published", thumbnailUrl: IMG.standard, playlistIds: [], visibility: "unlisted" },
  { id: "vMonsoon912", title: "Monsoon Readiness: Protecting Riverbank Villages", type: "video", status: "published", thumbnailUrl: IMG.wide, playlistIds: ["PLwater03"] },
  { id: "sTreeChal07", title: "The 1-minute tree planting challenge", type: "short", status: "published", thumbnailUrl: IMG.tree, playlistIds: ["PLshorts04"] },
  { id: "vWetlands33", title: "Why wetlands matter for the Ganga basin", type: "video", status: "published", thumbnailUrl: IMG.water, playlistIds: [] },
  {
    id: "vEpisode3Sc", title: "Clean Ganga Stories – Episode 3", type: "video", status: "scheduled", thumbnailUrl: IMG.river,
    scheduledAt: iso(addHours(startOfDay(addDays(NOW, 1)), 10)), visibility: "private", playlistIds: ["PLstories02"], approval: "approved",
  },
  {
    id: "sTipsWater1", title: "Water Conservation Tips at Home", type: "short", status: "scheduled", thumbnailUrl: IMG.portrait,
    scheduledAt: iso(addHours(startOfDay(addDays(NOW, 2)), 14)), visibility: "private", approval: "approved",
  },
  {
    id: "vPlantsWild", title: "Ganga Plants & Wildlife: A Field Guide", type: "video", status: "scheduled", thumbnailUrl: IMG.clean,
    scheduledAt: iso(addHours(startOfDay(addDays(NOW, 5)), 16)), visibility: "private", approval: "approved",
  },
  {
    id: "vVolAnnce18", title: "Volunteer Drive Announcement – Kanpur", type: "video", status: "draft", thumbnailUrl: IMG.tree,
    visibility: "private", approval: "pending", description: "Draft announcement for the Kanpur volunteer drive.",
  },
  {
    id: "vDonorThx02", title: "Thank you to our 2026 donors", type: "video", status: "draft", thumbnailUrl: IMG.banner,
    visibility: "private", approval: "changes_requested", tags: [],
  },
  { id: "sReelDraft9", title: "Short: sunrise at Dashashwamedh", type: "short", status: "draft", thumbnailUrl: IMG.tourism, visibility: "private" },
  {
    id: "vFailedUp01", title: "Behind the scenes: River Lab (4K)", type: "video", status: "failed", thumbnailUrl: IMG.wide2, visibility: "private",
    scheduledAt: iso(subHours(NOW, 6)), failureReason: "Processing failed: the uploaded file appears to be incomplete. Re-upload the original file.",
  },
  { id: "vProcess112", title: "Kayak expedition: Rishikesh to Haridwar", type: "video", status: "processing", thumbnailUrl: IMG.wide, visibility: "private" },
];

export const mockVideos: Video[] = seeds.map(video);

/* ------------------------------------------------------------------ */
/* Playlists                                                           */
/* ------------------------------------------------------------------ */

export const mockPlaylists: Playlist[] = [
  { id: "PLclean01", title: "Clean Ganga Drives", description: "Every clean-up drive, from Gangotri to Ganga Sagar.", visibility: "public", videoIds: ["vGng8a2KpQe", "sGhatClean1", "vJoinMove10"], updatedAt: iso(subDays(NOW, 2)), createdAt: "2022-03-01T00:00:00.000Z" },
  { id: "PLstories02", title: "Stories from the Riverbank", description: "People, places and the change they are making.", visibility: "public", videoIds: ["vVolSpot318", "vGng8a2KpQe", "lQnaTeam221", "vEpisode3Sc"], updatedAt: iso(subDays(NOW, 4)), createdAt: "2021-08-14T00:00:00.000Z" },
  { id: "PLwater03", title: "Water Awareness", description: "Explainers on water conservation and river health.", visibility: "public", videoIds: ["vWtr22Day25", "vSchoolPrg7", "vMonsoon912"], updatedAt: iso(subDays(NOW, 9)), createdAt: "2020-11-02T00:00:00.000Z" },
  { id: "PLshorts04", title: "Quick River Facts (Shorts)", description: "", visibility: "unlisted", videoIds: ["sPlstc60sec", "sGhatClean1", "sDolphin045", "sTreeChal07"], updatedAt: iso(subDays(NOW, 1)), createdAt: "2024-01-20T00:00:00.000Z" },
  { id: "PLinternal5", title: "Donor Updates (Private)", description: "Private updates shared with major donors.", visibility: "private", videoIds: ["vAnnualRpt5"], updatedAt: iso(subDays(NOW, 21)), createdAt: "2023-05-10T00:00:00.000Z" },
];

/* ------------------------------------------------------------------ */
/* Comments                                                            */
/* ------------------------------------------------------------------ */

const people = [
  "Priya Sharma", "Rahul Mehta", "Amit Singh", "Neha Gupta", "Vikram Patel", "Ananya Iyer", "Sanjay Kumar",
  "Fatima Khan", "Rohan Das", "Meera Nair", "Arjun Reddy", "Kavya Joshi", "Deepak Yadav", "Sneha Kulkarni",
];

const commentSeeds: [string, string, Partial<CommentThread>?][] = [
  ["vGng8a2KpQe", "Amazing initiative! Proud to support this 🙏 How can our college NSS unit join the next drive?", { priority: true }],
  ["vGng8a2KpQe", "Very informative video. The drone shots of the ghats are beautiful.", { replies: [{ id: "r1", author: "Namo Gange Trust", isChannelOwner: true, text: "Thank you Rahul! The drone footage was shot by our volunteer team in Varanasi.", likeCount: 4, publishedAt: iso(subHours(NOW, 1)) }] }],
  ["vWtr22Day25", "Can I volunteer for the next drive? I'm based in Kanpur."],
  ["sPlstc60sec", "Such a great cause ❤️"],
  ["vVolSpot318", "This gives hope for a cleaner future."],
  ["vGng8a2KpQe", "Earn ₹50,000 per week from home!!! Click the link in my profile", { moderationStatus: "likelySpam" }],
  ["vSchoolPrg7", "My daughter attended this programme and now reminds us every day not to use plastic bags 😊", { replies: [{ id: "r2", author: "Namo Gange Trust", isChannelOwner: true, text: "That's wonderful to hear — thank you for sharing!", likeCount: 9, publishedAt: iso(subHours(NOW, 20)) }] }],
  ["vJoinMove10", "Please share the donation receipt process for 80G tax exemption.", { priority: true }],
  ["lQnaTeam221", "Great session. Could you publish the water quality data you mentioned?", { moderationStatus: "heldForReview" }],
  ["sDolphin045", "Wow, I never knew dolphins lived in the Ganga!"],
  ["vMonsoon912", "Check out my channel for more river videos subscribe subscribe", { moderationStatus: "likelySpam" }],
  ["vTourism228", "The sections on Rishikesh were lovely. Planning a visit this winter.", { moderationStatus: "heldForReview" }],
  ["vWtr22Day25", "Are there any events in Prayagraj this month?"],
  ["sGhatClean1", "The difference is incredible. Respect to every volunteer 🙌"],
  ["vGng8a2KpQe", "Could you add Hindi subtitles? My grandparents would love to watch this."],
  ["vWetlands33", "Clear explanation of wetland ecology. Sharing with my students."],
];

export const mockComments: CommentThread[] = commentSeeds.map(([videoId, text, extra], i) => {
  const rand = seeded(i * 31 + 7);
  const author = people[i % people.length] ?? "Viewer";
  return {
    id: `cmt-${1000 + i}`,
    videoId,
    author,
    text,
    likeCount: Math.round(rand() * 60),
    publishedAt: iso(subMinutes(NOW, 10 + i * i * 45)),
    moderationStatus: "published",
    likedByChannel: false,
    replies: [],
    priority: false,
    ...extra,
  };
});
export const mockLiveEvents: LiveEvent[] = [
  {
    id: "live-upc-01", title: "Q&A with Our Team: Kanpur Volunteer Drive", description: "Ask us anything about the upcoming drive.", thumbnailUrl: IMG.tourism,
    scheduledStart: iso(addHours(startOfDay(addDays(NOW, 3)), 18)), actualStart: null, actualEnd: null, visibility: "public", lifecycle: "upcoming",
    health: "waiting", latency: "low", enableDvr: true, enableChat: true, ingestUrl: "rtmp://a.rtmp.youtube.com/live2", streamKey: "k8f2-9xqa-4m7d-p1zt-3hvc",
    concurrentViewers: null, peakViewers: null, totalViews: null, chatMessages: null, replayVideoId: null,
  },
  {
    id: "live-upc-02", title: "Ganga Aarti Live from Har Ki Pauri", description: "Evening aarti streamed live from Haridwar.", thumbnailUrl: IMG.clean,
    scheduledStart: iso(addHours(startOfDay(addDays(NOW, 8)), 19)), actualStart: null, actualEnd: null, visibility: "unlisted", lifecycle: "upcoming",
    health: "waiting", latency: "normal", enableDvr: true, enableChat: false, ingestUrl: "rtmp://a.rtmp.youtube.com/live2", streamKey: "q2n5-7bwe-8k3l-z9ru-6ypd",
    concurrentViewers: null, peakViewers: null, totalViews: null, chatMessages: null, replayVideoId: null,
  },
  {
    id: "live-now-01", title: "Live: Assi Ghat Clean-up Drive", description: "Join us live as 200 volunteers clean Assi Ghat.", thumbnailUrl: IMG.river,
    scheduledStart: iso(subMinutes(NOW, 40)), actualStart: iso(subMinutes(NOW, 34)), actualEnd: null, visibility: "public", lifecycle: "live",
    health: "healthy", latency: "low", enableDvr: true, enableChat: true, ingestUrl: "rtmp://a.rtmp.youtube.com/live2", streamKey: "m4t8-1cva-6j2k-w5ne-0xrb",
    concurrentViewers: 1_284, peakViewers: 1_612, totalViews: 3_904, chatMessages: 842, replayVideoId: null,
  },
  {
    id: "live-done-01", title: "Live Q&A with Our River Scientists", description: "Recorded Q&A on river water quality.", thumbnailUrl: IMG.wide,
    scheduledStart: iso(subDays(NOW, 19)), actualStart: iso(subDays(NOW, 19)), actualEnd: iso(addMinutes(subDays(NOW, 19), 62)), visibility: "public", lifecycle: "completed",
    health: "ended", latency: "normal", enableDvr: true, enableChat: true, ingestUrl: "rtmp://a.rtmp.youtube.com/live2", streamKey: "x1y2-z3a4-b5c6-d7e8-f9g0",
    concurrentViewers: null, peakViewers: 2_140, totalViews: 18_420, chatMessages: 1_906, replayVideoId: "lQnaTeam221",
  },
  {
    id: "live-done-02", title: "World Environment Day Townhall", description: "Panel discussion with partners.", thumbnailUrl: IMG.wide2,
    scheduledStart: iso(subDays(NOW, 64)), actualStart: iso(subDays(NOW, 64)), actualEnd: iso(addMinutes(subDays(NOW, 64), 95)), visibility: "public", lifecycle: "completed",
    health: "ended", latency: "normal", enableDvr: true, enableChat: true, ingestUrl: "rtmp://a.rtmp.youtube.com/live2", streamKey: "h7j8-k9l0-m1n2-o3p4-q5r6",
    concurrentViewers: null, peakViewers: 980, totalViews: 7_310, chatMessages: 612, replayVideoId: null,
  },
];
export function buildSeries(days: number, offset = 0): SeriesPoint[] {
  return Array.from({ length: days }, (_, i) => {
    const dayIndex = offset + days - 1 - i; // days ago
    const rand = seeded(10_000 - dayIndex * 7);
    const trend = 1 + (400 - dayIndex) / 900; // gentle growth over the year
    const weekly = new Date(subDays(NOW, dayIndex)).getDay() % 6 === 0 ? 1.18 : 1;
    const views = Math.round(7_200 * trend * weekly * (0.82 + rand() * 0.36));
    const impressions = Math.round(views * (13 + rand() * 3));
    return {
      date: iso(startOfDay(subDays(NOW, dayIndex))),
      views,
      watchTime: Math.round(views * (0.052 + rand() * 0.012)),
      subscribers: Math.round(views * (0.0055 + rand() * 0.002)),
      avgViewDuration: Math.round(205 + rand() * 40),
      impressions,
      ctr: Number(((views / impressions) * 100).toFixed(2)),
    };
  });
}

export const trafficSources: BreakdownRow[] = [
  { label: "Browse features", value: 42.3, watchTimeHours: 5_210, avgViewDurationSec: 232 },
  { label: "Suggested videos", value: 24.1, watchTimeHours: 3_120, avgViewDurationSec: 251 },
  { label: "YouTube search", value: 16.8, watchTimeHours: 2_040, avgViewDurationSec: 218 },
  { label: "External", value: 8.4, watchTimeHours: 810, avgViewDurationSec: 176 },
  { label: "Channel pages", value: 5.2, watchTimeHours: 690, avgViewDurationSec: 264 },
  { label: "Playlists", value: 2.1, watchTimeHours: 320, avgViewDurationSec: 301 },
  { label: "Other", value: 1.1, watchTimeHours: 110, avgViewDurationSec: 140 },
];

export const externalSites: BreakdownRow[] = [
  { label: "WhatsApp", value: 38 },
  { label: "Facebook", value: 27 },
  { label: "Google Search", value: 18 },
  { label: "namogange.org", value: 11 },
  { label: "X (Twitter)", value: 6 },
];

export const searchTerms: BreakdownRow[] = [
  { label: "ganga cleaning", value: 4_210 },
  { label: "namami gange", value: 3_180 },
  { label: "river pollution india", value: 1_940 },
  { label: "world water day", value: 1_320 },
  { label: "varanasi ghat", value: 980 },
];

/** Relative audience retention (% still watching) across the video timeline. */
export function buildRetention(seed: number, points = 41): { position: number; retention: number; typical: number }[] {
  const rand = seeded(seed);
  return Array.from({ length: points }, (_, i) => {
    const t = i / (points - 1);
    const base = 100 * Math.exp(-1.35 * t) * (1 - 0.12 * t) + (t < 0.05 ? 0 : 8);
    return {
      position: Math.round(t * 100),
      retention: Math.max(8, Math.min(100, Number((base + (rand() - 0.5) * 5 + (i === 14 ? 7 : 0)).toFixed(1)))),
      typical: Math.max(6, Number((100 * Math.exp(-1.6 * t) + (t < 0.05 ? 0 : 5)).toFixed(1))),
    };
  });
}

export function buildRealtime(): { hour: string; views: number }[] {
  const rand = seeded(4242);
  return Array.from({ length: 48 }, (_, i) => {
    const d = subHours(NOW, 47 - i);
    const h = d.getHours();
    const diurnal = 0.35 + Math.max(0, Math.sin(((h - 6) / 24) * Math.PI * 2)) * 0.9;
    return { hour: iso(d), views: Math.round(320 * diurnal * (0.75 + rand() * 0.5)) };
  });
}

function activityMatrix(): number[][] {
  const rand = seeded(777);
  return Array.from({ length: 7 }, (_, day) =>
    Array.from({ length: 24 }, (_, hour) => {
      const evening = Math.exp(-((hour - 20) ** 2) / 10);
      const morning = Math.exp(-((hour - 8) ** 2) / 8) * 0.45;
      const weekend = day >= 5 ? 1.25 : 1;
      return Math.round((evening + morning + 0.05) * weekend * 100 * (0.85 + rand() * 0.3));
    }),
  );
}

export const mockAudience: AudienceData = {
  uniqueViewers: 84_210,
  returningViewers: 21_430,
  newViewers: 62_780,
  age: [
    { label: "13–17", value: 8.2 },
    { label: "18–24", value: 24.1 },
    { label: "25–34", value: 37.6 },
    { label: "35–44", value: 19.8 },
    { label: "45–54", value: 6.9 },
    { label: "55–64", value: 2.4 },
    { label: "65+", value: 1.0 },
  ],
  gender: [
    { label: "Male", value: 66.4 },
    { label: "Female", value: 32.8 },
    { label: "User-specified", value: 0.8 },
  ],
  geography: [
    { code: "IN", country: "India", lat: 21, lon: 78, views: 196_400, watchTimeHours: 10_210, subscribers: 1_960 },
    { code: "US", country: "United States", lat: 39, lon: -98, views: 14_120, watchTimeHours: 820, subscribers: 142 },
    { code: "GB", country: "United Kingdom", lat: 54, lon: -2, views: 9_840, watchTimeHours: 590, subscribers: 96 },
    { code: "AE", country: "United Arab Emirates", lat: 24, lon: 54, views: 7_310, watchTimeHours: 402, subscribers: 71 },
    { code: "NP", country: "Nepal", lat: 28, lon: 84, views: 6_120, watchTimeHours: 318, subscribers: 58 },
    { code: "CA", country: "Canada", lat: 56, lon: -106, views: 4_980, watchTimeHours: 276, subscribers: 44 },
    { code: "AU", country: "Australia", lat: -25, lon: 134, views: 3_720, watchTimeHours: 201, subscribers: 31 },
    { code: "SG", country: "Singapore", lat: 1.3, lon: 103.8, views: 2_410, watchTimeHours: 130, subscribers: 19 },
    { code: "DE", country: "Germany", lat: 51, lon: 10, views: 1_980, watchTimeHours: 104, subscribers: 14 },
    { code: "BD", country: "Bangladesh", lat: 24, lon: 90, views: 1_720, watchTimeHours: 88, subscribers: 12 },
  ],
  devices: [
    { label: "Mobile phone", value: 71.2, watchTimeHours: 8_620 },
    { label: "Computer", value: 14.8, watchTimeHours: 2_140 },
    { label: "TV", value: 10.6, watchTimeHours: 1_720 },
    { label: "Tablet", value: 3.4, watchTimeHours: 410 },
  ],
  activity: activityMatrix(),
  subscriberSources: [
    { label: "Watch page", value: 58.4 },
    { label: "Shorts feed", value: 21.2 },
    { label: "Channel page", value: 11.6 },
    { label: "YouTube search", value: 6.1 },
    { label: "Other", value: 2.7 },
  ],
};

export function buildRevenue(days: number): RevenueData {
  const rand = seeded(days * 11);
  const series = Array.from({ length: days }, (_, i) => ({
    date: iso(startOfDay(subDays(NOW, days - 1 - i))),
    revenue: Math.round(380 + i * (140 / days) + rand() * 160),
  }));
  const total = series.reduce((sum, p) => sum + p.revenue, 0);
  return {
    estimatedRevenue: total,
    previousRevenue: Math.round(total * 0.87),
    rpm: 58.4,
    cpm: 142.7,
    monetizedPlaybacks: Math.round(total / 0.142),
    series,
    sources: [
      { label: "Watch page ads", value: 71.4 },
      { label: "YouTube Premium", value: 12.8 },
      { label: "Shorts Feed ads", value: 9.6 },
      { label: "Supers & Memberships", value: 6.2 },
    ],
  };
}
export const mockTeam: TeamMember[] = [
  { id: "usr-admin-001", name: "Manish Sirohi", email: "manishsirohi@encodency.com", role: "owner", initials: "MS" },
  { id: "usr-002", name: "Ritika Bansal", email: "ritika@namogange.org", role: "manager", initials: "RB" },
  { id: "usr-003", name: "Aakash Verma", email: "aakash@encodency.com", role: "editor", initials: "AV" },
  { id: "usr-004", name: "Pooja Rawat", email: "pooja@encodency.com", role: "contributor", initials: "PR" },
  { id: "usr-005", name: "Nitin Chauhan", email: "nitin@namogange.org", role: "analyst", initials: "NC" },
];

export const mockSettings: WorkspaceSettings = {
  defaults: {
    visibility: "private",
    categoryId: "29",
    language: "en",
    tags: ["namo gange", "clean ganga"],
    descriptionFooter: "Volunteer: namogange.org/volunteer\nDonate: namogange.org/donate",
    playlistId: "",
    timezone: "Asia/Kolkata",
    madeForKids: false,
    license: "youtube",
    commentsEnabled: true,
  },
  notifications: {
    uploadCompleted: { inApp: true, email: false },
    publishFailed: { inApp: true, email: true },
    newComments: { inApp: true, email: false },
    liveEvents: { inApp: true, email: true },
    syncFailure: { inApp: true, email: true },
    quotaWarning: { inApp: true, email: false },
  },
  moderation: {
    priorityAlerts: true,
    blockedKeywords: ["earn money", "click my profile", "subscribe to my channel"],
    holdLinks: true,
    requireApproval: true,
  },
  rolePermissions: {
    owner: [
      "view_youtube", "view_analytics", "upload_content", "edit_content", "delete_content", "publish_content", "schedule_content",
      "manage_playlists", "moderate_comments", "reply_comments", "manage_live", "manage_connection", "view_monetization", "manage_settings", "approve_content",
    ],
    manager: [
      "view_youtube", "view_analytics", "upload_content", "edit_content", "delete_content", "publish_content", "schedule_content",
      "manage_playlists", "moderate_comments", "reply_comments", "manage_live", "view_monetization", "approve_content",
    ],
    editor: ["view_youtube", "view_analytics", "upload_content", "edit_content", "schedule_content", "manage_playlists", "reply_comments"],
    contributor: ["view_youtube", "upload_content", "edit_content", "reply_comments"],
    analyst: ["view_youtube", "view_analytics", "view_monetization"],
  },
};

export const mockApprovals: ApprovalEvent[] = [
  { id: "ap-1", videoId: "vVolAnnce18", action: "submitted", actor: "Pooja Rawat", note: "Ready for review — thumbnail finalised.", at: iso(subHours(NOW, 5)) },
  { id: "ap-2", videoId: "vDonorThx02", action: "submitted", actor: "Pooja Rawat", at: iso(subDays(NOW, 2)) },
  { id: "ap-3", videoId: "vDonorThx02", action: "changes_requested", actor: "Ritika Bansal", note: "Please add tags and mention the 80G receipt link in the description.", at: iso(subDays(NOW, 1)) },
  { id: "ap-4", videoId: "vEpisode3Sc", action: "submitted", actor: "Aakash Verma", at: iso(subDays(NOW, 3)) },
  { id: "ap-5", videoId: "vEpisode3Sc", action: "approved", actor: "Ritika Bansal", note: "Looks great.", at: iso(subDays(NOW, 2)) },
];

export const mockVersions: VersionEntry[] = [
  { id: "ver-1", videoId: "vGng8a2KpQe", field: "title", previous: "Clean Ganga Drive 2026", next: "Clean Ganga Drive | A Step Towards a Cleaner Tomorrow", actor: "Aakash Verma", at: iso(subDays(NOW, 6)) },
  { id: "ver-2", videoId: "vGng8a2KpQe", field: "thumbnail", previous: IMG.clean, next: IMG.river, actor: "Ritika Bansal", at: iso(subDays(NOW, 5)) },
  { id: "ver-3", videoId: "vGng8a2KpQe", field: "tags", previous: "namo gange, clean ganga", next: "namo gange, clean ganga, river conservation, varanasi", actor: "Aakash Verma", at: iso(subDays(NOW, 4)) },
  { id: "ver-4", videoId: "vEpisode3Sc", field: "schedule", previous: "Not scheduled", next: "Tomorrow, 10:00 AM", actor: "Ritika Bansal", at: iso(subDays(NOW, 2)) },
];

export const mockAudit: AuditEvent[] = [
  { id: "au-1", actor: "System", action: "sync", summary: "Synced channel statistics and 24 videos", entity: { type: "channel", label: "Namo Gange Trust" }, source: "YouTube sync", at: iso(subMinutes(NOW, 12)) },
  { id: "au-2", actor: "Ritika Bansal", action: "approval", summary: "Requested changes", entity: { type: "video", id: "vDonorThx02", label: "Thank you to our 2026 donors" }, source: "OmniPlatform", at: iso(subDays(NOW, 1)) },
  { id: "au-3", actor: "Aakash Verma", action: "edit", summary: "Updated tags", entity: { type: "video", id: "vGng8a2KpQe", label: "Clean Ganga Drive | A Step Towards a Cleaner Tomorrow" }, previous: "namo gange, clean ganga", next: "namo gange, clean ganga, river conservation, varanasi", source: "OmniPlatform", at: iso(subDays(NOW, 4)) },
  { id: "au-4", actor: "Ritika Bansal", action: "thumbnail", summary: "Changed thumbnail", entity: { type: "video", id: "vGng8a2KpQe", label: "Clean Ganga Drive | A Step Towards a Cleaner Tomorrow" }, source: "OmniPlatform", at: iso(subDays(NOW, 5)) },
  { id: "au-5", actor: "Manish Sirohi", action: "playlist", summary: "Created playlist", entity: { type: "playlist", id: "PLshorts04", label: "Quick River Facts (Shorts)" }, source: "OmniPlatform", at: iso(subDays(NOW, 8)) },
  { id: "au-6", actor: "Manish Sirohi", action: "reconnect", summary: "Reconnected channel with analytics permissions", entity: { type: "channel", label: "Namo Gange Trust" }, source: "OmniPlatform", at: iso(subDays(NOW, 14)) },
];

export const mockNotifications: WorkspaceNotification[] = [
  { id: "n-1", kind: "live_starting", title: "Live stream is on air", body: "Live: Assi Ghat Clean-up Drive · 1,284 watching", href: "/admin/youtube/live?tab=live", at: iso(subMinutes(NOW, 34)), read: false },
  { id: "n-2", kind: "priority_comment", title: "High-priority comment", body: "Priya Sharma asked how a college NSS unit can join.", href: "/admin/youtube/comments?thread=cmt-1000", at: iso(subMinutes(NOW, 10)), read: false },
  { id: "n-3", kind: "upload_failed", title: "Upload failed", body: "Behind the scenes: River Lab (4K) couldn't be processed.", href: "/admin/youtube/content/vFailedUp01", at: iso(subHours(NOW, 6)), read: false },
  { id: "n-4", kind: "approval_requested", title: "Approval requested", body: "Pooja Rawat submitted “Volunteer Drive Announcement – Kanpur”.", href: "/admin/youtube/content/vVolAnnce18?tab=details", at: iso(subHours(NOW, 5)), read: true },
  { id: "n-5", kind: "quota_warning", title: "API quota at 34%", body: "Usage is normal. Bulk edits may use more quota.", href: "/admin/youtube/settings#sync", at: iso(subHours(NOW, 9)), read: true },
];
