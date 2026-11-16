"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { errorMessage } from "@/features/support/hooks";
import { btn, btnPrimary, field, Spinner, textarea } from "@/features/support/ui";
import { assistantApi } from "./api";
import type { ActionState, AssistantAction } from "./types";

type ConfirmAction = Extract<AssistantAction, { type: "confirm_action" }>;

const cardShell = "mt-2 rounded-sm border border-slate-200 bg-white p-3 text-slate-800 shadow-sm";
const PRIORITY_CHOICES = ["low", "medium", "high"] as const;

interface Props {
  action: ConfirmAction;
  companyId: string | undefined;
  state?: ActionState;
  onDone: (done: { message: string; href: string | null }) => void;
  onDismiss: () => void;
  onNavigate: () => void;
}

/**
 * The assistant only PREPARES a change. Nothing is done until the person presses Confirm here; the server then re-checks
 * their rights and runs the product's own feature as them. The card shows exactly what will happen.
 */
export function ConfirmActionCard({ action, companyId, state, onDone, onDismiss, onNavigate }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(action.draft?.title ?? "");
  const [description, setDescription] = useState(action.draft?.description ?? "");
  const [dueDate, setDueDate] = useState(action.draft?.dueDate ?? "");
  const [priority, setPriority] = useState(action.draft?.priority ?? "medium");
  const [workflowId, setWorkflowId] = useState("");

  if (state?.done) {
    return (
      <div className={`${cardShell} flex items-center gap-3 border-emerald-200 bg-emerald-50/60`}>
        <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
        <p className="min-w-0 flex-1 text-xs font-semibold text-emerald-900">{state.done.message}</p>
        {state.done.href && (
          <Link href={state.done.href} onClick={onNavigate} className={btn}>
            Open
          </Link>
        )}
      </div>
    );
  }
  if (state?.dismissed) return <div className={`${cardShell} text-xs font-medium text-slate-500`}>Nothing was changed.</div>;

  const needsWorkflow = action.kind === "pause_workflow";
  const valid = action.kind === "create_crm_task" ? title.trim().length >= 3 && /^\d{4}-\d{2}-\d{2}$/.test(dueDate) : needsWorkflow ? workflowId !== "" : true;

  const confirm = async () => {
    if (!companyId) return;
    setError(null);
    setBusy(true);
    try {
      const body = action.kind === "create_crm_task" ? { title: title.trim(), description: description.trim(), dueDate, priority } : needsWorkflow ? { workflowId } : {};
      const result = await assistantApi.confirmAction(companyId, action.proposalId, body);
      toast.success(result.message);
      onDone({ message: result.message, href: result.href });
    } catch (failure) {
      setError(errorMessage(failure, "That could not be done. Nothing was changed; you can try again or ask me again."));
    } finally {
      setBusy(false);
    }
  };
  const dismiss = () => {
    if (companyId) void assistantApi.cancelAction(companyId, action.proposalId).catch(() => undefined);
    onDismiss();
  };

  return (
    <div className={cardShell}>
      <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        <ShieldCheck className="size-3.5 text-red-600" />
        {action.title} · Review, Then Confirm
      </div>
      <p className="text-xs font-medium leading-relaxed text-slate-700">{action.summary}</p>

      {action.kind === "create_crm_task" && (
        <div className="mt-2 space-y-2">
          <label className="block text-[11px] font-semibold text-slate-600">
            Task
            <input dir="auto" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} className={`${field} mt-1`} />
          </label>
          <label className="block text-[11px] font-semibold text-slate-600">
            Details (Optional)
            <textarea dir="auto" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} rows={2} className={`${textarea} mt-1`} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-[11px] font-semibold text-slate-600">
              Due Date
              <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className={`${field} mt-1`} />
            </label>
            <label className="block text-[11px] font-semibold text-slate-600">
              Priority
              <select value={priority} onChange={(event) => setPriority(event.target.value)} className={`${field} mt-1`}>
                {PRIORITY_CHOICES.map((value) => (
                  <option key={value} value={value}>
                    {value.charAt(0).toUpperCase() + value.slice(1)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      )}

      {needsWorkflow && (
        <label className="mt-2 block text-[11px] font-semibold text-slate-600">
          Workflow To Pause
          <select value={workflowId} onChange={(event) => setWorkflowId(event.target.value)} className={`${field} mt-1`}>
            <option value="">Choose a workflow…</option>
            {action.options?.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {error && (
        <p role="alert" className="mt-2 text-[11px] font-semibold text-rose-600">
          {error}
        </p>
      )}
      <div className="mt-3 flex items-center justify-end gap-2">
        <button type="button" className={btn} onClick={dismiss} disabled={busy}>
          Not Now
        </button>
        <button type="button" className={btnPrimary} onClick={() => void confirm()} disabled={!valid || busy}>
          {busy ? <Spinner className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
          Confirm
        </button>
      </div>
    </div>
  );
}
