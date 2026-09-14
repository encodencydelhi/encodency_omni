/**
 * Meta Ads Manager Help Center content.
 *
 * Categories map to the workspace pages, so "View Help Center" from a campaign
 * can open the Campaigns category already highlighted.
 */

export type HelpCategoryId =
  | "getting-started"
  | "campaigns"
  | "adsets"
  | "ads"
  | "forms"
  | "leads"
  | "audiences"
  | "analytics"
  | "connections"
  | "billing"
  | "troubleshooting";

export type HelpCategory = {
  id: HelpCategoryId;
  title: string;
  description: string;
  icon: string;
};

export type HelpSection = {
  heading?: string;
  paragraphs?: string[];
  bullets?: string[];
  steps?: string[];
  callout?: { tone: "info" | "warning"; text: string };
};

export type HelpArticle = {
  slug: string;
  title: string;
  category: HelpCategoryId;
  summary: string;
  updated: string;
  readMinutes: number;
  popular?: boolean;
  sections: HelpSection[];
  related: string[];
};

export const helpCategories: HelpCategory[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    description: "Connect your accounts and launch your first campaign.",
    icon: "rocket",
  },
  {
    id: "campaigns",
    title: "Campaigns",
    description: "Objectives, budgets, bid strategies and campaign controls.",
    icon: "megaphone",
  },
  {
    id: "adsets",
    title: "Ad Sets & Targeting",
    description: "Audiences, placements, schedules and delivery.",
    icon: "grid",
  },
  {
    id: "ads",
    title: "Ads & Creative",
    description: "Image and video specs, copy, calls to action and reviews.",
    icon: "image",
  },
  {
    id: "forms",
    title: "Instant Forms",
    description: "Questions, qualification, privacy and completion rates.",
    icon: "file",
  },
  {
    id: "leads",
    title: "Leads",
    description: "Scoring, the pipeline, assignment, export and CRM delivery.",
    icon: "users",
  },
  {
    id: "audiences",
    title: "Audiences",
    description: "Saved, custom and lookalike audiences.",
    icon: "target",
  },
  {
    id: "analytics",
    title: "Analytics",
    description: "Reporting, breakdowns, attribution and funnels.",
    icon: "chart",
  },
  {
    id: "connections",
    title: "Connections & Permissions",
    description: "Ad accounts, Pages, Instagram and pixels.",
    icon: "plug",
  },
  {
    id: "billing",
    title: "Billing / Spend Guidance",
    description: "Spend caps, payment methods and account restrictions.",
    icon: "wallet",
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    description: "Delivery problems, rejections and missing data.",
    icon: "wrench",
  },
];

const A = (article: HelpArticle) => article;

export const helpArticles: HelpArticle[] = [
  /* ----------------------------- Getting started ----------------------------- */
  A({
    slug: "ads-manager-overview",
    title: "Meta Ads Manager Overview",
    category: "getting-started",
    summary:
      "What this workspace does, how it relates to the Meta & Instagram channel, and where to find each part.",
    updated: "2026-09-10",
    readMinutes: 4,
    popular: true,
    sections: [
      {
        paragraphs: [
          "Meta Ads Manager is the paid advertising workspace for Facebook and Instagram. It is one workspace, not two: a single campaign can deliver to both platforms, and reporting is combined.",
          "The Meta & Instagram channel page handles organic work — your connected Page, Instagram Business account, posts, reels, scheduled content, comments and messages. Anything you pay for happens here.",
        ],
      },
      {
        heading: "How the workspace is organised",
        bullets: [
          "Overview — spend, leads and delivery at a glance.",
          "Campaigns, Ad Sets, Ads and Instant Forms — the four entities you manage.",
          "Leads Center — every lead your forms collect, with a pipeline.",
          "Audiences and Creative Library — reusable targeting and media.",
          "Analytics, Issues, Activity Log and Assets — reporting, problems, audit trail and connections.",
        ],
      },
      {
        callout: {
          tone: "info",
          text: "Anything you can reach from the workspace navigation is at most two clicks from any entity detail page.",
        },
      },
    ],
    related: ["campaign-structure", "connect-ad-account", "first-campaign"],
  }),
  A({
    slug: "connect-ad-account",
    title: "Connect Meta Ad Account",
    category: "getting-started",
    summary: "Link the ad account that campaigns are billed to.",
    updated: "2026-09-02",
    readMinutes: 3,
    sections: [
      {
        steps: [
          "Open Assets & Connections from the workspace navigation.",
          "Under Ad Account, choose Manage, then pick the account from your Meta Business portfolio.",
          "Grant ads_read, ads_management and business_management when Meta asks.",
          "Confirm the currency and time zone — they cannot be changed after the first campaign spends.",
        ],
      },
      {
        callout: {
          tone: "warning",
          text: "Without ads_management you can read reporting but cannot pause, edit or publish campaigns from here.",
        },
      },
    ],
    related: ["connect-facebook-page", "connect-instagram", "permission-missing"],
  }),
  A({
    slug: "connect-facebook-page",
    title: "Connect Facebook Page",
    category: "getting-started",
    summary: "Choose the Page your ads are published under.",
    updated: "2026-09-02",
    readMinutes: 2,
    sections: [
      {
        paragraphs: [
          "Every ad needs a Page identity. That Page name and profile photo is what people see above your ad.",
        ],
        steps: [
          "Open Assets & Connections.",
          "Under Facebook Page, choose Manage and select your Page.",
          "Approve pages_read_engagement and pages_manage_ads.",
        ],
      },
    ],
    related: ["connect-instagram", "connect-ad-account"],
  }),
  A({
    slug: "connect-instagram",
    title: "Connect Instagram Business",
    category: "getting-started",
    summary: "Required before Instagram Feed, Reels or Stories placements can run.",
    updated: "2026-09-12",
    readMinutes: 3,
    popular: true,
    sections: [
      {
        paragraphs: [
          "Instagram placements need an Instagram Business or Creator account linked to your Facebook Page. A personal Instagram account will not work.",
        ],
        steps: [
          "In the Instagram app, go to Settings, then Account type and tools, and switch to a Business account.",
          "Link that account to your Facebook Page in Meta Business Suite.",
          "In Assets & Connections here, choose Manage under Instagram Business and select it.",
        ],
      },
      {
        callout: {
          tone: "warning",
          text: "Instagram access tokens expire periodically. When they do, the workspace shows a Reconnect prompt and Instagram placements stop delivering within about 24 hours.",
        },
      },
    ],
    related: ["instagram-not-connected", "permission-missing", "placements"],
  }),
  A({
    slug: "first-campaign",
    title: "Create Your First Campaign",
    category: "getting-started",
    summary: "A walk-through of the five-step campaign builder.",
    updated: "2026-09-08",
    readMinutes: 5,
    popular: true,
    sections: [
      {
        steps: [
          "Choose Create Campaign. The builder opens full screen with five steps.",
          "Campaign — pick an objective and set the budget.",
          "Ad Set — choose the audience, placements and schedule.",
          "Ad — upload the creative, write the copy and pick a call to action.",
          "Instant Form — add questions if you are collecting leads.",
          "Review & Publish — fix anything the checklist flags, then publish.",
        ],
      },
      {
        callout: {
          tone: "info",
          text: "Save Draft at any point. Drafts appear in Campaigns with a Draft status and can be finished later.",
        },
      },
    ],
    related: ["campaign-structure", "choosing-objective", "form-types"],
  }),
  A({
    slug: "campaign-structure",
    title: "Understand Campaign → Ad Set → Ad",
    category: "getting-started",
    summary: "What each level controls, and why one campaign can hold several ad sets and ads.",
    updated: "2026-09-06",
    readMinutes: 4,
    popular: true,
    sections: [
      {
        bullets: [
          "Campaign — the objective, the buying type and (optionally) the budget.",
          "Ad Set — who sees the ads, where they appear, when they run, and the budget if it is not set at campaign level.",
          "Ad — the creative, the copy, the call to action and the destination.",
        ],
      },
      {
        heading: "One to many, at every level",
        paragraphs: [
          "A campaign can hold as many ad sets as you need, and each ad set can hold several ads. That is how you test two audiences against each other, or three creatives inside one audience.",
          "An instant form is separate again: the same form can be reused across many ads and campaigns without duplicating it.",
        ],
      },
      {
        callout: {
          tone: "info",
          text: "Add Ad Set from a campaign detail page, and Add Ad from an ad set detail page. The builder is not a one-shot flow.",
        },
      },
    ],
    related: ["campaign-vs-adset-budget", "audience-targeting", "first-campaign"],
  }),

  /* -------------------------------- Campaigns -------------------------------- */
  A({
    slug: "choosing-objective",
    title: "Choosing an Objective",
    category: "campaigns",
    summary: "Match the objective to the result you actually want.",
    updated: "2026-09-04",
    readMinutes: 4,
    popular: true,
    sections: [
      {
        bullets: [
          "Awareness — maximise reach among people likely to remember your ad.",
          "Engagement — post reactions, comments, shares and video views.",
          "Lead Generation — form submissions, either on an instant form or your website.",
          "Conversions — actions on your website tracked by the pixel, such as donations.",
        ],
      },
      {
        callout: {
          tone: "warning",
          text: "The objective cannot be changed after a campaign is created. Duplicate the campaign and pick a new objective instead.",
        },
      },
    ],
    related: ["campaign-vs-adset-budget", "bid-strategies", "special-categories"],
  }),
  A({
    slug: "campaign-vs-adset-budget",
    title: "Campaign Budget vs Ad Set Budget",
    category: "campaigns",
    summary: "When to let Meta distribute budget, and when to control it per audience.",
    updated: "2026-09-04",
    readMinutes: 4,
    sections: [
      {
        paragraphs: [
          "With a campaign budget, Meta moves money between ad sets automatically toward whichever is delivering results most cheaply. With ad set budgets you fix the split yourself.",
        ],
        bullets: [
          "Use a campaign budget when your ad sets are interchangeable and you only care about the cheapest result.",
          "Use ad set budgets when each audience must get a guaranteed minimum — a city you have committed to, or a test you want to run fairly.",
        ],
      },
    ],
    related: ["daily-vs-lifetime", "bid-strategies", "campaign-structure"],
  }),
  A({
    slug: "daily-vs-lifetime",
    title: "Daily vs Lifetime Budget",
    category: "campaigns",
    summary: "How each budget type paces spend.",
    updated: "2026-09-04",
    readMinutes: 3,
    sections: [
      {
        bullets: [
          "Daily — Meta aims to spend this amount each day and may go up to 25% over on a strong day, balancing it out across the week.",
          "Lifetime — Meta spreads a fixed total across the campaign's date range and can front-load when results look good.",
        ],
      },
      {
        callout: {
          tone: "info",
          text: "Lifetime budgets require an end date. Daily budgets can run indefinitely.",
        },
      },
    ],
    related: ["campaign-vs-adset-budget", "spend-caps", "budget-exhausted"],
  }),
  A({
    slug: "bid-strategies",
    title: "Bid Strategies",
    category: "campaigns",
    summary: "Highest volume, cost per result goal and bid caps, explained.",
    updated: "2026-09-04",
    readMinutes: 4,
    sections: [
      {
        bullets: [
          "Highest volume — spend the budget to get as many results as possible. The default, and the right choice most of the time.",
          "Cost per result goal — tell Meta the average cost you want. Useful when a lead above a certain price is not worth having.",
          "Bid cap — a hard ceiling on each auction bid. Advanced, and it usually restricts delivery.",
        ],
      },
      {
        callout: {
          tone: "warning",
          text: "A cost goal set far below your current CPL will throttle delivery rather than lower costs. Move it in steps of 10–15%.",
        },
      },
    ],
    related: ["daily-vs-lifetime", "campaign-not-delivering", "choosing-objective"],
  }),
  A({
    slug: "special-categories",
    title: "Special Ad Categories",
    category: "campaigns",
    summary: "Credit, employment, housing, social issues, elections and politics.",
    updated: "2026-08-28",
    readMinutes: 3,
    sections: [
      {
        paragraphs: [
          "If your ad relates to credit, employment, housing, or social issues, elections and politics, you must declare the category. Meta then restricts your targeting options.",
        ],
        bullets: [
          "Detailed targeting by age, gender and many interests is removed.",
          "Location targeting is limited to a minimum radius.",
          "Lookalike audiences are replaced by special ad audiences.",
        ],
      },
      {
        callout: {
          tone: "warning",
          text: "Not declaring a category when one applies is a policy violation and can restrict the whole ad account.",
        },
      },
    ],
    related: ["creative-rejection", "account-restrictions"],
  }),
  A({
    slug: "pause-resume",
    title: "Pause / Resume a Campaign",
    category: "campaigns",
    summary: "How pausing affects delivery and the learning phase.",
    updated: "2026-09-01",
    readMinutes: 2,
    sections: [
      {
        paragraphs: [
          "Pause from the campaign detail header, from the row menu in Campaigns, or in bulk after selecting rows.",
        ],
        bullets: [
          "Pausing stops spend immediately; leads already collected are unaffected.",
          "Resuming within a few days usually keeps the learning phase progress.",
          "Pausing for longer often restarts learning, which temporarily raises costs.",
        ],
      },
    ],
    related: ["duplicate-campaign", "campaign-not-delivering"],
  }),
  A({
    slug: "duplicate-campaign",
    title: "Duplicate a Campaign",
    category: "campaigns",
    summary: "Copy structure without copying performance history.",
    updated: "2026-09-01",
    readMinutes: 2,
    sections: [
      {
        paragraphs: [
          "Duplicating copies the campaign, its ad sets and its ads. The copy starts as a draft so you can change the audience or creative before publishing.",
        ],
        callout: {
          tone: "info",
          text: "A duplicate starts its learning phase from zero — it does not inherit the original's delivery history.",
        },
      },
    ],
    related: ["pause-resume", "campaign-structure"],
  }),

  /* --------------------------------- Ad sets --------------------------------- */
  A({
    slug: "audience-targeting",
    title: "Audience Targeting",
    category: "adsets",
    summary: "Location, age, gender, language and detailed targeting.",
    updated: "2026-09-07",
    readMinutes: 5,
    popular: true,
    sections: [
      {
        paragraphs: [
          "An ad set's audience is the intersection of everything you set: someone must match the location and the age range and at least one detailed targeting option.",
        ],
        bullets: [
          "Keep audiences above roughly 150,000 people so delivery can optimise.",
          "Exclusions apply last — anyone in an excluded audience is removed even if they match everything else.",
          "Advantage+ audience expansion lets Meta go beyond your interests when it finds cheaper results.",
        ],
      },
    ],
    related: ["custom-audiences", "lookalike-audiences", "audience-too-narrow"],
  }),
  A({
    slug: "custom-audiences",
    title: "Custom Audiences",
    category: "adsets",
    summary: "Retarget people who already know you.",
    updated: "2026-09-07",
    readMinutes: 4,
    sections: [
      {
        bullets: [
          "Customer List — upload emails or phone numbers; Meta reports a match rate.",
          "Website Visitors — needs the pixel installed.",
          "Facebook or Instagram Engagement — people who interacted with your Page or profile.",
          "Lead Form Engagement — people who opened or submitted an instant form.",
          "Video Viewers — people who watched a set percentage of a video.",
        ],
      },
      {
        callout: {
          tone: "info",
          text: "Custom audiences refresh on their own. A Sync failed status usually clears on a retry.",
        },
      },
    ],
    related: ["lookalike-audiences", "audience-targeting", "pixel-not-receiving"],
  }),
  A({
    slug: "lookalike-audiences",
    title: "Lookalike Audiences",
    category: "adsets",
    summary: "Find new people who resemble your best source audience.",
    updated: "2026-09-07",
    readMinutes: 4,
    sections: [
      {
        paragraphs: [
          "A lookalike needs a source audience of at least 100 people from one country — your converted leads or past donors work better than raw website traffic.",
        ],
        bullets: [
          "1% — closest match, smallest reach. Start here.",
          "2–3% — broader, cheaper, slightly lower intent.",
          "5%+ — large reach, useful only once smaller percentages saturate.",
        ],
      },
    ],
    related: ["custom-audiences", "audience-targeting"],
  }),
  A({
    slug: "location-targeting",
    title: "Location Targeting",
    category: "adsets",
    summary: "Countries, states, cities, pin drops and radius.",
    updated: "2026-09-05",
    readMinutes: 3,
    sections: [
      {
        bullets: [
          "People living in this location — the safest default for local drives and events.",
          "People recently in this location — includes visitors and travellers.",
          "Radius targeting starts at 1 km around a pin and is useful for a single ghat, venue or centre.",
        ],
      },
    ],
    related: ["audience-targeting", "audience-too-narrow"],
  }),
  A({
    slug: "placements",
    title: "Placements",
    category: "adsets",
    summary: "Where your ads can appear across Facebook and Instagram.",
    updated: "2026-09-05",
    readMinutes: 4,
    popular: true,
    sections: [
      {
        bullets: [
          "Facebook — Feed, Stories, Reels, Marketplace, Video feeds, Right column, Search.",
          "Instagram — Feed, Stories, Reels, Explore, Profile feed.",
          "Messenger — Inbox and Stories.",
          "Audience Network — third-party apps and sites. Usually the cheapest and the lowest quality.",
        ],
      },
      {
        callout: {
          tone: "warning",
          text: "Instagram placements need a connected Instagram Business account. Without one they are skipped silently.",
        },
      },
    ],
    related: ["advantage-placements", "aspect-ratios", "connect-instagram"],
  }),
  A({
    slug: "advantage-placements",
    title: "Advantage+ Placements",
    category: "adsets",
    summary: "Let Meta choose placements instead of picking them yourself.",
    updated: "2026-09-05",
    readMinutes: 3,
    sections: [
      {
        paragraphs: [
          "Advantage+ placements let delivery use every eligible surface and shift spend toward whichever performs best. It almost always lowers cost per result compared with a hand-picked list.",
        ],
        callout: {
          tone: "info",
          text: "Turn it off only when a placement is genuinely unsuitable — for example when your creative has burnt-in text that breaks in 9:16.",
        },
      },
    ],
    related: ["placements", "aspect-ratios"],
  }),
  A({
    slug: "scheduling",
    title: "Scheduling",
    category: "adsets",
    summary: "Start dates, end dates and dayparting.",
    updated: "2026-09-05",
    readMinutes: 3,
    sections: [
      {
        bullets: [
          "Start and end dates use the ad account time zone, not your browser's.",
          "Dayparting — running only at certain hours — requires a lifetime budget.",
          "An ad set with no end date runs until you pause it or the spend cap is reached.",
        ],
      },
    ],
    related: ["daily-vs-lifetime", "campaign-not-delivering"],
  }),

  /* ----------------------------------- Ads ----------------------------------- */
  A({
    slug: "image-sizes",
    title: "Image Sizes",
    category: "ads",
    summary: "Resolutions that stay sharp on every placement.",
    updated: "2026-09-03",
    readMinutes: 3,
    sections: [
      {
        bullets: [
          "Feed 1:1 — 1080 × 1080 px.",
          "Feed 4:5 — 1080 × 1350 px. Takes the most vertical space in feed.",
          "Stories and Reels 9:16 — 1080 × 1920 px.",
          "Right column and in-article 1.91:1 — 1200 × 628 px.",
        ],
      },
      {
        callout: {
          tone: "info",
          text: "Upload the largest version you have. Meta downscales cleanly but never upscales.",
        },
      },
    ],
    related: ["aspect-ratios", "video-sizes", "creative-rejection"],
  }),
  A({
    slug: "video-sizes",
    title: "Video Sizes",
    category: "ads",
    summary: "Length, resolution and format guidance for video ads.",
    updated: "2026-09-03",
    readMinutes: 3,
    sections: [
      {
        bullets: [
          "Feed video — up to 241 minutes, but 15–30 seconds performs best.",
          "Reels — up to 90 seconds, 9:16, 1080 × 1920 px.",
          "Stories — up to 60 seconds per card.",
          "Use H.264, AAC audio and an MP4 or MOV container.",
        ],
      },
      {
        callout: {
          tone: "info",
          text: "Most people watch without sound. Burn in captions or make the first three seconds work silently.",
        },
      },
    ],
    related: ["aspect-ratios", "image-sizes", "ad-copy"],
  }),
  A({
    slug: "aspect-ratios",
    title: "Aspect Ratios",
    category: "ads",
    summary: "Which ratio belongs on which surface, and when Meta crops for you.",
    updated: "2026-09-03",
    readMinutes: 3,
    popular: true,
    sections: [
      {
        bullets: [
          "1:1 — safe everywhere, ideal for Feed.",
          "4:5 — the tallest ratio Feed allows; best use of screen space.",
          "9:16 — Stories and Reels; keep text away from the top and bottom 14%.",
          "1.91:1 — right column, in-article and link previews.",
        ],
      },
      {
        paragraphs: [
          "If you supply only one asset, Meta auto-crops it for other placements. That is fine for simple imagery and poor for anything with text or a subject near the edge.",
        ],
      },
    ],
    related: ["image-sizes", "video-sizes", "placements"],
  }),
  A({
    slug: "facebook-vs-instagram",
    title: "Facebook vs Instagram Placements",
    category: "ads",
    summary: "How the same ad behaves differently on each platform.",
    updated: "2026-09-03",
    readMinutes: 3,
    sections: [
      {
        bullets: [
          "Facebook Feed shows headline and description below the media; Instagram Feed shows neither.",
          "Instagram truncates primary text after about 125 characters.",
          "Reels on both platforms are sound-on surfaces — treat them as video-first.",
          "Right column is Facebook-only and needs 1.91:1.",
        ],
      },
    ],
    related: ["aspect-ratios", "ad-copy", "placements"],
  }),
  A({
    slug: "ad-copy",
    title: "Ad Copy Best Practices",
    category: "ads",
    summary: "Primary text, headline and description that actually get read.",
    updated: "2026-09-03",
    readMinutes: 4,
    sections: [
      {
        bullets: [
          "Put the offer in the first 125 characters of the primary text.",
          "Keep the headline under 40 characters so it does not truncate.",
          "Write for one person, not an audience.",
          "Say what happens after the click — people convert better when they know.",
        ],
      },
      {
        callout: {
          tone: "warning",
          text: "Avoid copy that names a personal characteristic of the reader — that is the most common cause of rejection under Personal Attributes.",
        },
      },
    ],
    related: ["cta-selection", "creative-rejection", "facebook-vs-instagram"],
  }),
  A({
    slug: "cta-selection",
    title: "CTA Selection",
    category: "ads",
    summary: "Matching the button to the objective.",
    updated: "2026-09-03",
    readMinutes: 2,
    sections: [
      {
        bullets: [
          "Sign Up or Get Quote for instant forms.",
          "Learn More for awareness and traffic.",
          "Donate Now for fundraising with a website destination.",
          "Watch More for video-led awareness.",
        ],
      },
    ],
    related: ["ad-copy", "choosing-objective"],
  }),
  A({
    slug: "creative-rejection",
    title: "Creative Rejection",
    category: "ads",
    summary: "Why ads get rejected and how to get them running again.",
    updated: "2026-09-13",
    readMinutes: 4,
    popular: true,
    sections: [
      {
        paragraphs: [
          "Rejections name a policy category. The category tells you what to change — the fix is almost never to resubmit the same ad.",
        ],
        bullets: [
          "Personal Attributes — copy implies something about the reader. Rewrite in the first person or about the cause.",
          "Unrealistic Outcomes — promises a specific result. Soften the claim.",
          "Restricted Content — needs prior authorisation, common for social issues.",
          "Low Quality — clickbait, excessive capitals or withheld information.",
        ],
      },
      {
        heading: "After you edit",
        paragraphs: [
          "Saving an edit resubmits the ad automatically. Reviews usually finish within 24 hours. Only the rejected ad is held — the rest of the campaign continues.",
        ],
      },
    ],
    related: ["ad-copy", "special-categories", "ad-rejected"],
  }),

  /* -------------------------------- Instant forms ---------------------------- */
  A({
    slug: "form-types",
    title: "Form Types",
    category: "forms",
    summary: "More volume, higher intent and rich creative forms.",
    updated: "2026-09-09",
    readMinutes: 3,
    popular: true,
    sections: [
      {
        bullets: [
          "More volume — quickest to complete, highest submission count, lowest average intent.",
          "Higher intent — adds a review step before submitting, which cuts accidental and low-quality leads.",
          "Rich creative — room for images and longer explanation before the questions.",
        ],
      },
      {
        callout: {
          tone: "info",
          text: "If your sales team complains about junk leads, switch from More volume to Higher intent before touching targeting.",
        },
      },
    ],
    related: ["form-questions", "form-qualification", "form-completion"],
  }),
  A({
    slug: "form-questions",
    title: "Questions",
    category: "forms",
    summary: "Prefilled fields, custom questions and ordering.",
    updated: "2026-09-09",
    readMinutes: 4,
    sections: [
      {
        bullets: [
          "Prefilled questions pull from the person's Meta profile — fastest to complete, but sometimes out of date.",
          "Custom questions can be multiple choice, short answer, conditional, or a store locator.",
          "Ask contact details first and qualifying questions after: people who have already typed their name are more likely to finish.",
        ],
      },
      {
        callout: {
          tone: "warning",
          text: "Every extra required question costs completions. Four to six questions is usually the sweet spot.",
        },
      },
    ],
    related: ["form-completion", "form-qualification", "form-types"],
  }),
  A({
    slug: "form-qualification",
    title: "Qualification",
    category: "forms",
    summary: "Filter out leads you cannot serve before they reach your team.",
    updated: "2026-09-09",
    readMinutes: 3,
    sections: [
      {
        paragraphs: [
          "Qualification rules mark a submission as qualified or not. Unqualified leads still arrive — they are just flagged, so your team can prioritise.",
        ],
        bullets: [
          "Use a multiple-choice question with a disqualifying option, such as a city you do not operate in.",
          "Combine two rules with AND when both must be true.",
          "Review the qualification rate weekly on the form detail page.",
        ],
      },
    ],
    related: ["lead-score", "spam-leads", "form-questions"],
  }),
  A({
    slug: "form-privacy",
    title: "Privacy & Consent",
    category: "forms",
    summary: "The privacy policy URL Meta requires on every lead form.",
    updated: "2026-09-13",
    readMinutes: 3,
    popular: true,
    sections: [
      {
        paragraphs: [
          "Meta requires a link to your own privacy policy on every instant form. Without it the form cannot be published and any ad using it is blocked.",
        ],
        steps: [
          "Open the form and go to the Privacy section.",
          "Paste the full URL, including https://.",
          "Make sure the page is publicly reachable — Meta checks it.",
          "Optionally add custom consent checkboxes for marketing permission.",
        ],
      },
      {
        callout: {
          tone: "warning",
          text: "A privacy page behind a login or a 404 counts as missing and will fail review.",
        },
      },
    ],
    related: ["form-missing-privacy", "form-questions", "form-types"],
  }),
  A({
    slug: "form-thank-you",
    title: "Thank You Screen",
    category: "forms",
    summary: "The last screen is your best chance at a second action.",
    updated: "2026-09-09",
    readMinutes: 2,
    sections: [
      {
        bullets: [
          "Confirm what happens next and when someone will make contact.",
          "Use the button for a real next step: view the schedule, join the group, download the kit.",
          "Set expectations honestly — over-promising here creates complaints later.",
        ],
      },
    ],
    related: ["form-completion", "form-types"],
  }),
  A({
    slug: "form-completion",
    title: "Improving Completion Rate",
    category: "forms",
    summary: "Read the drop-off chart and fix the question that loses people.",
    updated: "2026-09-12",
    readMinutes: 4,
    popular: true,
    sections: [
      {
        paragraphs: [
          "Every form detail page shows a question-by-question drop-off chart. The question with the biggest fall is where to start.",
        ],
        bullets: [
          "Make the offending question optional, or move it after contact details.",
          "Replace a short answer with multiple choice — typing on a phone loses people.",
          "Cut any question your team does not actually use.",
          "Shorten the intro; long intros lose people before question one.",
        ],
      },
    ],
    related: ["form-questions", "form-types", "lead-score"],
  }),

  /* --------------------------------- Leads ----------------------------------- */
  A({
    slug: "lead-score",
    title: "Lead Score",
    category: "leads",
    summary: "What the 0–100 score means and what moves it.",
    updated: "2026-09-11",
    readMinutes: 3,
    popular: true,
    sections: [
      {
        bullets: [
          "80 and above — high quality. Contact first.",
          "50 to 79 — medium. Worth a call, may need nurturing.",
          "Below 50 — low quality, often incomplete or inconsistent answers.",
        ],
        paragraphs: [
          "Score combines completeness of the answers, whether the contact details validate, whether the person matched your qualification rules, and how the source form usually performs.",
        ],
      },
    ],
    related: ["lead-pipeline", "spam-leads", "form-qualification"],
  }),
  A({
    slug: "lead-pipeline",
    title: "Lead Pipeline",
    category: "leads",
    summary: "The stages a lead moves through, and what each one means.",
    updated: "2026-09-11",
    readMinutes: 3,
    sections: [
      {
        bullets: [
          "New — arrived, nobody has made contact.",
          "Contacted — a call or message went out.",
          "Qualified — they are a genuine fit and interested.",
          "Meeting Scheduled — a specific commitment exists.",
          "Converted — they did the thing you were advertising for.",
          "Lost or Spam — terminal states that end the pipeline.",
        ],
      },
      {
        callout: {
          tone: "info",
          text: "Leads contacted within 30 minutes convert roughly three times more often than leads contacted the next day.",
        },
      },
    ],
    related: ["assign-leads", "lead-score", "crm-delivery"],
  }),
  A({
    slug: "assign-leads",
    title: "Assign Leads",
    category: "leads",
    summary: "Get every lead owned by a person quickly.",
    updated: "2026-09-11",
    readMinutes: 2,
    sections: [
      {
        bullets: [
          "Assign from the row menu in Leads Center, or in bulk after selecting rows.",
          "Unassigned leads show an Unassigned owner and are the ones most likely to go cold.",
          "The My Leads tab filters to the signed-in user.",
        ],
      },
    ],
    related: ["lead-pipeline", "export-leads"],
  }),
  A({
    slug: "export-leads",
    title: "Export Leads",
    category: "leads",
    summary: "Get leads out as CSV, filtered the way you need.",
    updated: "2026-09-11",
    readMinutes: 2,
    sections: [
      {
        paragraphs: [
          "Exports respect the filters currently applied, so filter first and export second. Select specific rows to export only those.",
        ],
        callout: {
          tone: "info",
          text: "Exports are emailed rather than downloaded directly, because large exports take time to assemble.",
        },
      },
    ],
    related: ["crm-delivery", "assign-leads"],
  }),
  A({
    slug: "crm-delivery",
    title: "CRM Delivery",
    category: "leads",
    summary: "Get leads into your CRM the moment they arrive.",
    updated: "2026-09-11",
    readMinutes: 3,
    sections: [
      {
        bullets: [
          "Leads appear in Leads Center within seconds of submission.",
          "Field mapping is set per form, so add new questions to the mapping when you edit a form.",
          "Failed deliveries are retried, and persistent failures appear in Issues & Warnings.",
        ],
      },
    ],
    related: ["export-leads", "lead-pipeline"],
  }),
  A({
    slug: "spam-leads",
    title: "Spam / Duplicate Leads",
    category: "leads",
    summary: "Spot junk submissions and stop them at the source.",
    updated: "2026-09-11",
    readMinutes: 3,
    sections: [
      {
        bullets: [
          "Obvious signs: placeholder names, disposable email domains, repeated digits in a phone number.",
          "Mark as spam rather than deleting — the pattern feeds back into scoring.",
          "Duplicates from the same person within 24 hours are merged automatically.",
        ],
      },
      {
        callout: {
          tone: "info",
          text: "A sudden spike in spam usually means an Audience Network placement. Disabling it on the ad set fixes it.",
        },
      },
    ],
    related: ["form-qualification", "lead-score", "placements"],
  }),

  /* ------------------------------- Audiences --------------------------------- */
  A({
    slug: "saved-audiences",
    title: "Saved Audiences",
    category: "audiences",
    summary: "Reuse a targeting combination across ad sets.",
    updated: "2026-09-06",
    readMinutes: 2,
    sections: [
      {
        paragraphs: [
          "A saved audience stores location, age, gender, languages and detailed targeting under one name, so you do not rebuild it each time.",
        ],
        callout: {
          tone: "info",
          text: "Editing a saved audience does not change ad sets that already use it — they keep the settings they were created with.",
        },
      },
    ],
    related: ["audience-targeting", "custom-audiences"],
  }),
  A({
    slug: "audience-sync",
    title: "Audience Sync Issues",
    category: "audiences",
    summary: "What Updating, Sync failed and Too small mean.",
    updated: "2026-09-12",
    readMinutes: 3,
    sections: [
      {
        bullets: [
          "Updating — Meta is refreshing membership. Normal, usually under an hour.",
          "Sync failed — a temporary data source error. Retry from the row menu.",
          "Too small — below the minimum size to use in targeting. Broaden the source or lengthen the retention window.",
        ],
      },
    ],
    related: ["custom-audiences", "audience-too-narrow"],
  }),

  /* -------------------------------- Analytics -------------------------------- */
  A({
    slug: "reading-reports",
    title: "Reading Your Reports",
    category: "analytics",
    summary: "Which metric answers which question.",
    updated: "2026-09-08",
    readMinutes: 4,
    sections: [
      {
        bullets: [
          "CPM — how expensive this audience is to reach.",
          "CTR — how well the creative earns attention.",
          "CPL — the number your budget conversation is actually about.",
          "Conversion rate — how well the form or landing page closes the click.",
          "Frequency — how often the same person sees the ad. Above 3 in a short window suggests fatigue.",
        ],
      },
    ],
    related: ["breakdowns", "attribution", "conversion-funnel"],
  }),
  A({
    slug: "breakdowns",
    title: "Breakdowns",
    category: "analytics",
    summary: "Split results by platform, placement, device, age, gender or location.",
    updated: "2026-09-08",
    readMinutes: 3,
    sections: [
      {
        paragraphs: [
          "Breakdowns only appear once a campaign has delivered enough impressions for Meta to report them without identifying individuals. Empty breakdowns are hidden rather than shown as zero rows.",
        ],
      },
    ],
    related: ["reading-reports", "attribution"],
  }),
  A({
    slug: "attribution",
    title: "Attribution Windows",
    category: "analytics",
    summary: "Why your numbers differ from your CRM's.",
    updated: "2026-09-08",
    readMinutes: 4,
    sections: [
      {
        bullets: [
          "7-day click, 1-day view is the default: a result counts if someone clicked within 7 days or saw the ad within 1 day.",
          "Meta credits the result to the day of the impression, not the day of the conversion.",
          "Your CRM usually credits last touch, so totals rarely match exactly.",
        ],
      },
    ],
    related: ["reading-reports", "conversion-funnel"],
  }),
  A({
    slug: "conversion-funnel",
    title: "The Conversion Funnel",
    category: "analytics",
    summary: "Impressions through to converted leads, and where to look when a step drops.",
    updated: "2026-09-08",
    readMinutes: 3,
    sections: [
      {
        bullets: [
          "Impressions to clicks — a creative and targeting problem.",
          "Clicks to form opens — usually slow loading or a mismatch between ad and destination.",
          "Form opens to leads — a form design problem; check question drop-off.",
          "Leads to qualified — a targeting or qualification-rules problem.",
        ],
      },
    ],
    related: ["form-completion", "reading-reports", "lead-score"],
  }),

  /* ------------------------------- Connections ------------------------------- */
  A({
    slug: "permission-missing",
    title: "Permission Missing",
    category: "connections",
    summary: "Restore a scope that was never granted or has been revoked.",
    updated: "2026-09-06",
    readMinutes: 3,
    popular: true,
    sections: [
      {
        paragraphs: [
          "A missing permission does not break everything at once — it removes specific abilities. The Assets page names the exact scope that is missing.",
        ],
        bullets: [
          "ads_management — needed to create, edit, pause or publish.",
          "pages_manage_ads — needed to run ads under a Page identity.",
          "instagram_manage_insights — needed for Instagram-level reporting.",
        ],
      },
      {
        steps: [
          "Open Assets & Connections.",
          "Find the asset showing Permission Missing.",
          "Choose Refresh Permissions and approve the full list Meta requests.",
        ],
      },
    ],
    related: ["connect-ad-account", "instagram-not-connected", "account-restrictions"],
  }),
  A({
    slug: "pixel-setup",
    title: "Pixel & Data Sources",
    category: "connections",
    summary: "Send website and offline events back to Meta.",
    updated: "2026-09-07",
    readMinutes: 4,
    sections: [
      {
        bullets: [
          "The pixel measures website actions and powers website custom audiences.",
          "Standard events such as Lead, CompleteRegistration and Purchase are what optimisation uses.",
          "Offline event sets let you upload conversions that happen away from your site.",
        ],
      },
    ],
    related: ["pixel-not-receiving", "custom-audiences"],
  }),

  /* --------------------------------- Billing --------------------------------- */
  A({
    slug: "spend-caps",
    title: "Spend Caps",
    category: "billing",
    summary: "Put a hard ceiling on what a campaign or account can spend.",
    updated: "2026-08-30",
    readMinutes: 3,
    sections: [
      {
        bullets: [
          "A campaign spend cap stops delivery once the total is reached, regardless of the daily budget.",
          "An account spend limit applies across every campaign in the account.",
          "Raising a cap resumes delivery; it does not restart the learning phase.",
        ],
      },
    ],
    related: ["daily-vs-lifetime", "budget-exhausted", "payment-methods"],
  }),
  A({
    slug: "payment-methods",
    title: "Payment Methods",
    category: "billing",
    summary: "How billing works and what happens when a payment fails.",
    updated: "2026-08-30",
    readMinutes: 3,
    sections: [
      {
        bullets: [
          "Meta charges when you hit a billing threshold or on your monthly bill date, whichever comes first.",
          "A failed payment pauses every campaign in the account until it is settled.",
          "Keep a backup payment method on the account to avoid a full stop.",
        ],
      },
    ],
    related: ["spend-caps", "account-restrictions"],
  }),
  A({
    slug: "account-restrictions",
    title: "Payment / Account Restrictions",
    category: "billing",
    summary: "What a restricted ad account means and how to appeal.",
    updated: "2026-08-30",
    readMinutes: 3,
    sections: [
      {
        paragraphs: [
          "A restricted account cannot publish or run ads. Restrictions come from repeated policy violations, unusual payment activity, or an unverified business.",
        ],
        steps: [
          "Open the Account Quality section in Meta Business Suite to see the reason.",
          "Resolve what is named — settle a payment, complete business verification, or remove offending ads.",
          "Submit an appeal; most are reviewed within a few days.",
        ],
      },
    ],
    related: ["payment-methods", "special-categories", "creative-rejection"],
  }),

  /* ------------------------------ Troubleshooting ---------------------------- */
  A({
    slug: "instagram-not-connected",
    title: "Instagram Not Connected",
    category: "troubleshooting",
    summary: "Instagram placements are skipped or the account shows as expired.",
    updated: "2026-09-12",
    readMinutes: 3,
    popular: true,
    sections: [
      {
        heading: "Symptoms",
        bullets: [
          "Instagram placements get no impressions while Facebook delivers normally.",
          "The workspace header shows Reconnect needed under Instagram Business.",
          "An Instagram authorization expired issue appears in Issues & Warnings.",
        ],
      },
      {
        heading: "Fix",
        steps: [
          "Open Assets & Connections.",
          "Choose Reconnect on the Instagram Business card.",
          "Complete Meta's authorisation and approve every requested scope.",
          "Delivery resumes within a few minutes; reporting backfills within an hour.",
        ],
      },
    ],
    related: ["connect-instagram", "permission-missing", "placements"],
  }),
  A({
    slug: "ad-rejected",
    title: "Ad Rejected",
    category: "troubleshooting",
    summary: "Read the policy reason and get the ad back into review.",
    updated: "2026-09-13",
    readMinutes: 3,
    sections: [
      {
        steps: [
          "Open the ad — the rejection banner names the policy category and the reason.",
          "Edit only what the category refers to, usually the copy or the creative.",
          "Save. The ad is resubmitted automatically.",
          "If you believe the rejection is wrong, request another review from the same banner.",
        ],
      },
      {
        callout: {
          tone: "info",
          text: "A rejected ad does not stop the rest of the campaign. Other ads in the same ad set keep delivering.",
        },
      },
    ],
    related: ["creative-rejection", "ad-copy", "special-categories"],
  }),
  A({
    slug: "campaign-not-delivering",
    title: "Campaign Not Delivering",
    category: "troubleshooting",
    summary: "Work through the usual causes in order.",
    updated: "2026-09-10",
    readMinutes: 4,
    popular: true,
    sections: [
      {
        steps: [
          "Check the status — a campaign in review has not been approved yet.",
          "Check the schedule — the start date may be in the future in the account time zone.",
          "Check the budget — a spend cap or exhausted lifetime budget stops delivery.",
          "Check the audience size — very narrow audiences deliver slowly or not at all.",
          "Check the ads — every ad may be paused or rejected.",
          "Check the bid — a cost goal far below market throttles delivery.",
        ],
      },
      {
        callout: {
          tone: "info",
          text: "Issues & Warnings surfaces most of these automatically, each linked to the page that fixes it.",
        },
      },
    ],
    related: ["audience-too-narrow", "budget-exhausted", "bid-strategies"],
  }),
  A({
    slug: "audience-too-narrow",
    title: "Audience Too Narrow",
    category: "troubleshooting",
    summary: "Widen an ad set that cannot leave the learning phase.",
    updated: "2026-09-09",
    readMinutes: 3,
    sections: [
      {
        bullets: [
          "Widen the age range or add a nearby city.",
          "Remove one layer of detailed targeting — layered interests multiply the narrowing.",
          "Turn on Advantage+ audience expansion.",
          "Check your exclusions; a large exclusion list quietly removes most of the audience.",
        ],
      },
    ],
    related: ["audience-targeting", "campaign-not-delivering", "location-targeting"],
  }),
  A({
    slug: "pixel-not-receiving",
    title: "Pixel Not Receiving Events",
    category: "troubleshooting",
    summary: "Conversion events stop arriving from your website.",
    updated: "2026-09-07",
    readMinutes: 3,
    sections: [
      {
        steps: [
          "Open Assets & Connections and confirm the pixel shows as Connected.",
          "Use Meta's Pixel Helper browser extension on the page that should fire the event.",
          "Confirm the event name matches exactly, including capitalisation.",
          "Check that a consent banner is not blocking the script before acceptance.",
        ],
      },
    ],
    related: ["pixel-setup", "attribution"],
  }),
  A({
    slug: "form-missing-privacy",
    title: "Instant Form Missing Privacy URL",
    category: "troubleshooting",
    summary: "The most common reason a lead campaign will not publish.",
    updated: "2026-09-13",
    readMinutes: 2,
    sections: [
      {
        paragraphs: [
          "Publishing is blocked until every instant form in the campaign has a working privacy policy URL. The blocking issue links straight to the form that needs it.",
        ],
        steps: [
          "Open Issues & Warnings and find the blocking issue.",
          "Choose Fix Form to open the form's privacy section.",
          "Add the full public URL and save.",
          "Publish the campaign again.",
        ],
      },
    ],
    related: ["form-privacy", "form-types"],
  }),
  A({
    slug: "budget-exhausted",
    title: "Budget Exhausted",
    category: "troubleshooting",
    summary: "A lifetime budget or spend cap has been reached.",
    updated: "2026-09-13",
    readMinutes: 2,
    sections: [
      {
        bullets: [
          "Raise the lifetime budget, or extend the end date to spread what is left.",
          "Raise or remove the campaign spend cap.",
          "Check the account-level spend limit, which overrides everything below it.",
        ],
      },
    ],
    related: ["spend-caps", "daily-vs-lifetime", "campaign-not-delivering"],
  }),
];

export const getArticle = (slug: string) =>
  helpArticles.find((a) => a.slug === slug);

export const articlesInCategory = (category: HelpCategoryId) =>
  helpArticles.filter((a) => a.category === category);

export const popularArticles = () => helpArticles.filter((a) => a.popular);

export function searchArticles(query: string): HelpArticle[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return helpArticles.filter(
    (a) =>
      a.title.toLowerCase().includes(q) ||
      a.summary.toLowerCase().includes(q) ||
      a.sections.some((s) =>
        [...(s.paragraphs ?? []), ...(s.bullets ?? []), ...(s.steps ?? [])].some((t) =>
          t.toLowerCase().includes(q),
        ),
      ),
  );
}

/**
 * Maps a `?from=` hint on the Help Center URL to the category that should be
 * highlighted, so contextual help lands in the right place.
 */
export const CONTEXT_CATEGORY: Record<string, HelpCategoryId> = {
  create: "getting-started",
  campaign: "campaigns",
  campaigns: "campaigns",
  adset: "adsets",
  adsets: "adsets",
  ad: "ads",
  ads: "ads",
  creative: "ads",
  form: "forms",
  forms: "forms",
  lead: "leads",
  leads: "leads",
  audiences: "audiences",
  analytics: "analytics",
  assets: "connections",
  issues: "troubleshooting",
};
