import { useEffect, useRef, useState } from "react";
import {
  Palette,
  Upload,
  Trash2,
  Lock,
  Eye,
  FileText,
  Check,
  Sparkles,
  Loader2,
  Mail,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { BrandingSettings } from "../settings-data/types";
import { useSettingsCapability } from "../settings-data/capability-provider";
import { useAuth } from "@/features/auth/components/auth-provider";
import { getStoredCompanyId } from "@/lib/api/tenancy-storage";
import {
  brandingApi,
  BRANDING_UPLOAD_LIMITS,
  describeBrandingError,
  isAssetConflict,
  isCompanyInactive,
  isFileTooLarge,
  isStorageUnavailable,
  type BrandingPurpose,
} from "../live/branding-api";
import { cn } from "@/lib/utils/cn";

interface BrandingSectionProps {
  data: BrandingSettings;
  onChange: (partial: Partial<BrandingSettings>) => void;
}

type PreviewTab = "sidebar" | "report" | "email";

const PURPOSE_LABEL_MAP: Record<BrandingPurpose, string> = {
  logo: "Header / Sidebar Logo",
  favicon: "Browser Favicon",
  "report-logo": "PDF & Report Logo",
  "email-logo": "Email Header Logo",
};

function formatMaxBytes(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${Math.round((bytes / (1024 * 1024)) * 10) / 10}MB` : `${Math.round(bytes / 1024)}KB`;
}

export function BrandingSection({ data, onChange }: BrandingSectionProps) {
  const { capabilities } = useSettingsCapability();
  const { user } = useAuth();
  const [activePreview, setActivePreview] = useState<PreviewTab>("sidebar");

  const logoRef = useRef<HTMLInputElement>(null);
  const faviconRef = useRef<HTMLInputElement>(null);
  const reportLogoRef = useRef<HTMLInputElement>(null);
  const emailLogoRef = useRef<HTMLInputElement>(null);

  const [assetIds, setAssetIds] = useState<{
    logo?: string;
    favicon?: string;
    reportLogo?: string;
    emailLogo?: string;
  }>({});

  const [uploadingPurpose, setUploadingPurpose] = useState<BrandingPurpose | null>(null);
  const [deletingPurpose, setDeletingPurpose] = useState<BrandingPurpose | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // RBAC: OWNER / ADMIN have write access; MANAGER / VIEWER are read-only
  const activeCompanyId = getStoredCompanyId();
  const activeMembership = user?.memberships?.find((m) => m.companyId === activeCompanyId) ?? user?.memberships?.[0];
  const systemRole = activeMembership?.systemRole;
  const isReadOnly = (systemRole && systemRole !== "OWNER" && systemRole !== "ADMIN") || !capabilities.canEditBranding;

  // Initial load from live backend API
  useEffect(() => {
    let active = true;

    brandingApi
      .get()
      .then((res) => {
        if (!active) return;
        onChange({
          logo: res.logo?.url || "",
          favicon: res.favicon?.url || "",
          reportLogo: res.reportLogo?.url || "",
          emailLogo: res.emailLogo?.url || "",
        });
        setAssetIds({
          logo: res.logo?.id,
          favicon: res.favicon?.id,
          reportLogo: res.reportLogo?.id,
          emailLogo: res.emailLogo?.id,
        });
      })
      .catch((err: unknown) => {
        if (!active) return;
        setLoadError(describeBrandingError(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleAssetUpload = async (purpose: BrandingPurpose, file?: File) => {
    if (!file) return;

    const limits = BRANDING_UPLOAD_LIMITS[purpose];
    if (file.size > limits.maxBytes) {
      toast.error("File is too large", {
        description: `This slot accepts images up to ${formatMaxBytes(limits.maxBytes)}.`,
      });
      return;
    }

    if (file.type && !limits.mimeTypes.includes(file.type)) {
      toast.error("Unsupported format", {
        description: `Use ${limits.mimeTypes.map((mime) => mime.replace("image/", "").toUpperCase()).join(" / ")} for this slot.`,
      });
      return;
    }

    const fieldKey =
      purpose === "report-logo"
        ? "reportLogo"
        : purpose === "email-logo"
          ? "emailLogo"
          : purpose;

    const currentAssetId = assetIds[fieldKey];

    setUploadingPurpose(purpose);
    try {
      const res = await brandingApi.upload(purpose, file, {
        replacesAssetId: currentAssetId,
      });

      const updated = res[fieldKey];
      onChange({ [fieldKey]: updated?.url || "" });
      setAssetIds((prev) => ({ ...prev, [fieldKey]: updated?.id }));
      toast.success(`${PURPOSE_LABEL_MAP[purpose]} updated successfully.`);
    } catch (err: unknown) {
      if (isAssetConflict(err)) {
        toast.error("Branding Slot Modified", {
          description: "This branding slot was changed by someone else. Reloading latest...",
        });
        try {
          const latest = await brandingApi.get();
          onChange({
            logo: latest.logo?.url || "",
            favicon: latest.favicon?.url || "",
            reportLogo: latest.reportLogo?.url || "",
            emailLogo: latest.emailLogo?.url || "",
          });
          setAssetIds({
            logo: latest.logo?.id,
            favicon: latest.favicon?.id,
            reportLogo: latest.reportLogo?.id,
            emailLogo: latest.emailLogo?.id,
          });
        } catch {
          // ignore secondary failure
        }
      } else if (isFileTooLarge(err)) {
        toast.error("File Too Large", {
          description: `This slot accepts images up to ${formatMaxBytes(limits.maxBytes)}.`,
        });
      } else if (isStorageUnavailable(err)) {
        toast.error("Storage Unavailable", {
          description: "Image storage is temporarily unavailable. Please try again.",
        });
      } else if (isCompanyInactive(err)) {
        toast.error("Company Inactive", {
          description: describeBrandingError(err),
        });
      } else {
        toast.error("Upload Failed", { description: describeBrandingError(err) });
      }
    } finally {
      setUploadingPurpose(null);
    }
  };

  const handleAssetRemove = async (purpose: BrandingPurpose) => {
    const fieldKey =
      purpose === "report-logo"
        ? "reportLogo"
        : purpose === "email-logo"
          ? "emailLogo"
          : purpose;

    setDeletingPurpose(purpose);
    try {
      await brandingApi.remove(purpose);
      onChange({ [fieldKey]: "" });
      setAssetIds((prev) => ({ ...prev, [fieldKey]: undefined }));
      toast.success(`${PURPOSE_LABEL_MAP[purpose]} removed.`);
    } catch (err: unknown) {
      if (isStorageUnavailable(err)) {
        toast.error("Storage Unavailable", {
          description: "Image storage is temporarily unavailable. Please try again.",
        });
      } else {
        toast.error("Remove Failed", { description: describeBrandingError(err) });
      }
    } finally {
      setDeletingPurpose(null);
    }
  };

  const PRESET_COLORS = ["#10B981", "#2563EB", "#7C3AED", "#EA580C", "#0891B2", "#E11D48", "#111C3A"];

  return (
    <div className="space-y-2">
      {/* SECTION 1: ASSETS & COLOR PALETTE */}
      <section className="bg-white rounded-xl border border-[#DDE4ED] shadow-xs p-3 space-y-2 hover:border-[#CBD5E1] transition-all">
        <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-lg bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] text-white flex items-center justify-center shadow-xs shrink-0">
              <Palette className="size-3.5" />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-[#0F172A]">Visual Brand Identity</h3>
              <p className="text-[10.5px] text-[#64748B] font-normal leading-relaxed">
                Configure logos, colors, and typography displayed across reports, emails, and exports.
              </p>
            </div>
          </div>
          {isReadOnly && (
            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
              View Only
            </span>
          )}
        </div>

        {loadError && (
          <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-700">
            <AlertCircle className="size-3.5 shrink-0" />
            <span>{loadError}</span>
          </div>
        )}

        {/* Upload Cards Grid: 4 slots */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {/* 1. Main Logo */}
          <div className="p-2.5 bg-[#F8FAFD] border border-[#DDE4ED] rounded-xl space-y-1.5 shadow-2xs">
            <div className="text-[11.5px] font-bold text-[#1E293B]">Header / Sidebar Logo</div>
            <div className="h-14 rounded-lg bg-white border border-[#DDE4ED] flex items-center justify-center overflow-hidden p-1.5 shadow-2xs">
              {loading ? (
                <Loader2 className="size-4 animate-spin text-slate-400" />
              ) : data.logo ? (
                <img src={data.logo} alt="Logo" className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="text-[10px] text-[#94A3B8] font-normal">No logo uploaded</span>
              )}
            </div>
            <p className="text-[9.5px] text-[#64748B] font-normal">PNG / JPEG / WebP • Max 5MB</p>
            <input
              ref={logoRef}
              type="file"
              accept={BRANDING_UPLOAD_LIMITS.logo.mimeTypes.join(",")}
              className="hidden"
              onChange={(e) => void handleAssetUpload("logo", e.target.files?.[0])}
            />
            <div className="flex items-center gap-1 pt-0.5">
              <button
                type="button"
                onClick={() => logoRef.current?.click()}
                disabled={isReadOnly || uploadingPurpose === "logo"}
                className="flex-1 py-1 px-2 bg-white border border-[#CBD5E1] rounded-md text-[10.5px] font-semibold text-[#1E293B] hover:bg-slate-50 flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 shadow-2xs transition-colors"
              >
                {uploadingPurpose === "logo" ? (
                  <Loader2 className="size-3 animate-spin text-[#2563EB]" />
                ) : (
                  <Upload className="size-3 text-[#2563EB]" />
                )}
                {uploadingPurpose === "logo" ? "Uploading..." : "Upload"}
              </button>
              {data.logo && (
                <button
                  type="button"
                  onClick={() => void handleAssetRemove("logo")}
                  disabled={isReadOnly || deletingPurpose === "logo"}
                  className="p-1 text-red-500 hover:bg-red-50 rounded-md cursor-pointer disabled:opacity-50 transition-colors"
                  title="Remove logo"
                >
                  {deletingPurpose === "logo" ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Trash2 className="size-3" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* 2. Favicon */}
          <div className="p-2.5 bg-[#F8FAFD] border border-[#DDE4ED] rounded-xl space-y-1.5 shadow-2xs">
            <div className="text-[11.5px] font-bold text-[#1E293B]">Browser Favicon</div>
            <div className="h-14 rounded-lg bg-white border border-[#DDE4ED] flex items-center justify-center overflow-hidden p-1.5 shadow-2xs">
              {loading ? (
                <Loader2 className="size-4 animate-spin text-slate-400" />
              ) : data.favicon ? (
                <img src={data.favicon} alt="Favicon" className="size-7 rounded object-cover" />
              ) : (
                <span className="text-[10px] text-[#94A3B8] font-normal">No favicon</span>
              )}
            </div>
            <p className="text-[9.5px] text-[#64748B] font-normal">Square • PNG / WebP • Max 512KB</p>
            <input
              ref={faviconRef}
              type="file"
              accept={BRANDING_UPLOAD_LIMITS.favicon.mimeTypes.join(",")}
              className="hidden"
              onChange={(e) => void handleAssetUpload("favicon", e.target.files?.[0])}
            />
            <div className="flex items-center gap-1 pt-0.5">
              <button
                type="button"
                onClick={() => faviconRef.current?.click()}
                disabled={isReadOnly || uploadingPurpose === "favicon"}
                className="flex-1 py-1 px-2 bg-white border border-[#CBD5E1] rounded-md text-[10.5px] font-semibold text-[#1E293B] hover:bg-slate-50 flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 shadow-2xs transition-colors"
              >
                {uploadingPurpose === "favicon" ? (
                  <Loader2 className="size-3 animate-spin text-[#2563EB]" />
                ) : (
                  <Upload className="size-3 text-[#2563EB]" />
                )}
                {uploadingPurpose === "favicon" ? "Uploading..." : "Upload"}
              </button>
              {data.favicon && (
                <button
                  type="button"
                  onClick={() => void handleAssetRemove("favicon")}
                  disabled={isReadOnly || deletingPurpose === "favicon"}
                  className="p-1 text-red-500 hover:bg-red-50 rounded-md cursor-pointer disabled:opacity-50 transition-colors"
                  title="Remove favicon"
                >
                  {deletingPurpose === "favicon" ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Trash2 className="size-3" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* 3. Report Logo */}
          <div className="p-2.5 bg-[#F8FAFD] border border-[#DDE4ED] rounded-xl space-y-1.5 shadow-2xs">
            <div className="text-[11.5px] font-bold text-[#1E293B]">PDF & Report Logo</div>
            <div className="h-14 rounded-lg bg-white border border-[#DDE4ED] flex items-center justify-center overflow-hidden p-1.5 shadow-2xs">
              {loading ? (
                <Loader2 className="size-4 animate-spin text-slate-400" />
              ) : data.reportLogo ? (
                <img src={data.reportLogo} alt="Report Logo" className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="text-[10px] text-[#94A3B8] font-normal">Matches main logo</span>
              )}
            </div>
            <p className="text-[9.5px] text-[#64748B] font-normal">PNG / JPEG / WebP • Max 5MB</p>
            <input
              ref={reportLogoRef}
              type="file"
              accept={BRANDING_UPLOAD_LIMITS["report-logo"].mimeTypes.join(",")}
              className="hidden"
              onChange={(e) => void handleAssetUpload("report-logo", e.target.files?.[0])}
            />
            <div className="flex items-center gap-1 pt-0.5">
              <button
                type="button"
                onClick={() => reportLogoRef.current?.click()}
                disabled={isReadOnly || uploadingPurpose === "report-logo"}
                className="flex-1 py-1 px-2 bg-white border border-[#CBD5E1] rounded-md text-[10.5px] font-semibold text-[#1E293B] hover:bg-slate-50 flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 shadow-2xs transition-colors"
              >
                {uploadingPurpose === "report-logo" ? (
                  <Loader2 className="size-3 animate-spin text-[#2563EB]" />
                ) : (
                  <Upload className="size-3 text-[#2563EB]" />
                )}
                {uploadingPurpose === "report-logo" ? "Uploading..." : "Upload"}
              </button>
              {data.reportLogo && (
                <button
                  type="button"
                  onClick={() => void handleAssetRemove("report-logo")}
                  disabled={isReadOnly || deletingPurpose === "report-logo"}
                  className="p-1 text-red-500 hover:bg-red-50 rounded-md cursor-pointer disabled:opacity-50 transition-colors"
                  title="Remove report logo"
                >
                  {deletingPurpose === "report-logo" ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Trash2 className="size-3" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* 4. Email Header Logo */}
          <div className="p-2.5 bg-[#F8FAFD] border border-[#DDE4ED] rounded-xl space-y-1.5 shadow-2xs">
            <div className="text-[11.5px] font-bold text-[#1E293B]">Email Header Logo</div>
            <div className="h-14 rounded-lg bg-white border border-[#DDE4ED] flex items-center justify-center overflow-hidden p-1.5 shadow-2xs">
              {loading ? (
                <Loader2 className="size-4 animate-spin text-slate-400" />
              ) : data.emailLogo ? (
                <img src={data.emailLogo} alt="Email Logo" className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="text-[10px] text-[#94A3B8] font-normal">Matches main logo</span>
              )}
            </div>
            <p className="text-[9.5px] text-[#64748B] font-normal">PNG / JPEG / WebP • Max 5MB</p>
            <input
              ref={emailLogoRef}
              type="file"
              accept={BRANDING_UPLOAD_LIMITS["email-logo"].mimeTypes.join(",")}
              className="hidden"
              onChange={(e) => void handleAssetUpload("email-logo", e.target.files?.[0])}
            />
            <div className="flex items-center gap-1 pt-0.5">
              <button
                type="button"
                onClick={() => emailLogoRef.current?.click()}
                disabled={isReadOnly || uploadingPurpose === "email-logo"}
                className="flex-1 py-1 px-2 bg-white border border-[#CBD5E1] rounded-md text-[10.5px] font-semibold text-[#1E293B] hover:bg-slate-50 flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 shadow-2xs transition-colors"
              >
                {uploadingPurpose === "email-logo" ? (
                  <Loader2 className="size-3 animate-spin text-[#2563EB]" />
                ) : (
                  <Upload className="size-3 text-[#2563EB]" />
                )}
                {uploadingPurpose === "email-logo" ? "Uploading..." : "Upload"}
              </button>
              {data.emailLogo && (
                <button
                  type="button"
                  onClick={() => void handleAssetRemove("email-logo")}
                  disabled={isReadOnly || deletingPurpose === "email-logo"}
                  className="p-1 text-red-500 hover:bg-red-50 rounded-md cursor-pointer disabled:opacity-50 transition-colors"
                  title="Remove email logo"
                >
                  {deletingPurpose === "email-logo" ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Trash2 className="size-3" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Color Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
          <div>
            <label className="block text-[11px] font-semibold text-[#334155] mb-1">
              Primary Brand Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={data.primaryColor}
                onChange={(e) => onChange({ primaryColor: e.target.value })}
                disabled={!capabilities.canEditBranding}
                className="size-8 rounded-lg border border-[#CBD5E1] p-0.5 cursor-pointer bg-white shadow-2xs"
              />
              <input
                type="text"
                value={data.primaryColor}
                onChange={(e) => onChange({ primaryColor: e.target.value })}
                disabled={!capabilities.canEditBranding}
                className="h-8 w-24 px-2.5 rounded-lg border border-[#CBD5E1] bg-white text-[12px] font-mono text-[#0F172A] font-normal uppercase outline-none focus:border-[#2563EB] shadow-2xs"
              />
              <div className="flex items-center gap-1">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onChange({ primaryColor: c })}
                    className={cn(
                      "size-4 rounded-full border border-white shadow-2xs transition-transform hover:scale-110",
                      data.primaryColor === c && "ring-2 ring-blue-500 ring-offset-1"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <span className="text-[9.5px] text-[#64748B] font-normal mt-0.5 block">Applied to buttons, badges, and primary report highlights.</span>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#334155] mb-1">
              Secondary Brand Accent Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={data.secondaryColor}
                onChange={(e) => onChange({ secondaryColor: e.target.value })}
                disabled={!capabilities.canEditBranding}
                className="size-8 rounded-lg border border-[#CBD5E1] p-0.5 cursor-pointer bg-white shadow-2xs"
              />
              <input
                type="text"
                value={data.secondaryColor}
                onChange={(e) => onChange({ secondaryColor: e.target.value })}
                disabled={!capabilities.canEditBranding}
                className="h-8 w-24 px-2.5 rounded-lg border border-[#CBD5E1] bg-white text-[12px] font-mono text-[#0F172A] font-normal uppercase outline-none focus:border-[#2563EB] shadow-2xs"
              />
            </div>
            <span className="text-[9.5px] text-[#64748B] font-normal mt-0.5 block">Used for table headers, dark cards, and chart baselines.</span>
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold text-[#334155] mb-1">
              Custom Footer / Copyright Notice
            </label>
            <input
              type="text"
              value={data.footerText}
              onChange={(e) => onChange({ footerText: e.target.value })}
              disabled={!capabilities.canEditBranding}
              placeholder="e.g. © 2026 Namo Gange Trust. All rights reserved."
              className="w-full h-8 px-3 rounded-lg border border-[#CBD5E1] bg-white text-[12px] text-[#0F172A] font-normal outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-slate-100 shadow-2xs placeholder:text-[#94A3B8]"
            />
          </div>
        </div>
      </section>

      {/* SECTION 2: LIVE BRANDING PREVIEW */}
      <section className="bg-white rounded-xl border border-[#DDE4ED] shadow-xs p-3 space-y-2 hover:border-[#CBD5E1] transition-all">
        <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Eye className="size-3.5" />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-[#0F172A]">Live Branding Preview</h3>
              <p className="text-[10.5px] text-[#64748B] font-normal leading-relaxed">Real-time preview of your brand elements applied to OmniPlatform outputs.</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-[#F1F5F9] p-1 rounded-xl text-[11px] border border-[#CBD5E1] shadow-2xs">
            <button
              type="button"
              onClick={() => setActivePreview("sidebar")}
              className={cn(
                "px-4 sm:px-5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer min-w-[90px] sm:min-w-[110px] text-center",
                activePreview === "sidebar" ? "bg-white text-[#0F172A] shadow-2xs" : "text-[#64748B] hover:text-[#0F172A]"
              )}
            >
              Sidebar
            </button>
            <button
              type="button"
              onClick={() => setActivePreview("report")}
              className={cn(
                "px-4 sm:px-5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer min-w-[100px] sm:min-w-[125px] text-center",
                activePreview === "report" ? "bg-white text-[#0F172A] shadow-2xs" : "text-[#64748B] hover:text-[#0F172A]"
              )}
            >
              Report PDF
            </button>
            <button
              type="button"
              onClick={() => setActivePreview("email")}
              className={cn(
                "px-4 sm:px-5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer min-w-[125px] sm:min-w-[155px] text-center",
                activePreview === "email" ? "bg-white text-[#0F172A] shadow-2xs" : "text-[#64748B] hover:text-[#0F172A]"
              )}
            >
              Email Notification
            </button>
          </div>
        </div>

        {/* Live Preview Container */}
        <div className="border border-[#CBD5E1] rounded-xl p-3.5 bg-slate-100/70 shadow-2xs">
          {activePreview === "sidebar" && (
            <div className="w-full max-w-[320px] mx-auto bg-[#0A0E1A] text-white rounded-lg p-3 space-y-2.5 shadow-md">
              <div className="flex items-center gap-2 pb-1.5 border-b border-slate-800">
                <div className="size-6 rounded-md bg-white p-0.5 flex items-center justify-center overflow-hidden shrink-0">
                  {data.logo ? <img src={data.logo} alt="Logo" className="size-full object-contain" /> : <Sparkles className="size-3.5 text-emerald-500" />}
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold truncate">{data.brandName || "Namo Gange"}</div>
                  <div className="text-[8.5px] text-slate-300 font-semibold">OmniPlatform Workspace</div>
                </div>
              </div>
              <div className="space-y-1 text-[10px]">
                <div
                  className="px-2 py-1 rounded font-bold text-white flex items-center justify-between"
                  style={{ backgroundColor: data.primaryColor }}
                >
                  <span>Dashboard Overview</span>
                  <Check className="size-3" />
                </div>
                <div className="px-2 py-1 text-slate-300 font-medium hover:text-white">Campaign Analytics</div>
                <div className="px-2 py-1 text-slate-300 font-medium hover:text-white">Automation Studio</div>
              </div>
            </div>
          )}

          {activePreview === "report" && (
            <div className="w-full max-w-md mx-auto bg-white rounded-lg p-3.5 shadow-sm border border-slate-200 space-y-2 text-[10.5px]">
              <div className="flex items-start justify-between border-b pb-2">
                <div className="flex items-center gap-1.5">
                  <div className="size-7 rounded bg-slate-50 border p-0.5 flex items-center justify-center">
                    {data.reportLogo || data.logo ? (
                      <img src={data.reportLogo || data.logo} alt="Logo" className="size-full object-contain" />
                    ) : (
                      <FileText className="size-3.5 text-[#111C3A]" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-[12px] font-bold text-[#111C3A]">{data.brandName || "Namo Gange"}</h4>
                    <p className="text-[8.5px] text-[#64748B] font-normal">Executive Performance Audit</p>
                  </div>
                </div>
                <span
                  className="px-1.5 py-0.2 rounded text-[8.5px] font-bold text-white"
                  style={{ backgroundColor: data.primaryColor }}
                >
                  CONFIDENTIAL
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 py-1 text-center">
                <div className="bg-slate-50 p-1.5 rounded">
                  <div className="text-[8.5px] text-[#64748B] font-normal">Audited Runs</div>
                  <div className="text-[12px] font-bold text-[#111C3A]">2,076</div>
                </div>
                <div className="bg-slate-50 p-1.5 rounded">
                  <div className="text-[8.5px] text-[#64748B] font-normal">Success Rate</div>
                  <div className="text-[12px] font-bold" style={{ color: data.primaryColor }}>97.8%</div>
                </div>
                <div className="bg-slate-50 p-1.5 rounded">
                  <div className="text-[8.5px] text-[#64748B] font-normal">Total Leads</div>
                  <div className="text-[12px] font-bold text-[#111C3A]">842</div>
                </div>
              </div>
              <div className="text-[8.5px] text-[#64748B] font-normal pt-1 border-t text-center">{data.footerText}</div>
            </div>
          )}

          {activePreview === "email" && (
            <div className="w-full max-w-md mx-auto bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden text-[10.5px]">
              <div className="p-2 text-white flex items-center justify-between" style={{ backgroundColor: data.secondaryColor }}>
                <div className="flex items-center gap-1.5">
                  {data.emailLogo || data.logo ? (
                    <div className="h-5 max-w-[80px] bg-white/10 rounded px-1 flex items-center justify-center overflow-hidden">
                      <img src={data.emailLogo || data.logo} alt="Logo" className="max-h-full max-w-full object-contain" />
                    </div>
                  ) : (
                    <Mail className="size-3.5 text-white/80" />
                  )}
                  <span className="font-bold text-[11px]">{data.brandName} Notification</span>
                </div>
                <span className="text-[9px] opacity-90 font-semibold">Security Notice</span>
              </div>
              <div className="p-3 space-y-1.5 text-[#111C3A]">
                <p className="text-[11px] font-bold text-[#0F172A]">Hello Team Administrator,</p>
                <p className="text-[10px] text-[#64748B] font-normal">
                  A scheduled campaign report for Moksha Sewa has completed with 100% deliverability rate.
                </p>
                <button
                  type="button"
                  className="mt-1 px-2.5 py-1 rounded-md text-white text-[10px] font-semibold shadow-2xs cursor-pointer"
                  style={{ backgroundColor: data.primaryColor }}
                >
                  View Performance Metrics
                </button>
              </div>
              <div className="bg-slate-50 p-2 text-[8.5px] text-[#64748B] font-normal text-center border-t">
                {data.footerText}
              </div>
            </div>
          )}
        </div>

        {/* Plan-Locked Feature */}
        <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 flex items-start gap-2">
          <div className="size-5 rounded bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
            <Lock className="size-3" />
          </div>
          <div className="text-[10.5px] text-amber-950 min-w-0">
            <div className="font-bold flex items-center gap-1.5">
              Custom CNAME & White-Label Domain
              <span className="text-[8.5px] font-bold bg-amber-200/80 text-amber-800 px-1 py-0.2 rounded uppercase">
                Enterprise Add-on
              </span>
            </div>
            <p className="text-[9.5px] text-amber-900 mt-0.5 leading-snug font-normal">
              Hosting OmniPlatform at a dedicated subdomain like <code className="bg-amber-100 px-1 rounded font-mono font-bold">portal.namogange.org</code> with custom SSL certificate requires an <span className="whitespace-nowrap font-bold">Enterprise Organization Tier</span> license. Contact your EnCodency account rep to activate.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
