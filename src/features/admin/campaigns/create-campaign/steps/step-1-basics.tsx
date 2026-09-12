"use client";

import { Building2, Flag, Heart, Leaf, Megaphone, Target, UserRound, Users } from "lucide-react";
import type { CampaignDraft } from "../draft";
import RichTextEditor from "@/components/layout/rich-text-editor";
import { Field, Section, SelectInput, TagField, Textarea, TextInput } from "../ui";

type Setter = <K extends keyof CampaignDraft>(key: K, value: CampaignDraft[K]) => void;

const TAG_ICON: Record<string, { icon: typeof Leaf; className: string }> = {
  Environment: { icon: Leaf, className: "text-[#0AA673]" },
  Awareness: { icon: Megaphone, className: "text-[#E11D28]" },
  Social: { icon: Users, className: "text-[#1975E7]" },
  CSR: { icon: Heart, className: "text-[#E11D28]" },
};

export function StepBasics({ draft, set }: { draft: CampaignDraft; set: Setter }) {
  return (
    <Section
      letter="A"
      title="Campaign Basics"
      caption="Tell us about your campaign. All fields marked with * are required."
    >
      <div className="grid gap-x-4 gap-y-3 md:grid-cols-2">
        <Field label="Campaign Name" required>
          <TextInput value={draft.name} onChange={(v) => set("name", v)} max={100} />
        </Field>
        <Field label="Campaign Type" required>
          <SelectInput
            icon={Megaphone}
            value={draft.type}
            onChange={(v) => set("type", v)}
            options={["Awareness", "Conversion", "Engagement", "Traffic", "Fundraising"]}
          />
        </Field>
      </div>

      <div className="mt-3 grid gap-x-4 gap-y-3 md:grid-cols-3">
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
        <Field label="Priority" required>
          <SelectInput
            icon={Flag}
            iconClass="text-[#E11D28]"
            value={draft.priority}
            onChange={(v) => set("priority", v)}
            options={["High", "Medium", "Low"]}
            tone="danger"
          />
        </Field>
      </div>

      <div className="mt-3 space-y-3">
        <Field label="Short Description" required>
          <RichTextEditor
            value={draft.description}
            onChange={(v) => set("description", v as any)}
            placeholder="Describe your campaign..."
            minHeight="100px"
          />
        </Field>

        <Field label="Internal Notes">
          <Textarea value={draft.internalNotes} onChange={(v) => set("internalNotes", v)} rows={3} />
        </Field>

        <Field label="Tags">
          <TagField
            tags={draft.tags}
            onChange={(v) => set("tags", v)}
            addLabel="Add tag"
            renderIcon={(tag) => {
              const meta = TAG_ICON[tag];
              if (!meta) return null;
              const Icon = meta.icon;
              return <Icon className={`size-3 ${meta.className}`} />;
            }}
          />
        </Field>
      </div>

      <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-[#F3F6FE] px-3 py-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#E3EAFD]">
          <Target className="size-4 text-[#4F46E5]" />
        </span>
        <div className="min-w-0">
          <b className="block text-[11.5px] font-bold text-[#27334E]">Campaign Goals</b>
          <small className="block text-[10px] text-[#6B7A96]">
            In the next step, you&apos;ll set specific goals, budget and KPIs for this campaign.
          </small>
        </div>
      </div>
    </Section>
  );
}
