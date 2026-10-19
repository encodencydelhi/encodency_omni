"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
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
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function InsightBlock({ title, text }: { title: string; text?: string }) {
  if (!text) return null;
  return <div><p className="mb-1 font-semibold text-slate-800">{title}</p><p className="text-slate-600">{text}</p></div>;
}
