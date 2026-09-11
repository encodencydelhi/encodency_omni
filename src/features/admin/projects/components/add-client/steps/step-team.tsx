"use client";

import {
  BookOpen,
  ChevronDown,
  Crown,
  Eye,
  FileText,
  Info,
  Megaphone,
  Search,
  Send,
  Share2,
  UserPlus,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import type { ClientDraft } from "../draft";
import { Field, NeedHelpCard, RailCard, SelectInput, StepHeader } from "../ui";
import { cn } from "@/lib/utils/cn";

const scopeTint: Record<string, string> = {
  indigo: "bg-[#EEF2FF] text-[#4338CA]",
  green: "bg-[#ECFDF5] text-[#059669]",
  blue: "bg-[#EFF6FF] text-[#2563EB]",
  pink: "bg-[#FDF2F8] text-[#DB2777]",
  amber: "bg-[#FFFBEB] text-[#D97706]",
};

const ROLE_GUIDE = [
  { icon: Crown, color: "#F59E0B", title: "Account Manager", text: "Overall client relationship, full access, billing and strategy." },
  { icon: Search, color: "#4F46E5", title: "SEO Manager", text: "Manage website SEO, keyword tracking, audits and reports." },
  { icon: Share2, color: "#DB2777", title: "Social Media Manager", text: "Create and manage social media content, calendars and publishing." },
  { icon: Megaphone, color: "#EA580C", title: "Ads Manager", text: "Manage ad campaigns across Meta, Google and other platforms." },
  { icon: FileText, color: "#2563EB", title: "Content Writer", text: "Create and manage website and social content." },
  { icon: UsersRound, color: "#059669", title: "Sales / CRM User", text: "Access leads, contacts and CRM pipeline." },
  { icon: Eye, color: "#0891B2", title: "Viewer", text: "View reports and dashboard data (read-only)." },
];

const ACCESS_PREVIEW = [
  { module: "Manage SEO", members: ["PK", "MS"] },
  { module: "Manage Social Media", members: ["AR", "MS"] },
  { module: "Manage Campaigns", members: ["RV", "MS"] },
  { module: "Manage Integrations", members: ["MS", "PK", "RV"] },
  { module: "Manage Content", members: ["SK", "AR"] },
  { module: "Access CRM", members: ["AT", "MS"] },
  { module: "View Reports", members: ["RK", "MS", "AT"] },
];

const memberColor: Record<string, string> = {
  MS: "#4F46E5",
  PK: "#7C3AED",
  AR: "#DB2777",
  RV: "#EA580C",
  SK: "#9333EA",
  AT: "#059669",
  RK: "#0891B2",
};

export function TeamStep({
  draft,
  set,
}: {
  draft: ClientDraft;
  set: <K extends keyof ClientDraft>(key: K, value: ClientDraft[K]) => void;
}) {
  return (
    <>
      <StepHeader
        icon={Users}
        step={6}
        title="Team & Permissions"
        description={`Assign your team members and set their access levels for ${draft.brandName}.`}
        tip="Assign the right people to ensure smooth collaboration and secure access."
      />
      <div className="space-y-3 p-5">
        <div>
          <b className="block text-[14px] font-bold text-[#111827]">Team Assignment</b>
          <p className="text-[11.5px] text-[#6B7280]">
            Choose team members for each role and set their access permissions.
          </p>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[860px]">
            <div className="grid grid-cols-[150px_1.4fr_1.1fr_1.1fr_54px] gap-3 border-b border-[#E6E8F0] pb-2 text-[11px] font-semibold text-[#6B7280]">
              <span>Role</span>
              <span>Team Member</span>
              <span>Access Scope</span>
              <span className="flex items-center gap-1">
                Additional Role
                <Info className="size-3 text-[#9CA3AF]" />
              </span>
              <span className="text-right">Actions</span>
            </div>

            {draft.team.map((member, index) => (
              <div
                key={member.role}
                className="grid grid-cols-[150px_1.4fr_1.1fr_1.1fr_54px] items-center gap-3 border-b border-[#F1F5F9] py-2.5"
              >
                <span className="text-[12px] font-semibold text-[#374151]">
                  {member.role}
                  {index === 0 && <span className="ml-0.5 text-[#EF4444]">*</span>}
                </span>

                <span className="flex h-[42px] items-center gap-2 rounded-lg border border-[#E2E5EE] bg-white px-2.5">
                  <span
                    className="grid size-7 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white"
                    style={{ background: member.color }}
                  >
                    {member.initials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[11.5px] font-semibold text-[#111827]">{member.name}</b>
                    <small className="block truncate text-[10px] text-[#9CA3AF]">{member.email}</small>
                  </span>
                  <button aria-label={`Clear ${member.role}`} className="shrink-0 text-[#9CA3AF] hover:text-[#EF4444]">
                    <X className="size-3.5" />
                  </button>
                  <ChevronDown className="size-3.5 shrink-0 text-[#9CA3AF]" />
                </span>

                <span className="flex flex-wrap gap-1.5">
                  {member.scopes.map((scope) => (
                    <i
                      key={scope.label}
                      className={cn(
                        "rounded-md px-2 py-1 text-[10.5px] font-semibold not-italic",
                        scopeTint[scope.tone],
                      )}
                    >
                      {scope.label}
                    </i>
                  ))}
                </span>

                <SelectInput
                  value={member.additionalRole}
                  onChange={(value) =>
                    set(
                      "team",
                      draft.team.map((row) =>
                        row.role === member.role ? { ...row, additionalRole: value } : row,
                      ),
                    )
                  }
                  options={[
                    member.additionalRole,
                    "Account Manager",
                    "SEO Specialist",
                    "Social Media Manager",
                    "Performance Marketer",
                    "Content Writer",
                    "CRM Executive",
                    "Viewer",
                  ].filter((value, position, all) => all.indexOf(value) === position)}
                />

                <span className="flex justify-end">
                  <button
                    aria-label={`Remove ${member.role}`}
                    onClick={() => set("team", draft.team.filter((row) => row.role !== member.role))}
                    className="grid size-7 place-items-center rounded-md text-[#9CA3AF] transition-colors hover:bg-[#FEF2F2] hover:text-[#EF4444]"
                  >
                    <X className="size-4" />
                  </button>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-2.5 lg:grid-cols-3">
          <div className="rounded-xl border border-[#E6E8F0] bg-white p-3.5">
            <div className="mb-2.5 flex items-start gap-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#EEF2FF]">
                <UserPlus className="size-4 text-[#4F46E5]" />
              </span>
              <div>
                <b className="block text-[12px] font-bold text-[#111827]">Invite New Member</b>
                <p className="text-[10.5px] text-[#6B7280]">Add a team member to your workspace.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                placeholder="Enter email address"
                className="h-[38px] min-w-0 flex-1 rounded-lg border border-[#E2E5EE] px-2.5 text-[11.5px] outline-none focus:border-[#4F46E5]"
              />
              <select className="h-[38px] shrink-0 rounded-lg border border-[#E2E5EE] px-2 text-[11.5px] outline-none">
                <option>Select role</option>
                <option>SEO Manager</option>
                <option>Content Writer</option>
              </select>
              <button className="flex h-[38px] shrink-0 items-center gap-1.5 rounded-lg bg-[#4F46E5] px-2.5 text-[11.5px] font-semibold text-white transition-colors hover:bg-[#4338CA]">
                <Send className="size-3.5" />
                Send Invite
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-[#E6E8F0] bg-white p-3.5">
            <div className="mb-2.5 flex items-start gap-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#FFFBEB]">
                <Crown className="size-4 text-[#F59E0B]" />
              </span>
              <div>
                <b className="block text-[12px] font-bold text-[#111827]">
                  Assign Client Owner<span className="ml-0.5 text-[#EF4444]">*</span>
                </b>
                <p className="text-[10.5px] text-[#6B7280]">Primary point of contact for this client.</p>
              </div>
            </div>
            <span className="flex h-[42px] items-center gap-2 rounded-lg border border-[#E2E5EE] bg-white px-2.5">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#4F46E5] text-[10px] font-bold text-white">
                MS
              </span>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[11.5px] font-semibold text-[#111827]">{draft.clientOwner}</b>
                <small className="block truncate text-[10px] text-[#9CA3AF]">manish@encodency.com</small>
              </span>
              <X className="size-3.5 shrink-0 text-[#9CA3AF]" />
              <ChevronDown className="size-3.5 shrink-0 text-[#9CA3AF]" />
            </span>
          </div>

          <div className="rounded-xl border border-[#E6E8F0] bg-white p-3.5">
            <div className="mb-2.5 flex items-start gap-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#EEF2FF]">
                <Users className="size-4 text-[#4F46E5]" />
              </span>
              <div>
                <b className="block text-[12px] font-bold text-[#111827]">
                  Approval Contact <span className="font-normal text-[#9CA3AF]">(Optional)</span>
                </b>
                <p className="text-[10.5px] text-[#6B7280]">Client-side contact for content approvals.</p>
              </div>
            </div>
            <Field label="">
              <SelectInput
                value={draft.approvalTeamContact || "Select team member"}
                onChange={(v) => set("approvalTeamContact", v)}
                options={["Select team member", "Ravi Kumar", "Anjali Tiwari", "Sneha Kulkarni"]}
              />
            </Field>
          </div>
        </div>
      </div>
    </>
  );
}

export function TeamRail() {
  return (
    <>
      <RailCard>
        <div className="mb-3 flex items-start gap-2">
          <BookOpen className="mt-px size-4 shrink-0 text-[#4F46E5]" />
          <div>
            <b className="block text-[13px] font-bold text-[#111827]">Role Explanations</b>
            <p className="text-[10.5px] text-[#6B7280]">Understand what each role can do.</p>
          </div>
        </div>
        <ul className="space-y-2.5">
          {ROLE_GUIDE.map(({ icon: Icon, color, title, text }) => (
            <li key={title} className="flex items-start gap-2.5">
              <span
                className="grid size-7 shrink-0 place-items-center rounded-lg"
                style={{ background: `${color}1A` }}
              >
                <Icon className="size-3.5" style={{ color }} />
              </span>
              <span className="min-w-0">
                <b className="block text-[11.5px] font-bold text-[#111827]">{title}</b>
                <small className="block text-[10.5px] leading-[15px] text-[#6B7280]">{text}</small>
              </span>
            </li>
          ))}
        </ul>
      </RailCard>

      <RailCard>
        <div className="mb-3 flex items-start gap-2">
          <Eye className="mt-px size-4 shrink-0 text-[#4F46E5]" />
          <div>
            <b className="block text-[13px] font-bold text-[#111827]">Access Preview</b>
            <p className="text-[10.5px] text-[#6B7280]">Quick overview of who can access what.</p>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border border-[#E6E8F0]">
          <div className="grid grid-cols-[1fr_1fr] bg-[#F8FAFC] px-2.5 py-1.5 text-[10.5px] font-semibold text-[#6B7280]">
            <span>Module</span>
            <span>Team Members</span>
          </div>
          {ACCESS_PREVIEW.map(({ module, members }) => (
            <div
              key={module}
              className="grid grid-cols-[1fr_1fr] items-center border-t border-[#F1F5F9] px-2.5 py-1.5"
            >
              <span className="text-[10.5px] text-[#374151]">{module}</span>
              <span className="flex -space-x-1.5">
                {members.map((initials) => (
                  <i
                    key={initials}
                    className="grid size-5 place-items-center rounded-full border border-white text-[8px] font-bold not-italic text-white"
                    style={{ background: memberColor[initials] }}
                  >
                    {initials}
                  </i>
                ))}
              </span>
            </div>
          ))}
        </div>
      </RailCard>
      <NeedHelpCard />
    </>
  );
}
