export type DeskRange = "7d" | "30d" | "90d" | "all";

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface PageRef {
  id: string | null;
  title: string;
}

export interface PersonRef {
  id: string;
  name: string;
  email: string;
  role: string | null;
}

export interface ConversationItem {
  id: string;
  title: string;
  person: PersonRef;
  company: { id: string; name: string };
  firstPage: PageRef;
  lastPage: PageRef;
  questions: number;
  messages: number;
  tokens: number;
  ticketNumber: number | null;
  degraded: number;
  redacted: number;
  startedAt: string;
  lastMessageAt: string;
}

export interface ThreadMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  page: PageRef;
  model: string | null;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number | null;
  tools: string[];
  cards: string[];
  degraded: boolean;
  redacted: boolean;
}

export interface ConversationDetail extends ConversationItem {
  promptTokens: number;
  completionTokens: number;
  ticket: { number: number; subject: string; status: string; priority: string } | null;
  thread: ThreadMessage[];
}

export interface Totals {
  questions: number;
  replies: number;
  conversations: number;
  users: number;
  companies: number;
  degraded: number;
  redacted: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  avgLatencyMs: number;
  avgTokensPerReply: number;
  avgQuestionsPerConversation: number;
  ticketsFromAssistant: number;
  failureRate: number;
}

export interface DayPoint {
  day: string;
  questions: number;
  conversations?: number;
  tokens: number;
}

export interface Overview {
  range: DeskRange;
  since: string | null;
  retentionDays: number;
  totals: Totals;
  change: { conversations: number | null; questions: number | null; tokens: number | null; users: number | null } | null;
  series: Array<Required<DayPoint>>;
  pages: Array<PageRef & { questions: number; tokens: number }>;
  tools: Array<{ name: string; count: number }>;
  cards: Array<{ name: string; count: number }>;
  models: Array<{ model: string | null; replies: number; promptTokens: number; completionTokens: number; totalTokens: number }>;
  topQuestions: Array<{ text: string; count: number; lastAskedAt: string }>;
  keywords: Array<{ word: string; count: number }>;
  companies: Array<{ id: string; name: string; conversations: number; questions: number; tokens: number; users: number }>;
  people: Array<{ id: string; name: string; email: string; company: string; conversations: number; questions: number; tokens: number; lastActiveAt: string }>;
  recent: ConversationItem[];
}

export interface AiAnalytics {
  range: DeskRange;
  since: string | null;
  totals: {
    usageEvents: number;
    openAiRequests: number;
    faqBypasses: number;
    cacheHitRate: number;
    errorRate: number;
    inputTokens: number;
    outputTokens: number;
    cachedInputTokens: number;
    totalTokens: number;
    estimatedCostMicros: number;
    avgLatencyMs: number;
  };
  byModel: Array<{ model: string; operation: string; requests: number; inputTokens: number; outputTokens: number; totalTokens: number; estimatedCostMicros: number }>;
  byFeature: Array<{ feature: string; operation: string; success: boolean; requests: number; totalTokens: number; estimatedCostMicros: number }>;
  alerts: Array<{ id: string; severity: string; kind: string; title: string; detail: string | null; createdAt: string }>;
  evaluationRuns: Array<{ id: string; status: string; totalCases: number; passed: number; failed: number; createdAt: string; finishedAt: string | null }>;
}

export interface Filters {
  companies: Array<{ id: string; name: string; conversations: number }>;
  pages: Array<PageRef & { questions: number }>;
}

export interface PersonListItem {
  id: string;
  name: string;
  email: string;
  companies: Array<{ id: string; name: string; role: string }>;
  conversations: number;
  questions: number;
  tokens: number;
  failedReplies: number;
  firstChatAt: string | null;
  lastActiveAt: string | null;
}

export interface PersonDetail {
  person: { id: string; name: string; email: string; companies: Array<{ id: string; name: string; role: string }> };
  stats: {
    conversations: number;
    questions: number;
    tokens: number;
    promptTokens: number;
    completionTokens: number;
    avgTokensPerConversation: number;
    failedReplies: number;
    maskedMessages: number;
    ticketsSent: number;
    firstChatAt: string | null;
    lastActiveAt: string | null;
  };
  series: Array<{ day: string; questions: number; tokens: number }>;
  pages: Array<PageRef & { questions: number; tokens: number }>;
  keywords: Array<{ word: string; count: number }>;
  conversations: Paged<ConversationItem>;
}
