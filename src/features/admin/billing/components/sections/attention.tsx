"use client";

import { AlertOctagon, AlertTriangle, BellRing, Info } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useBillingView } from "../../billing-data/hooks";
import type { AttentionItem, AttentionSeverity } from "../../billing-data/selectors";
import { useBillingActions } from "../use-billing-actions";
import { Badge, Button, Section, SectionHeader } from "../ui";
import { useBannerCovers } from "./header";

const SEVERITY: Record<AttentionSeverity, { label: string; tone: "red" | "amber" | "blue"; icon: typeof Info; box: string }> = {
  critical: { label: "Critical", tone: "red", icon: AlertOctagon, box: "bg-[#FEF1F2] text-[#C81E2B]" },
  warning: { label: "Warning", tone: "amber", icon: AlertTriangle, box: "bg-[#FFF7E8] text-[#B54708]" },
  info: { label: "Info", tone: "blue", icon: Info, box: "bg-[#EFF4FF] text-[#1D4ED8]" },
};

export function NeedsAttention() {
  const { attention } = useBillingView();
  const covers = useBannerCovers();
  const items = attention.filter((item) => !covers.includes(item.id));
  if (!items.length) return null;
  const counts = (["critical", "warning", "info"] as const).map((severity) => ({ severity, count: items.filter((item) => item.severity === severity).length }));

  return (
    <Section id="attention">
      <SectionHeader
        id="attention"
        icon={BellRing}
        title="Needs attention"
        description={`${items.length} item${items.length === 1 ? "" : "s"}, most urgent first`}
        actions={
          <div className="flex gap-1">
            {counts
              .filter((item) => item.count > 0)
              .map((item) => (
                <Badge key={item.severity} tone={SEVERITY[item.severity].tone}>
                  {item.count} {SEVERITY[item.severity].label.toLowerCase()}
                </Badge>
              ))}
          </div>
        }
      />
      <ul className="grid border-t border-[#EEF1F5] md:grid-cols-3">
        {items.map((item, index) => (
          <AttentionRow key={item.id} item={item} className={cn(index % 3 !== 2 && "md:border-r", index >= 3 && "md:border-t", index >= 1 && "max-md:border-t")} />
        ))}
      </ul>
    </Section>
  );
}

function AttentionRow({ item, className }: { item: AttentionItem; className?: string }) {
  const { runAttention, gateFor } = useBillingActions();
  const meta = SEVERITY[item.severity];
  const Icon = meta.icon;
  return (
    <li className={cn("flex min-w-0 items-start gap-3 border-[#EEF1F5] px-4 py-3", className)}>
      <span className={cn("mt-0.5 grid size-7 shrink-0 place-items-center rounded-sm", meta.box)}>
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-1.5 text-[12.5px] font-semibold text-[#0F1B3D]">
          {item.title}
          <Badge tone={meta.tone} className="h-[18px] px-1 text-[10px]">
            {meta.label}
          </Badge>
        </p>
        <p className="mt-0.5 text-[12px] leading-[18px] text-[#3C4A66]">{item.description}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Button size="xs" variant={item.severity === "info" ? "secondary" : "primary"} gate={gateFor(item.action)} onClick={() => runAttention(item.action)}>
            {item.action.label}
          </Button>
          {item.secondary && (
            <Button size="xs" variant="ghost" gate={gateFor(item.secondary)} onClick={() => item.secondary && runAttention(item.secondary)}>
              {item.secondary.label}
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}
