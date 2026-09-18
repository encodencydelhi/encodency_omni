"use client";

import { useState } from "react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { Send, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AutomationWorkflow } from "../../data/types";

interface TestWebhookModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflows: AutomationWorkflow[];
  onTrigger: (payload: { workflowId: string; eventType: string; payload: Record<string, any> }) => Promise<void>;
}

const SAMPLE_PAYLOADS: Record<string, Record<string, any>> = {
  meta_lead: {
    event: "leadgen",
    form_id: "form_summer_2025",
    campaign_name: "Q2 Omnichannel Conversion Ads",
    lead_name: "Ananya Deshmukh",
    phone_number: "+919876500112",
    email: "ananya.d@enterprise.in",
    city: "Bengaluru",
    budget: "INR 2,00,000 - 5,00,000",
    interested_service: "Omnichannel Social + WhatsApp Suite"
  },
  whatsapp_inbound: {
    event: "messages",
    from: "+919811223344",
    sender_name: "Vikram Malhotra",
    message_type: "text",
    message_body: "Hi Encodency team, I want to automate my Google review alerts and Meta ads leads.",
    timestamp: Math.floor(Date.now() / 1000)
  },
  google_review: {
    event: "new_review",
    location_name: "Encodency Omnichannel Solutions - Connaught Place",
    star_rating: 1,
    reviewer_name: "Karan Johar",
    comment: "Facing delivery delay on campaigns. Please connect urgently.",
    create_time: new Date().toISOString()
  },
  uptime_ping: {
    event: "service_health_check",
    target_url: "https://shop.clientdomain.com",
    http_status: 503,
    error_message: "Backend Service Unavailable (Timeout > 15000ms)",
    server_region: "ap-south-1 (Mumbai)"
  }
};

export function TestWebhookModal({ open, onOpenChange, workflows, onTrigger }: TestWebhookModalProps) {
  const [selectedEvent, setSelectedEvent] = useState<string>("meta_lead");
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>(workflows[0]?.id || "wf_1");
  const [payloadString, setPayloadString] = useState<string>(
    JSON.stringify(SAMPLE_PAYLOADS["meta_lead"], null, 2)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEventTypeChange = (eventKey: string) => {
    setSelectedEvent(eventKey);
    setPayloadString(JSON.stringify(SAMPLE_PAYLOADS[eventKey] || {}, null, 2));
  };

  const handleResetPayload = () => {
    setPayloadString(JSON.stringify(SAMPLE_PAYLOADS[selectedEvent] || {}, null, 2));
    toast.info("Reset to default sample payload");
  };

  const handleSend = async () => {
    let parsed: Record<string, any>;
    try {
      parsed = JSON.parse(payloadString);
    } catch (e) {
      toast.error("Invalid JSON format. Please check your payload syntax.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onTrigger({
        workflowId: selectedWorkflowId,
        eventType: selectedEvent,
        payload: parsed
      });
      toast.success("Simulated webhook dispatched successfully! New run recorded in logs.");
      onOpenChange(false);
    } catch (err) {
      toast.error("Failed to trigger test webhook.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-white border border-[#E2E8F0] p-6 shadow-2xl rounded-2xl">
        <DialogHeader className="space-y-1.5 pb-3 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Sparkles className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-[16px] font-bold text-[#111C3A]">
                Trigger Test Webhook Event
              </DialogTitle>
              <DialogDescription className="text-[11.5px] text-[#64748B]">
                Simulate an incoming event to test trigger listeners, execution steps, and logs in real-time.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          
          {/* Target Workflow & Event Type Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">
            <div>
              <label className="block text-[11px] font-bold text-[#334155] mb-1">
                Event Template
              </label>
              <select
                value={selectedEvent}
                onChange={(e) => handleEventTypeChange(e.target.value)}
                className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-[12px] font-medium text-[#111C3A] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="meta_lead">Meta Leadgen Form Submission</option>
                <option value="whatsapp_inbound">WhatsApp Inbound Message</option>
                <option value="google_review">Google Business 1-Star Review</option>
                <option value="uptime_ping">Website Downtime Ping (HTTP 503)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#334155] mb-1">
                Target Automation Workflow
              </label>
              <select
                value={selectedWorkflowId}
                onChange={(e) => setSelectedWorkflowId(e.target.value)}
                className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-[12px] font-medium text-[#111C3A] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                {workflows.map((wf) => (
                  <option key={wf.id} value={wf.id}>
                    {wf.name} ({wf.trigger.label})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* JSON Payload Editor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-[#334155] flex items-center gap-1.5">
                <span>Webhook Payload (JSON)</span>
                <span className="text-[10px] text-[#94A3B8] font-normal">Editable</span>
              </label>
              <button
                type="button"
                onClick={handleResetPayload}
                className="text-[10.5px] font-semibold text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1"
              >
                <RefreshCw className="size-3" /> Reset to Default
              </button>
            </div>

            <div className="relative rounded-xl border border-[#E2E8F0] bg-[#FAFBFD] overflow-hidden shadow-2xs focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
              <textarea
                value={payloadString}
                onChange={(e) => setPayloadString(e.target.value)}
                rows={9}
                className="w-full bg-transparent text-[#1E293B] p-3.5 font-mono text-[11.5px] focus:outline-none leading-relaxed resize-none selection:bg-blue-100 selection:text-blue-900"
                spellCheck={false}
              />
            </div>
          </div>

        </div>

        <DialogFooter className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between sm:justify-between">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 border border-[#E2E8F0] bg-white hover:bg-slate-50 text-[12px] font-bold text-[#64748B] rounded-lg transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSend}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[12px] font-bold rounded-lg shadow-sm shadow-blue-500/20 transition-colors disabled:opacity-50"
          >
            <Send className={`size-3.5 ${isSubmitting ? "animate-spin" : ""}`} />
            {isSubmitting ? "Dispatching..." : "Send Test Webhook"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
