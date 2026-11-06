import { newId, type FlowScreen, type Template, type WorkflowNode, type Workspace } from "./mock-service";
import { templateParameters } from "./creation-model";

export const AI_TASKS = {
  template_draft: { label: "Write A Template", prompt: "Write a welcome message for our new collection.", action: "Create A Template Draft" },
  template_improve: { label: "Improve A Template", prompt: "Make this message clearer and more concise while keeping its variables.", action: "Update The Template Draft" },
  campaign_plan: { label: "Plan A Campaign", prompt: "Plan a product launch campaign for opted-in VIP contacts.", action: "Create A Campaign Draft" },
  reply_draft: { label: "Suggest A Reply", prompt: "Write a friendly reply and ask which product the customer is interested in.", action: "Insert Into Reply Composer" },
  conversation_summary: { label: "Summarize A Conversation", prompt: "Summarize the customer's request and suggest a next step.", action: "" },
  workflow_draft: { label: "Build An Automation", prompt: "Welcome new enquiries, check product interest and assign them to an agent.", action: "Create A Workflow Draft" },
  flow_draft: { label: "Build A WhatsApp Flow", prompt: "Create a product enquiry form with name, email and product interest.", action: "Create A Flow Draft" },
  contact_segments: { label: "Suggest Contact Segments", prompt: "Suggest useful segments for opted-in contacts and explain how to use them.", action: "" },
  message_diagnosis: { label: "Explain Message Failures", prompt: "Explain failed-message examples and suggest checks before retrying.", action: "" },
  media_copy: { label: "Write Media Copy", prompt: "Suggest a short product caption and alt text for our collection banner.", action: "" },
  analytics_summary: { label: "Summarize Performance", prompt: "Summarize the available demo performance and suggest follow-up questions.", action: "" },
  budget_review: { label: "Review Usage", prompt: "Suggest what to review in messaging usage and the monthly budget.", action: "" },
  business_profile: { label: "Write A Business Profile", prompt: "Write a clear, friendly business description focused on helpful service.", action: "Update The Local Profile Description" },
} as const;
export type AITask = keyof typeof AI_TASKS;
export const AI_AREAS: Record<string, readonly AITask[]> = {
  Overview: ["analytics_summary", "campaign_plan"], "Team Inbox": ["reply_draft", "conversation_summary"],
  Campaigns: ["campaign_plan"], Templates: ["template_draft", "template_improve"], Contacts: ["contact_segments"],
  Messages: ["message_diagnosis"], Automations: ["workflow_draft"], "WhatsApp Flows": ["flow_draft"],
  "Media Library": ["media_copy"], Analytics: ["analytics_summary"], "Billing & Usage": ["budget_review"],
  "Settings & Connections": ["business_profile"],
};
export interface AIContext {
  businessName?: string;
  contactCount?: number;
  optedInCount?: number;
  campaignCount?: number;
  failedMessageCount?: number;
  conversation?: { direction: "Customer" | "Business"; text: string }[];
  draft?: Pick<Template, "name" | "body" | "variables" | "sample" | "category">;
}
export interface AIRequest {
  scope: string;
  task: AITask;
  prompt: string;
  tone: "Professional" | "Friendly" | "Persuasive";
  language: "English" | "Hindi";
  targetContactId?: string;
  context?: AIContext;
}
export type AIProposal =
  | { kind: "template"; name: string; body: string; language: string; category: string; variables: Record<string, string> }
  | { kind: "campaign"; name: string; goal: string; audienceTag: string; approach: string }
  | { kind: "reply"; contactId: string; text: string }
  | { kind: "workflow"; name: string; nodes: Omit<WorkflowNode, "id">[] }
  | { kind: "flow"; name: string; screens: Omit<FlowScreen, "id">[] }
  | { kind: "profile"; text: string }
  | { kind: "insight"; title: string; points: string[] };
export interface AIResult { id: string; scope: string; task: AITask; provider: "demo" | "mock" | "openai"; proposal: AIProposal; }
export interface WhatsAppAIAdapter { generate(request: AIRequest, signal?: AbortSignal): Promise<AIResult>; }

/** Allowlisted context only. No directory phone fields, media URLs, configuration or credentials are added. */
export function buildAIContext(data: Workspace, contactId?: string, draft?: Template): AIContext {
  return {
    businessName: data.settings.business,
    contactCount: data.contacts.length,
    optedInCount: data.contacts.filter(contact => contact.consent).length,
    campaignCount: data.campaigns.length,
    failedMessageCount: data.messages.filter(message => message.status === "Failed").length,
    ...(contactId ? { conversation: data.messages.filter(message => message.contactId === contactId).slice(-8).map(message => ({ direction: message.outgoing ? "Business" as const : "Customer" as const, text: message.body })) } : {}),
    ...(draft ? { draft: { name: draft.name, body: draft.body, variables: draft.variables, sample: draft.sample, category: draft.category } } : {}),
  };
}
export function createDemoAIResult(request: AIRequest): AIResult {
  if (!request.scope || request.prompt.trim().length < 8 || request.prompt.length > 2000) throw new Error("Describe What You Need In 8–2,000 Characters.");
  const brief = request.prompt.trim().replace(/[{}]/g, "").replace(/\s+/g, " ").slice(0, 96);
  const greeting = request.tone === "Professional" ? "Hello" : "Hi";
  const suffix = request.language === "Hindi" ? "अधिक जानकारी के लिए इस संदेश का जवाब दें। धन्यवाद!" : request.tone === "Persuasive" ? "Explore the collection and reply to learn more." : "Reply if you would like more details. Thank you!";
  let proposal: AIProposal;
  switch (request.task) {
    case "template_draft": case "template_improve": {
      if (request.task === "template_improve" && !request.context?.draft?.body.trim()) throw new Error("Include The Current Template Context To Improve An Existing Draft.");
      const body = request.task === "template_improve"
        ? `${request.context!.draft!.body.trim().slice(0, 900)}\n${suffix}`
        : request.language === "Hindi" ? `नमस्ते {{1}}, हमारी नई पेशकश देखें। अधिक जानकारी के लिए इस संदेश का जवाब दें। धन्यवाद!` : `${greeting} {{1}}, here is something for you: ${brief}. ${suffix}`;
      proposal = { kind: "template", name: request.context?.draft?.name || "ai_message_draft", body, language: request.language, category: request.context?.draft?.category || "Marketing", variables: Object.fromEntries(templateParameters(body).map(key => [key, request.context?.draft?.variables?.[key] || (key === "1" ? request.context?.draft?.sample || "Aarav" : `Sample ${key}`)])) };
      break;
    }
    case "campaign_plan": proposal = { kind: "campaign", name: `AI Campaign: ${brief.slice(0, 48)}`, goal: brief, audienceTag: /vip|loyal/i.test(brief) ? "VIP" : "All Opted-In", approach: `${request.tone} ${request.language} messaging. Choose an approved template, review personalization, then test before scheduling.` }; break;
    case "reply_draft":
      if (!request.targetContactId) throw new Error("Choose A Conversation Before Drafting A Reply.");
      proposal = { kind: "reply", contactId: request.targetContactId, text: request.language === "Hindi" ? "नमस्ते! आपकी रुचि के लिए धन्यवाद। आप किस उत्पाद के बारे में जानकारी चाहते हैं?" : `${request.tone === "Professional" ? "Hello" : "Hi"}! Thank you for your interest. Which product would you like to know more about? We will be happy to help.` }; break;
    case "workflow_draft": proposal = { kind: "workflow", name: `AI Enquiry Workflow: ${brief.slice(0, 35)}`, nodes: [{ kind: "Trigger", label: "Incoming Enquiry", value: "hello" }, { kind: "Condition", label: "Product Interest", value: "product" }, { kind: "Message", label: "Welcome Reply", value: "Welcome! Which product would you like to explore?" }, { kind: "Assignment", label: "Assign To Team", value: "Unassigned" }] }; break;
    case "flow_draft": proposal = { kind: "flow", name: `AI Enquiry Form: ${brief.slice(0, 35)}`, screens: [{ title: "Your Details", fields: [{ id: "name", label: "Name", type: "Text", required: true, options: "" }, { id: "email", label: "Email", type: "Email", required: true, options: "" }] }, { title: "Product Interest", fields: [{ id: "interest", label: "Interested In", type: "Select", required: true, options: "New Collection,Order Support,Other" }] }] }; break;
    case "business_profile": proposal = { kind: "profile", text: request.language === "Hindi" ? "हम उपयोगी उत्पादों और भरोसेमंद सेवा के साथ आपकी मदद करने के लिए तैयार हैं। अधिक जानकारी के लिए हमसे संपर्क करें।" : `${request.context?.businessName || "Our business"} offers thoughtful products and friendly, reliable service. Message us for product information and assistance.` }; break;
    case "conversation_summary": proposal = { kind: "insight", title: "Conversation Summary", points: request.context?.conversation?.length ? ["Demo conversation excerpt:", ...request.context.conversation.slice(-3).map(message => `${message.direction}: ${message.text}`), "Suggested next step: confirm the customer's product interest before preparing a reply."] : ["Include the selected conversation context to preview a grounded summary.", "Review the customer's request, confirm missing details and prepare a reply draft."] }; break;
    case "contact_segments": proposal = { kind: "insight", title: "Suggested Segments", points: ["Opted-in VIP contacts: consider a tailored collection announcement.", "New opted-in leads: prepare a short welcome and product-discovery message.", "Keep opted-out contacts excluded. Suggestions do not change consent or tags."] }; break;
    case "message_diagnosis": proposal = { kind: "insight", title: "Message Review", points: [request.context ? `${request.context.failedMessageCount || 0} failed messages in the included demo context.` : "Include current context to see demo failure counts.", "Review each error code, recipient format, template status and missing parameters.", "Retry decisions remain manual; this suggestion does not retry or send messages."] }; break;
    case "media_copy": proposal = { kind: "insight", title: "Media Copy Ideas", points: [`Caption: Discover our latest collection. ${suffix}`, "Alt text example: A product collection displayed against a clean background.", "Adapt this text after reviewing the actual image; the demo has not inspected or uploaded media."] }; break;
    case "budget_review": proposal = { kind: "insight", title: "Usage Review", points: ["Compare demo usage by message category and selected period.", "Check the budget alert threshold and confirm actual provider rates after integration.", "Budget values and billing preferences remain unchanged."] }; break;
    default: proposal = { kind: "insight", title: "Performance Summary", points: [request.context ? `${request.context.contactCount || 0} contacts, ${request.context.optedInCount || 0} opted-in contacts and ${request.context.campaignCount || 0} campaigns in the included demo context.` : "Include current context for a summary of the available demo records.", "Compare delivery and read performance across campaigns and date ranges.", "Review failed messages and audience consent before planning the next campaign."] };
  }
  return { id: newId(), scope: request.scope, task: request.task, provider: "demo", proposal };
}
export const demoAIAdapter: WhatsAppAIAdapter = {
  async generate(request, signal) {
    if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => { signal?.removeEventListener("abort", cancel); resolve(); }, 250);
      const cancel = () => { clearTimeout(timer); signal?.removeEventListener("abort", cancel); reject(new DOMException("Cancelled", "AbortError")); };
      signal?.addEventListener("abort", cancel, { once: true });
    });
    if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
    return createDemoAIResult(request);
  },
};

/** Apply only reviewed local proposals. This function cannot send, publish or activate anything. */
export function applyAIProposal(data: Workspace, proposal: AIProposal): Workspace {
  switch (proposal.kind) {
    case "template": return { ...data, templates: [{ id: newId(), name: `${proposal.name.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 90)}_${data.templates.length + 1}`, category: proposal.category, language: proposal.language, header: "", body: proposal.body, footer: "Reply STOP to opt out", sample: proposal.variables["1"] || "", variables: proposal.variables, type: "Text", button: "", buttonType: "URL", buttonTarget: "", actions: [], status: "Draft" }, ...data.templates] };
    case "campaign": { const template = data.templates.find(template => template.status === "Approved"); return { ...data, campaigns: [{ id: newId(), name: proposal.name, kind: "Broadcast", status: "Draft", audience: data.contacts.filter(contact => contact.consent && (proposal.audienceTag !== "VIP" || contact.tags.includes("VIP"))).map(contact => contact.id), templateId: template?.id || "", parameters: template?.variables || (template?.sample ? { "1": template.sample } : {}), scheduledAt: "", sent: 0, read: 0 }, ...data.campaigns] }; }
    case "workflow": return { ...data, workflows: [{ id: newId(), name: proposal.name, nodes: proposal.nodes.map(node => ({ ...node, id: newId() })) }, ...data.workflows] };
    case "flow": return { ...data, flows: [{ id: newId(), name: proposal.name, screens: proposal.screens.map(screen => ({ ...screen, id: newId(), fields: screen.fields.map(field => ({ ...field, id: newId() })) })) }, ...data.flows] };
    case "reply":
      if (!data.contacts.some(contact => contact.id === proposal.contactId)) throw new Error("This Conversation Is Not Available In The Current Client.");
      return { ...data, replyDrafts: { ...data.replyDrafts, [proposal.contactId]: proposal.text } };
    case "profile": return { ...data, settings: { ...data.settings, description: proposal.text.slice(0, 512) } };
    case "insight": return data;
  }
}
