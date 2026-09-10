"use client";

import { Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils/cn";
import type { Company } from "@/types/domain/company";
import { PLAN_TIER, type PlanTier } from "@/types/domain/plan";
import { useChangeCompanyPlan } from "../hooks/use-companies";

const PLAN_TIERS = Object.keys(PLAN_TIER) as PlanTier[];

interface ChangePlanDialogProps {
  company: Company | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Plan changes carry billing consequences, so the effective date is an
 * explicit choice rather than an assumption, and the reason is captured for
 * the audit trail.
 */
export function ChangePlanDialog({ company, onOpenChange }: ChangePlanDialogProps) {
  const changePlan = useChangeCompanyPlan();

  const [planTier, setPlanTier] = useState<PlanTier>("starter");
  const [effective, setEffective] = useState<"immediately" | "next_cycle">("next_cycle");
  const [note, setNote] = useState("");

  // Reset the form whenever a different company is selected.
  useEffect(() => {
    if (!company) return;
    setPlanTier(company.planTier);
    setEffective("next_cycle");
    setNote("");
  }, [company]);

  const isUnchanged = company?.planTier === planTier;

  const submit = () => {
    if (!company) return;
    changePlan.mutate(
      { companyId: company.id, planTier, effective, note: note.trim() || undefined },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={company !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change subscription plan</DialogTitle>
          <DialogDescription>
            {company ? `Move ${company.name} to a different plan tier.` : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="plan-tier">Plan</Label>
            <Select value={planTier} onValueChange={(value) => setPlanTier(value as PlanTier)}>
              <SelectTrigger id="plan-tier">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLAN_TIERS.map((tier) => (
                  <SelectItem key={tier} value={tier}>
                    {PLAN_TIER[tier].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium text-foreground">Effective</legend>
            <RadioGroup
              value={effective}
              onValueChange={(value) => setEffective(value as typeof effective)}
            >
              {(
                [
                  { value: "next_cycle", label: "At the next renewal", hint: "No proration applied" },
                  { value: "immediately", label: "Immediately", hint: "Prorates the current period" },
                ] as const
              ).map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 transition-colors",
                    effective === option.value
                      ? "border-primary/40 bg-primary-subtle"
                      : "border-border hover:bg-accent",
                  )}
                >
                  <RadioGroupItem value={option.value} className="mt-0.5" />
                  <span>
                    <span className="block text-[0.8125rem] font-medium text-foreground">
                      {option.label}
                    </span>
                    <span className="block text-2xs text-muted-foreground">{option.hint}</span>
                  </span>
                </label>
              ))}
            </RadioGroup>
          </fieldset>

          <div className="space-y-1.5">
            <Label htmlFor="plan-note">Reason (optional)</Label>
            <Textarea
              id="plan-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Recorded in the audit log alongside this change."
              className="min-h-16"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={changePlan.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={changePlan.isPending || isUnchanged}>
            {changePlan.isPending ? <Loader2Icon className="animate-spin" /> : null}
            {isUnchanged ? "Select a different plan" : "Change plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
