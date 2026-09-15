"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Globe2,
  Send,
  CheckCircle2,
  Layout,
  SearchCheck,
  ExternalLink,
  Clock,
  FileText,
  Calendar,
  HeartHandshake,
  Smartphone,
  Laptop,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import RichTextEditor from "@/components/layout/rich-text-editor";

/* ─── SHARED BOX ─── */
function Box({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-sm border border-slate-200 bg-white shadow-xs flex flex-col transition-all hover:shadow-md", className)}>
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4">
        <h2 className="text-xs font-bold tracking-wider text-slate-800 uppercase">{title}</h2>
        {action && <div className="text-xs font-semibold text-slate-500 flex items-center gap-1">{action}</div>}
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin]">{children}</div>
    </section>
  );
}

const TEMPLATES = [
  {
    id: "standard",
    label: "Standard Content",
    desc: "Clean article & information layout with header and sidebar",
    icon: FileText,
  },
  {
    id: "landing",
    label: "Landing Page / Hero",
    desc: "High conversion layout with hero banner, CTAs, and trust metrics",
    icon: Layout,
  },
  {
    id: "donation",
    label: "Donation Appeal",
    desc: "Targeted fundraising page with donation tiers and progress meter",
    icon: HeartHandshake,
  },
  {
    id: "event",
    label: "Event & Volunteer",
    desc: "Event registration with date, location, RSVP form, and countdown",
    icon: Calendar,
  },
];

export default function CreateWebsitePage() {
  const router = useRouter();

  // Basic Details
  const [title, setTitle] = useState("Clean Ganga Youth Leadership Summit 2025");
  const [slug, setSlug] = useState("youth-leadership-summit-2025");
  const [parentPage, setParentPage] = useState("events");
  const [template, setTemplate] = useState("landing");
  const [status] = useState<"Published" | "Draft" | "Scheduled">("Published");

  // Content (Rich Text Editor)
  const [content, setContent] = useState(
    "<h2><b>Empowering the Next Generation of River Guardians</b></h2><p><br></p><p>Join <b>1,000+ student leaders</b>, environmental researchers, and grassroots activists for a 2-day immersive summit along the banks of the sacred Ganga. Together, we are building technology-driven waste management systems and riverfront reforestation drives.</p><p><br></p><ul><li><b>Hands-on Riverfront Restoration</b> workshops in Rishikesh and Haridwar</li><li>Direct mentorship with senior environmental policymakers</li><li>Certification of Ecological Volunteerism from <b>Namo Gange Trust</b></li></ul>"
  );

  // SEO & Meta Configuration
  const [metaTitle, setMetaTitle] = useState("Clean Ganga Youth Summit 2025 | Namo Gange Trust");
  const [metaDescription, setMetaDescription] = useState(
    "Register for the Clean Ganga Youth Leadership Summit 2025. Join 1,000+ passionate volunteers in hands-on river restoration, workshops, and policy dialogues."
  );
  const [canonicalUrl, setCanonicalUrl] = useState("https://namogangetrust.org/events/youth-leadership-summit-2025");
  const [allowIndexing, setAllowIndexing] = useState(true);

  // Layout & Visibility Settings
  const [showHeader, setShowHeader] = useState(true);
  const [showFooter, setShowFooter] = useState(true);
  const [enableComments, setEnableComments] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [isPublishing, setIsPublishing] = useState(false);

  // Auto-slug sync
  const handleTitleChange = (val: string) => {
    setTitle(val);
    const generatedSlug = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    setSlug(generatedSlug);
    setMetaTitle(`${val} | Namo Gange Trust`);
    setCanonicalUrl(`https://namogangetrust.org/${parentPage ? `${parentPage}/` : ""}${generatedSlug}`);
  };

  const handlePublish = (targetStatus: "Published" | "Draft") => {
    if (!title.trim()) {
      toast.error("Please enter a valid page title");
      return;
    }
    setIsPublishing(true);
    setTimeout(() => {
      setIsPublishing(false);
      toast.success(
        targetStatus === "Published" ? "Page Published Successfully!" : "Draft Saved Successfully!",
        {
          description: `namogangetrust.org/${parentPage ? `${parentPage}/` : ""}${slug} is now ${targetStatus.toLowerCase()}.`,
        }
      );
      router.push("/admin/website");
    }, 800);
  };

  const fullUrl = `namogangetrust.org/${parentPage ? `${parentPage}/` : ""}${slug}`;

  return (
    <div className="pb-8">
      {/* Top Composer Action Bar */}
      <div className="-mx-4 -mt-5 mb-2 bg-white px-4 py-3 sm:-mx-5 sm:px-5 xl:-mx-6 xl:px-6 shadow-xs border-b border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/admin/website")}
              className="flex size-8 items-center justify-center rounded-sm border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
              title="Back to Website Dashboard"
            >
              <ArrowLeft className="size-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-900">New Website Page Configuration</h1>
                <span className="inline-flex items-center gap-1 rounded-sm bg-blue-50 px-2 py-0.5 text-[10.5px] font-bold text-blue-700 border border-blue-100">
                  <Globe2 className="size-3" /> namogangetrust.org
                </span>
                <span className="inline-flex items-center gap-1 rounded-sm bg-emerald-50 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700 border border-emerald-100">
                  SSL Production
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Configure page hierarchy, templates, RichText content, SEO metadata, and publishing parameters
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/admin/website")}
              className="flex h-8 items-center gap-1.5 rounded-sm border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Discard
            </button>
            <button
              onClick={() => handlePublish("Draft")}
              disabled={isPublishing}
              className="flex h-8 items-center gap-1.5 rounded-sm border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
            >
              Save Draft
            </button>
            <button
              onClick={() => handlePublish("Published")}
              disabled={isPublishing}
              className="flex h-8 items-center gap-1.5 rounded-sm bg-blue-600 hover:bg-blue-700 px-4 text-xs font-bold text-white shadow-xs transition-all active:scale-98 cursor-pointer"
            >
              <Send className="size-3.5" />
              <span>{isPublishing ? "Publishing..." : "Publish Page"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Config, Right Live Preview */}
      <div className="space-y-2 bg-slate-50/30 p-1 rounded-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-start">
          {/* Left Column: Configurations */}
          <div className="space-y-2 lg:col-span-7">
            {/* Box 1: Basic Page Info */}
            <Box title="Page Identity & Routing">
              <div className="p-3.5 space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Page Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="e.g. Clean Ganga Youth Leadership Summit 2025"
                    className="h-8.5 w-full rounded-sm border border-slate-200 px-3 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Parent Directory
                    </label>
                    <select
                      value={parentPage}
                      onChange={(e) => {
                        setParentPage(e.target.value);
                        setCanonicalUrl(`https://namogangetrust.org/${e.target.value ? `${e.target.value}/` : ""}${slug}`);
                      }}
                      className="h-8.5 w-full rounded-sm border border-slate-200 px-2.5 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">None (Root Domain /)</option>
                      <option value="events">Events (/events/)</option>
                      <option value="programs">Programs (/programs/)</option>
                      <option value="about">About Us (/about/)</option>
                      <option value="campaigns">Campaigns (/campaigns/)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      URL Permalink / Slug <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center h-8.5 rounded-sm border border-slate-200 bg-slate-50 px-2.5 focus-within:ring-1 focus-within:ring-blue-500 focus-within:bg-white">
                      <span className="text-[10.5px] font-semibold text-slate-400 select-none shrink-0">/</span>
                      <input
                        type="text"
                        value={slug}
                        onChange={(e) => {
                          setSlug(e.target.value);
                          setCanonicalUrl(`https://namogangetrust.org/${parentPage ? `${parentPage}/` : ""}${e.target.value}`);
                        }}
                        placeholder="page-slug"
                        className="h-full flex-1 border-0 bg-transparent px-1 text-xs font-mono font-medium text-blue-600 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-sm bg-blue-50/60 border border-blue-100 p-2 text-[11px] text-blue-800 flex items-center gap-2">
                  <ExternalLink className="size-3.5 text-blue-600 shrink-0" />
                  <span className="truncate">
                    Public Live URL: <b className="font-mono font-bold">https://{fullUrl}</b>
                  </span>
                </div>
              </div>
            </Box>

            {/* Box 2: Layout & Template */}
            <Box title="Page Layout & Template">
              <div className="p-3.5 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TEMPLATES.map((tmpl) => {
                    const Icon = tmpl.icon;
                    const isSelected = template === tmpl.id;
                    return (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => setTemplate(tmpl.id)}
                        className={cn(
                          "p-2.5 rounded-sm border text-left transition-all cursor-pointer flex items-start gap-2.5",
                          isSelected
                            ? "border-blue-600 bg-blue-50/70 shadow-2xs"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        )}
                      >
                        <div
                          className={cn(
                            "grid size-8 shrink-0 place-items-center rounded-sm",
                            isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                          )}
                        >
                          <Icon className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={cn("text-xs font-bold leading-tight", isSelected ? "text-blue-900" : "text-slate-800")}>
                            {tmpl.label}
                          </p>
                          <p className="text-[10px] text-slate-500 leading-snug mt-0.5">{tmpl.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </Box>

            {/* Box 3: RichText Content Area */}
            <Box
              title="Page Content & Body"
              action={
                <span className="text-[10.5px] text-slate-400 font-medium flex items-center gap-1">
                  <Clock className="size-3" /> Auto-saving enabled
                </span>
              }
            >
              <div className="p-3.5 space-y-2.5">
                <p className="text-[11px] text-slate-500">
                  Write and format your page content using headings, lists, bold highlights, alignment, and links.
                </p>
                <RichTextEditor
                  value={content}
                  onChange={setContent}
                  placeholder="Start drafting your website page content..."
                  minHeight="180px"
                  className="rounded-sm border-slate-200"
                />
              </div>
            </Box>

            {/* Box 4: SEO & Meta Tagging */}
            <Box
              title="SEO & Metadata Configuration"
              action={
                <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                  <SearchCheck className="size-3.5" /> SEO Score: 94/100
                </span>
              }
            >
              <div className="p-3.5 space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-bold text-slate-700">Meta Title Tag</label>
                    <span className={cn("text-[10.5px] font-mono", metaTitle.length > 60 ? "text-amber-600 font-bold" : "text-slate-400")}>
                      {metaTitle.length} / 60 chars
                    </span>
                  </div>
                  <input
                    type="text"
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    placeholder="Page Title - Brand Name"
                    className="h-8.5 w-full rounded-sm border border-slate-200 px-3 text-xs text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-bold text-slate-700">Meta Description</label>
                    <span className={cn("text-[10.5px] font-mono", metaDescription.length > 160 ? "text-amber-600 font-bold" : "text-slate-400")}>
                      {metaDescription.length} / 160 chars
                    </span>
                  </div>
                  <textarea
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    placeholder="Search engine summary..."
                    className="w-full min-h-[65px] rounded-sm border border-slate-200 p-2.5 text-xs text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Robots Meta Indexing</label>
                    <select
                      value={allowIndexing ? "index" : "noindex"}
                      onChange={(e) => setAllowIndexing(e.target.value === "index")}
                      className="h-8.5 w-full rounded-sm border border-slate-200 px-2 text-xs text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="index">Index, Follow (Recommended)</option>
                      <option value="noindex">Noindex, Nofollow (Hidden from search)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Canonical Tag</label>
                    <input
                      type="text"
                      value={canonicalUrl}
                      onChange={(e) => setCanonicalUrl(e.target.value)}
                      className="h-8.5 w-full rounded-sm border border-slate-200 px-2.5 text-xs font-mono text-slate-600 bg-slate-50 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </Box>

            {/* Box 5: Page Visibility & Navigation */}
            <Box title="Display Settings & Visibility">
              <div className="p-3.5 space-y-2.5">
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 p-2 rounded-sm border border-slate-200 bg-white cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={showHeader}
                      onChange={(e) => setShowHeader(e.target.checked)}
                      className="rounded-xs text-blue-600 focus:ring-0"
                    />
                    <span className="text-xs font-semibold text-slate-700">Site Header</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-sm border border-slate-200 bg-white cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={showFooter}
                      onChange={(e) => setShowFooter(e.target.checked)}
                      className="rounded-xs text-blue-600 focus:ring-0"
                    />
                    <span className="text-xs font-semibold text-slate-700">Site Footer</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-sm border border-slate-200 bg-white cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={enableComments}
                      onChange={(e) => setEnableComments(e.target.checked)}
                      className="rounded-xs text-blue-600 focus:ring-0"
                    />
                    <span className="text-xs font-semibold text-slate-700">Feedback / Form</span>
                  </label>
                </div>
              </div>
            </Box>
          </div>

          {/* Right Column: Live Previews */}
          <div className="space-y-2 lg:col-span-5">
            {/* Live Web Page Preview Box */}
            <Box
              title="Live Website Preview"
              action={
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("desktop")}
                    className={cn(
                      "p-1 rounded-sm transition-colors",
                      previewDevice === "desktop" ? "bg-blue-100 text-blue-700" : "text-slate-400 hover:text-slate-600"
                    )}
                    title="Desktop View"
                  >
                    <Laptop className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("mobile")}
                    className={cn(
                      "p-1 rounded-sm transition-colors",
                      previewDevice === "mobile" ? "bg-blue-100 text-blue-700" : "text-slate-400 hover:text-slate-600"
                    )}
                    title="Mobile View"
                  >
                    <Smartphone className="size-3.5" />
                  </button>
                </div>
              }
            >
              <div className="p-3 space-y-3 bg-slate-100/60">
                {/* Browser Mockup Window */}
                <div
                  className={cn(
                    "mx-auto bg-white rounded-sm border border-slate-200 shadow-md overflow-hidden transition-all",
                    previewDevice === "mobile" ? "max-w-[320px]" : "w-full"
                  )}
                >
                  {/* Browser Bar */}
                  <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-100 bg-slate-50 text-[10px] text-slate-500 font-mono">
                    <div className="flex gap-1">
                      <span className="size-2 rounded-full bg-rose-400" />
                      <span className="size-2 rounded-full bg-amber-400" />
                      <span className="size-2 rounded-full bg-emerald-400" />
                    </div>
                    <div className="flex-1 bg-white border border-slate-200 rounded-sm px-2 py-0.5 truncate text-[9.5px]">
                      https://{fullUrl}
                    </div>
                  </div>

                  {/* Simulated Header */}
                  {showHeader && (
                    <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-white">
                      <div className="flex items-center gap-1.5">
                        <div className="grid size-5 place-items-center rounded-sm bg-blue-600 text-white font-bold text-[9px]">
                          NG
                        </div>
                        <span className="text-[11px] font-bold text-slate-900">Namo Gange Trust</span>
                      </div>
                      <div className="flex gap-2 text-[10px] font-semibold text-slate-600">
                        <span>About</span>
                        <span>Programs</span>
                        <span>Donate</span>
                      </div>
                    </div>
                  )}

                  {/* Template Hero Banner */}
                  <div className="bg-gradient-to-r from-blue-900 to-indigo-950 p-4 text-white space-y-2">
                    <span className="inline-block rounded-xs bg-blue-500/30 border border-blue-400/40 px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase text-blue-200">
                      {template === "landing"
                        ? "Campaign Initiative"
                        : template === "donation"
                        ? "Fundraising Appeal"
                        : template === "event"
                        ? "Upcoming Event"
                        : "Official Publication"}
                    </span>
                    <h3 className="text-sm font-bold leading-tight">{title || "Untitled Website Page"}</h3>
                    <p className="text-[10px] text-slate-300 leading-snug">
                      Namo Gange Trust • Dedicated to Sustainable Ganga Conservation & Community Welfare
                    </p>
                  </div>

                  {/* Page Body Content Render */}
                  <div
                    className="p-3 text-[11px] leading-relaxed text-slate-800 break-words prose-xs [&_h2]:text-xs [&_h2]:font-bold [&_h2]:mb-1.5 [&_p]:mb-1.5 [&_ul]:list-disc [&_ul]:pl-3 [&_b]:font-bold [&_a]:text-blue-600"
                    dangerouslySetInnerHTML={{
                      __html: content || "<p class='text-slate-400 italic'>Your page content will render here...</p>",
                    }}
                  />

                  {/* CTA Banner based on template */}
                  {template === "landing" && (
                    <div className="m-3 p-2.5 rounded-sm bg-blue-50 border border-blue-200 text-center space-y-1">
                      <p className="text-xs font-bold text-blue-950">Join Our Mission Today</p>
                      <button className="h-7 px-3 rounded-sm bg-blue-600 hover:bg-blue-700 text-[10.5px] font-bold text-white shadow-2xs">
                        Register As Volunteer
                      </button>
                    </div>
                  )}

                  {template === "donation" && (
                    <div className="m-3 p-2.5 rounded-sm bg-emerald-50 border border-emerald-200 text-center space-y-1.5">
                      <p className="text-xs font-bold text-emerald-950">Contribute Towards Clean Rivers</p>
                      <div className="flex justify-center gap-1.5 text-[10px] font-bold">
                        <span className="px-2 py-0.5 rounded-xs bg-white border border-emerald-300 text-emerald-800">₹500</span>
                        <span className="px-2 py-0.5 rounded-xs bg-white border border-emerald-300 text-emerald-800">₹1,500</span>
                        <span className="px-2 py-0.5 rounded-xs bg-emerald-600 text-white">₹5,000</span>
                      </div>
                    </div>
                  )}

                  {/* Simulated Footer */}
                  {showFooter && (
                    <div className="px-3 py-2 border-t border-slate-100 bg-slate-50 text-[9.5px] text-slate-500 flex justify-between">
                      <span>© 2025 Namo Gange Trust</span>
                      <span>namogangetrust.org</span>
                    </div>
                  )}
                </div>
              </div>
            </Box>

            {/* Google SERP Snippet Preview Box */}
            <Box title="Google Search Engine Snippet">
              <div className="p-3.5 space-y-2 bg-white">
                <div className="flex items-center gap-2">
                  <div className="size-4.5 rounded-full bg-slate-100 grid place-items-center text-[9px] font-bold text-blue-600">
                    G
                  </div>
                  <div className="leading-tight">
                    <p className="text-[11px] font-semibold text-slate-900">Namo Gange Trust</p>
                    <p className="text-[9.5px] text-slate-500 font-mono truncate">https://{fullUrl}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-[#1a0dab] hover:underline cursor-pointer leading-snug">
                    {metaTitle || "Page Title | Namo Gange Trust"}
                  </h4>
                  <p className="text-[11px] text-[#4d5156] leading-relaxed line-clamp-2 mt-0.5">
                    {metaDescription || "Provide an engaging meta description to summarize this page in search engine rankings."}
                  </p>
                </div>
              </div>
            </Box>

            {/* Launch Readiness Summary */}
            <Box title="Readiness & Audit">
              <div className="p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">SSL Security</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="size-3.5" /> 256-bit TLS Encrypted
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Mobile Responsiveness</span>
                  <span className="font-bold text-blue-600 flex items-center gap-1">
                    <CheckCircle2 className="size-3.5" /> Optimized (Viewport meta)
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">CDN Edge Caching</span>
                  <span className="font-bold text-purple-600 flex items-center gap-1">
                    <CheckCircle2 className="size-3.5" /> Global Edge Active
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-600 font-medium">Initial Status</span>
                  <span className="font-bold text-slate-900">{status}</span>
                </div>
              </div>
            </Box>
          </div>
        </div>
      </div>
    </div>
  );
}
