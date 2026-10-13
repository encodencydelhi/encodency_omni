"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import type { DealStage, Pipeline } from "../types";
import { BUILTIN_PIPELINE, DEAL_STAGES, DEAL_STAGE_LABELS } from "../lib/crm-records";

const OPEN_STAGES = DEAL_STAGES.filter((s) => s !== "won" && s !== "lost");

interface PipelineSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  /** The default pipeline (built-in, or the user's renamed version): shown first, editable, never deletable. */
  defaultPipeline: Pipeline;
  /** Other stored pipelines. */
  pipelines: Pipeline[];
  dealCounts: Record<string, number>;
  isSaving?: boolean;
  onSave: (pipeline: { id?: string; name: string; stages: DealStage[] }) => void | Promise<void>;
  onDelete: (pipeline: Pipeline) => void | Promise<void>;
}

interface Draft { id?: string; name: string; stages: DealStage[] }

export function PipelineSettingsDialog({ open, onClose, defaultPipeline, pipelines, dealCounts, isSaving = false, onSave, onDelete }: PipelineSettingsDialogProps) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const startNew = () => setDraft({ name: "", stages: ["new", "qualified", "proposal"] });
  const toggleStage = (stage: DealStage) =>
    setDraft((d) => (d ? { ...d, stages: d.stages.includes(stage) ? d.stages.filter((s) => s !== stage) : [...d.stages, stage] } : d));

  const duplicate = draft
    ? [defaultPipeline, ...pipelines].some((p) => p.id !== draft.id && p.name.trim().toLowerCase() === draft.name.trim().toLowerCase())
    : false;
  const canSave = !!draft && draft.name.trim().length > 0 && draft.stages.length > 0 && !duplicate;

  const save = async () => {
    if (!draft || !canSave) return;
    // Canonical order, regardless of the order the stages were toggled in.
    const ordered = OPEN_STAGES.filter((s) => draft.stages.includes(s));
    await onSave({ id: draft.id, name: draft.name.trim(), stages: ordered });
    setDraft(null);
  };

  const close = () => { setDraft(null); setConfirmId(null); onClose(); };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) close(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Pipeline Settings</DialogTitle>
          <DialogDescription>Create pipelines with the stages your team uses. Won and Lost are always included.</DialogDescription>
        </DialogHeader>

        {draft ? (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <Input value={draft.name} maxLength={60} placeholder="Pipeline name *" onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            {duplicate ? <p className="text-[12px] text-red-600">A pipeline with this name already exists.</p> : null}
            <div>
              <p className="mb-1.5 text-[12px] font-medium text-slate-600">Stages</p>
              <div className="flex flex-wrap gap-1.5">
                {OPEN_STAGES.map((stage) => {
                  const on = draft.stages.includes(stage);
                  return (
                    <button
                      key={stage} type="button" aria-pressed={on} onClick={() => toggleStage(stage)}
                      className={cn("rounded-full border px-3 py-1 text-[12px] font-medium transition-colors",
                        on ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}
                    >
                      {DEAL_STAGE_LABELS[stage]}
                    </button>
                  );
                })}
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[12px] font-medium text-emerald-700">Won</span>
                <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[12px] font-medium text-red-700">Lost</span>
              </div>
              {draft.stages.length === 0 ? <p className="mt-1.5 text-[12px] text-red-600">Pick at least one open stage.</p> : null}
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
              <Button size="sm" disabled={!canSave || isSaving} onClick={() => void save()}>{isSaving ? "Saving..." : draft.id ? "Save Changes" : "Create Pipeline"}</Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end">
            <Button size="sm" onClick={startNew}><Plus className="size-3.5" /> New Pipeline</Button>
          </div>
        )}

        <ul className="max-h-72 space-y-1.5 overflow-y-auto scrollbar-thin">
          {[defaultPipeline, ...pipelines].map((pipeline) => {
            const builtin = pipeline.id === BUILTIN_PIPELINE.id;
            const count = dealCounts[pipeline.id] ?? 0;
            return (
              <li key={pipeline.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-slate-800">{pipeline.name}{builtin ? <span className="ml-2 text-[11px] font-medium text-slate-400">Default</span> : null}</p>
                  <p className="truncate text-[12px] text-slate-500">{pipeline.stages.map((s) => DEAL_STAGE_LABELS[s]).join(" → ")} · {count} deal{count === 1 ? "" : "s"}</p>
                </div>
                {builtin ? (
                  <Button size="icon-sm" variant="ghost" aria-label={`Edit ${pipeline.name}`} onClick={() => setDraft({ id: pipeline.id, name: pipeline.name, stages: pipeline.stages.filter((s) => s !== "won" && s !== "lost") })}><Pencil className="size-4" /></Button>
                ) : confirmId === pipeline.id ? (
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => setConfirmId(null)}>Keep</Button>
                    <Button size="sm" variant="destructive" disabled={isSaving || count > 0} onClick={() => { void onDelete(pipeline); setConfirmId(null); }}>Delete</Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <Button size="icon-sm" variant="ghost" aria-label={`Edit ${pipeline.name}`} onClick={() => setDraft({ id: pipeline.id, name: pipeline.name, stages: pipeline.stages.filter((s) => s !== "won" && s !== "lost") })}><Pencil className="size-4" /></Button>
                    <Button size="icon-sm" variant="ghost" aria-label={`Delete ${pipeline.name}`} onClick={() => setConfirmId(pipeline.id)}><Trash2 className="size-4" /></Button>
                  </div>
                )}
                {confirmId === pipeline.id && count > 0 ? <p className="basis-full text-[12px] text-red-600">Move or delete its {count} deal{count === 1 ? "" : "s"} first.</p> : null}
              </li>
            );
          })}
        </ul>

        <DialogFooter><Button variant="outline" onClick={close}>Done</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
