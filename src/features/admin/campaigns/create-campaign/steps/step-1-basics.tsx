"use client";

import {
  ArrowDown,
  ArrowUp,
  Building2,
  Calendar,
  Check,
  CheckCircle,
  Clock,
  DollarSign,
  Eye,
  Globe,
  Heart,
  Leaf,
  Megaphone,
  Minus,
  Pencil,
  Play,
  RefreshCw,
  Shield,
  Smartphone,
  Target,
  UserRound,
  Users,
} from "lucide-react";
import RichTextEditor from "@/components/layout/rich-text-editor";
import type { CampaignDraft } from "../draft";
import { APPROVAL_WORKFLOW, CAMPAIGN_CATEGORIES, CAMPAIGN_MODES, CAMPAIGN_OBJECTIVES } from "../draft";
import { Field, SelectInput, Segmented, TagField, Textarea, TextInput } from "../ui";
import { cn } from "@/lib/utils/cn";

type Setter = <K extends keyof CampaignDraft>(key: K, value: CampaignDraft[K]) => void;

const OBJECTIVE_ICONS: Record<string, typeof Target> = {
  "Brand Awareness": Megaphone,
  "Website Traffic": Globe,
  Engagement: Heart,
  "Lead Generation": Users,
  "Sales / Conversions": DollarSign,
  "App Promotion": Smartphone,
  Donations: Heart,
  "Event Promotion": Calendar,
  "Community Engagement": Users,
  "Customer Retention": RefreshCw,
  "Re-engagement": Megaphone,
};

export function StepBasics({ draft, set }: { draft: CampaignDraft; set: Setter }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#DDE6F1] bg-white shadow-[0_1px_4px_rgb(15_23_42/0.05)]">
      <StepSection
        letter="A"
        title="Campaign Identity"
        caption="Define the core identity of your campaign. A clear name and objective help your team stay aligned."
      >
        <div className="grid gap-x-4 gap-y-3 md:grid-cols-2">
          <Field label="Campaign Name" required>
            <TextInput value={draft.name} onChange={(v) => set("name", v)} max={100} placeholder="e.g. Save Rivers, Save Lives 2025" />
          </Field>
          <Field label="Campaign ID" hint="Auto-generated unique identifier">
            <TextInput value={draft.campaignId} disabled />
          </Field>
        </div>

        <div className="mt-3">
          <Field label="Short Description" required>
            <RichTextEditor
              value={draft.description}
              onChange={(v) => set("description", v as any)}
              placeholder="Describe your campaign in detail..."
              minHeight="100px"
            />
          </Field>
        </div>
      </StepSection>

      <StepSection
        letter="B"
        title="Campaign Mode & Objective"
        caption="Choose how you want to run this campaign and what you want to achieve."
      >
        <Field label="Campaign Mode" required hint="Select how this campaign will run across channels.">
          <div className="grid grid-cols-3 gap-2">
            {CAMPAIGN_MODES.map((mode) => {
              const active = draft.campaignMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => set("campaignMode", mode)}
                  className={cn(
                    "relative flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors",
                    active
                      ? "border-[#E11D28] bg-[#FFF5F6] shadow-[0_0_0_1px_#E11D28]"
                      : "border-[#E6E8F0] bg-white hover:border-[#F5B5BA]",
                  )}
                >
                  <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", mode === "Organic" ? "bg-[#E4F8F0] text-[#0AA673]" : mode === "Paid" ? "bg-[#FFF3DC] text-[#D97706]" : "bg-[#F2EAFF] text-[#7C3AED]")}>
                    {mode === "Organic" ? <Leaf className="size-4.5" /> : mode === "Paid" ? <Megaphone className="size-4.5" /> : <Target className="size-4.5" />}
                  </span>
                  <span className="flex flex-1 flex-col">
                    <b className="text-[11.5px] font-bold text-[#111827]">{mode}</b>
                    <small className="text-[10px] leading-[14px] text-[#8791A4]">
                      {mode === "Organic" ? "Free reach through content" : mode === "Paid" ? "Paid advertising campaigns" : "Organic + Paid combined"}
                    </small>
                  </span>
                  <span className={cn(
                    "size-4 shrink-0 rounded-full border-2 flex items-center justify-center",
                    active ? "border-[#E11D28]" : "border-[#D1D5DB]"
                  )}>
                    {active && <span className="size-2 rounded-full bg-[#E11D28]" />}
                  </span>
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Campaign Objective" required hint="The primary goal determines how we optimize your campaign.">
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {CAMPAIGN_OBJECTIVES.map((obj) => {
              const active = draft.objective === obj;
              const Icon = OBJECTIVE_ICONS[obj] ?? Target;
              return (
                <button
                  key={obj}
                  type="button"
                  onClick={() => set("objective", obj)}
                  className={cn(
                    "relative flex items-center gap-2 rounded-lg border p-2.5 text-left transition-colors",
                    active
                      ? "border-[#E11D28] bg-[#FFF5F6]"
                      : "border-[#E6E8F0] bg-white hover:border-[#F5B5BA]",
                  )}
                >
                  {active && (
                    <span className="absolute right-1.5 top-1.5 grid size-3.5 place-items-center rounded-full bg-[#E11D28]">
                      <svg className="size-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  )}
                  <Icon className={cn("size-4 shrink-0", active ? "text-[#E11D28]" : "text-[#9CA3AF]")} />
                  <span className="min-w-0 truncate text-[10.5px] font-semibold text-[#374151]">{obj}</span>
                </button>
              );
            })}
          </div>
        </Field>

        <div className="mt-3 grid gap-x-4 gap-y-3 md:grid-cols-2">
          <Field label="Campaign Category" required>
            <SelectInput
              icon={Megaphone}
              value={draft.category}
              onChange={(v) => set("category", v)}
              options={[...CAMPAIGN_CATEGORIES]}
            />
          </Field>
          <Field label="Priority" required>
            <Segmented
              value={draft.priority}
              onChange={(v) => set("priority", v)}
              options={[
                { id: "Low", label: "Low", icon: ArrowDown },
                { id: "Medium", label: "Medium", icon: Minus },
                { id: "High", label: "High", icon: ArrowUp },
              ]}
            />
          </Field>
        </div>
      </StepSection>

      <StepSection
        letter="C"
        title="Team & Ownership"
        caption="Assign the right people to manage, contribute to and approve this campaign."
      >
        <div className="grid gap-x-4 gap-y-3 md:grid-cols-2">
          <Field label="Project / Client" required>
            <SelectInput
              icon={Building2}
              value={draft.client}
              onChange={(v) => set("client", v)}
              options={["Moksha Sewa", "Namo Gange Trust", "Ganga Explorer"]}
            />
          </Field>
          <Field label="Campaign Owner" required>
            <SelectInput
              icon={UserRound}
              value={draft.owner}
              onChange={(v) => set("owner", v)}
              options={["Manish Sirohi", "Priya Kapoor", "Amit Reddy"]}
            />
          </Field>
          <Field label="Contributors" optional hint="Team members who will work on this campaign.">
            <TagField
              tags={draft.contributors}
              onChange={(v) => set("contributors", v)}
              icon={Users}
              addLabel="Add contributor"
            />
          </Field>
          <Field label="Approvers" optional hint="People who need to approve before launch.">
            <TagField
              tags={draft.approvers}
              onChange={(v) => set("approvers", v)}
              icon={Shield}
              addLabel="Add approver"
            />
          </Field>
        </div>
      </StepSection>

      <StepSection
        letter="D"
        title="Internal Notes & Tags"
        caption="Add context for your team and organize with tags."
      >
        <div className="space-y-3">
          <Field label="Internal Notes" optional>
            <Textarea
              value={draft.internalNotes}
              onChange={(v) => set("internalNotes", v)}
              rows={3}
              placeholder="Add internal notes for your team..."
            />
          </Field>
          <Field label="Tags" optional>
            <TagField
              tags={draft.tags}
              onChange={(v) => set("tags", v)}
              addLabel="Add tag"
              renderIcon={(tag) => {
                const meta: Record<string, { icon: typeof Leaf; className: string }> = {
                  Environment: { icon: Leaf, className: "text-[#0AA673]" },
                  Awareness: { icon: Megaphone, className: "text-[#E11D28]" },
                  Social: { icon: Users, className: "text-[#1975E7]" },
                  CSR: { icon: Heart, className: "text-[#E11D28]" },
                };
                const m = meta[tag];
                if (!m) return null;
                const Ic = m.icon;
                return <Ic className={`size-3 ${m.className}`} />;
              }}
            />
          </Field>
        </div>
      </StepSection>

      <StepSection
        letter="E"
        title="Approval Workflow"
        caption="Preview the approval pipeline for this campaign."
      >
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {APPROVAL_WORKFLOW.map((item, index) => (
            <div key={item.step} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <span
                  className={cn(
                    "grid size-8 place-items-center rounded-full text-[10px] font-bold text-white",
                    index === 0 ? "ring-2 ring-offset-1" : "",
                  )}
                  style={{ backgroundColor: item.color, ...(index === 0 ? { ringColor: item.color } : {}) }}
                >
                  {item.icon === "pencil" && <Pencil className="size-3.5" />}
                  {item.icon === "eye" && <Eye className="size-3.5" />}
                  {item.icon === "check" && <Check className="size-3.5" />}
                  {item.icon === "clock" && <Clock className="size-3.5" />}
                  {item.icon === "play" && <Play className="size-3.5" />}
                  {item.icon === "checkcircle" && <CheckCircle className="size-3.5" />}
                </span>
                <span className="text-[9px] font-semibold text-[#374151]">{item.step}</span>
              </div>
              {index < APPROVAL_WORKFLOW.length - 1 && (
                <i className="mx-1.5 mt-[-14px] h-[2px] w-6 shrink-0 rounded-full bg-[#E2E8F0]" />
              )}
            </div>
          ))}
        </div>
      </StepSection>
    </div>
  );
}

function StepSection({
  letter,
  title,
  caption,
  children,
}: {
  letter: string;
  title: string;
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-[#E7EDF5] p-3.5 last:border-b-0">
      <div className="mb-3 flex items-start gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#FFE6EA] text-[16px] font-black text-[#EB0711]">
          {letter}
        </span>
        <div className="min-w-0 flex-1">
          <b className="block text-[16px] font-bold leading-5 text-[#101A3D]">{title}</b>
          <small className="block text-[11px] leading-4 text-[#526385]">{caption}</small>
        </div>
      </div>
      {children}
    </section>
  );
}
