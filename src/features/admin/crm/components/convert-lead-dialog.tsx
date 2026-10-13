"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DealStage, Lead, Pipeline } from "../types";
import { DEAL_STAGE_LABELS } from "../lib/crm-records";

export interface ConvertLeadValues {
  createDeal: boolean;
  dealName: string;
  dealValue: number;
  pipelineId: string;
  stage: DealStage;
}

interface ConvertLeadDialogProps {
  open: boolean;
  onClose: () => void;
  lead: Lead | null;
  pipelines: Pipeline[];
  /** A contact with the lead's email already exists: it is linked instead of duplicated. */
  existingContactName?: string;
  isSaving?: boolean;
  onConfirm: (values: ConvertLeadValues) => void | Promise<void>;
}

/** Mount with a changing `key` so each open starts from the lead's values. */
export function ConvertLeadDialog({ open, onClose, lead, pipelines, existingContactName, isSaving = false, onConfirm }: ConvertLeadDialogProps) {
  const [createDeal, setCreateDeal] = useState(true);
  const [dealName, setDealName] = useState(lead ? `${lead.company || `${lead.firstName} ${lead.lastName}`.trim()} deal` : "");
  const [dealValue, setDealValue] = useState(lead ? String(lead.estimatedDealValue || "") : "");
  const [pipelineId, setPipelineId] = useState(pipelines[0]?.id ?? "");

  const pipeline = pipelines.find((p) => p.id === pipelineId) ?? pipelines[0];
  const stage = (pipeline?.stages[0] ?? "new") as DealStage;
  const value = Number(dealValue || 0);
  const invalid = createDeal && (!dealName.trim() || !Number.isFinite(value) || value < 0);

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Convert Lead</DialogTitle>
          <DialogDescription>
            {existingContactName
              ? `${existingContactName} already exists as a contact — the lead will be linked to it.`
              : `A contact will be created from ${lead ? `${lead.firstName} ${lead.lastName}`.trim() : "this lead"}.`}
          </DialogDescription>
        </DialogHeader>

        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5">
          <Checkbox checked={createDeal} onCheckedChange={(v) => setCreateDeal(v === true)} />
          <span className="text-[13px] font-medium text-slate-800">Also create a deal in the pipeline</span>
        </label>

        {createDeal ? (
          <div className="space-y-3">
            <Input value={dealName} onChange={(e) => setDealName(e.target.value)} placeholder="Deal name *" />
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1 text-[12px] font-medium text-slate-600">Value (₹)
                <Input type="number" min="0" value={dealValue} onChange={(e) => setDealValue(e.target.value)} />
              </label>
              <label className="block space-y-1 text-[12px] font-medium text-slate-600">Pipeline
                <Select value={pipelineId} onValueChange={setPipelineId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{pipelines.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </label>
            </div>
            <p className="text-[12px] text-slate-500">The deal starts in <span className="font-medium">{DEAL_STAGE_LABELS[stage]}</span>.</p>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={invalid || isSaving}
            onClick={() => void onConfirm({ createDeal, dealName: dealName.trim(), dealValue: value, pipelineId: pipeline?.id ?? "", stage })}
          >
            {isSaving ? "Converting..." : "Convert"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
