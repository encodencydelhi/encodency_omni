"use client";

import { useState } from "react";
import { CheckSquare2, Copy, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { crmApi, type CrmAiInsight, type CrmAiKind, type CrmScope } from "../data/crm-api";

interface CrmAiInsightsProps {
  kind: CrmAiKind;
  recordId: string;
  label: string;
  scope: CrmScope | null;
}

export function CrmAiInsights({ kind, recordId, label, scope }: CrmAiInsightsProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState<CrmAiInsight | null>(null);
  const [creatingTask, setCreatingTask] = useState(false);

  const analyze = async () => {
    if (!scope || loading) return;
    setOpen(true);
    setLoading(true);
    try {
      const result = await crmApi.aiInsight(kind, recordId, scope);
      setInsight(result.insight);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI analysis could not be generated.");
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const createSuggestedTask = async () => {
    if (!scope || !insight?.suggestedTaskTitle || creatingTask) return;
    setCreatingTask(true);
    const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const relation = kind === "lead" ? { relatedLeadId: recordId, relatedLeadName: label } : kind === "contact" ? { relatedContactId: recordId, relatedContactName: label } : kind === "deal" ? { relatedDealId: recordId, relatedDealName: label } : {};
    try {
      await crmApi.create("task", { title: insight.suggestedTaskTitle, description: `AI suggested next step: ${insight.nextBestAction || insight.summary}`, type: "follow_up", priority: "medium", status: "pending", dueDate, reminder: "none", tags: ["ai-suggested"], ...relation }, scope);
      toast.success("Suggested task created. Review ownership and due time in Tasks.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Suggested task could not be created.");
    } finally {
      setCreatingTask(false);
    }
  };

  const copyDraft = async (value: string, name: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(`${name} copied for review.`);
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => void analyze()} disabled={!scope || loading}>
        <Sparkles className="size-3.5 text-violet-600" /> AI Insights
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Sparkles className="size-4 text-violet-600" /> AI Insights</DialogTitle>
            <DialogDescription>Read-only analysis for {label}. Review recommendations before taking action.</DialogDescription>
          </DialogHeader>
          {loading ? (
            <div className="py-8 text-center text-sm text-slate-500">Analyzing CRM context...</div>
          ) : insight ? (
            <div className="space-y-3 text-sm">
              {typeof insight.score === "number" ? <div className="rounded-lg border border-violet-200 bg-violet-50 p-3"><span className="font-semibold">Lead score: {insight.score}/100</span>{insight.classification ? <span className="ml-2 capitalize text-violet-700">{insight.classification}</span> : null}{insight.scoreReason ? <p className="mt-1 text-xs text-slate-600">{insight.scoreReason}</p> : null}</div> : null}
              <InsightBlock title="Summary" text={insight.summary} />
              {insight.risks?.length ? <div><p className="mb-1 font-semibold text-slate-800">Risks</p><ul className="space-y-1 text-slate-600">{insight.risks.map((risk) => <li key={risk}>• {risk}</li>)}</ul></div> : null}
              <InsightBlock title="Next best action" text={insight.nextBestAction} />
              <InsightBlock title="Suggested task" text={insight.suggestedTaskTitle} />
              {insight.suggestedTaskTitle ? <Button size="sm" onClick={() => void createSuggestedTask()} disabled={creatingTask}><CheckSquare2 className="size-3.5" /> {creatingTask ? "Creating..." : "Create suggested task"}</Button> : null}
              {insight.emailDraft ? <DraftBlock title="Email draft" text={insight.emailDraft} onCopy={() => void copyDraft(insight.emailDraft!, "Email draft")} /> : null}
              {insight.whatsappDraft ? <DraftBlock title="WhatsApp draft" text={insight.whatsappDraft} onCopy={() => void copyDraft(insight.whatsappDraft!, "WhatsApp draft")} /> : null}
              <p className="text-[11px] text-amber-700">AI can be inaccurate. Drafts are never sent automatically; review before using them.</p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function DraftBlock({ title, text, onCopy }: { title: string; text: string; onCopy: () => void }) {
  return <div className="rounded-lg border bg-slate-50 p-3"><div className="mb-1 flex items-center justify-between"><p className="font-semibold text-slate-800">{title}</p><Button size="sm" variant="ghost" onClick={onCopy}><Copy className="size-3.5" /> Copy</Button></div><p className="whitespace-pre-wrap text-slate-600">{text}</p></div>;
}

function InsightBlock({ title, text }: { title: string; text?: string }) {
  if (!text) return null;
  return <div><p className="mb-1 font-semibold text-slate-800">{title}</p><p className="text-slate-600">{text}</p></div>;
}
