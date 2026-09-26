"use client";

import { Globe2, Table2, FileSpreadsheet, User, Upload, Trash2, Loader2 } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/features/auth/components/auth-provider";
import { getUserDisplay } from "@/lib/utils/user-display";
import {
  userAvatarApi,
  USER_AVATAR_LIMITS,
  isAvatarAssetConflict,
  isAvatarFileTooLarge,
  isAvatarStorageUnavailable,
} from "@/features/auth/services/user-avatar-api";
import { UserPreferences } from "../settings-data/types";
import { useSettingsCapability } from "../settings-data/capability-provider";

interface PreferencesSectionProps {
  data: UserPreferences;
  onChange: (partial: Partial<UserPreferences>) => void;
}

export function PreferencesSection({ data, onChange }: PreferencesSectionProps) {
  const { capabilities } = useSettingsCapability();
  const { user, refreshUser } = useAuth();
  const { fullName, initials } = getUserDisplay(user);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > USER_AVATAR_LIMITS.maxBytes) {
      toast.error("Avatar file exceeds 2MB limit.");
      return;
    }

    if (!USER_AVATAR_LIMITS.mimeTypes.includes(file.type)) {
      toast.error("Unsupported format. Allowed: PNG, JPEG, WebP.");
      return;
    }

    setUploading(true);
    const toastId = toast.loading("Uploading avatar...");
    try {
      await userAvatarApi.upload(file);
      await refreshUser();
      toast.success("Avatar updated successfully.", { id: toastId });
    } catch (err) {
      if (isAvatarAssetConflict(err)) {
        toast.error("Avatar was modified in another session. Please reload.", { id: toastId });
      } else if (isAvatarFileTooLarge(err)) {
        toast.error("Avatar exceeds 2MB limit.", { id: toastId });
      } else if (isAvatarStorageUnavailable(err)) {
        toast.error("Storage service unavailable. Please try again.", { id: toastId });
      } else {
        toast.error("Failed to upload avatar.", { id: toastId });
      }
    } finally {
      setUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    setUploading(true);
    const toastId = toast.loading("Removing avatar...");
    try {
      await userAvatarApi.remove();
      await refreshUser();
      toast.success("Avatar removed.", { id: toastId });
    } catch {
      toast.error("Failed to remove avatar.", { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* SECTION 0: USER PROFILE & AVATAR */}
      <section className="bg-white rounded-xl border border-[#DDE4ED] shadow-xs p-3 space-y-2 hover:border-[#CBD5E1] transition-all">
        <div className="flex items-center gap-2 border-b border-[#F1F5F9] pb-2">
          <div className="size-6 rounded-lg bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] text-white flex items-center justify-center shadow-xs shrink-0">
            <User className="size-3.5" />
          </div>
          <div>
            <h3 className="text-[13px] font-bold text-[#0F172A]">User Profile & Avatar</h3>
            <p className="text-[10.5px] text-[#64748B] font-normal leading-relaxed">
              Personalize your account appearance across the platform and team activity logs.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 py-1">
          <div className="relative group shrink-0">
            {user?.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt={fullName}
                width={64}
                height={64}
                className="size-16 rounded-xl object-cover border-2 border-slate-200 shadow-xs"
              />
            ) : (
              <div className="size-16 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] text-white flex items-center justify-center font-bold text-[18px] shadow-xs border border-blue-600">
                {initials}
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center text-white">
                <Loader2 className="size-5 animate-spin" />
              </div>
            )}
          </div>

          <div className="space-y-1.5 flex-1 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-[14px] font-bold text-[#0F172A]">{fullName}</span>
              <span className="text-[11px] text-[#64748B] bg-slate-100 px-2 py-0.5 rounded-md font-medium w-fit mx-auto sm:mx-0">
                {user?.email}
              </span>
            </div>
            <p className="text-[10.5px] text-[#64748B]">
              Supports PNG, JPEG, WebP. Maximum file size: 2MB.
            </p>

            <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-[11px] gap-1.5 px-3 rounded-lg border-slate-300 font-medium"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="size-3" />
                {user?.avatarUrl ? "Change Avatar" : "Upload Avatar"}
              </Button>
              {user?.avatarUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px] gap-1 px-2.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg font-medium"
                  disabled={uploading}
                  onClick={handleRemoveAvatar}
                >
                  <Trash2 className="size-3" />
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 1: LOCALE & REGIONAL FORMATS */}
      <section className="bg-white rounded-xl border border-[#DDE4ED] shadow-xs p-3 space-y-2 hover:border-[#CBD5E1] transition-all">
        <div className="flex items-center gap-2 border-b border-[#F1F5F9] pb-2">
          <div className="size-6 rounded-lg bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] text-white flex items-center justify-center shadow-xs shrink-0">
            <Globe2 className="size-3.5" />
          </div>
          <div>
            <h3 className="text-[13px] font-bold text-[#0F172A]">Locale & Regional Formatting</h3>
            <p className="text-[10.5px] text-[#64748B] font-normal leading-relaxed">
              Standardize dates, currencies, time offsets, and numerical grouping across all client reporting.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-semibold text-[#334155] mb-1">
              Organization Default Timezone
            </label>
            <select
              value={data.locale.timezone}
              onChange={(e) =>
                onChange({ locale: { ...data.locale, timezone: e.target.value } })
              }
              disabled={!capabilities.canManagePreferences}
              className="w-full h-8 px-2.5 rounded-lg border border-[#CBD5E1] bg-white text-[12px] text-[#0F172A] font-normal outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-slate-100 cursor-pointer shadow-2xs"
            >
              <option value="Asia/Kolkata (IST +5:30)">Asia/Kolkata (IST +5:30) - Indian Standard</option>
              <option value="UTC (GMT +0:00)">UTC (GMT +0:00) - Coordinated Universal</option>
              <option value="Asia/Dubai (GST +4:00)">Asia/Dubai (GST +4:00)</option>
              <option value="Europe/London (BST/GMT)">Europe/London (GMT / BST)</option>
              <option value="America/New_York (EST -5:00)">America/New_York (EST -5:00)</option>
              <option value="America/Los_Angeles (PST -8:00)">America/Los_Angeles (PST -8:00)</option>
              <option value="Asia/Singapore (SGT +8:00)">Asia/Singapore (SGT +8:00)</option>
            </select>
            <span className="text-[9.5px] text-[#64748B] font-normal mt-0.5 block">
              Automations, scheduled campaigns, and logs synchronize to this timezone.
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#334155] mb-1">
              Default System Language
            </label>
            <select
              value={data.locale.language}
              onChange={(e) =>
                onChange({ locale: { ...data.locale, language: e.target.value } })
              }
              disabled={!capabilities.canManagePreferences}
              className="w-full h-8 px-2.5 rounded-lg border border-[#CBD5E1] bg-white text-[12px] text-[#0F172A] font-normal outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-slate-100 cursor-pointer shadow-2xs"
            >
              <option value="English (United States)">English (United States)</option>
              <option value="English (India)">English (India)</option>
              <option value="English (United Kingdom)">English (United Kingdom)</option>
              <option value="Hindi (हिंदी)">Hindi (हिंदी)</option>
            </select>
            <span className="text-[9.5px] text-[#64748B] font-normal mt-0.5 block">Primary language for standard email templates and system alerts.</span>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#334155] mb-1">
              Currency Representation
            </label>
            <select
              value={data.locale.currency}
              onChange={(e) =>
                onChange({ locale: { ...data.locale, currency: e.target.value } })
              }
              disabled={!capabilities.canManagePreferences}
              className="w-full h-8 px-2.5 rounded-lg border border-[#CBD5E1] bg-white text-[12px] text-[#0F172A] font-normal outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-slate-100 cursor-pointer shadow-2xs"
            >
              <option value="INR (₹) - Indian Rupee">INR (₹) - Indian Rupee</option>
              <option value="USD ($) - US Dollar">USD ($) - US Dollar</option>
              <option value="EUR (€) - Euro">EUR (€) - Euro</option>
              <option value="AED (د.إ) - UAE Dirham">AED (د.إ) - UAE Dirham</option>
              <option value="GBP (£) - British Pound">GBP (£) - British Pound</option>
            </select>
            <span className="text-[9.5px] text-[#64748B] font-normal mt-0.5 block">Display currency for billing, budget metrics, and invoice summaries.</span>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#334155] mb-1">
              Date Format
            </label>
            <select
              value={data.locale.dateFormat}
              onChange={(e) =>
                onChange({ locale: { ...data.locale, dateFormat: e.target.value as any } })
              }
              disabled={!capabilities.canManagePreferences}
              className="w-full h-8 px-2.5 rounded-lg border border-[#CBD5E1] bg-white text-[12px] text-[#0F172A] font-normal outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-slate-100 cursor-pointer shadow-2xs"
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY (19/09/2026)</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY (09/19/2026)</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD (2026-09-19)</option>
            </select>
            <span className="text-[9.5px] text-[#64748B] font-normal mt-0.5 block">Calendar presentation across filters, tables, and reports.</span>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#334155] mb-1">
              Clock Time Display
            </label>
            <select
              value={data.locale.timeFormat}
              onChange={(e) =>
                onChange({ locale: { ...data.locale, timeFormat: e.target.value as any } })
              }
              disabled={!capabilities.canManagePreferences}
              className="w-full h-8 px-2.5 rounded-lg border border-[#CBD5E1] bg-white text-[12px] text-[#0F172A] font-normal outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-slate-100 cursor-pointer shadow-2xs"
            >
              <option value="12-hour">12-hour clock (04:15 PM)</option>
              <option value="24-hour">24-hour military clock (16:15)</option>
            </select>
            <span className="text-[9.5px] text-[#64748B] font-normal mt-0.5 block">Standard time format for publish schedules and logs.</span>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#334155] mb-1">
              Number & Lakhs Formatting
            </label>
            <select
              value={data.locale.numberFormat}
              onChange={(e) =>
                onChange({ locale: { ...data.locale, numberFormat: e.target.value as any } })
              }
              disabled={!capabilities.canManagePreferences}
              className="w-full h-8 px-2.5 rounded-lg border border-[#CBD5E1] bg-white text-[12px] text-[#0F172A] font-normal outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-slate-100 cursor-pointer shadow-2xs"
            >
              <option value="Indian (1,00,000)">Indian Lacs/Crores (1,50,000)</option>
              <option value="International (100,000)">International Thousands/Millions (150,000)</option>
            </select>
            <span className="text-[9.5px] text-[#64748B] font-normal mt-0.5 block">Digit grouping standard across analytics counters.</span>
          </div>
        </div>
      </section>

      {/* SECTION 2: TABLE & LIST PRESENTATION */}
      <section className="bg-white rounded-xl border border-[#DDE4ED] shadow-xs p-3 space-y-2 hover:border-[#CBD5E1] transition-all">
        <div className="flex items-center gap-2 border-b border-[#F1F5F9] pb-2">
          <div className="size-6 rounded-lg bg-gradient-to-br from-[#10B981] to-[#059669] text-white flex items-center justify-center shadow-xs shrink-0">
            <Table2 className="size-3.5" />
          </div>
          <div>
            <h3 className="text-[13px] font-bold text-[#0F172A]">Data Grid & Table Presentation</h3>
            <p className="text-[10.5px] text-[#64748B] font-normal leading-relaxed">
              Configure default row pagination densities, sticky headers, and compact layout styles.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div>
            <label className="block text-[11px] font-semibold text-[#334155] mb-1">
              Default Rows Per Page
            </label>
            <select
              value={data.tables.defaultRowsPerPage}
              onChange={(e) =>
                onChange({
                  tables: { ...data.tables, defaultRowsPerPage: Number(e.target.value) as any },
                })
              }
              disabled={!capabilities.canManagePreferences}
              className="w-full h-8 px-2.5 rounded-lg border border-[#CBD5E1] bg-white text-[12px] text-[#0F172A] font-normal outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-slate-100 cursor-pointer shadow-2xs"
            >
              <option value={10}>10 items per page</option>
              <option value={25}>25 items per page (Recommended)</option>
              <option value={50}>50 items per page</option>
              <option value={100}>100 items per page</option>
            </select>
            <span className="text-[9.5px] text-[#64748B] font-normal mt-0.5 block">Standard page slice across all admin data tables.</span>
          </div>

          <div className="md:col-span-2 flex flex-col sm:flex-row items-center gap-2 pt-1 sm:pt-4">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F8FAFD] border border-[#DDE4ED] shadow-2xs hover:bg-white hover:border-[#CBD5E1] transition-all w-full">
              <div className="space-y-0.5">
                <span className="text-[11.5px] font-bold text-[#1E293B]">Compact Row Density</span>
                <p className="text-[9.5px] text-[#64748B] font-normal">Tighter line spacing for higher information density.</p>
              </div>
              <Switch
                checked={data.tables.compactDensity}
                onCheckedChange={(val) =>
                  onChange({ tables: { ...data.tables, compactDensity: val } })
                }
                disabled={!capabilities.canManagePreferences}
              />
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F8FAFD] border border-[#DDE4ED] shadow-2xs hover:bg-white hover:border-[#CBD5E1] transition-all w-full">
              <div className="space-y-0.5">
                <span className="text-[11.5px] font-bold text-[#1E293B]">Sticky Table Headers</span>
                <p className="text-[9.5px] text-[#64748B] font-normal">Freeze column headers when scrolling long tables.</p>
              </div>
              <Switch
                checked={data.tables.stickyHeaders}
                onCheckedChange={(val) =>
                  onChange({ tables: { ...data.tables, stickyHeaders: val } })
                }
                disabled={!capabilities.canManagePreferences}
              />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: EXPORT PREFERENCES */}
      <section className="bg-white rounded-xl border border-[#DDE4ED] shadow-xs p-3 space-y-2 hover:border-[#CBD5E1] transition-all">
        <div className="flex items-center gap-2 border-b border-[#F1F5F9] pb-2">
          <div className="size-6 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <FileSpreadsheet className="size-3.5" />
          </div>
          <div>
            <h3 className="text-[13px] font-bold text-[#0F172A]">Export & Delimiter Standards</h3>
            <p className="text-[10.5px] text-[#64748B] font-normal leading-relaxed">Configure formatting for generated CSV and Excel downloads.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-semibold text-[#334155] mb-1">
              CSV Field Separator
            </label>
            <select
              value={data.exports.csvSeparator}
              onChange={(e) =>
                onChange({
                  exports: { ...data.exports, csvSeparator: e.target.value as any },
                })
              }
              disabled={!capabilities.canManagePreferences}
              className="w-full h-8 px-2.5 rounded-lg border border-[#CBD5E1] bg-white text-[12px] text-[#0F172A] font-normal outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-slate-100 cursor-pointer shadow-2xs"
            >
              <option value=",">Comma (,) - Standard</option>
              <option value=";">Semicolon (;) - European Excel Standard</option>
              <option value="\t">Tab (\t) - TSV</option>
            </select>
            <span className="text-[9.5px] text-[#64748B] font-normal mt-0.5 block">Delimiter used when parsing tabular spreadsheet data.</span>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#334155] mb-1">
              Export Timestamp Representation
            </label>
            <select
              value={data.exports.exportDateFormat}
              onChange={(e) =>
                onChange({
                  exports: { ...data.exports, exportDateFormat: e.target.value as any },
                })
              }
              disabled={!capabilities.canManagePreferences}
              className="w-full h-8 px-2.5 rounded-lg border border-[#CBD5E1] bg-white text-[12px] text-[#0F172A] font-normal outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-slate-100 cursor-pointer shadow-2xs"
            >
              <option value="ISO 8601">ISO 8601 (2026-09-19T10:00:00Z)</option>
              <option value="Locale Format">Locale Date String (19/09/2026 10:00 AM)</option>
              <option value="Timestamp">Unix Epoch Milliseconds</option>
            </select>
            <span className="text-[9.5px] text-[#64748B] font-normal mt-0.5 block">Date/time format for exported cell values.</span>
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F8FAFD] border border-[#DDE4ED] shadow-2xs hover:bg-white hover:border-[#CBD5E1] transition-all">
              <div className="space-y-0.5 pr-4">
                <div className="text-[11.5px] font-bold text-[#1E293B]">
                  Include Organization & Plan Metadata in File Header
                </div>
                <p className="text-[9.5px] text-[#64748B] font-normal">
                  Prepends first 2 rows of CSV exports with Organization Title, Generated By user, and Date.
                </p>
              </div>
              <Switch
                checked={data.exports.includeOrganizationMetadata}
                onCheckedChange={(val) =>
                  onChange({
                    exports: { ...data.exports, includeOrganizationMetadata: val },
                  })
                }
                disabled={!capabilities.canManagePreferences}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
