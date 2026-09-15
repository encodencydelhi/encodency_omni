"use client";

import { useState } from "react";
import {
  X,
  Send,
  Upload,
  FileText,
  Plus,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Users,
  Settings,
  Zap,
  Sparkles,
  Phone,
  Globe,
  ShieldCheck,
  Megaphone,
  Workflow,
  Copy,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

export interface WabaIntegrationDetails {
  provider: string;
  phoneNumber: string;
  businessName: string;
  wabaStatus: string;
  qualityRating: string;
  dailyLimit: string;
  timezone: string;
  wabaId: string;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// -------------------------------------------------------------
// 1. CREATE CAMPAIGN MODAL
// -------------------------------------------------------------
export function CreateCampaignModal({ isOpen, onClose }: ModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState("Marketing");
  const [audience, setAudience] = useState("all");
  const [template, setTemplate] = useState("event_reminder_v2");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Campaign name is required");
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success("Broadcast Campaign Launched!", {
        description: `Campaign "${name}" has been queued for ${audience === "all" ? "3,842 contacts" : "selected audience segment"}.`,
      });
      onClose();
      setName("");
    }, 600);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl bg-white p-0 overflow-hidden rounded-2xl shadow-2xl border border-slate-200">
        <div className="bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 p-6 text-white relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl">
                <Megaphone className="size-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-white tracking-tight">Create WhatsApp Broadcast</DialogTitle>
                <DialogDescription className="text-emerald-100 text-xs mt-0.5 font-medium">
                  Send targeted bulk messages using Meta approved templates via AiSensy WABA.
                </DialogDescription>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-slate-800">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Campaign Name</label>
            <Input
              placeholder="e.g. Earth Day Volunteer Rally 2025"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 text-sm border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Campaign Type</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-10 text-sm border-slate-200 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Marketing">Marketing (Promotions & Offers)</SelectItem>
                  <SelectItem value="Utility">Utility (Updates & Alerts)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Target Audience</label>
              <Select value={audience} onValueChange={setAudience}>
                <SelectTrigger className="h-10 text-sm border-slate-200 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Contacts (3,842 contacts)</SelectItem>
                  <SelectItem value="donors">Donors Tag (1,240 contacts)</SelectItem>
                  <SelectItem value="volunteers">Volunteers Tag (1,920 contacts)</SelectItem>
                  <SelectItem value="attendees">Event Attendees (1,560 contacts)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Approved Message Template</label>
            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger className="h-10 text-sm border-slate-200 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="event_reminder_v2">event_reminder_v2 (Utility - English)</SelectItem>
                <SelectItem value="volunteer_signup_invite">volunteer_signup_invite (Marketing - English)</SelectItem>
                <SelectItem value="donation_thanks_msg">donation_thanks_msg (Utility - English)</SelectItem>
                <SelectItem value="campaign_progress_update">campaign_progress_update (Marketing - English)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200/80 text-xs text-emerald-900 space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-emerald-800">
              <ShieldCheck className="size-4 text-emerald-600" /> Meta WABA Quality Assurance:
            </p>
            <p className="text-emerald-700 font-medium">
              Your message will be delivered with 256-bit encryption. Expected completion rate is ~98.4% within 15 minutes.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="h-10 px-4 text-xs font-bold rounded-xl">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-10 px-5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-600/20"
            >
              {isSubmitting ? "Launching..." : "Launch Campaign"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// -------------------------------------------------------------
// 2. SEND TEMPLATE MESSAGE MODAL
// -------------------------------------------------------------
export function SendTemplateModal({ isOpen, onClose }: ModalProps) {
  const [recipient, setRecipient] = useState("+91 98123 45670");
  const [template, setTemplate] = useState("event_reminder_v2");
  const [var1, setVar1] = useState("Rahul Sharma");
  const [var2, setVar2] = useState("March 22, 2025");
  const [isSending, setIsSending] = useState(false);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      toast.success("Template Message Sent!", {
        description: `Delivered template "${template}" to ${recipient}.`,
      });
      onClose();
    }, 500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white p-0 overflow-hidden rounded-2xl shadow-2xl border border-slate-200">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Send className="size-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white">Send Direct Template</DialogTitle>
              <DialogDescription className="text-emerald-100 text-xs font-medium">
                Send a single approved WhatsApp template message.
              </DialogDescription>
            </div>
          </div>
        </div>

        <form onSubmit={handleSend} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase">Recipient Phone Number</label>
            <Input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="+91 98XXX XXXXX"
              className="h-10 text-sm border-slate-200 focus:border-emerald-500 rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase">Select Template</label>
            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger className="h-10 text-sm border-slate-200 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="event_reminder_v2">event_reminder_v2</SelectItem>
                <SelectItem value="volunteer_signup_invite">volunteer_signup_invite</SelectItem>
                <SelectItem value="donation_thanks_msg">donation_thanks_msg</SelectItem>
                <SelectItem value="otp_verification_code">otp_verification_code</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600">Variable {"{{1}}"}</label>
              <Input
                value={var1}
                onChange={(e) => setVar1(e.target.value)}
                className="h-8 text-xs bg-white rounded-lg"
                placeholder="Name"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600">Variable {"{{2}}"}</label>
              <Input
                value={var2}
                onChange={(e) => setVar2(e.target.value)}
                className="h-8 text-xs bg-white rounded-lg"
                placeholder="Date/Value"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="h-9 text-xs font-bold rounded-xl">
              Cancel
            </Button>
            <Button type="submit" disabled={isSending} className="h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
              {isSending ? "Sending..." : "Send Message"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// -------------------------------------------------------------
// 3. CREATE TEMPLATE MODAL WITH LIVE WABA MOCKUP
// -------------------------------------------------------------
export function CreateTemplateModal({ isOpen, onClose }: ModalProps) {
  const [templateName, setTemplateName] = useState("");
  const [category, setCategory] = useState("Marketing");
  const [language, setLanguage] = useState("English");
  const [headerType, setHeaderType] = useState("Text");
  const [headerText, setHeaderText] = useState("Special Invitation");
  const [bodyText, setBodyText] = useState(
    "Hi {{1}}, thank you for supporting Namo Gange Trust! Join us on {{2}} for our upcoming Ganga Cleanup Drive in Varanasi."
  );
  const [footerText, setFooterText] = useState("Namo Gange Helpline: 1800-180-1551");
  const [button1, setButton1] = useState("I will join 🙌");
  const [button2, setButton2] = useState("Remind me later ⏰");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) {
      toast.error("Template name is required");
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success("Template Submitted to Meta!", {
        description: `Template "${templateName.toLowerCase().replace(/\s+/g, "_")}" has been sent for Meta WABA approval (Status: Pending).`,
      });
      onClose();
      setTemplateName("");
    }, 700);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-white p-0 overflow-hidden rounded-2xl shadow-2xl border border-slate-200">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl">
              <FileText className="size-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white">Create WhatsApp Message Template</DialogTitle>
              <DialogDescription className="text-emerald-100 text-xs font-medium">
                Design interactive templates with dynamic variables according to Meta WABA policies.
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 max-h-[80vh] overflow-y-auto">
          {/* Left Form: 7 cols */}
          <form onSubmit={handleCreate} className="col-span-7 p-6 space-y-4 border-r border-slate-200">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Template Name</label>
                <Input
                  placeholder="e.g. ganga_cleanup_invite"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
                  className="h-9 text-xs rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Category</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-9 text-xs rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Utility">Utility</SelectItem>
                    <SelectItem value="Authentication">Authentication</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Language</label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="h-9 text-xs rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="English">English (en)</SelectItem>
                    <SelectItem value="Hindi">Hindi (hi)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Header Format</label>
                <Select value={headerType} onValueChange={setHeaderType}>
                  <SelectTrigger className="h-9 text-xs rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="None">None</SelectItem>
                    <SelectItem value="Text">Text Header</SelectItem>
                    <SelectItem value="Image">Media - Image</SelectItem>
                    <SelectItem value="Video">Media - Video</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {headerType === "Text" && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Header Text</label>
                <Input value={headerText} onChange={(e) => setHeaderText(e.target.value)} className="h-9 text-xs rounded-xl" />
              </div>
            )}

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-700">Body Content</label>
                <span className="text-[10px] text-slate-500 font-semibold">Use {"{{1}}"}, {"{{2}}"} for parameters</span>
              </div>
              <Textarea
                rows={4}
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                className="text-xs resize-none rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Footer Text (Optional)</label>
              <Input value={footerText} onChange={(e) => setFooterText(e.target.value)} className="h-9 text-xs rounded-xl" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Interactive Buttons</label>
              <div className="grid grid-cols-2 gap-2">
                <Input value={button1} onChange={(e) => setButton1(e.target.value)} placeholder="Button 1" className="h-8 text-xs rounded-lg" />
                <Input value={button2} onChange={(e) => setButton2(e.target.value)} placeholder="Button 2" className="h-8 text-xs rounded-lg" />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose} className="h-9 text-xs font-bold rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
                {isSubmitting ? "Submitting..." : "Submit for Meta Approval"}
              </Button>
            </div>
          </form>

          {/* Right Live Preview: 5 cols */}
          <div className="col-span-5 bg-slate-50 p-6 flex flex-col items-center justify-center border-l border-slate-200">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Live WhatsApp Preview</p>
            <div className="w-[280px] bg-[#E5DDD5] rounded-2xl p-3 shadow-lg border-4 border-slate-300 relative">
              <div className="bg-white rounded-lg p-3 shadow-sm text-slate-800 space-y-1.5 relative">
                {headerType === "Text" && headerText && (
                  <p className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-1">{headerText}</p>
                )}
                {headerType === "Image" && (
                  <div className="h-28 bg-slate-200 rounded-md flex items-center justify-center text-xs text-slate-500 font-bold">
                    🖼 Image Preview
                  </div>
                )}
                <p className="text-[11.5px] leading-snug whitespace-pre-wrap">{bodyText}</p>
                {footerText && <p className="text-[10px] text-slate-400 pt-1 font-semibold">{footerText}</p>}
                <div className="text-[9px] text-slate-400 text-right">10:42 AM</div>
              </div>

              <div className="mt-1.5 space-y-1">
                {button1 && (
                  <div className="bg-white rounded-lg py-2 px-3 text-center text-[11px] font-bold text-emerald-600 shadow-xs border border-slate-200">
                    {button1}
                  </div>
                )}
                {button2 && (
                  <div className="bg-white rounded-lg py-2 px-3 text-center text-[11px] font-bold text-emerald-600 shadow-xs border border-slate-200">
                    {button2}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// -------------------------------------------------------------
// 4. IMPORT CONTACTS MODAL
// -------------------------------------------------------------
export function ImportContactsModal({ isOpen, onClose }: ModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [tag, setTag] = useState("Volunteer");
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    setIsImporting(true);
    setTimeout(() => {
      setIsImporting(false);
      toast.success("Contacts Imported Successfully!", {
        description: `Imported 240 new contacts tagged with "${tag}".`,
      });
      onClose();
      setFile(null);
    }, 800);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white p-0 overflow-hidden rounded-2xl shadow-2xl border border-slate-200">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Upload className="size-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white">Import Contacts CSV</DialogTitle>
              <DialogDescription className="text-emerald-100 text-xs font-medium">
                Upload CSV or Excel file containing phone numbers & contact names.
              </DialogDescription>
            </div>
          </div>
        </div>

        <form onSubmit={handleImport} className="p-5 space-y-4">
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-emerald-500 transition-colors bg-slate-50 cursor-pointer">
            <Upload className="size-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">Drag and drop CSV file here</p>
            <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Supports .csv, .xlsx (Max size 10MB)</p>
            <input
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              id="csv-upload"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <label htmlFor="csv-upload" className="inline-block mt-3 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50">
              Browse Files
            </label>
            {file && <p className="text-xs font-bold text-emerald-600 mt-2">Selected: {file.name}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase">Apply Tag/Label</label>
            <Select value={tag} onValueChange={setTag}>
              <SelectTrigger className="h-9 text-xs rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Donor">Donor</SelectItem>
                <SelectItem value="Volunteer">Volunteer</SelectItem>
                <SelectItem value="Event Attendee">Event Attendee</SelectItem>
                <SelectItem value="Newsletter">Newsletter</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="h-9 text-xs font-bold rounded-xl">
              Cancel
            </Button>
            <Button type="submit" disabled={isImporting} className="h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
              {isImporting ? "Importing..." : "Start Import"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// -------------------------------------------------------------
// 5. EDIT INTEGRATION MODAL
// -------------------------------------------------------------
export function EditIntegrationModal({
  isOpen,
  onClose,
  details,
  onSave,
}: ModalProps & {
  details: WabaIntegrationDetails;
  onSave: (updated: WabaIntegrationDetails) => void;
}) {
  const [form, setForm] = useState<WabaIntegrationDetails>(details);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    toast.success("WABA Integration Settings Saved!", {
      description: `Updated profile for ${form.businessName}.`,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white p-0 overflow-hidden rounded-2xl shadow-2xl border border-slate-200">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Settings className="size-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white">Edit WABA Integration</DialogTitle>
              <DialogDescription className="text-emerald-100 text-xs font-medium">
                Manage AiSensy WhatsApp Business API configurations.
              </DialogDescription>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Business Name</label>
            <Input
              value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              className="h-9 text-xs rounded-xl"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Registered Phone Number</label>
            <Input
              value={form.phoneNumber}
              onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
              className="h-9 text-xs rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Provider</label>
              <Input value={form.provider} disabled className="h-9 text-xs bg-slate-100 rounded-xl" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Daily Messaging Limit</label>
              <Select
                value={form.dailyLimit}
                onValueChange={(val) => setForm({ ...form, dailyLimit: val })}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1,000 messages">1,000 / day</SelectItem>
                  <SelectItem value="10,000 messages">10,000 / day</SelectItem>
                  <SelectItem value="100,000 messages">100,000 / day</SelectItem>
                  <SelectItem value="Unlimited">Unlimited</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Quality Rating</label>
              <Select
                value={form.qualityRating}
                onValueChange={(val) => setForm({ ...form, qualityRating: val })}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="High">High (Green)</SelectItem>
                  <SelectItem value="Medium">Medium (Yellow)</SelectItem>
                  <SelectItem value="Low">Low (Red)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Timezone</label>
              <Select
                value={form.timezone}
                onValueChange={(val) => setForm({ ...form, timezone: val })}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="h-9 text-xs font-bold rounded-xl">
              Cancel
            </Button>
            <Button type="submit" className="h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// -------------------------------------------------------------
// 6. CREATE AUTOMATION RULE MODAL
// -------------------------------------------------------------
export function CreateRuleModal({ isOpen, onClose }: ModalProps) {
  const [ruleName, setRuleName] = useState("");
  const [triggerType, setTriggerType] = useState("keyword");
  const [triggerValue, setTriggerValue] = useState("donate");
  const [action, setAction] = useState("Send donation_thanks_msg template");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) {
      toast.error("Rule name is required");
      return;
    }
    toast.success("Automation Rule Created!", {
      description: `Rule "${ruleName}" is now active and monitoring incoming messages.`,
    });
    onClose();
    setRuleName("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white p-0 overflow-hidden rounded-2xl shadow-2xl border border-slate-200">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Zap className="size-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white">Create Automation Rule</DialogTitle>
              <DialogDescription className="text-emerald-100 text-xs font-medium">
                Automate instant replies or actions based on triggers.
              </DialogDescription>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Rule Name</label>
            <Input
              placeholder="e.g. Keyword Reply - Volunteer Info"
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              className="h-9 text-xs rounded-xl"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Trigger Type</label>
            <Select value={triggerType} onValueChange={setTriggerType}>
              <SelectTrigger className="h-9 text-xs rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="keyword">Inbound Keyword Match</SelectItem>
                <SelectItem value="event">New Contact Added</SelectItem>
                <SelectItem value="time-based">Inactivity Delay</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Trigger Condition / Keyword</label>
            <Input
              placeholder='e.g. "donate" or "volunteer"'
              value={triggerValue}
              onChange={(e) => setTriggerValue(e.target.value)}
              className="h-9 text-xs rounded-xl"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Automated Action</label>
            <Input
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="h-9 text-xs rounded-xl"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="h-9 text-xs font-bold rounded-xl">
              Cancel
            </Button>
            <Button type="submit" className="h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
              Create Rule
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// -------------------------------------------------------------
// 7. CREATE CTWA AD MODAL
// -------------------------------------------------------------
export function CreateCTWAAdModal({ isOpen, onClose }: ModalProps) {
  const [adName, setAdName] = useState("");
  const [platform, setPlatform] = useState("Facebook");
  const [dailyBudget, setDailyBudget] = useState("1000");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Click-to-WhatsApp Ad Created!", {
      description: `Ad "${adName}" synced with Meta Ads Manager.`,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white p-0 overflow-hidden rounded-2xl shadow-2xl border border-slate-200">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Megaphone className="size-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white">Create Click-to-WhatsApp Ad</DialogTitle>
              <DialogDescription className="text-blue-100 text-xs font-medium">
                Drive conversations directly into WhatsApp from Facebook & Instagram.
              </DialogDescription>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Ad Campaign Name</label>
            <Input
              placeholder="e.g. Assi Ghat Volunteers Lead Gen"
              value={adName}
              onChange={(e) => setAdName(e.target.value)}
              className="h-9 text-xs rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Platform</label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger className="h-9 text-xs rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Facebook">Facebook Feed</SelectItem>
                  <SelectItem value="Instagram">Instagram Reels/Feed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Daily Budget (₹)</label>
              <Input
                type="number"
                value={dailyBudget}
                onChange={(e) => setDailyBudget(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="h-9 text-xs font-bold rounded-xl">
              Cancel
            </Button>
            <Button type="submit" className="h-9 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
              Launch Ad
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
