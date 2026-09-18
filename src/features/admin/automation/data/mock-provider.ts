import { AutomationRepository } from "./repository";
import { 
  AutomationRun, 
  AutomationTemplate, 
  AutomationWorkflow, 
  AutomationAnalytics,
  AutomationConsoleLog,
  AutomationHealthMetrics 
} from "./types";
import { AutomationSettingsState, DEFAULT_AUTOMATION_SETTINGS } from "./settings-types";

export const AUTOMATION_MOCK_MODE = true;
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const MOCK_WORKFLOWS: AutomationWorkflow[] = [
  {
    id: "wf_1",
    clientId: "client_1",
    name: "New Meta Lead Follow-up",
    status: "Active",
    version: 2,
    trigger: { type: "meta_lead", label: "New Meta Lead" },
    channels: ["meta", "whatsapp"],
    runs: 1248,
    successRate: 98.4,
    failures: 8,
    lastRunAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    nodes: [
      { id: "node_1", type: "trigger", label: "New Meta Lead", status: "configured", config: { source: "Campaign A" } },
      { id: "node_2", type: "action", actionId: "send_whatsapp", label: "Send WhatsApp", status: "configured", config: { template: "welcome_message" } },
      { id: "node_3", type: "delay", label: "Wait 2 hours", status: "configured", config: { duration: 2, unit: "hours" } },
      { id: "node_4", type: "action", actionId: "assign_user", label: "Assign User", status: "configured", config: { assignee: "sales_team" } }
    ],
    edges: [
      { id: "e1", source: "node_1", target: "node_2" },
      { id: "e2", source: "node_2", target: "node_3" },
      { id: "e3", source: "node_3", target: "node_4" },
    ]
  },
  {
    id: "wf_2",
    clientId: "client_1",
    name: "Google Review Alert",
    status: "Active",
    version: 1,
    trigger: { type: "google_review", label: "New Google review" },
    channels: ["google-business", "email"],
    runs: 428,
    successRate: 100,
    failures: 0,
    lastRunAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    nodes: [
      { id: "node_1", type: "trigger", label: "New Google Review", status: "configured", config: { minRating: 1, maxRating: 3 } },
      { id: "node_2", type: "action", actionId: "send_email", label: "Send Alert Email", status: "configured", config: { to: "manager@company.com" } }
    ],
    edges: [
      { id: "e1", source: "node_1", target: "node_2" }
    ]
  },
  {
    id: "wf_3",
    clientId: "client_1",
    name: "WhatsApp Re-engagement",
    status: "Paused",
    version: 4,
    trigger: { type: "whatsapp_no_reply", label: "No reply for 24 hours" },
    channels: ["whatsapp"],
    runs: 316,
    successRate: 91.8,
    failures: 14,
    lastRunAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    nodes: [],
    edges: []
  },
  {
    id: "wf_4",
    clientId: "client_1",
    name: "Website Down Alert",
    status: "Error",
    version: 1,
    trigger: { type: "website_down", label: "Website Down" },
    channels: ["omni-tracking"],
    runs: 12,
    successRate: 85.0,
    failures: 2,
    lastRunAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    nodes: [
      { id: "node_1", type: "trigger", label: "Website Down", status: "configured", config: {} },
      { id: "node_2", type: "action", actionId: "send_whatsapp", label: "Send WhatsApp", status: "error", config: {} }
    ],
    edges: [
      { id: "e1", source: "node_1", target: "node_2" }
    ]
  }
];

const MOCK_RUNS: AutomationRun[] = [
  {
    id: "run_8f3a2c1e",
    workflowId: "wf_1",
    workflowName: "New Meta Lead Follow-up",
    channel: "meta",
    triggerSource: "Meta Ads (Leadgen)",
    status: "Successful",
    startedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    durationMs: 450,
    owner: "Manish Sharma",
    triggerEntity: { type: "lead", id: "lead_123", label: "Rahul Sharma", subLabel: "+91 98765 43210 • Delhi" },
    steps: [
      { id: "step_1", nodeId: "node_1", status: "Successful", startedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(), durationMs: 45, input: { form_id: "form_meta_982", ad_id: "ad_summer_sale" }, output: { lead_id: "lead_123", verified: true }, retryCount: 0 },
      { id: "step_2", nodeId: "node_2", status: "Successful", startedAt: new Date(Date.now() - 11.9 * 60 * 1000).toISOString(), durationMs: 220, input: { recipient: "+919876543210", template: "welcome_lead_v2" }, output: { messageId: "wamid_HBgMOTE...", deliveryStatus: "delivered" }, retryCount: 0 },
      { id: "step_3", nodeId: "node_3", status: "Successful", startedAt: new Date(Date.now() - 11.7 * 60 * 1000).toISOString(), durationMs: 30, input: { delayMinutes: 0 }, output: { triggeredNext: true }, retryCount: 0 },
      { id: "step_4", nodeId: "node_4", status: "Successful", startedAt: new Date(Date.now() - 11.6 * 60 * 1000).toISOString(), durationMs: 155, input: { assign_to: "sales_delhi", lead_id: "lead_123" }, output: { assignedUserId: "usr_manish", stage: "Contacted" }, retryCount: 0 }
    ],
    rawWebhookPayload: {
      object: "page",
      entry: [
        {
          id: "109847123984",
          time: 1744619420,
          changes: [
            {
              field: "leadgen",
              value: {
                ad_id: "2385192841920",
                form_id: "192847192847",
                leadgen_id: "lead_123",
                created_time: 1744619418,
                page_id: "109847123984",
                adgroup_id: "2385192841919",
                campaign_id: "12020819284",
                campaign_name: "Q2 Digital Omnichannel Conversion",
                user_data: {
                  full_name: "Rahul Sharma",
                  phone_number: "+919876543210",
                  email: "rahul.sharma@example.com",
                  city: "New Delhi",
                  interested_service: "Omnichannel Growth Package",
                  budget: "INR 1,00,000 - 2,50,000"
                }
              }
            }
          ]
        }
      ]
    },
    httpDumps: [
      {
        id: "dump_1",
        service: "Meta Graph API (Leadgen Fetch)",
        method: "GET",
        endpoint: "https://graph.facebook.com/v19.0/lead_123?fields=field_data,created_time",
        statusCode: 200,
        durationMs: 95,
        requestHeaders: { Authorization: "Bearer EAAQZ...", "User-Agent": "OmniPlatform/2.0" },
        responseBody: { id: "lead_123", status: "VALID", field_data: [{ name: "full_name", values: ["Rahul Sharma"] }] }
      },
      {
        id: "dump_2",
        service: "AiSensy WhatsApp Cloud API",
        method: "POST",
        endpoint: "https://backend.aisensy.com/campaign/t1/api/v2",
        statusCode: 200,
        durationMs: 220,
        requestHeaders: { "Content-Type": "application/json", Authorization: "Bearer aisensy_sec_..." },
        requestBody: { apiKey: "ai_...", campaignName: "welcome_lead_v2", destination: "+919876543210", userName: "Rahul Sharma" },
        responseBody: { success: true, messageId: "wamid_HBgMOTE...", status: "SENT_TO_GATEWAY" }
      }
    ]
  },
  {
    id: "run_7c9d4b2a",
    workflowId: "wf_1",
    workflowName: "New Meta Lead Follow-up",
    channel: "whatsapp",
    triggerSource: "Meta Ads (Leadgen)",
    status: "Failed",
    startedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    durationMs: 1200,
    owner: "Neha Verma",
    triggerEntity: { type: "lead", id: "lead_124", label: "Priya Singh", subLabel: "+91 88000 11223 • Mumbai" },
    steps: [
      { id: "step_1", nodeId: "node_1", status: "Successful", startedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(), durationMs: 40, input: { form_id: "form_meta_982" }, output: { lead_id: "lead_124" }, retryCount: 0 },
      { id: "step_2", nodeId: "node_2", status: "Failed", startedAt: new Date(Date.now() - 24.9 * 60 * 1000).toISOString(), durationMs: 1100, input: { phone: "987654" }, error: "Invalid recipient phone number format. Must be E.164 compliant with country code.", retryCount: 1 }
    ],
    rawWebhookPayload: {
      object: "page",
      entry: [
        {
          id: "109847123984",
          changes: [
            {
              field: "leadgen",
              value: {
                leadgen_id: "lead_124",
                user_data: {
                  full_name: "Priya Singh",
                  phone_number: "987654", // Invalid format
                  email: "priya.singh@gmail.com",
                  city: "Mumbai"
                }
              }
            }
          ]
        }
      ]
    },
    httpDumps: [
      {
        id: "dump_f1",
        service: "AiSensy WhatsApp Cloud API",
        method: "POST",
        endpoint: "https://backend.aisensy.com/campaign/t1/api/v2",
        statusCode: 400,
        durationMs: 1100,
        requestBody: { destination: "987654", campaignName: "welcome_lead_v2" },
        responseBody: { success: false, error: { code: "INVALID_PHONE_NUMBER", message: "Phone number 987654 is not a valid WhatsApp registered number or lacks international dialing code." } }
      }
    ],
    errorSummary: {
      code: "WHATSAPP_INVALID_RECIPIENT",
      message: "Phone number '987654' failed WhatsApp API schema validation.",
      stack: "Error: WhatsApp Cloud API returned HTTP 400\n  at sendWhatsAppMessage (node_modules/@omni/channels:142:12)\n  at executeNode (workflow-runner.ts:89:18)",
      recommendation: "Ensure lead capture forms enforce strict E.164 phone validation (e.g. +91 98765 43210). You can manually edit the phone number in CRM and click 'Retry Run'."
    }
  },
  {
    id: "run_5e2f8a9d",
    workflowId: "wf_2",
    workflowName: "Google Review Alert",
    channel: "google-business",
    triggerSource: "Google Business Profile",
    status: "Successful",
    startedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    durationMs: 380,
    owner: "Rohit Kumar",
    triggerEntity: { type: "review", id: "rev_99182", label: "2-Star Review by Amit Roy", subLabel: "Rating: ★★☆☆☆ • Connaught Place Branch" },
    steps: [
      { id: "step_1", nodeId: "node_1", status: "Successful", startedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(), durationMs: 60, input: { minRating: 1, maxRating: 3 }, output: { matched: true, rating: 2 }, retryCount: 0 },
      { id: "step_2", nodeId: "node_2", status: "Successful", startedAt: new Date(Date.now() - 44.9 * 60 * 1000).toISOString(), durationMs: 320, input: { to: "escalations@encodency.com", subject: "Critical Review Alert" }, output: { messageId: "email_msg_9812", sent: true }, retryCount: 0 }
    ],
    rawWebhookPayload: {
      event: "GOOGLE_MY_BUSINESS_NEW_REVIEW",
      locationId: "accounts/102983192/locations/8819284",
      review: {
        reviewId: "rev_99182",
        reviewer: { displayName: "Amit Roy", isAnonymous: false },
        starRating: "TWO",
        comment: "Support response was delayed by 2 hours. Need faster turnaround.",
        createTime: "2025-04-14T03:14:02Z",
        updateTime: "2025-04-14T03:14:02Z"
      }
    },
    httpDumps: [
      {
        id: "dump_g1",
        service: "Google My Business API",
        method: "GET",
        endpoint: "https://mybusiness.googleapis.com/v4/accounts/.../locations/.../reviews/rev_99182",
        statusCode: 200,
        durationMs: 140,
        responseBody: { name: "Amit Roy", starRating: "TWO", comment: "Support response delayed..." }
      },
      {
        id: "dump_g2",
        service: "Omni SES Email Gateway",
        method: "POST",
        endpoint: "https://email.omniplatform.internal/v1/send",
        statusCode: 200,
        durationMs: 180,
        responseBody: { status: "QUEUED", messageId: "ses_8819284a" }
      }
    ]
  },
  {
    id: "run_4b8e2d1f",
    workflowId: "wf_4",
    workflowName: "Website Down Alert",
    channel: "omni-tracking",
    triggerSource: "Omni Uptime Monitor",
    status: "Failed",
    startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    durationMs: 820,
    owner: "Priya Menon",
    triggerEntity: { type: "server", id: "srv_web_01", label: "https://clientstore.com", subLabel: "Status: HTTP 503 Backend Timeout" },
    steps: [
      { id: "step_1", nodeId: "node_1", status: "Successful", startedAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(), durationMs: 40, input: { targetUrl: "https://clientstore.com" }, output: { status: "DOWN", code: 503 }, retryCount: 0 },
      { id: "step_2", nodeId: "node_2", status: "Failed", startedAt: new Date(Date.now() - 119.9 * 60 * 1000).toISOString(), durationMs: 780, input: { channel: "whatsapp_alerts" }, error: "Meta WhatsApp API HTTP 429: Too Many Requests. Rate limit quota exceeded for hour bucket.", retryCount: 2 }
    ],
    rawWebhookPayload: {
      alertType: "UPTIME_DOWN",
      monitorId: "mon_clientstore_441",
      url: "https://clientstore.com",
      httpStatus: 503,
      responseLatencyMs: 15400,
      timestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
      region: "ap-south-1 (Mumbai)"
    },
    httpDumps: [
      {
        id: "dump_w1",
        service: "Meta WhatsApp Cloud API Gateway",
        method: "POST",
        endpoint: "https://graph.facebook.com/v19.0/109847123984/messages",
        statusCode: 429,
        durationMs: 780,
        responseBody: {
          error: {
            message: "(#429) Rate limit hit for phone number bucket. Maximum 80 requests/min reached.",
            type: "OAuthException",
            code: 429,
            fbtrace_id: "AJks91823901a"
          }
        }
      }
    ],
    errorSummary: {
      code: "RATE_LIMIT_EXCEEDED_HTTP_429",
      message: "Meta Graph API WhatsApp rate limit exceeded (HTTP 429).",
      stack: "RateLimitError: 429 Too Many Requests\n  at sendBroadcastAlert (notification-engine.ts:204:15)\n  at runActionStep (step-executor.ts:114:9)",
      recommendation: "Wait for the current 60-second rate limiter window to cool down or increase tier limit in Meta Business Suite settings. Automatic exponential retry will trigger in 3 minutes."
    }
  },
  {
    id: "run_1d7c9e5b",
    workflowId: "wf_3",
    workflowName: "WhatsApp Re-engagement",
    channel: "whatsapp",
    triggerSource: "Scheduled Cron",
    status: "Partial Failure",
    startedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    durationMs: 2400,
    owner: "Neha Verma",
    triggerEntity: { type: "segment", id: "seg_inactive_24h", label: "Inactive Leads (12 Contacts)", subLabel: "Segment: Unreplied > 24 Hours" },
    steps: [
      { id: "step_1", nodeId: "node_1", status: "Successful", startedAt: new Date(Date.now() - 180 * 60 * 1000).toISOString(), durationMs: 120, input: { filter: "inactive_hours > 24" }, output: { totalEligible: 12 }, retryCount: 0 },
      { id: "step_2", nodeId: "node_2", status: "Partial Failure", startedAt: new Date(Date.now() - 179 * 60 * 1000).toISOString(), durationMs: 2280, input: { batchSize: 12 }, output: { delivered: 10, failed: 2 }, error: "2 out of 12 recipients could not be delivered due to WhatsApp 24-hour window expiry.", retryCount: 1 }
    ],
    rawWebhookPayload: {
      trigger: "cron_daily_reengagement",
      scheduledAt: "2025-04-14T07:00:00Z",
      client_id: "client_1",
      audienceCount: 12
    },
    errorSummary: {
      code: "WHATSAPP_CONVERSATION_WINDOW_CLOSED",
      message: "Customer messaging window closed for 2 contacts. Requires paid marketing template.",
      recommendation: "Switch node template to 'utility_marketing_reopen' to send outside the 24-hour customer service window."
    }
  },
  {
    id: "run_9a3f6c7e",
    workflowId: "wf_1",
    workflowName: "New Meta Lead Follow-up",
    channel: "meta",
    triggerSource: "Meta Ads (Leadgen)",
    status: "Running",
    startedAt: new Date(Date.now() - 25 * 1000).toISOString(),
    durationMs: 250,
    owner: "Manish Sharma",
    triggerEntity: { type: "lead", id: "lead_125", label: "Vikram Malhotra", subLabel: "+91 99223 88110 • Bangalore" },
    steps: [
      { id: "step_1", nodeId: "node_1", status: "Successful", startedAt: new Date(Date.now() - 25 * 1000).toISOString(), durationMs: 48, input: { form_id: "form_meta_982" }, output: { lead_id: "lead_125" }, retryCount: 0 },
      { id: "step_2", nodeId: "node_2", status: "Running", startedAt: new Date(Date.now() - 20 * 1000).toISOString(), durationMs: 202, input: { template: "welcome_lead_v2" }, retryCount: 0 }
    ],
    rawWebhookPayload: {
      object: "page",
      entry: [{ id: "109847123984", changes: [{ field: "leadgen", value: { leadgen_id: "lead_125", user_data: { full_name: "Vikram Malhotra", phone: "+919922388110" } } }] }]
    }
  },
  {
    id: "run_6d2b4e8f",
    workflowId: "wf_2",
    workflowName: "Google Review Alert",
    channel: "google-business",
    triggerSource: "Google Business Profile",
    status: "Successful",
    startedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    durationMs: 280,
    owner: "Rohit Kumar",
    triggerEntity: { type: "review", id: "rev_99180", label: "5-Star Review by Sunita Rao", subLabel: "Rating: ★★★★★ • Indiranagar Branch" },
    steps: [
      { id: "step_1", nodeId: "node_1", status: "Successful", startedAt: new Date(Date.now() - 300 * 60 * 1000).toISOString(), durationMs: 50, input: {}, output: { starRating: 5 }, retryCount: 0 },
      { id: "step_2", nodeId: "node_2", status: "Successful", startedAt: new Date(Date.now() - 299.9 * 60 * 1000).toISOString(), durationMs: 230, input: { template: "auto_thank_you" }, output: { replyId: "reply_881a" }, retryCount: 0 }
    ],
    rawWebhookPayload: {
      event: "GOOGLE_MY_BUSINESS_NEW_REVIEW",
      review: { starRating: "FIVE", comment: "Outstanding service and very polite staff!" }
    }
  },
  {
    id: "run_3e9c1a7d",
    workflowId: "wf_3",
    workflowName: "WhatsApp Re-engagement",
    channel: "whatsapp",
    triggerSource: "Manual",
    status: "Cancelled",
    startedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    durationMs: 120,
    owner: "Neha Verma",
    triggerEntity: { type: "lead", id: "lead_110", label: "Karan Johar", subLabel: "Manually stopped by operator" },
    steps: [
      { id: "step_1", nodeId: "node_1", status: "Successful", startedAt: new Date(Date.now() - 480 * 60 * 1000).toISOString(), durationMs: 40, input: {}, output: {}, retryCount: 0 },
      { id: "step_2", nodeId: "node_2", status: "Cancelled", startedAt: new Date(Date.now() - 479.9 * 60 * 1000).toISOString(), durationMs: 80, input: {}, error: "Execution cancelled by user Neha Verma", retryCount: 0 }
    ]
  }
];

const MOCK_CONSOLE_LOGS: AutomationConsoleLog[] = [
  { id: "log_1", runId: "run_9a3f6c7e", workflowName: "New Meta Lead Follow-up", timestamp: new Date(Date.now() - 2 * 1000).toISOString(), level: "info", source: "meta-webhook", message: "Incoming webhook signature verified (sha256=a8f9c1b...)", details: { leadgen_id: "lead_125", ip: "31.13.79.1" } },
  { id: "log_2", runId: "run_9a3f6c7e", workflowName: "New Meta Lead Follow-up", timestamp: new Date(Date.now() - 1.8 * 1000).toISOString(), level: "debug", source: "queue-worker", message: "Dispatched job to queue 'marketing-high-priority' with priority=10" },
  { id: "log_3", runId: "run_9a3f6c7e", workflowName: "New Meta Lead Follow-up", timestamp: new Date(Date.now() - 1.2 * 1000).toISOString(), level: "info", source: "aisensy-api", message: "Initiating WhatsApp Cloud API dispatch to +919922388110" },
  { id: "log_4", runId: "run_8f3a2c1e", workflowName: "New Meta Lead Follow-up", timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(), level: "info", source: "system", message: "Run run_8f3a2c1e completed successfully in 450ms. 4/4 nodes executed." },
  { id: "log_5", runId: "run_7c9d4b2a", workflowName: "New Meta Lead Follow-up", timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(), level: "error", source: "aisensy-api", message: "HTTP 400 Bad Request: Invalid phone number '987654'. WhatsApp API validation failed.", details: { code: "INVALID_PHONE_FORMAT", httpStatus: 400 } },
  { id: "log_6", runId: "run_7c9d4b2a", workflowName: "New Meta Lead Follow-up", timestamp: new Date(Date.now() - 24.8 * 60 * 1000).toISOString(), level: "warn", source: "queue-worker", message: "Run marked as FAILED and routed to Dead Letter Queue (DLQ). Awaiting manual retry or resolution." },
  { id: "log_7", runId: "run_5e2f8a9d", workflowName: "Google Review Alert", timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(), level: "info", source: "google-business", message: "Received PubSub notification for location accounts/.../locations/8819284" },
  { id: "log_8", runId: "run_5e2f8a9d", workflowName: "Google Review Alert", timestamp: new Date(Date.now() - 44.8 * 60 * 1000).toISOString(), level: "warn", source: "alert-dispatcher", message: "Escalation triggered: Negative review (2-star) detected from Amit Roy. Notifying branch manager." },
  { id: "log_9", runId: "run_4b8e2d1f", workflowName: "Website Down Alert", timestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString(), level: "error", source: "omni-tracking", message: "Website uptime check failed: https://clientstore.com returned HTTP 503 Backend Timeout after 15400ms" },
  { id: "log_10", runId: "run_4b8e2d1f", workflowName: "Website Down Alert", timestamp: new Date(Date.now() - 119.8 * 60 * 1000).toISOString(), level: "error", source: "meta-webhook", message: "Rate limit reached: Meta WhatsApp API returned HTTP 429 Too Many Requests. Code: 429 OAuthException" },
  { id: "log_11", runId: "run_1d7c9e5b", workflowName: "WhatsApp Re-engagement", timestamp: new Date(Date.now() - 180 * 60 * 1000).toISOString(), level: "warn", source: "aisensy-api", message: "2 contacts outside 24h conversation window. Message delivery dropped. Switch to approved template." },
  { id: "log_12", timestamp: new Date(Date.now() - 200 * 60 * 1000).toISOString(), level: "debug", source: "system", message: "Automated health check OK. Active listeners: 4, Ingestion queue: healthy, Memory: 142MB" },
  { id: "log_13", timestamp: new Date(Date.now() - 240 * 60 * 1000).toISOString(), level: "info", source: "system", message: "Sync complete: Meta Leadgen webhook certificate renewed for 90 days." }
];

const MOCK_HEALTH_METRICS: AutomationHealthMetrics = {
  totalExecutions: { value: 2076, trend: 18.2 },
  successRate: { value: 97.1, trend: 2.4 },
  failedRuns: { value: 61, trend: -28.0 },
  activeQueue: { count: 14, avgWaitTime: "4.2s", processingRate: 98.2 },
  rateLimits: {
    meta: { remaining: 820, total: 1000, percentage: 82, status: "Healthy" },
    whatsapp: { remaining: 9400, total: 10000, percentage: 94, status: "Healthy" },
    google: { remaining: 4950, total: 5000, percentage: 99, status: "Healthy" }
  },
  webhookIngestion: { eventsPerMin: 142, uptime: 99.98 }
};


const MOCK_TEMPLATES: AutomationTemplate[] = [
  {
    id: "tpl_1",
    name: "New Meta Lead Follow-up",
    description: "Instantly welcome new leads from Facebook & Instagram with a personalized WhatsApp message, then assign them to sales.",
    category: "Lead Management",
    trigger: "New Meta Lead",
    stepCount: 4,
    requiredIntegrations: ["meta", "aisensy"],
    useCount: 1245,
    complexity: "Basic"
  },
  {
    id: "tpl_2",
    name: "Negative Review Escalation",
    description: "Detect 1-3 star reviews on Google Business and immediately alert the manager via email while sending a polite apology to the customer.",
    category: "Google Business",
    trigger: "New Google Review",
    stepCount: 5,
    requiredIntegrations: ["google-business"],
    useCount: 890,
    complexity: "Intermediate"
  },
  {
    id: "tpl_3",
    name: "Website Down Alert",
    description: "Monitor website uptime and instantly notify the IT team via WhatsApp if the site becomes unreachable.",
    category: "Website",
    trigger: "Website Down",
    stepCount: 2,
    requiredIntegrations: ["omni-tracking", "aisensy"],
    useCount: 340,
    complexity: "Basic"
  }
];

class MockAutomationRepository implements AutomationRepository {
  private workflows = [...MOCK_WORKFLOWS];
  private runs = [...MOCK_RUNS];

  async getWorkflows(clientId: string): Promise<AutomationWorkflow[]> {
    return this.workflows.filter(wf => wf.clientId === clientId);
  }

  async getWorkflow(workflowId: string): Promise<AutomationWorkflow | null> {
    return this.workflows.find(wf => wf.id === workflowId) || null;
  }

  async createWorkflow(clientId: string, workflow: Partial<AutomationWorkflow>): Promise<AutomationWorkflow> {
    const newWf: AutomationWorkflow = {
      id: `wf_${Date.now()}`,
      clientId,
      name: workflow.name || "Untitled Workflow",
      status: "Draft",
      version: 1,
      trigger: workflow.trigger || { type: "manual", label: "Manual Trigger" },
      channels: workflow.channels || [],
      runs: 0,
      successRate: 0,
      failures: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodes: workflow.nodes || [],
      edges: workflow.edges || [],
    };
    this.workflows.push(newWf);
    return newWf;
  }

  async updateWorkflow(workflowId: string, updates: Partial<AutomationWorkflow>): Promise<AutomationWorkflow> {
    const idx = this.workflows.findIndex(wf => wf.id === workflowId);
    if (idx === -1) throw new Error("Workflow not found");
    
    this.workflows[idx] = { 
      ...this.workflows[idx], 
      ...updates, 
      updatedAt: new Date().toISOString() 
    } as AutomationWorkflow;
    return this.workflows[idx];
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    this.workflows = this.workflows.filter(wf => wf.id !== workflowId);
  }

  async getRuns(clientId: string, workflowId?: string): Promise<AutomationRun[]> {
    let results = this.runs;
    if (workflowId) {
      results = results.filter(r => r.workflowId === workflowId);
    } else {
      // In a real app we would join runs with workflows to filter by clientId
      const clientWfIds = this.workflows.filter(wf => wf.clientId === clientId).map(wf => wf.id);
      results = results.filter(r => clientWfIds.includes(r.workflowId));
    }
    return results.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  async getRun(runId: string): Promise<AutomationRun | null> {
    return this.runs.find(r => r.id === runId) || null;
  }

  async retryRun(runId: string): Promise<AutomationRun> {
    await delay(300);
    const idx = this.runs.findIndex(r => r.id === runId);
    if (idx === -1) throw new Error("Run not found");
    const existing = this.runs[idx];
    if (!existing) throw new Error("Run not found");

    const retriedSteps = existing.steps.map(s => ({
      ...s,
      status: "Successful" as const,
      error: undefined,
      retryCount: s.retryCount + 1,
      durationMs: s.durationMs + 80
    }));

    const updated: AutomationRun = {
      ...existing,
      status: "Successful",
      errorSummary: undefined,
      durationMs: existing.durationMs + 200,
      steps: retriedSteps
    };
    this.runs[idx] = updated;

    this.consoleLogs.unshift({
      id: `log_retry_${Date.now()}`,
      runId: existing.id,
      workflowName: existing.workflowName,
      timestamp: new Date().toISOString(),
      level: "info",
      source: "queue-worker",
      message: `Manual retry succeeded for run ${existing.id}. All ${retriedSteps.length} steps executed successfully.`
    });

    return updated;
  }

  async bulkRetryRuns(runIds: string[]): Promise<AutomationRun[]> {
    await delay(400);
    const updatedRuns: AutomationRun[] = [];
    for (const id of runIds) {
      const idx = this.runs.findIndex(r => r.id === id);
      if (idx !== -1) {
        const existing = this.runs[idx];
        if (existing) {
          const retriedSteps = existing.steps.map(s => ({
            ...s,
            status: "Successful" as const,
            error: undefined,
            retryCount: s.retryCount + 1
          }));
          const updated: AutomationRun = {
            ...existing,
            status: "Successful",
            errorSummary: undefined,
            steps: retriedSteps
          };
          this.runs[idx] = updated;
          updatedRuns.push(updated);
        }
      }
    }
    return updatedRuns;
  }

  async createTestWebhookRun(payload: { workflowId: string; eventType: string; payload: Record<string, any> }): Promise<AutomationRun> {
    await delay(200);
    const wf = this.workflows.find(w => w.id === payload.workflowId) ?? this.workflows[0]!;
    const newRunId = `run_test_${Date.now().toString(36)}`;
    const newRun: AutomationRun = {
      id: newRunId,
      workflowId: wf.id,
      workflowName: wf.name,
      channel: (wf.channels[0] as any) || "meta",
      triggerSource: `Simulated Webhook (${payload.eventType})`,
      status: "Successful",
      startedAt: new Date().toISOString(),
      durationMs: 310,
      owner: "Developer / Admin",
      triggerEntity: {
        type: "simulated_event",
        id: `test_ent_${Date.now()}`,
        label: payload.payload.user_data?.full_name || payload.payload.lead_name || "Synthetic Test Event",
        subLabel: `Event: ${payload.eventType} • Test Payload`
      },
      steps: [
        { id: `step_t1`, nodeId: "node_1", status: "Successful", startedAt: new Date().toISOString(), durationMs: 42, input: payload.payload, output: { verified: true, signature: "valid" }, retryCount: 0 },
        { id: `step_t2`, nodeId: "node_2", status: "Successful", startedAt: new Date().toISOString(), durationMs: 180, input: { processed: true }, output: { responseCode: 200, status: "DISPATCHED" }, retryCount: 0 }
      ],
      rawWebhookPayload: payload.payload,
      httpDumps: [
        {
          id: `dump_t_${Date.now()}`,
          service: "Simulated Webhook Receiver",
          method: "POST",
          endpoint: "/api/webhooks/automation/simulate",
          statusCode: 200,
          durationMs: 42,
          requestBody: payload.payload,
          responseBody: { status: "RECEIVED_AND_PROCESSED", runId: newRunId }
        }
      ]
    };

    this.runs.unshift(newRun);
    this.consoleLogs.unshift({
      id: `log_${Date.now()}`,
      runId: newRunId,
      workflowName: wf.name,
      timestamp: new Date().toISOString(),
      level: "info",
      source: "meta-webhook",
      message: `Simulated test webhook received for event '${payload.eventType}'. Created run ${newRunId}.`
    });

    return newRun;
  }

  private consoleLogs: AutomationConsoleLog[] = [...MOCK_CONSOLE_LOGS];

  async getConsoleLogs(): Promise<AutomationConsoleLog[]> {
    return [...this.consoleLogs];
  }

  async getHealthMetrics(): Promise<AutomationHealthMetrics> {
    return { ...MOCK_HEALTH_METRICS };
  }

  async getTemplates(): Promise<AutomationTemplate[]> {
    return MOCK_TEMPLATES;
  }

  async getAnalytics(_clientId: string): Promise<AutomationAnalytics> {
    await delay(600);
    return {
      activeWorkflows: { value: 12, trend: 33 },
      totalRuns: { value: 2076, trend: 18 },
      successRate: { value: 97.1, trend: 2.4 },
      failedRuns: { value: 61, trend: -28 },
      timeSavedHours: { value: 84, trend: 41 },
      actionsExecuted: { value: 6842, trend: 26 },
      activity: [
        { date: "Mar 15", successfulRuns: 50, failedRuns: 5, successRate: 90 },
        { date: "Mar 16", successfulRuns: 45, failedRuns: 3, successRate: 92 },
        { date: "Mar 17", successfulRuns: 65, failedRuns: 10, successRate: 85 },
        { date: "Mar 18", successfulRuns: 70, failedRuns: 8, successRate: 89 },
        { date: "Mar 19", successfulRuns: 80, failedRuns: 4, successRate: 95 },
        { date: "Mar 20", successfulRuns: 85, failedRuns: 2, successRate: 97 },
        { date: "Mar 21", successfulRuns: 75, failedRuns: 6, successRate: 92 },
        { date: "Mar 22", successfulRuns: 60, failedRuns: 1, successRate: 98 },
        { date: "Mar 23", successfulRuns: 55, failedRuns: 2, successRate: 96 },
        { date: "Mar 24", successfulRuns: 65, failedRuns: 4, successRate: 94 },
        { date: "Mar 25", successfulRuns: 70, failedRuns: 3, successRate: 95 },
        { date: "Mar 26", successfulRuns: 80, failedRuns: 2, successRate: 97 },
        { date: "Mar 27", successfulRuns: 90, failedRuns: 5, successRate: 94 },
        { date: "Mar 28", successfulRuns: 75, failedRuns: 12, successRate: 85 },
        { date: "Mar 29", successfulRuns: 80, failedRuns: 6, successRate: 92 },
        { date: "Mar 30", successfulRuns: 100, failedRuns: 3, successRate: 97 },
        { date: "Mar 31", successfulRuns: 95, failedRuns: 2, successRate: 98 },
        { date: "Apr 1", successfulRuns: 90, failedRuns: 4, successRate: 95 },
        { date: "Apr 2", successfulRuns: 110, failedRuns: 5, successRate: 95 },
        { date: "Apr 3", successfulRuns: 120, failedRuns: 3, successRate: 97 },
        { date: "Apr 4", successfulRuns: 115, failedRuns: 2, successRate: 98 },
        { date: "Apr 5", successfulRuns: 100, failedRuns: 8, successRate: 92 },
        { date: "Apr 6", successfulRuns: 105, failedRuns: 4, successRate: 96 },
        { date: "Apr 7", successfulRuns: 125, failedRuns: 5, successRate: 96 },
        { date: "Apr 8", successfulRuns: 130, failedRuns: 2, successRate: 98 },
        { date: "Apr 9", successfulRuns: 110, failedRuns: 4, successRate: 96 },
        { date: "Apr 10", successfulRuns: 115, failedRuns: 1, successRate: 99 },
        { date: "Apr 11", successfulRuns: 125, failedRuns: 3, successRate: 97 },
        { date: "Apr 12", successfulRuns: 120, failedRuns: 5, successRate: 95 },
        { date: "Apr 13", successfulRuns: 110, failedRuns: 4, successRate: 96 },
        { date: "Apr 14", successfulRuns: 115, failedRuns: 2, successRate: 98 }
      ],
      health: [
        { status: "Healthy", count: 24, color: "#10B981" },
        { status: "Needs Attention", count: 4, color: "#F59E0B" },
        { status: "Paused", count: 3, color: "#3B82F6" },
        { status: "Error", count: 1, color: "#EF4444" }
      ],
      triggerSources: [
        { source: "Meta Ads", percentage: 38, color: "#1877F2" },
        { source: "Website", percentage: 24, color: "#10B981" },
        { source: "Google Business", percentage: 16, color: "#F59E0B" },
        { source: "Manual", percentage: 10, color: "#8B5CF6" },
        { source: "Time Based", percentage: 8, color: "#EC4899" },
        { source: "Others", percentage: 4, color: "#94A3B8" }
      ],
      alerts: [
        { id: "a1", type: "error", title: "WhatsApp action failed 14 times", description: "New Meta Lead Follow-up", timeAgo: "2 hrs ago", actionLabel: "View Runs" },
        { id: "a2", type: "warning", title: "Google connection expired", description: "Google Review Alert", timeAgo: "5 hrs ago", actionLabel: "Reconnect" },
        { id: "a3", type: "error", title: "8 leads stuck at step 3", description: "WhatsApp Re-engagement", timeAgo: "1 day ago", actionLabel: "View Runs" },
        { id: "a4", type: "warning", title: "Workflow has no assignee", description: "Website Down Alert", timeAgo: "1 day ago", actionLabel: "Edit" },
        { id: "a5", type: "error", title: "Meta integration error", description: "Lead Campaign Monitor", timeAgo: "2 days ago", actionLabel: "Fix" },
      ]
    };
  }

  private currentSettings: AutomationSettingsState = JSON.parse(JSON.stringify(DEFAULT_AUTOMATION_SETTINGS));

  async getSettings(): Promise<AutomationSettingsState> {
    await delay(30);
    return JSON.parse(JSON.stringify(this.currentSettings));
  }

  async updateSettings(updates: Partial<AutomationSettingsState>): Promise<AutomationSettingsState> {
    await delay(50);
    this.currentSettings = {
      ...this.currentSettings,
      ...updates,
    };
    return JSON.parse(JSON.stringify(this.currentSettings));
  }

  async resetSettings(): Promise<AutomationSettingsState> {
    await delay(50);
    this.currentSettings = JSON.parse(JSON.stringify(DEFAULT_AUTOMATION_SETTINGS));
    return JSON.parse(JSON.stringify(this.currentSettings));
  }
}

export const automationRepository = new MockAutomationRepository();
