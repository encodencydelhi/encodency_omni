"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { clientsApi } from "@/features/admin/projects/live/clients-api";
import { CATEGORY_HINT, CATEGORY_LABEL, PRIORITY_LABEL } from "../labels";
import { errorMessage, errorReason, useCompanyScope, useCreateTicket, useSupportSummary } from "../hooks";
import { TICKET_CATEGORIES, TICKET_PRIORITIES, type TicketCategory, type TicketPriority } from "../types";
import { btn, btnPrimary, field, Spinner, textarea } from "../ui";

const MODULES = ["Content Studio", "Calendar", "Campaigns", "Media Library", "Meta (Facebook / Instagram / Ads)", "LinkedIn", "Google Business", "WhatsApp", "YouTube", "X (Twitter)", "Website & SEO", "Billing", "Team & Roles", "Settings", "Other"];

const PRIORITY_HELP: Record<TicketPriority, string> = {
  low: "A question or small annoyance. No rush.",
  normal: "Something is not working but you can carry on.",
  high: "Blocks important work.",
  urgent: "Everything is stopped or money is at risk.",
};

const DEFAULT_HOURS: Record<TicketPriority, number> = { urgent: 1, high: 4, normal: 8, low: 24 };

interface FormState {
  category: TicketCategory | "";
  priority: TicketPriority;
  subject: string;
  description: string;
  relatedModule: string;
  relatedUrl: string;
  clientId: string;
}

const EMPTY: FormState = { category: "", priority: "normal", subject: "", description: "", relatedModule: "", relatedUrl: "", clientId: "" };

export function NewTicketDialog({ open, onOpenChange, presetSubject }: { open: boolean; onOpenChange: (open: boolean) => void; presetSubject?: string }) {
  const router = useRouter();
  const { companyId } = useCompanyScope();
  const summary = useSupportSummary();
  const create = useCreateTicket();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [touched, setTouched] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Every time the dialog opens it starts from a clean form (reset while rendering, not in an effect).
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setForm({ ...EMPTY, subject: presetSubject ?? "" });
      setTouched(false);
      setServerError(null);
    }
  }

  const clients = useQuery({ queryKey: ["support", companyId, "clients"], enabled: open && Boolean(companyId), queryFn: () => clientsApi.list(companyId), staleTime: 60_000 });
  const hours = (priority: TicketPriority) => summary.data?.policy.find((p) => p.priority === priority)?.firstResponseHours ?? DEFAULT_HOURS[priority];

  const errors = {
    category: form.category ? null : "Choose what this is about.",
    subject: form.subject.trim().length >= 3 ? null : "Give it a short title (at least 3 characters).",
    description: form.description.trim().length >= 10 ? null : "Describe what happened (at least 10 characters).",
    relatedUrl: !form.relatedUrl.trim() || /^(\/[^\s]*|https:\/\/[^\s]+)$/.test(form.relatedUrl.trim()) ? null : "Use a page path like /admin/calendar or an https link.",
  };
  const valid = !Object.values(errors).some(Boolean);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async () => {
    setTouched(true);
    setServerError(null);
    if (!valid || !form.category) return;
    try {
      const ticket = await create.mutateAsync({
        subject: form.subject.trim(),
        description: form.description.trim(),
        category: form.category,
        priority: form.priority,
        ...(form.clientId ? { clientId: form.clientId } : {}),
        ...(form.relatedModule ? { relatedModule: form.relatedModule } : {}),
        ...(form.relatedUrl.trim() ? { relatedUrl: form.relatedUrl.trim() } : {}),
      });
      toast.success(`Ticket #${ticket.number} raised. We will reply within ${hours(form.priority)} hour${hours(form.priority) === 1 ? "" : "s"}.`);
      onOpenChange(false);
      router.push(`/admin/support/tickets/${ticket.number}`);
    } catch (error) {
      setServerError(errorReason(error) === "too_many_tickets" ? errorMessage(error) : errorMessage(error, "The ticket could not be raised. Nothing was sent; try again."));
    }
  };

  const showError = (key: keyof typeof errors) => (touched && errors[key] ? <p className="mt-1 text-[11px] font-semibold text-rose-600">{errors[key]}</p> : null);

  return (
    <Dialog open={open} onOpenChange={(next) => (create.isPending ? undefined : onOpenChange(next))}>
      <DialogContent className="max-h-[92vh] max-w-2xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-slate-200 px-5 py-4">
          <DialogTitle className="text-[15px] font-semibold text-slate-900">Raise a support ticket</DialogTitle>
          <DialogDescription className="text-xs font-medium text-slate-500">Tell us what is wrong. The more detail you give, the faster we can fix it.</DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(92vh-140px)] space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <span className="mb-1.5 block text-xs font-semibold text-slate-700">What is this about?</span>
            <div className="grid gap-1.5 sm:grid-cols-2" role="radiogroup" aria-label="Category">
              {TICKET_CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  role="radio"
                  aria-checked={form.category === category}
                  onClick={() => set("category", category)}
                  className={cn("rounded-sm border px-3 py-2 text-left transition", form.category === category ? "border-red-500 bg-red-50 ring-1 ring-red-500/30" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50")}
                >
                  <span className="block text-xs font-semibold text-slate-900">{CATEGORY_LABEL[category]}</span>
                  <span className="block text-[11px] font-medium text-slate-500">{CATEGORY_HINT[category]}</span>
                </button>
              ))}
            </div>
            {showError("category")}
          </div>

          <div>
            <label htmlFor="ticket-subject" className="mb-1.5 block text-xs font-semibold text-slate-700">
              Title
            </label>
            <input id="ticket-subject" value={form.subject} onChange={(event) => set("subject", event.target.value)} maxLength={160} placeholder="e.g. Scheduled Instagram post failed to publish" className={cn(field, touched && errors.subject && "border-rose-400")} />
            {showError("subject")}
          </div>

          <div>
            <label htmlFor="ticket-description" className="mb-1.5 block text-xs font-semibold text-slate-700">
              What happened?
            </label>
            <textarea id="ticket-description" value={form.description} onChange={(event) => set("description", event.target.value)} rows={5} maxLength={5000} placeholder="What were you trying to do, what did you expect and what happened instead? Include any error message." className={cn(textarea, touched && errors.description && "border-rose-400")} />
            <div className="flex justify-between">
              {showError("description") ?? <span />}
              <span className="mt-1 text-[11px] font-medium text-slate-400">{form.description.length}/5000</span>
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-semibold text-slate-700">How urgent is it?</span>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4" role="radiogroup" aria-label="Priority">
              {TICKET_PRIORITIES.map((priority) => (
                <button
                  key={priority}
                  type="button"
                  role="radio"
                  aria-checked={form.priority === priority}
                  onClick={() => set("priority", priority)}
                  className={cn("rounded-sm border px-3 py-2 text-left transition", form.priority === priority ? "border-red-500 bg-red-50 ring-1 ring-red-500/30" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50")}
                >
                  <span className="block text-xs font-semibold text-slate-900">{PRIORITY_LABEL[priority]}</span>
                  <span className="block text-[11px] font-medium text-slate-500">First reply in {hours(priority)}h</span>
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] font-medium text-slate-500">{PRIORITY_HELP[form.priority]}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="ticket-module" className="mb-1.5 block text-xs font-semibold text-slate-700">
                Where in the app? <span className="font-medium text-slate-400">(optional)</span>
              </label>
              <select id="ticket-module" value={form.relatedModule} onChange={(event) => set("relatedModule", event.target.value)} className={field}>
                <option value="">Not sure / not specific</option>
                {MODULES.map((module) => (
                  <option key={module} value={module}>
                    {module}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ticket-client" className="mb-1.5 block text-xs font-semibold text-slate-700">
                Which Client? <span className="font-medium text-slate-400">(optional)</span>
              </label>
              <select id="ticket-client" value={form.clientId} onChange={(event) => set("clientId", event.target.value)} className={field} disabled={clients.isLoading}>
                <option value="">All / not Client specific</option>
                {(clients.data ?? []).map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.displayName ?? client.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="ticket-url" className="mb-1.5 block text-xs font-semibold text-slate-700">
              Page where it happens <span className="font-medium text-slate-400">(optional)</span>
            </label>
            <input id="ticket-url" value={form.relatedUrl} onChange={(event) => set("relatedUrl", event.target.value)} placeholder="/admin/calendar" className={cn(field, touched && errors.relatedUrl && "border-rose-400")} />
            {showError("relatedUrl")}
          </div>

          {serverError && (
            <p className="rounded-sm border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800" role="alert">
              {serverError}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-200 bg-slate-50/70 px-5 py-3">
          <p className="text-[11px] font-medium text-slate-500">Your name and Company are sent with the ticket.</p>
          <div className="flex gap-2">
            <button type="button" className={btn} onClick={() => onOpenChange(false)} disabled={create.isPending}>
              Cancel
            </button>
            <button type="button" className={btnPrimary} onClick={() => void submit()} disabled={create.isPending}>
              {create.isPending && <Spinner />}
              {create.isPending ? "Raising…" : "Raise ticket"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
