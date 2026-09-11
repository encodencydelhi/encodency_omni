"use client";

import {
  Building2,
  CircleCheck,
  Circle,
  ClipboardCheck,
  ExternalLink,
  Globe,
  Link2,
  MapPin,
  Megaphone,
  Pencil,
  Rocket,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import type { ClientDraft } from "../draft";
import { NeedHelpCard, RailCard, StepHeader } from "../ui";
import { cn } from "@/lib/utils/cn";

function SummaryCard({
  icon: Icon,
  title,
  rows,
  onEdit,
}: {
  icon: typeof UserRound;
  title: string;
  rows: { label: string; value: React.ReactNode }[];
  onEdit: () => void;
}) {
  return (
    <div className="rounded-xl border border-[#E6E8F0] bg-white p-3.5">
      <div className="mb-2.5 flex items-center gap-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#EEF2FF]">
          <Icon className="size-4 text-[#4F46E5]" />
        </span>
        <b className="flex-1 text-[13px] font-bold text-[#111827]">{title}</b>
        <button
          onClick={onEdit}
          className="flex items-center gap-1 text-[11px] font-semibold text-[#4F46E5] transition-opacity hover:opacity-75"
        >
          <Pencil className="size-3" />
          Edit
        </button>
      </div>
      <dl className="space-y-1.5">
        {rows.map(({ label, value }) => (
          <div key={label} className="grid grid-cols-[108px_1fr] items-start gap-2 text-[11px]">
            <dt className="text-[#9CA3AF]">{label}</dt>
            <dd className="min-w-0 truncate font-medium text-[#374151]">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function ReviewStep({
  draft,
  set,
  goTo,
}: {
  draft: ClientDraft;
  set: <K extends keyof ClientDraft>(key: K, value: ClientDraft[K]) => void;
  goTo: (step: number) => void;
}) {
  const channelRows = Object.entries(draft.channels)
    .slice(0, 5)
    .map(([name, state]) => ({
      label: name,
      value: (
        <span className="flex items-center gap-1.5">
          {state === "connected" ? (
            <CircleCheck className="size-3.5 shrink-0 text-[#10B981]" />
          ) : (
            <Circle className="size-3.5 shrink-0 text-[#CBD5E1]" />
          )}
          {state === "connected" ? `Connected (${draft.brandName})` : "Not connected"}
        </span>
      ),
    }));

  return (
    <>
      <StepHeader
        icon={ClipboardCheck}
        step={7}
        title="Review & Create"
        description="Review all the details below before creating your client. You can go back and edit any section if needed."
        tip="Everything look good? Once you create the client, you can still make changes anytime."
      />
      <div className="grid gap-2.5 p-5 lg:grid-cols-2">
        <SummaryCard
          icon={UserRound}
          title="Basic Information"
          onEdit={() => goTo(1)}
          rows={[
            { label: "Client / Brand Name", value: draft.brandName },
            { label: "Legal / Company Name", value: draft.legalName },
            { label: "Client Type", value: draft.clientType },
            { label: "Industry / Category", value: draft.industry },
            { label: "Short Description", value: draft.shortDescription },
          ]}
        />
        <SummaryCard
          icon={Building2}
          title="Business Profile"
          onEdit={() => goTo(2)}
          rows={[
            { label: "Business Focus", value: draft.services.slice(0, 2).join(", ") },
            { label: "Mission", value: draft.usp },
            { label: "Target Audience", value: draft.targetAudience.slice(0, 3).join(", ") },
            { label: "Brand Tone", value: draft.brandTone.slice(0, 3).join(", ") },
            { label: "Operating Regions", value: draft.targetLocations.join(", ") },
          ]}
        />
        <SummaryCard
          icon={Globe}
          title="Website & SEO"
          onEdit={() => goTo(3)}
          rows={[
            {
              label: "Primary Website URL",
              value: (
                <span className="flex items-center gap-1 text-[#4F46E5]">
                  {draft.websiteUrl}
                  <ExternalLink className="size-3 shrink-0" />
                </span>
              ),
            },
            { label: "Country", value: draft.country },
            {
              label: "City / Service Area",
              value: (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3 shrink-0 text-[#9CA3AF]" />
                  {draft.city}
                </span>
              ),
            },
            { label: "Timezone", value: draft.timezone },
            {
              label: "Default Currency",
              value: (
                <span className="flex items-center gap-1">
                  <Wallet className="size-3 shrink-0 text-[#9CA3AF]" />
                  {draft.currency}
                </span>
              ),
            },
          ]}
        />
        <SummaryCard icon={Link2} title="Channels & Integrations" onEdit={() => goTo(4)} rows={channelRows} />
        <SummaryCard
          icon={Megaphone}
          title="Marketing Setup"
          onEdit={() => goTo(5)}
          rows={[
            { label: "Primary Goal", value: draft.primaryGoals.join(" & ") },
            { label: "Target Audience", value: draft.audienceSegments.join(", ") },
            { label: "Content Focus", value: draft.contentCategories.join(", ") },
            { label: "Campaign Frequency", value: draft.publishingFrequency },
            { label: "Default CTA", value: draft.defaultCta },
          ]}
        />
        <SummaryCard
          icon={Users}
          title="Team & Permissions"
          onEdit={() => goTo(6)}
          rows={[
            { label: "Workspace Members", value: `${draft.team.length} members` },
            { label: "Primary Owner", value: `${draft.clientOwner} (You)` },
            { label: "Team Members", value: draft.team.slice(1, 3).map((m) => m.name).join(", ") },
            { label: "Default Permissions", value: "Standard (Custom)" },
            { label: "Departments", value: "Marketing, Content, SEO" },
          ]}
        />
      </div>

      <div className="flex items-center gap-2 px-5 pb-1">
        <button
          type="button"
          onClick={() => set("confirmed", !draft.confirmed)}
          className="flex items-center gap-2 text-[12px] font-medium text-[#374151]"
        >
          <span
            className={cn(
              "grid size-4 shrink-0 place-items-center rounded border transition-colors",
              draft.confirmed ? "border-[#4F46E5] bg-[#4F46E5]" : "border-[#CBD5E1] bg-white",
            )}
          >
            {draft.confirmed && (
              <svg viewBox="0 0 12 12" className="size-2.5 text-white" fill="none">
                <path d="M2 6.2 4.6 8.8 10 3.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          I confirm the information is correct.
        </button>
      </div>
    </>
  );
}

export function ReviewRail({ draft }: { draft: ClientDraft }) {
  const checklist = [
    "Basic information added",
    "Business profile completed",
    "Website & SEO configured",
    "Channels connected",
    "Marketing setup defined",
    "Team & permissions assigned",
    "Review and confirm",
  ];
  const done = draft.confirmed ? 7 : 6;

  return (
    <>
      <RailCard>
        <b className="mb-3 block text-[13px] font-bold text-[#111827]">Setup Completeness</b>
        <div className="flex items-center gap-3">
          <div className="relative size-[86px] shrink-0">
            <svg viewBox="0 0 36 36" className="size-full -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E8EDF3" strokeWidth="3.2" />
              <circle
                cx="18"
                cy="18"
                r="15.9"
                fill="none"
                stroke="#4F46E5"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeDasharray={`${(done / 7) * 100}, 100`}
              />
            </svg>
            <span className="absolute inset-0 grid place-items-center text-[17px] font-bold text-[#111827]">
              {Math.round((done / 7) * 100)}%
            </span>
          </div>
          <div className="min-w-0">
            <b className="block text-[12.5px] font-bold text-[#059669]">
              {done === 7 ? "All set!" : "Almost there"}
            </b>
            <p className="text-[11px] leading-4 text-[#6B7280]">
              {done === 7
                ? "You have completed all the required information. Ready to create your client!"
                : "Confirm the details below to finish setting up your client."}
            </p>
          </div>
        </div>
      </RailCard>

      <RailCard>
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <b className="text-[13px] font-bold text-[#111827]">Onboarding Checklist</b>
          <span className="text-[10.5px] text-[#6B7280]">{done} of 7 completed</span>
        </div>
        <ul className="space-y-1.5">
          {checklist.map((item, index) => (
            <li key={item} className="flex items-center gap-2 text-[11px] text-[#374151]">
              {index < done ? (
                <CircleCheck className="size-4 shrink-0 text-[#10B981]" />
              ) : (
                <Circle className="size-4 shrink-0 text-[#CBD5E1]" />
              )}
              {item}
            </li>
          ))}
        </ul>
      </RailCard>

      <RailCard>
        <div className="mb-2.5 flex items-start gap-2">
          <Rocket className="mt-px size-4 shrink-0 text-[#4F46E5]" />
          <div>
            <b className="block text-[13px] font-bold text-[#111827]">What happens after creation?</b>
            <p className="text-[10.5px] leading-[15px] text-[#6B7280]">
              Your client will be ready, and you can start their digital journey. Here&apos;s what you can
              do next:
            </p>
          </div>
        </div>
        <ol className="space-y-2">
          {[
            { title: "Connect any remaining channels", text: "Add more social media or integrate marketing tools" },
            { title: "Run the first SEO audit", text: "Get insights about their website" },
            { title: "Add target keywords", text: "Set up keyword tracking" },
            { title: "Create the first campaign", text: "Start with an awareness or intro campaign" },
            { title: "Invite more team members", text: "Bring in your client's team to collaborate" },
          ].map((item, index) => (
            <li key={item.title} className="flex items-start gap-2.5">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#EEF2FF] text-[10px] font-bold text-[#4F46E5]">
                {index + 1}
              </span>
              <span className="min-w-0">
                <b className="block text-[11.5px] font-semibold text-[#111827]">{item.title}</b>
                <small className="block text-[10.5px] leading-[15px] text-[#6B7280]">{item.text}</small>
              </span>
            </li>
          ))}
        </ol>
      </RailCard>
      <NeedHelpCard />
    </>
  );
}

