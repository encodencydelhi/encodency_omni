"use client";

import Link from "next/link";
import Image from "next/image";
import { FaFacebookF, FaInstagram, FaMeta } from "react-icons/fa6";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  Database,
  FileImage,
  FileText,
  Folder,
  Grid2X2,
  Image as ImageIcon,
  Info,
  Lightbulb,
  Link2,
  Megaphone,
  Monitor,
  Plus,
  Save,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
  Users,
  X,
} from "lucide-react";

import {
  getAd,
  getAdSet,
  getCampaign,
  getCreative,
  getForm,
} from "@/features/admin/meta-ads/data";

type Step = "campaign" | "adset" | "ad" | "form" | "review";

const steps: { id: Step; label: string; sub: string; icon: typeof Folder }[] = [
  { id: "campaign", label: "Campaign", sub: "Campaign Settings", icon: Folder },
  {
    id: "adset",
    label: "Ad Set",
    sub: "Audience, Placements, Schedule",
    icon: Grid2X2,
  },
  {
    id: "ad",
    label: "Ad",
    sub: "Creative, Format, Destination",
    icon: FileImage,
  },
  {
    id: "form",
    label: "Instant Form",
    sub: "Questions, Privacy, Thank You",
    icon: FileText,
  },
  {
    id: "review",
    label: "Review & Publish",
    sub: "Review and launch",
    icon: ClipboardCheck,
  },
];

const order: Step[] = ["campaign", "adset", "ad", "form", "review"];
const input =
  "h-9 w-full rounded-md border border-[#cfd9e6] bg-white px-3 text-xs text-[#17213c] outline-none transition focus:border-[#1671f8] focus:ring-2 focus:ring-[#1671f8]/10";

/**
 * Entry context. Management pages deep-link into the builder — "Add Ad Set"
 * from a campaign, "Edit" from an ad, "Use in Ad" from an instant form — so the
 * builder opens on the requested step instead of always restarting at step 1.
 */
function useEntryContext() {
  const params = useSearchParams();
  const requested = params?.get("step");
  const initialStep: Step = order.includes(requested as Step)
    ? (requested as Step)
    : "campaign";

  const campaignId = params?.get("campaign");
  const adSetId = params?.get("adset");
  const adId = params?.get("ad");
  const formId = params?.get("form");
  const creativeId = params?.get("creative");
  const audienceId = params?.get("audience");

  const parent =
    getCampaign(campaignId ?? "") ??
    getCampaign(getAdSet(adSetId ?? "")?.campaignId ?? "") ??
    getCampaign(getAd(adId ?? "")?.campaignId ?? "");
  const parentAdSet = getAdSet(adSetId ?? "") ?? getAdSet(getAd(adId ?? "")?.adSetId ?? "");
  const editing = getAd(adId ?? "") ?? getForm(formId ?? "");

  /** One line of context so the user knows what they are adding to or editing. */
  let contextLabel: string | null = null;
  if (adId && editing) contextLabel = `Editing ad · ${editing.name}`;
  else if (formId && editing) contextLabel = `Instant form · ${editing.name}`;
  else if (creativeId) contextLabel = `Using creative · ${getCreative(creativeId)?.name ?? creativeId}`;
  else if (audienceId) contextLabel = "Using a saved audience";
  else if (parentAdSet) contextLabel = `Adding to ad set · ${parentAdSet.name}`;
  else if (parent) contextLabel = `Adding to campaign · ${parent.name}`;

  const returnHref = parentAdSet
    ? `/admin/meta/ads/adsets/${parentAdSet.id}`
    : parent
      ? `/admin/meta/ads/campaigns/${parent.id}`
      : "/admin/meta/ads";

  return { initialStep, contextLabel, returnHref };
}

function CreateAdsManagerInner() {
  const router = useRouter();
  const { initialStep, contextLabel, returnHref } = useEntryContext();
  const [step, setStep] = useState<Step>(initialStep);
  const index = order.indexOf(step);
  const next = () => setStep(order[Math.min(index + 1, order.length - 1)]!);
  const back = () => setStep(order[Math.max(index - 1, 0)]!);

  const saveDraft = () => {
    toast.success("Campaign saved as draft", {
      description: "You can finish setting it up any time from Campaigns.",
    });
    router.push("/admin/meta/ads");
  };

  const publish = () => router.push("/admin/meta/ads/publish?status=submitted");

  return (
    <div className="ads-create-workspace flex h-dvh w-full flex-col overflow-hidden bg-[#f6f8fb] text-[#111c3b]">
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-[#dce4ee] bg-white px-4">
        <div className="flex shrink-0 items-center gap-2">
          <FaMeta className="size-7 text-[#0866ff]" />
          <FaInstagram className="size-5 text-[#d946ef]" />
          <div>
            <h1 className="text-sm font-bold">Meta Ads Manager</h1>
            <p className="text-[9px] text-[#66758f]">
              Create paid campaigns across Facebook and Instagram.
            </p>
          </div>
        </div>
        <nav className="flex min-w-0 flex-1 items-center justify-center gap-2">
          {order.map((item, i) => {
            const complete = i < index;
            const active = i === index;
            const label =
              item === "adset"
                ? "Ad Set"
                : item === "form"
                  ? "Instant Form"
                  : item === "review"
                    ? "Review & Publish"
                    : "Campaign";
            return (
              <div key={item} className="flex items-center gap-2">
                <button
                  disabled={i > index}
                  onClick={() => setStep(item)}
                  className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-1 py-4 text-[10px] font-bold ${active ? "border-[#1671f8] text-[#0769e8]" : complete ? "border-transparent text-[#111c3b]" : "border-transparent text-[#66758f]"}`}
                >
                  <span
                    className={`flex size-5 items-center justify-center rounded-full text-[9px] ${complete ? "bg-[#10a85e] text-white" : active ? "bg-[#1671f8] text-white" : "bg-[#e9eef5] text-[#526078]"}`}
                  >
                    {complete ? <Check className="size-3" /> : i + 1}
                  </span>
                  {label}
                </button>
                {i < order.length - 1 && (
                  <span className="h-px w-6 bg-[#dce4ee]" />
                )}
              </div>
            );
          })}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-md border border-[#cfe8df] bg-[#f2fbf7] px-3 py-2 text-[10px] font-bold text-[#087a50]">
            <CheckCircle2 className="size-3.5" />
            Meta Connected
          </span>
          <Link
            href={returnHref}
            className="flex size-8 items-center justify-center rounded-md border border-[#d8e0ea] text-[#64748b] hover:bg-[#f8fafc]"
            aria-label="Close campaign builder"
          >
            <X className="size-4" />
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[248px] shrink-0 flex-col border-r border-[#dce4ee] bg-white p-4">
          <div>
            <h2 className="text-base font-bold">Create Campaign</h2>
            <p className="mt-1 text-xs leading-relaxed text-[#66758f]">
              Set up your campaign, ad set and ad
              <br />
              to start getting results.
            </p>
            {contextLabel && (
              <p className="mt-2.5 rounded-md border border-[#cfe0fb] bg-[#eef5ff] px-2.5 py-1.5 text-[10px] font-semibold leading-relaxed text-[#0769e8]">
                {contextLabel}
              </p>
            )}
          </div>
          <nav className="mt-5 space-y-1">
            {steps.map((item, i) => {
              const Icon = item.icon;
              const active = step === item.id;
              const complete = index > i;
              return (
                <button
                  key={item.id}
                  disabled={i > index}
                  onClick={() => setStep(item.id)}
                  className={`relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${active ? "bg-[#edf5ff]" : complete ? "hover:bg-[#f8fafc]" : "cursor-not-allowed opacity-75"}`}
                >
                  {active && (
                    <span className="absolute inset-y-2 left-0 w-0.5 rounded bg-[#1671f8]" />
                  )}
                  <span
                    className={`flex size-9 shrink-0 items-center justify-center rounded-full border ${active ? "border-[#8fbcff] bg-white text-[#1671f8]" : complete ? "border-[#16a765] bg-[#16a765] text-white" : "border-[#d6dfeb] bg-white text-[#607089]"}`}
                  >
                    {complete ? (
                      <Check className="size-4" />
                    ) : (
                      <Icon className="size-4" />
                    )}
                  </span>
                  <span>
                    <strong
                      className={`block text-xs ${active ? "text-[#0769e8]" : "text-[#17213c]"}`}
                    >
                      {item.label}
                    </strong>
                    <small className="mt-0.5 block text-[10px] text-[#6b7891]">
                      {item.sub}
                    </small>
                  </span>
                </button>
              );
            })}
          </nav>
          <div className="mt-auto rounded-lg bg-[#f3f7fc] p-3">
            <div className="flex gap-2">
              <CircleHelp className="mt-0.5 size-4 text-[#1671f8]" />
              <div>
                <p className="text-xs font-bold">Need help?</p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-[#66758f]">
                  Check out our guide or contact support.
                </p>
                <Link
                  href="/admin/meta/ads/help?from=create"
                  className="mt-2 inline-block text-[10px] font-bold text-[#0769e8] hover:underline"
                >
                  View Help Center →
                </Link>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto p-4 [scrollbar-color:#cbd5e1_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5">
          {step === "campaign" && <CampaignStep />}
          {step === "adset" && <AdSetStep />}
          {step === "ad" && <AdStep />}
          {step === "form" && <FormStep />}
          {step === "review" && <ReviewStep />}
        </main>

        <aside
          key={step}
          className="w-[330px] shrink-0 overflow-y-auto border-l border-[#dce4ee] bg-[#f8fafc] p-3 [scrollbar-color:#cbd5e1_transparent] [scrollbar-width:thin]"
        >
          <RightRail step={step} />
        </aside>
      </div>

      <footer className="flex h-14 shrink-0 items-center justify-between border-t border-[#dce4ee] bg-white px-5">
        <button
          onClick={back}
          disabled={index === 0}
          className="flex h-9 items-center gap-2 rounded-md border border-[#cfd9e6] bg-white px-4 text-xs font-bold shadow-sm disabled:opacity-40"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>
        <div className="flex gap-2">
          <button
            onClick={saveDraft}
            className="flex h-9 items-center gap-2 rounded-md border border-[#cfd9e6] bg-white px-5 text-xs font-bold shadow-sm transition hover:bg-[#f8fafc]"
          >
            <Save className="size-3.5" />
            Save Draft
          </button>
          <button
            onClick={step === "review" ? publish : next}
            className="flex h-9 items-center gap-2 rounded-md bg-[#126df3] px-5 text-xs font-bold text-white shadow-[0_3px_10px_rgba(18,109,243,.25)] hover:bg-[#075ed8]"
          >
            {step === "review"
              ? "Publish Campaign"
              : `Next: ${order[index + 1] === "adset" ? "Ad Set" : order[index + 1] === "form" ? "Instant Form" : order[index + 1] === "review" ? "Review & Publish" : "Ad"}`}
            <ArrowRight className="size-4" />
          </button>
        </div>
      </footer>
    </div>
  );
}

export default function CreateAdsManager() {
  return (
    <Suspense fallback={<div className="h-dvh w-full bg-[#f6f8fb]" />}>
      <CreateAdsManagerInner />
    </Suspense>
  );
}

function Heading({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-3">
      <h1 className="text-[22px] font-bold leading-tight">{title}</h1>
      <p className="mt-0.5 text-xs text-[#66758f]">{sub}</p>
    </div>
  );
}
function Card({
  title,
  sub,
  icon,
  children,
  className = "",
}: {
  title: string;
  sub?: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-[#dce4ee] bg-white p-3.5 shadow-[0_1px_3px_rgba(15,23,42,.03)] ${className}`}
    >
      <div className="mb-3 flex items-start gap-3">
        <span className="mt-0.5 text-[#1671f8]">{icon}</span>
        <div>
          <h2 className="text-sm font-bold">{title}</h2>
          {sub && <p className="mt-0.5 text-[10px] text-[#66758f]">{sub}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold text-[#26344f]">
        {label}
      </span>
      {children}
    </label>
  );
}
function Select({ children }: { children: ReactNode }) {
  return <select className={input}>{children}</select>;
}
/**
 * A selectable option card. Backed by a native radio so the choice really
 * changes and is keyboard-navigable; `group` names the mutually exclusive set.
 */
function Choice({
  group,
  selected,
  icon,
  title,
  sub,
  badge,
}: {
  group: string;
  selected?: boolean;
  icon?: ReactNode;
  title: string;
  sub: string;
  badge?: string;
}) {
  return (
    <label className="group block cursor-pointer">
      <input
        type="radio"
        name={group}
        defaultChecked={selected}
        className="sr-only"
      />
      <span className="flex min-h-14 w-full items-center gap-3 rounded-md border border-[#d8e1ec] bg-white p-2.5 text-left transition group-has-[:checked]:border-[#1671f8] group-has-[:checked]:bg-[#f2f7ff] group-has-[:checked]:ring-1 group-has-[:checked]:ring-[#1671f8] group-has-[:focus-visible]:ring-2 group-has-[:focus-visible]:ring-[#1671f8]/40">
        <span className="flex size-8 items-center justify-center rounded-full bg-[#f4f6f8] text-[#6b7891] group-has-[:checked]:bg-[#e4efff] group-has-[:checked]:text-[#1671f8]">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <strong className="block text-xs">{title}</strong>
          <small className="text-[10px] text-[#66758f]">{sub}</small>
        </span>
        {badge && (
          <span className="rounded-full bg-[#dceaff] px-2 py-0.5 text-[9px] font-bold text-[#126df3]">
            {badge}
          </span>
        )}
      </span>
    </label>
  );
}

function CampaignStep() {
  return (
    <div className="w-full">
      <Heading
        title="Campaign Settings"
        sub="Define your campaign goal and budget to get started."
      />
      <div className="space-y-2.5">
        <Card
          title="Campaign Details"
          sub="Give your campaign a name and choose how you want to buy your ads."
          icon={<FileText className="size-5" />}
        >
          <div className="grid grid-cols-[1.4fr_1fr] gap-3">
            <Field label="Campaign Name">
              <input
                className={input}
                defaultValue="LEADS | DHIPL | Delhi NCR | Sep 2026"
              />
            </Field>
            <Field label="Buying Type">
              <Select>
                <option>Auction</option>
              </Select>
            </Field>
          </div>
          <div className="mt-3">
            <p className="mb-1 text-[10px] font-semibold">Campaign Objective</p>
            <p className="mb-2 text-[10px] text-[#66758f]">
              Choose the business outcome you want to achieve.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Choice
                group="buying-type"
                selected
                icon={<Users className="size-4" />}
                title="Leads"
                sub="Forms, calls, or chats"
                badge="Recommended"
              />
              <Choice
                group="buying-type"
                icon={<Megaphone className="size-4" />}
                title="Awareness"
                sub="Reach & impressions"
                badge="Coming Soon"
              />
            </div>
          </div>
        </Card>
        <Card
          title="Budget & Bid Strategy"
          sub="Set your budget and bidding preferences for this campaign."
          icon={<Database className="size-5" />}
        >
          <div className="grid grid-cols-2 gap-5">
            <div>
              <p className="mb-2 text-[10px] font-semibold">Budget Strategy</p>
              <div className="flex gap-5 text-xs">
                <label>
                  <input type="radio" defaultChecked /> Campaign Budget
                </label>
                <label>
                  <input type="radio" /> Ad Set Budget
                </label>
              </div>
              <Field label="Budget Type">
                <Select>
                  <option>Daily Budget</option>
                  <option>Lifetime Budget</option>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount (INR)">
                <input className={input} defaultValue="1000" />
              </Field>
              <Field label="Bid Strategy">
                <Select>
                  <option>Lowest Cost</option>
                </Select>
              </Field>
              <div />
              <Field label="Cost per Result Goal (Optional)">
                <input className={input} placeholder="₹ Enter amount" />
              </Field>
            </div>
          </div>
        </Card>
        <Card
          title="Smart Lead Optimization"
          sub="Use Meta's AI to find people most likely to become leads for your business."
          icon={<Sparkles className="size-5" />}
        >
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <span className="rounded-full bg-[#dcf8e8] px-3 py-1 text-[10px] font-bold text-[#079455]">
                ◎ Optimize for Leads
              </span>
              <span className="rounded-full bg-[#dcf8e8] px-3 py-1 text-[10px] font-bold text-[#079455]">
                High Intent
              </span>
            </div>
            <span className="flex items-center gap-2 text-xs font-bold">
              <span className="h-5 w-9 rounded-full bg-[#1671f8] p-0.5">
                <span className="ml-auto block size-4 rounded-full bg-white" />
              </span>
              On
            </span>
          </div>
        </Card>
        <Card
          title="Special Ad Categories"
          sub="Declare if your ads are related to credit, employment, housing, or social issues."
          icon={<ShieldCheck className="size-5" />}
        >
          <div className="flex justify-end gap-6 text-xs">
            <label>
              <input type="radio" defaultChecked /> None selected
            </label>
            <label>
              <input type="radio" /> Housing
            </label>
            <label>
              <input type="radio" /> Employment
            </label>
            <label>
              <input type="radio" /> Credit
            </label>
          </div>
        </Card>
        <Card
          title="Campaign Controls & Internal Details"
          sub="Set guardrails and keep campaign context for your team."
          icon={<Settings2 className="size-5" />}
        >
          <div className="grid grid-cols-3 gap-3">
            <Field label="Campaign Spending Limit">
              <input className={input} placeholder="₹ Optional limit" />
            </Field>
            <Field label="Internal Tags">
              <input
                className={input}
                defaultValue="Delhi NCR, Lead Generation"
              />
            </Field>
            <Field label="Internal Notes">
              <input
                className={input}
                placeholder="Add notes for your team..."
              />
            </Field>
          </div>
          <label className="mt-3 flex items-center gap-2 text-xs font-semibold">
            <input type="checkbox" /> Enable A/B test
          </label>
        </Card>
      </div>
    </div>
  );
}

function AdSetStep() {
  return (
    <div className="w-full">
      <Heading
        title="Ad Set Settings"
        sub="Define audience, schedule, placements and delivery settings."
      />
      <div className="space-y-2.5">
        <Card
          title="Ad Set Identity & Conversion"
          sub="Choose your ad set name, conversion location and connected assets."
          icon={<Grid2X2 className="size-5" />}
        >
          <div className="grid grid-cols-3 gap-3">
            <Field label="Ad Set Name">
              <input
                className={input}
                defaultValue="Leads | US | 25–45 | Interests | Sep 2026"
              />
            </Field>
            <Field label="Conversion Location">
              <Select>
                <option>Instant Form</option>
                <option>Website</option>
              </Select>
            </Field>
            <Field label="Facebook Page">
              <Select>
                <option>Acme Fitness</option>
                <option>Namo Gange</option>
              </Select>
            </Field>
          </div>
        </Card>
        <Card
          title="Schedule"
          sub="Choose when to start running your ad set."
          icon={<CalendarDays className="size-5" />}
        >
          <div className="grid grid-cols-4 gap-3">
            <Field label="Start date">
              <input type="date" className={input} />
            </Field>
            <Field label="Start time">
              <input type="time" className={input} />
            </Field>
            <Field label="End date · Optional">
              <input type="date" className={input} />
            </Field>
            <Field label="Time zone">
              <Select>
                <option>(GMT+05:30) India Standard Time</option>
              </Select>
            </Field>
          </div>
        </Card>
        <Card
          title="Audience"
          sub="Define who you want to see your ads."
          icon={<Users className="size-5" />}
        >
          <div className="grid grid-cols-4 gap-3">
            <Field label="Locations">
              <input className={input} defaultValue="United States" />
            </Field>
            <Field label="Location type">
              <Select>
                <option>People living in this location</option>
              </Select>
            </Field>
            <Field label="Radius">
              <Select>
                <option>25 miles</option>
              </Select>
            </Field>
            <div />
            <Field label="Age">
              <div className="flex gap-2">
                <Select>
                  <option>25</option>
                </Select>
                <Select>
                  <option>45</option>
                </Select>
              </div>
            </Field>
            <Field label="Gender">
              <Select>
                <option>All genders</option>
              </Select>
            </Field>
            <Field label="Languages · Optional">
              <Select>
                <option>English (All)</option>
              </Select>
            </Field>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Custom audiences · Optional">
              <input
                className={input}
                placeholder="Search existing audiences"
              />
            </Field>
            <Field label="Detailed targeting · Optional">
              <input
                className={input}
                placeholder="Add demographics, interests or behaviors"
              />
            </Field>
          </div>
        </Card>
        <Card
          title="Meta Placements"
          sub="Choose delivery across Facebook, Instagram and Meta inventory."
          icon={<Monitor className="size-5" />}
        >
          <div className="grid grid-cols-2 gap-3">
            <Choice
                group="conversion-location"
              selected
              icon={<Sparkles className="size-4" />}
              title="Advantage+ Placements"
              sub="Let Meta distribute budget across the best placements"
              badge="Recommended"
            />
            <Choice
                group="conversion-location"
              icon={<Settings2 className="size-4" />}
              title="Manual Placements"
              sub="Choose placements separately by platform"
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <PlacementGroup
              icon={<FaFacebookF />}
              title="Facebook"
              color="text-[#1877f2]"
              items={[
                "Facebook Feed",
                "Facebook Stories",
                "Facebook Reels",
                "Facebook Search",
                "Video Feed",
                "Messenger",
              ]}
            />
            <PlacementGroup
              icon={<FaInstagram />}
              title="Instagram"
              color="text-[#d946ef]"
              items={[
                "Instagram Feed",
                "Instagram Stories",
                "Instagram Reels",
                "Instagram Explore",
                "Profile Feed",
                "Audience Network",
              ]}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

function PlacementGroup({
  icon,
  title,
  color,
  items,
}: {
  icon: ReactNode;
  title: string;
  color: string;
  items: string[];
}) {
  return (
    <div className="rounded-md border border-[#d8e1ec] p-3">
      <p className={`mb-2 flex items-center gap-2 text-xs font-bold ${color}`}>
        {icon}
        {title}
      </p>
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        {items.map((x) => (
          <label key={x}>
            <input type="checkbox" defaultChecked className="mr-1.5" />
            {x}
          </label>
        ))}
      </div>
    </div>
  );
}

function AdStep() {
  return (
    <div className="w-full">
      <Heading
        title="Ad Settings"
        sub="Create the ad, add media, messaging, CTA, and destination."
      />
      <div className="grid grid-cols-[1.45fr_.75fr] gap-3">
        <div className="space-y-2.5">
          <Card
            title="Ad Identity & Setup"
            sub="Choose the Facebook Page and Instagram Business identity shown with this ad."
            icon={<BadgeCheck className="size-5" />}
          >
            <Field label="Ad Name">
              <input
                className={input}
                defaultValue="Leads | Namo Gange | Product Launch | Sep 2026"
              />
            </Field>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="Facebook Page">
                <Select>
                  <option>Namo Gange Trust</option>
                </Select>
              </Field>
              <Field label="Instagram Business Account">
                <Select>
                  <option>@namogangetrust</option>
                </Select>
              </Field>
            </div>
            <div className="mt-2 flex gap-4 text-[10px]">
              <label>
                <input type="radio" name="identityMode" className="mr-1" />
                Facebook only
              </label>
              <label>
                <input type="radio" name="identityMode" className="mr-1" />
                Instagram only
              </label>
              <label>
                <input
                  type="radio"
                  name="identityMode"
                  defaultChecked
                  className="mr-1"
                />
                Use both identities
              </label>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Choice
                group="ad-setup"
                selected
                icon={<EditIcon />}
                title="Create Ad"
                sub="Create a new ad with media, text and more."
              />
              <Choice
                group="ad-setup"
                icon={<Link2 className="size-4" />}
                title="Use Existing Post"
                sub="Use a post from your Page or Instagram."
              />
            </div>
          </Card>
          <Card
            title="Ad Creative"
            sub="Add media, crop, and customize how your ad looks across placements."
            icon={<ImageIcon className="size-5" />}
          >
            <div className="grid grid-cols-[1fr_1.4fr] gap-3">
              <button
                type="button"
                onClick={() => toast.success("Opening the media uploader…")}
                className="flex min-h-32 flex-col items-center justify-center rounded-md border border-dashed border-[#aac6eb] bg-[#f8fbff] text-xs transition hover:border-[#1671f8] hover:bg-[#f2f7ff]"
              >
                <span className="mb-2 flex size-9 items-center justify-center rounded-full bg-[#dceaff] text-[#1671f8]">
                  <Upload className="size-5" />
                </span>
                <strong>Add images or videos</strong>
                <span className="mt-1 text-[10px] text-[#66758f]">
                  Drag and drop, or choose files to upload.
                </span>
              </button>
              <div>
                <p className="mb-2 text-[10px] font-semibold">
                  Choose media ratio
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    "1:1 Square",
                    "4:5 Vertical",
                    "9:16 Story",
                    "1.91:1 Wide",
                  ].map((x, i) => (
                    <label key={x} className="group block cursor-pointer">
                      <input
                        type="radio"
                        name="media-ratio"
                        defaultChecked={i === 0}
                        className="sr-only"
                      />
                      <span className="flex h-16 items-center justify-center rounded-md border border-[#d8e1ec] text-center text-[10px] font-semibold transition group-has-[:checked]:border-[#1671f8] group-has-[:checked]:bg-[#f2f7ff] group-has-[:checked]:text-[#0769e8] group-has-[:focus-visible]:ring-2 group-has-[:focus-visible]:ring-[#1671f8]/40">
                        {x}
                      </span>
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => toast.success("Opening the media uploader…")}
                  className="mt-3 rounded-md bg-[#1671f8] px-4 py-2 text-[10px] font-bold text-white transition hover:bg-[#075ed8]"
                >
                  Upload Media
                </button>
              </div>
            </div>
          </Card>
          <div className="grid grid-cols-2 gap-3">
            <Card
              title="Copy & Messaging"
              icon={<FileText className="size-5" />}
            >
              <Field label="Primary Text">
                <textarea
                  className={`${input} h-16 py-2`}
                  defaultValue="Skincare that works with your skin. Clean ingredients. Real results."
                />
              </Field>
              <Field label="Headline">
                <input
                  className={input}
                  defaultValue="Glow Brighter, Naturally"
                />
              </Field>
            </Card>
            <Card title="Call to Action" icon={<Target className="size-5" />}>
              <Field label="Call to Action">
                <Select>
                  <option>Learn More</option>
                  <option>Get Quote</option>
                </Select>
              </Field>
              <Field label="Destination URL">
                <input
                  className={input}
                  placeholder="https://yourwebsite.com"
                />
              </Field>
            </Card>
          </div>
        </div>
        <LiveAdPreview />
      </div>
    </div>
  );
}

function EditIcon() {
  return <Settings2 className="size-4" />;
}
const PREVIEW_SURFACES = [
  "Facebook Feed",
  "Facebook Story",
  "Facebook Reel",
  "Instagram Feed",
  "Instagram Story",
  "Instagram Reel",
] as const;

function LiveAdPreview() {
  const [surface, setSurface] = useState<(typeof PREVIEW_SURFACES)[number]>(
    "Facebook Feed",
  );

  return (
    <Card
      title="Meta Placement Preview"
      sub="Preview across Facebook and Instagram placements."
      icon={<Monitor className="size-5" />}
      className="sticky top-0"
    >
      <div className="mb-3 grid grid-cols-3 gap-1">
        {PREVIEW_SURFACES.map((x) => (
          <button
            key={x}
            type="button"
            onClick={() => setSurface(x)}
            aria-pressed={surface === x}
            className={`rounded px-1 py-1.5 text-[8px] font-semibold transition ${surface === x ? "bg-[#e8f1ff] text-[#0769e8]" : "bg-[#f2f4f7] hover:bg-[#e8ebef]"}`}
          >
            {x}
          </button>
        ))}
      </div>
      <div className="mx-auto max-w-[280px] overflow-hidden rounded-[24px] border-[5px] border-[#19202b] bg-white shadow-lg">
        <div className="p-3 text-[10px]">
          <strong>Namo Gange Trust</strong>
          <p className="mt-2">
            Skincare that works with your skin. 🌿
            <br />
            Clean ingredients. Real results.
          </p>
        </div>
        <div className="relative h-52 overflow-hidden">
          <Image
            src="/images/ads-manager/skincare-serum.png"
            alt="Amber skincare serum campaign creative"
            fill
            sizes="280px"
            className="object-cover"
          />
        </div>
        <div className="p-3">
          <p className="text-[9px] text-[#66758f]">META INSTANT FORM</p>
          <div className="flex justify-between gap-2">
            <strong className="text-xs">Glow Brighter, Naturally</strong>
            <span className="shrink-0 self-center rounded bg-[#e8ebef] px-2 py-1 text-[9px] font-bold">
              Learn More
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function FormStep() {
  const questions = [
    "Full Name",
    "Phone Number",
    "Email Address",
    "Project Type",
    "Estimated Budget",
    "Project Timeline",
    "Preferred City",
  ];
  return (
    <div className="w-full">
      <Heading
        title="Instant Form Builder"
        sub="Build the lead form people will complete after clicking your ad."
      />
      <div className="grid grid-cols-[1fr_290px] gap-3">
        <div className="space-y-2.5">
          <Card title="Form Basics" icon={<FileText className="size-5" />}>
            <div className="grid grid-cols-[1.2fr_.8fr_.7fr] items-end gap-3">
              <Field label="Form Name">
                <input
                  className={input}
                  defaultValue="Home Renovation Leads - Sep 2026"
                />
              </Field>
              <Field label="Language">
                <Select>
                  <option>English (India)</option>
                  <option>Hindi</option>
                </Select>
              </Field>
              <label className="flex h-9 items-center justify-between rounded-md border border-[#cfd9e6] px-3 text-[10px] font-semibold">Save as Template <input type="checkbox" /></label>
            </div>
          </Card>
          <Card title="Form Type" sub="Choose the balance between lead volume and intent." icon={<Target className="size-5" />}>
            <div className="grid grid-cols-2 gap-3"><Choice group="form-type" selected title="Higher Intent" sub="More thoughtful responses with a review step" badge="Recommended"/><Choice group="form-type" title="More Volume" sub="A shorter form designed to capture more leads"/></div>
          </Card>
          <Card
            title="Intro / Welcome Screen"
            icon={<ImageIcon className="size-5" />}
          >
            <div className="grid grid-cols-[150px_1fr] gap-3">
              <div className="relative h-24 overflow-hidden rounded-md">
                <Image
                  src="/images/ads-manager/renovation-home.png"
                  alt="Modern renovated home"
                  fill
                  sizes="150px"
                  className="object-cover"
                />
              </div>
              <div>
                <Field label="Headline">
                  <input
                    className={input}
                    defaultValue="Get a Free Home Renovation Quote"
                  />
                </Field>
                <Field label="Supporting Text">
                  <textarea
                    className={`${input} mt-2 h-12 py-2`}
                    defaultValue="Tell us about your project and we'll get back to you with a personalized estimate."
                  />
                </Field>
              </div>
            </div>
          </Card>
          <Card
            title="3. Questions"
            icon={<ClipboardCheck className="size-5" />}
          >
            <div className="divide-y divide-[#e5eaf1]">
              {questions.map((q, i) => (
                <div
                  key={q}
                  className="flex items-center gap-3 py-1.5 text-[10px]"
                >
                  <span className="text-[#94a3b8]">⠿</span>
                  <strong className="flex-1">{q}</strong>
                  <span className="rounded bg-[#eef2f6] px-2 py-0.5 text-[#5d6b82]">
                    {i < 3 ? "Standard field" : "Custom question"}
                  </span>
                  <span className="w-16 text-[#66758f]">
                    {i === 5 || i === 6 ? "Optional" : "Required"}
                  </span>
                  <span>•••</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => toast.success("Question added to this form")}
              className="mt-2 flex items-center gap-1 text-[10px] font-bold text-[#0769e8] hover:underline"
            >
              <Plus className="size-3" />
              Add Question
            </button>
          </Card>
          <div className="grid grid-cols-2 gap-3">
            <Card
              title="Qualification"
              icon={<Target className="size-5" />}
            >
              <p className="text-[10px] text-[#66758f]">
                Budget range is at least ₹ 5,00,000
              </p>
            </Card>
            <Card
              title="Privacy & Consent"
              icon={<ShieldCheck className="size-5" />}
            >
              <input
                className={input}
                defaultValue="https://yourwebsite.com/privacy"
              />
            </Card>
          </div>
          <Card title="Thank You Screen" sub="Show a clear confirmation and next action after submission." icon={<CheckCircle2 className="size-5" />}>
            <div className="grid grid-cols-3 gap-3"><Field label="Headline"><input className={input} defaultValue="Thank you for your interest!"/></Field><Field label="CTA Button"><Select><option>Visit Website</option><option>Call Now</option><option>WhatsApp</option><option>Download Brochure</option></Select></Field><Field label="CTA URL"><input className={input} defaultValue="https://www.namogange.org"/></Field></div>
          </Card>
        </div>
        <FormPreview />
      </div>
    </div>
  );
}
function FormPreview() {
  return (
    <Card
      title="Live Preview"
      icon={<Monitor className="size-5" />}
      className="sticky top-0"
    >
      <div className="mx-auto overflow-hidden rounded-[26px] border-[5px] border-[#1c232c] bg-white shadow-lg">
        <div className="relative h-28">
          <Image
            src="/images/ads-manager/renovation-home.png"
            alt="Modern renovated home form cover"
            fill
            sizes="270px"
            className="object-cover"
          />
        </div>
        <div className="p-3">
          <h3 className="text-center text-base font-bold leading-tight">
            Get a Free Home
            <br />
            Renovation Quote
          </h3>
          <p className="mt-2 text-center text-[9px] text-[#66758f]">
            Tell us about your project and we'll get back to you.
          </p>
          <div className="mt-4 space-y-2">
            {[
              "Full Name *",
              "Phone Number *",
              "Email Address *",
              "Project Type *",
            ].map((x) => (
              <div key={x}>
                <p className="text-[8px]">{x}</p>
                <div className="mt-0.5 h-7 rounded border border-[#d5deea]" />
              </div>
            ))}
          </div>
          <span className="mt-3 block w-full rounded bg-[#126df3] py-2 text-center text-[10px] font-bold text-white">
            Next
          </span>
        </div>
      </div>
    </Card>
  );
}

function ReviewStep() {
  return (
    <div className="w-full">
      <Heading
        title="Review & Publish"
        sub="Validate your campaign, fix issues, and publish to Facebook."
      />
      <Card
        title="Publish Readiness Summary"
        sub="Your campaign is ready to publish with minor improvements."
        icon={<FileText className="size-5" />}
      >
        <div className="flex items-center gap-6">
          <div className="flex size-20 items-center justify-center rounded-full border-[8px] border-[#12a85c]">
            <strong className="text-2xl">
              92
              <span className="block text-center text-xs text-[#66758f]">
                /100
              </span>
            </strong>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold">Almost ready to publish!</h3>
            <p className="mt-1 text-xs text-[#66758f]">
              Your campaign looks great. Fix the warnings below to get the best
              possible results.
            </p>
          </div>
          <div className="rounded-lg bg-[#eafbf2] p-4 text-[#079455]">
            <strong className="flex items-center gap-2">
              <CheckCircle2 />
              Ready to Publish
            </strong>
            <p className="mt-1 text-[10px]">
              No blocking issues. You can publish your campaign now.
            </p>
          </div>
        </div>
      </Card>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {[
          [Megaphone, "Campaign", "Leads | Auction"],
          [Database, "Budget", "Daily Budget: ₹1,000 INR"],
          [Grid2X2, "Ad Set", "Audience, Placements, Schedule"],
          [Users, "Audience", "Potential reach: 12M – 18M"],
          [FileImage, "Ad Creative", "1 ad using image"],
          [Monitor, "Placements", "4 placements"],
          [FileText, "Instant Form", "Lead form with 5 questions"],
          [BarChart3, "Tracking", "Meta Pixel + Conversions API"],
        ].map(([I, t, s]) => {
          const Icon = I as typeof Megaphone;
          return (
            <div
              key={String(t)}
              className="flex items-center gap-3 rounded-lg border border-[#dce4ee] bg-white p-3"
            >
              <Icon className="size-5 text-[#1671f8]" />
              <div className="flex-1">
                <strong className="text-xs">{String(t)}</strong>
                <p className="text-[10px] text-[#66758f]">{String(s)}</p>
              </div>
              <span className="rounded-full bg-[#dcf8e8] px-2 py-1 text-[9px] font-bold text-[#079455]">
                Complete
              </span>
              <ChevronRight className="size-4 text-[#66758f]" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RightRail({ step }: { step: Step }) {
  const isReview = step === "review";
  const checklist =
    step === "campaign"
      ? [
          "Campaign basics",
          "Budget & bid strategy",
          "Optimization settings",
          "Ad Set pending",
          "Ad pending",
          "Review pending",
        ]
      : step === "adset"
        ? [
            "Ad set basics",
            "Audience targeting",
            "Placements",
            "Schedule",
            "Delivery settings",
          ]
        : step === "ad"
          ? [
              "Ad identity",
              "Creative upload",
              "Primary text & headline",
              "Destination & tracking",
              "Placement compatibility",
            ]
          : step === "form"
            ? [
                "Form basics",
                "Form type",
                "Intro / welcome screen",
                "Questions",
                "Qualification",
                "Privacy & consent",
                "Thank you screen",
              ]
            : ["Campaign", "Ad Set", "Ad creative", "Instant form", "Tracking"];
  const completeCount =
    step === "campaign"
      ? 1
      : step === "adset"
        ? 2
        : step === "ad"
          ? 4
          : step === "form"
            ? 6
            : checklist.length;
  return (
    <div className="space-y-2.5">
      <RailCard className="sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">
            {step === "adset"
              ? "Audience Quality Score"
              : step === "ad"
                ? "Creative Quality Score"
                : step === "form"
                  ? "Form Quality Score"
                  : step === "review"
                    ? "Final Readiness Score"
                    : "Campaign Score"}{" "}
            <Info className="inline size-3.5 text-[#66758f]" />
          </p>
          <span className="rounded bg-[#dcf8e8] px-2 py-1 text-[9px] font-bold text-[#079455]">
            {isReview ? "Ready" : "Great"}
          </span>
        </div>
        <div className="mt-2 text-3xl font-bold text-[#08a657]">
          {step === "campaign"
            ? "78"
            : step === "adset"
              ? "82"
              : step === "review"
                ? "96"
                : "92"}
          <span className="text-lg text-[#7f8aa1]">/100</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded bg-[#e5eaf1]">
          <div className="h-full w-[88%] bg-[#08a657]" />
        </div>
        <p className="mt-2 text-[10px] text-[#66758f]">
          This score is estimated from your current setup and selected options.
        </p>
      </RailCard>
      <RailCard>
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-xs font-bold">
            <Grid2X2 className="size-4 text-[#1671f8]" />
            Validation Issues
          </p>
          <span className="text-[9px] text-[#66758f]">
            0 blocking · <b className="text-amber-600">1 warning</b>
          </span>
        </div>
        <div className="mt-3 flex gap-3 rounded-md border border-[#f4d99d] bg-[#fffaf0] p-3">
          <AlertTriangle className="size-5 shrink-0 text-[#efa413]" />
          <div>
            <p className="text-[10px] font-bold">
              Consider adding a campaign image
            </p>
            <p className="mt-1 text-[9px] leading-relaxed text-[#66758f]">
              An eye-catching image can improve performance across placements.
            </p>
          </div>
        </div>
      </RailCard>
      <RailCard>
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-xs font-bold">
            <ClipboardCheck className="size-4 text-[#1671f8]" />
            {isReview ? "Publish Checklist" : "Setup Checklist"}
          </p>
          <span className="text-[9px] text-[#66758f]">
            {completeCount} of {checklist.length} complete
          </span>
        </div>
        <div className="mt-3 space-y-2">
          {checklist.map((x, i) => (
            <div key={x} className="flex items-center gap-2 text-[10px]">
              <span
                className={`flex size-4 items-center justify-center rounded-full ${i < completeCount ? "bg-[#10a85e] text-white" : "border border-[#9aa7ba]"}`}
              >
                {i < completeCount && <Check className="size-3" />}
              </span>
              <span className="flex-1">{x}</span>
              <span className="text-[#66758f]">
                {i < completeCount ? "Completed" : "Pending"}
              </span>
            </div>
          ))}
        </div>
      </RailCard>
      <RailCard>
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-xs font-bold">
            <Lightbulb className="size-4 text-amber-500" />
            Recommendations
          </p>
          <span className="text-[9px] text-[#66758f]">3 suggestions</span>
        </div>
        <div className="mt-3 divide-y divide-[#e5eaf1]">
          {[
            "Try Advantage+ Placements",
            "Add a lookalike audience",
            "Use multiple ad creatives",
          ].map((x, i) => (
            <div key={x} className="flex gap-2 py-2">
              <span className="flex size-7 items-center justify-center rounded bg-[#e8f1ff] text-[#1671f8]">
                {i === 0 ? (
                  <BarChart3 className="size-4" />
                ) : i === 1 ? (
                  <Users className="size-4" />
                ) : (
                  <ImageIcon className="size-4" />
                )}
              </span>
              <div className="flex-1">
                <p className="text-[10px] font-bold">{x}</p>
                <p className="mt-0.5 text-[9px] text-[#66758f]">
                  Improve campaign performance with this recommendation.
                </p>
              </div>
              <button
                type="button"
                onClick={() => toast.success(`${x} enabled`)}
                className="text-[9px] font-bold text-[#0769e8] hover:underline"
              >
                Enable
              </button>
            </div>
          ))}
        </div>
      </RailCard>
    </div>
  );
}
function RailCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-[#dce4ee] bg-white p-3.5 shadow-[0_1px_3px_rgba(15,23,42,.03)] ${className}`}
    >
      {children}
    </section>
  );
}
