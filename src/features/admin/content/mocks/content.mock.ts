import type {
  ContentDraft,
  Template,
  ContentIdea,
  ApprovalEntry,
  MediaAsset,
} from "../types/content.types";

/* ── Reusable images ── */
export const IMG = {
  river: "https://images.unsplash.com/photo-1437482078695-73f5ca6c96e2?auto=format&fit=crop&w=900&q=80",
  lake: "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=900&q=80",
  cleanup: "https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=900&q=80",
  nature: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=900&q=80",
  people: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=900&q=80",
  water: "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=900&q=80",
  mountains: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=80",
  forest: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=900&q=80",
};

export const IMAGES = Object.values(IMG);

/* ── Mock media ── */
export const MOCK_MEDIA: MediaAsset[] = [
  { id: "m1", url: IMG.river, type: "image", name: "river-cleanup.jpg", width: 1080, height: 1350, size: "2.4 MB", alt: "River cleanup campaign" },
  { id: "m2", url: IMG.lake, type: "image", name: "lake-sunset.jpg", width: 1080, height: 1080, size: "1.8 MB", alt: "Lake sunset" },
  { id: "m3", url: IMG.nature, type: "image", name: "forest-trail.jpg", width: 1920, height: 1080, size: "3.1 MB", alt: "Forest trail" },
  { id: "m4", url: IMG.people, type: "image", name: "volunteers.jpg", width: 1080, height: 1350, size: "2.0 MB", alt: "Volunteers at cleanup" },
  { id: "m5", url: IMG.water, type: "image", name: "clean-water.jpg", width: 1200, height: 627, size: "1.5 MB", alt: "Clean water initiative" },
  { id: "m6", url: IMG.cleanup, type: "image", name: "team-effort.jpg", width: 1080, height: 1080, size: "2.2 MB", alt: "Team effort" },
];

/* ── Mock clients ── */
export const MOCK_CLIENTS = [
  { id: "c1", name: "Moksha Sewa", logo: "🌿" },
  { id: "c2", name: "Namo Gange Trust", logo: "🙏" },
  { id: "c3", name: "Ganga Explorer", logo: "🚀" },
  { id: "c4", name: "Namo Gange Foundation", logo: "💚" },
];

/* ── Mock campaigns ── */
export const MOCK_CAMPAIGNS = [
  { id: "cp1", name: "Clean Ganga Awareness", objective: "Awareness" },
  { id: "cp2", name: "Volunteer Drive 2026", objective: "Engagement" },
  { id: "cp3", name: "River Conservation Tips", objective: "Education" },
  { id: "cp4", name: "Donate for Change", objective: "Donations" },
];

/* ── Content owners ── */
export const CONTENT_OWNERS = ["Manish Sirohi", "Prateeksha", "Ankit Kumar", "Ritu Pandey", "Neha Sharma"];

/* ── Mock drafts ── */
export const MOCK_DRAFTS: ContentDraft[] = [
  {
    id: "d1", title: "Cleaner Rivers, Brighter Tomorrow",
    client: MOCK_CLIENTS[0]!, campaign: MOCK_CAMPAIGNS[0]!,
    contentType: "image",
    caption: "Small actions create a cleaner tomorrow.\n\nLet's work together for a healthier, greener and cleaner India.\n\n#CleanGanga #HealthyIndia #Sustainability #MokshaSewa",
    headline: "CLEAN RIVERS BRIGHTER TOMORROW",
    description: "Small actions create a cleaner tomorrow. Together, we can protect every river.",
    cta: "Learn More", link: "https://mokshasewa.org/clean-ganga",
    hashtags: ["#CleanGanga", "#HealthyIndia", "#Sustainability", "#MokshaSewa"],
    firstComment: "What small action will you take today? 💚",
    mentions: [], location: "Varanasi, UP", notes: "",
    media: MOCK_MEDIA.slice(0, 3), ratio: "4:5",
    channels: ["instagram", "facebook", "linkedin"],
    placements: { instagram: "Feed Post", facebook: "Feed", linkedin: "Image Post", "google-business": "", whatsapp: "", youtube: "", website: "" },
    schedule: "later", scheduledAt: "2026-09-14T11:00:00Z",
    status: "pending", createdAt: "2026-09-04T08:30:00Z", updatedAt: "2026-09-04T14:14:00Z", createdBy: "Manish Sirohi",
  },
  {
    id: "d2", title: "Volunteer Stories — Behind the Scenes",
    client: MOCK_CLIENTS[1]!, campaign: MOCK_CAMPAIGNS[1]!,
    contentType: "reel",
    caption: "Meet the changemakers behind our river cleanup initiative.",
    headline: "Volunteer Spotlight", description: "Real stories of people making a difference.",
    cta: "Join Us", link: "https://mokshasewa.org/volunteer",
    hashtags: ["#Volunteer", "#ChangeMakers", "#MokshaSewa"],
    firstComment: "", mentions: [], location: "", notes: "",
    media: MOCK_MEDIA.slice(1, 3), ratio: "9:16",
    channels: ["instagram", "facebook", "youtube"],
    placements: { instagram: "Reel", facebook: "Reel", youtube: "Short", linkedin: "", "google-business": "", whatsapp: "", website: "" },
    schedule: "now", status: "draft", createdAt: "2026-09-03T10:00:00Z", updatedAt: "2026-09-03T17:40:00Z", createdBy: "Prateeksha",
  },
  {
    id: "d3", title: "World Environment Day Pledge",
    client: MOCK_CLIENTS[0]!, campaign: MOCK_CAMPAIGNS[2]!,
    contentType: "carousel",
    caption: "This Environment Day, let us renew our pledge for a greener planet.",
    headline: "Environment Day 2026", description: "Celebrate nature and take a pledge.",
    cta: "Take Pledge", link: "",
    hashtags: ["#EnvironmentDay", "#GreenPlanet", "#Pledge"],
    firstComment: "", mentions: [], location: "", notes: "",
    media: MOCK_MEDIA.slice(2, 5), ratio: "1:1",
    channels: ["linkedin", "facebook"],
    placements: { linkedin: "Document / Carousel", facebook: "Carousel", instagram: "", "google-business": "", whatsapp: "", youtube: "", website: "" },
    schedule: "later", status: "approved", createdAt: "2026-09-01T06:00:00Z", updatedAt: "2026-09-01T10:00:00Z", createdBy: "Ankit Kumar",
  },
  {
    id: "d4", title: "Tips for a Cleaner India",
    client: MOCK_CLIENTS[3]!, campaign: MOCK_CAMPAIGNS[2]!,
    contentType: "image",
    caption: "Simple everyday actions can make a big difference. Here are 5 tips for a cleaner India.",
    headline: "5 Tips for Cleaner India", description: "Everyday actions for a cleaner country.",
    cta: "Read More", link: "",
    hashtags: ["#CleanIndia", "#Tips", "#EcoFriendly"],
    firstComment: "", mentions: [], location: "", notes: "",
    media: MOCK_MEDIA.slice(0, 1), ratio: "1:1",
    channels: ["whatsapp", "facebook"],
    placements: { whatsapp: "Image", facebook: "Feed", instagram: "", linkedin: "", "google-business": "", youtube: "", website: "" },
    schedule: "now", status: "draft", createdAt: "2026-08-28T07:30:00Z", updatedAt: "2026-08-28T12:30:00Z", createdBy: "Neha Sharma",
  },
  {
    id: "d5", title: "This or That — Engagement Poll",
    client: MOCK_CLIENTS[2]!, campaign: MOCK_CAMPAIGNS[1]!,
    contentType: "image",
    caption: "This or That? Which river would you most like to help clean?",
    headline: "This or That?", description: "Quick engagement poll for followers.",
    cta: "Vote Now", link: "",
    hashtags: ["#ThisOrThat", "#Engagement", "#Poll"],
    firstComment: "", mentions: [], location: "", notes: "",
    media: MOCK_MEDIA.slice(3, 4), ratio: "1:1",
    channels: ["instagram"],
    placements: { instagram: "Feed Post", facebook: "", linkedin: "", "google-business": "", whatsapp: "", youtube: "", website: "" },
    schedule: "now", status: "draft", createdAt: "2026-08-26T09:15:00Z", updatedAt: "2026-08-26T16:15:00Z", createdBy: "Manish Sirohi",
  },
];

/* ── Templates ── */
export const MOCK_TEMPLATES: Template[] = [
  { id: "t1", title: "Clean Ganga Campaign", category: "Social Awareness", image: IMG.river, platform: "instagram", ratio: "4:5", isPro: true },
  { id: "t2", title: "Motivational Quote", category: "Quotes", image: IMG.lake, platform: "instagram", ratio: "1:1", isPro: false },
  { id: "t3", title: "Environment Day", category: "Festival & Events", image: IMG.nature, platform: "facebook", ratio: "1:1", isPro: true },
  { id: "t4", title: "Impact Story", category: "Behind the Scenes", image: IMG.cleanup, platform: "linkedin", ratio: "1.91:1", isPro: false },
  { id: "t5", title: "Campaign Launch", category: "Announcements", image: IMG.people, platform: "instagram", ratio: "4:5", isPro: false },
  { id: "t6", title: "Eco Tips Carousel", category: "Tips & Education", image: IMG.water, platform: "instagram", ratio: "1:1", isPro: false },
  { id: "t7", title: "Volunteer Call", category: "Recruitment", image: IMG.people, platform: "facebook", ratio: "1:1", isPro: true },
  { id: "t8", title: "Festival Greeting", category: "Festival & Events", image: IMG.lake, platform: "whatsapp", ratio: "1:1", isPro: false },
  { id: "t9", title: "Quick Update", category: "Announcements", image: IMG.forest, platform: "linkedin", ratio: "1.91:1", isPro: false },
  { id: "t10", title: "Special Offer", category: "Offers & Promotions", image: IMG.mountains, platform: "google-business", ratio: "4:5", isPro: false },
  { id: "t11", title: "Testimonial Card", category: "Testimonials", image: IMG.people, platform: "instagram", ratio: "1:1", isPro: true },
  { id: "t12", title: "Behind the Scenes", category: "Behind the Scenes", image: IMG.cleanup, platform: "youtube", ratio: "16:9", isPro: false },
];

export const TEMPLATE_CATEGORIES = [
  "All", "Festival & Events", "Social Awareness", "Product / Service", "Quotes",
  "Offers", "Behind the Scenes", "Announcements", "Tips & Education", "Testimonials",
  "Polls", "Recruitment", "Custom",
];

/* ── Content Ideas ── */
export const MOCK_IDEAS: ContentIdea[] = [
  { id: "i1", title: "Clean Ganga Campaign", description: "Spread awareness about keeping rivers clean for a better tomorrow.", image: IMG.river, tag: "Environment", channels: ["instagram", "facebook"], contentType: "image", suggestedCTA: "Learn More" },
  { id: "i2", title: "Tips for a Cleaner India", description: "Everyday actions that make a big difference in keeping India clean.", image: IMG.nature, tag: "Tips", channels: ["instagram", "linkedin"], contentType: "carousel", suggestedCTA: "Read More" },
  { id: "i3", title: "Volunteer Stories", description: "Real people making a real difference in their communities.", image: IMG.people, tag: "Community", channels: ["instagram", "facebook", "youtube"], contentType: "reel", suggestedCTA: "Join Us" },
  { id: "i4", title: "Save Water Awareness", description: "Every drop counts. Conserve water for a sustainable future.", image: IMG.water, tag: "Awareness", channels: ["instagram", "whatsapp"], contentType: "image", suggestedCTA: "Share" },
  { id: "i5", title: "Festival Greetings", description: "Spread positivity with thoughtful festival wishes.", image: IMG.lake, tag: "Festival", channels: ["instagram", "whatsapp", "facebook"], contentType: "image", suggestedCTA: "Send Wishes" },
  { id: "i6", title: "River Cleanup Drive", description: "Join Saturday's community cleanup at Assi Ghat.", image: IMG.cleanup, tag: "Event", channels: ["instagram", "facebook", "whatsapp"], contentType: "reel", suggestedCTA: "Register Now" },
];

/* ── Approvals ── */
export const MOCK_APPROVALS: ApprovalEntry[] = [
  { id: "a1", title: "Cleaner Rivers, Brighter Tomorrow", channel: "instagram", client: "Moksha Sewa", owner: "Manish Sirohi", submittedBy: "Manish Sirohi", submittedAt: "Sep 4, 2026", status: "pending", image: IMG.river },
  { id: "a2", title: "Behind the Scenes", channel: "facebook", client: "Namo Gange Trust", owner: "Prateeksha", submittedBy: "Prateeksha", submittedAt: "Sep 3, 2026", status: "approved", image: IMG.cleanup },
  { id: "a3", title: "Small Actions, Big Change", channel: "linkedin", client: "Moksha Sewa", owner: "Ankit Kumar", submittedBy: "Ankit Kumar", submittedAt: "Sep 2, 2026", status: "changes-requested", image: IMG.water },
  { id: "a4", title: "World Environment Day", channel: "youtube", client: "Ganga Explorer", owner: "Ritu Pandey", submittedBy: "Ritu Pandey", submittedAt: "Aug 30, 2026", status: "pending", image: IMG.nature },
  { id: "a5", title: "Tips for a Cleaner India", channel: "whatsapp", client: "Namo Gange Foundation", owner: "Neha Sharma", submittedBy: "Neha Sharma", submittedAt: "Aug 29, 2026", status: "approved", image: IMG.water },
  { id: "a6", title: "Save Water Save Life", channel: "instagram", client: "Moksha Sewa", owner: "Manish Sirohi", submittedBy: "Manish Sirohi", submittedAt: "Aug 26, 2026", status: "pending", image: IMG.water },
  { id: "a7", title: "Festival Greetings", channel: "google-business", client: "Namo Gange Trust", owner: "Prateeksha", submittedBy: "Prateeksha", submittedAt: "Aug 24, 2026", status: "approved", image: IMG.lake },
  { id: "a8", title: "Join Our Mission", channel: "website", client: "Moksha Sewa", owner: "Ankit Kumar", submittedBy: "Ankit Kumar", submittedAt: "Aug 22, 2026", status: "changes-requested", image: IMG.people },
];

/* ── AI Content Suggestions ── */
export const MOCK_AI_CONTENT = {
  caption: "Small actions create a cleaner tomorrow.\n\nLet's work together for a healthier, greener and cleaner India. 💙🌱\n\n#CleanGanga #HealthyIndia #Sustainability #MokshaSewa",
  hashtags: ["#CleanGanga", "#HealthyIndia", "#Sustainability", "#MokshaSewa", "#SaveWater", "#CleanIndia", "#RiverConservation", "#GoGreen"],
  variations: [
    "Together, we can protect every river. Small steps, big impact. 💚",
    "Cleaner rivers begin with everyday choices. Be the change today. 🌊",
    "A healthier India starts with cleaner water. Join us now. 💙",
  ],
  firstComment: "What small action will you take today? Tell us below 💚 #CleanGanga",
  headline: "CLEAN RIVERS BRIGHTER TOMORROW",
};
