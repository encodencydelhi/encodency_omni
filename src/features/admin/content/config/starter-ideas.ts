import type { ContentType, Platform } from "../types/content.types";

export interface StarterIdea {
  id: string;
  title: string;
  /** What the post is about, written so it can be sent to the AI assistant as a brief. */
  description: string;
  tag: string;
  channels: Platform[];
  contentType: ContentType;
  suggestedCTA: string;
}

/**
 * Prompts to get a post started. They are the same for every Company and name no brand or client; the AI assistant
 * adapts one to the Company's own topic, or the team uses it as a plain starting point.
 */
export const STARTER_IDEAS: readonly StarterIdea[] = [
  { id: "idea-behind-the-scenes", title: "Behind the scenes", description: "Show how your team prepares something people normally only see finished.", tag: "Story", channels: ["instagram", "facebook"], contentType: "feed-post", suggestedCTA: "Learn More" },
  { id: "idea-quick-tips", title: "Three quick tips", description: "Share three short, practical tips your audience can use today.", tag: "Tips", channels: ["instagram", "linkedin"], contentType: "carousel", suggestedCTA: "Read More" },
  { id: "idea-customer-story", title: "Customer or supporter story", description: "Tell the story of one real person you helped and what changed for them.", tag: "Community", channels: ["facebook", "linkedin"], contentType: "feed-post", suggestedCTA: "Join Us" },
  { id: "idea-myth-vs-fact", title: "Myth vs fact", description: "Clear up one common misunderstanding about your work or industry.", tag: "Education", channels: ["instagram", "linkedin"], contentType: "carousel", suggestedCTA: "Learn More" },
  { id: "idea-festival-wishes", title: "Festival greeting", description: "A warm, short greeting for an upcoming festival or public holiday.", tag: "Festival", channels: ["instagram", "facebook", "whatsapp"], contentType: "feed-post", suggestedCTA: "Send Wishes" },
  { id: "idea-event-countdown", title: "Event countdown", description: "Build interest in an upcoming event with the date, place and one reason to attend.", tag: "Event", channels: ["instagram", "facebook", "whatsapp"], contentType: "reel", suggestedCTA: "Register Now" },
  { id: "idea-milestone", title: "Milestone update", description: "Share a number or milestone you reached and thank the people behind it.", tag: "Update", channels: ["linkedin", "facebook"], contentType: "feed-post", suggestedCTA: "Read More" },
  { id: "idea-faq", title: "Answer a common question", description: "Pick a question you hear often and answer it in a few clear lines.", tag: "Education", channels: ["instagram", "linkedin", "facebook"], contentType: "feed-post", suggestedCTA: "Ask Us" },
];
