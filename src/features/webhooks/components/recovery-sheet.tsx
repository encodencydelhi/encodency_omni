/**
 * EnCodency OmniPlatform - Super Admin Webhooks Module
 * Recovery review drawer for retry, redelivery and incoming reprocess requests.
 *
 * Frontend-only: submitting creates a clearly labelled demo request. It never adds a delivery attempt,
 * never changes the target's history and never claims a backend accepted or executed anything.
 */

"use client";

import { AlertTriangleIcon, CheckCircle2Icon, InfoIcon, XCircleIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DefinitionList } from "@/components/shared/definition-list";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils/cn";
import { ATTEMPT_RESULT, FAILURE_CLASS, NOT_LIVE_NOTICE, RECOVERY_KIND, VERIFICATION_STATE } from "../data/config";
import { useWebhookMutation } from "../data/hooks";
import { webhooksRepository } from "../data/repository";
import { attemptsFor, evaluateDeliveryRecovery, evaluateIncomingReprocess, type EligibilityAssessment, type FactorStatus } from "../data/selectors";
import type { RecoveryKind, WebhookDirection } from "../data/types";
import { Chip, DirectionBadge, Notice, State, Timestamp } from "./kit";
import { useWebhookData } from "./webhooks-context";

const FACTOR_ICON: Record<FactorStatus, { icon: typeof InfoIcon; className: string }> = {
  pass: { icon: CheckCircle2Icon, className: "text-success" },
  warn: { icon: AlertTriangleIcon, className: "text-warning" },
  block: { icon: XCircleIcon, className: "text-danger" },
  info: { icon: InfoIcon, className: "text-muted-foreground" },
};

export function EligibilityBadge({ level }: { level: EligibilityAssessment["level"] }) {
  if (level === "eligible") return <Chip tone="success">No blocking factors</Chip>;
  if (level === "review_required") return <Chip tone="warning">Review required</Chip>;
  return <Chip tone="danger">Not eligible</Chip>;
}

export function EligibilityFactors({ assessment }: { assessment: EligibilityAssessment }) {
  return (
    <ul className="divide-y divide-border rounded-sm border border-border">
      {assessment.factors.map((factor) => {
        const { icon: Icon, className } = FACTOR_ICON[factor.status];
        return (
          <li key={factor.id} className="flex gap-2.5 px-3 py-2.5">
            <Icon className={cn("mt-0.5 size-4 shrink-0", className)} aria-label={factor.status} />
            <div className="min-w-0">
              <p className="text-[0.8125rem] font-medium text-foreground">{factor.label}</p>
              <p className="text-2xs leading-relaxed text-muted-foreground">{factor.detail}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function RecoverySheet({
  open,
  onOpenChange,
  direction,
  targetId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  direction: WebhookDirection;
  targetId: string | null;
}) {
  const { snapshot, environment } = useWebhookData();
  const [kind, setKind] = useState<RecoveryKind | null>(null);
  const [reason, setReason] = useState("");
  const [ack, setAck] = useState(false);
  const [touched, setTouched] = useState(false);

  const create = useWebhookMutation(environment, (input: Parameters<typeof webhooksRepository.createRecoveryRequest>[1]) =>
    webhooksRepository.createRecoveryRequest(environment, input),
  );

  const context = useMemo(() => {
    if (!targetId) return null;
    if (direction === "outgoing") {
      const delivery = snapshot.deliveries.find((item) => item.id === targetId);
      if (!delivery) return null;
      const endpoint = snapshot.endpoints.find((item) => item.id === delivery.endpointId);
      const attempts = attemptsFor(snapshot, delivery.id);
      const assessment = evaluateDeliveryRecovery({
        delivery, endpoint, attempts,
        eventType: snapshot.eventTypes.find((item) => item.key === delivery.eventKey),
        siblingDeliveries: snapshot.deliveries.filter((item) => item.eventId === delivery.eventId && item.endpointId === delivery.endpointId),
      });
      return { kind: "outgoing" as const, delivery, endpoint, attempts, assessment };
    }
    const event = snapshot.incomingEvents.find((item) => item.id === targetId);
    if (!event) return null;
    const source = snapshot.sources.find((item) => item.id === event.sourceId);
    return { kind: "incoming" as const, event, source, assessment: evaluateIncomingReprocess(event, source) };
  }, [snapshot, targetId, direction]);

  const reset = () => { setKind(null); setReason(""); setAck(false); setTouched(false); };
  const close = (next: boolean) => { if (!next) reset(); onOpenChange(next); };

  if (!context) {
    return (
      <Sheet open={open} onOpenChange={close}>
        <SheetContent className="max-w-xl"><SheetHeader><SheetTitle>Recovery review</SheetTitle><SheetDescription>The selected record is not available in this environment.</SheetDescription></SheetHeader></SheetContent>
      </Sheet>
    );
  }

  const { assessment } = context;
  const allowedKinds: RecoveryKind[] = context.kind === "outgoing" ? ["retry", "redelivery"] : ["reprocess"];
  const chosen: RecoveryKind = kind ?? assessment.suggestedKind ?? allowedKinds[0]!;
  const notEligible = assessment.level === "not_eligible";
  const needsAck = assessment.duplicateRisk !== "none";
  const reasonError = touched && !reason.trim() ? "A reason is required." : null;
  const ackError = touched && needsAck && !ack ? "Acknowledge the duplicate side-effect risk to continue." : null;

  const submit = async (send: boolean) => {
    setTouched(true);
    if (!reason.trim() || (needsAck && !ack) || notEligible) return;
    try {
      await create.mutateAsync({ direction, kind: chosen, targetId: targetId!, reason, duplicateRiskAcknowledged: ack, submit: send });
      toast.success(send ? "Demo recovery request submitted for review" : "Recovery draft saved", { description: `${NOT_LIVE_NOTICE} The ${context.kind === "outgoing" ? "delivery" : "event"} history is unchanged.` });
      close(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The request could not be saved.");
    }
  };

  const items =
    context.kind === "outgoing"
      ? [
        { label: "Direction", value: <DirectionBadge direction="outgoing" /> },
        { label: "Delivery ID", value: <span className="font-mono text-2xs">{context.delivery.id}</span> },
        { label: "Endpoint", value: context.endpoint?.name ?? context.delivery.endpointId },
        { label: "Company / Scope", value: context.delivery.companyName ?? "Platform" },
        { label: "Previous attempts", value: `${context.delivery.attemptsUsed} of ${context.delivery.maxAttempts} used` },
        { label: "Latest failure", value: context.delivery.latestFailureClass ? FAILURE_CLASS[context.delivery.latestFailureClass].label : "None recorded" },
        { label: "Idempotency reference", value: <span className="font-mono text-2xs">{context.delivery.idempotencyRef}</span> },
        { label: "Endpoint dependency state", value: context.endpoint ? `${context.endpoint.state} (${context.endpoint.security.urlValidationState.replaceAll("_", " ")})` : "Missing" },
      ]
      : [
        { label: "Direction", value: <DirectionBadge direction="incoming" /> },
        { label: "Incoming event ID", value: <span className="font-mono text-2xs">{context.event.id}</span> },
        { label: "Provider / Source", value: context.event.providerName },
        { label: "Company / Scope", value: context.event.companyName ?? "Not mapped" },
        { label: "Original authenticity", value: <State registry={VERIFICATION_STATE} status={context.event.verification.state} /> },
        { label: "Latest failure", value: context.event.processing.errorSummary ?? "None recorded" },
        { label: "Provider event reference", value: <span className="font-mono text-2xs">{context.event.providerEventRef}</span> },
        { label: "Source dependency state", value: context.source ? `${context.source.configurationState}, receiver ${context.source.receiverStatus.replaceAll("_", " ")}` : "Missing" },
      ];

  return (
    <Sheet open={open} onOpenChange={close}>
      <SheetContent className="max-w-xl sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Recovery Review</SheetTitle>
          <SheetDescription>{context.kind === "outgoing" ? "Retry or redelivery of an outgoing event" : "Reprocess a received incoming event"}. Frontend demo request only.</SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-4">
          <Notice tone="warning" title="Nothing is sent or executed here">
            {NOT_LIVE_NOTICE} A successful attempt is never added to the history by this form.
          </Notice>

          <DefinitionList items={items} columns={2} />

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">Current eligibility</p>
              <EligibilityBadge level={assessment.level} />
            </div>
            <p className="text-[0.8125rem] text-muted-foreground">{assessment.summary}</p>
            <EligibilityFactors assessment={assessment} />
          </div>

          {context.kind === "outgoing" && context.attempts.length ? (
            <div className="space-y-1.5">
              <p className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">Previous attempts</p>
              <ul className="divide-y divide-border rounded-sm border border-border">
                {context.attempts.map((attempt) => (
                  <li key={attempt.id} className="flex items-center justify-between gap-2 px-3 py-2 text-[0.8125rem]">
                    <span>Attempt {attempt.number}</span>
                    {attempt.result ? <State registry={ATTEMPT_RESULT} status={attempt.result} /> : <Chip tone="info">In flight</Chip>}
                    <Timestamp iso={attempt.startedAt} relative={false} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {assessment.duplicateRisk !== "none" ? (
            <Notice tone="danger" title="Potential duplicate side effects">
              {assessment.duplicateRisk === "high"
                ? "The endpoint already accepted this event. A further delivery can repeat downstream actions."
                : "The recipient may already have processed the event. Blind redelivery can duplicate side effects. Recipients should deduplicate on the idempotency reference."}
            </Notice>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="recovery-kind">Proposed recovery action</Label>
            <Select value={chosen} onValueChange={(value) => setKind(value as RecoveryKind)}>
              <SelectTrigger id="recovery-kind" disabled={notEligible}><SelectValue /></SelectTrigger>
              <SelectContent>
                {allowedKinds.map((item) => (<SelectItem key={item} value={item}>{RECOVERY_KIND[item].label}</SelectItem>))}
              </SelectContent>
            </Select>
            <p className="text-2xs text-muted-foreground">{RECOVERY_KIND[chosen].definition}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="recovery-reason">Reason *</Label>
            <Textarea id="recovery-reason" value={reason} onChange={(event) => setReason(event.target.value)} rows={3} placeholder="Why is recovery appropriate? Reference the resolved dependency or confirmation." aria-invalid={Boolean(reasonError)} disabled={notEligible} />
            {reasonError ? <p className="text-2xs text-danger">{reasonError}</p> : null}
          </div>

          {needsAck ? (
            <div className="flex items-start gap-2">
              <Checkbox id="recovery-ack" checked={ack} onCheckedChange={(value) => setAck(value === true)} disabled={notEligible} />
              <Label htmlFor="recovery-ack" className="text-[0.8125rem] font-normal leading-snug">I understand this may cause duplicate downstream side effects.</Label>
            </div>
          ) : null}
          {ackError ? <p className="text-2xs text-danger">{ackError}</p> : null}

          <p className="text-2xs text-muted-foreground">Required permission: Super Admin webhook recovery capability. Approval: a reviewer must approve. The frontend cannot approve or execute requests.</p>
        </SheetBody>
        <SheetFooter>
          <Button variant="ghost" onClick={() => close(false)}>Cancel</Button>
          <Button variant="outline" disabled={notEligible || create.isPending} onClick={() => void submit(false)}>Save Recovery Draft</Button>
          <Button disabled={notEligible || create.isPending} onClick={() => void submit(true)}>Submit Demo Recovery Request</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
