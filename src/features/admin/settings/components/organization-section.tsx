"use client";

import { useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import {
  Building2,
  MapPin,
  Shield,
  Upload,
  Trash2,
  Copy,
  ExternalLink,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { OrganizationProfile } from "../settings-data/types";
import { useSettingsCapability } from "../settings-data/capability-provider";

interface OrganizationSectionProps {
  data: OrganizationProfile;
  onChange: (partial: Partial<OrganizationProfile>) => void;
}

export function OrganizationSection({ data, onChange }: OrganizationSectionProps) {
  const { capabilities } = useSettingsCapability();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copiedId, setCopiedId] = useState(false);

  const handleCopyId = () => {
    navigator.clipboard.writeText(data.metadata.id);
    setCopiedId(true);
    toast.success("Organization ID copied to clipboard");
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo file size exceeds 2MB limit.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onChange({ logo: reader.result });
        toast.success("Organization logo updated locally.");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    onChange({ logo: "" });
    toast.info("Logo removed. Default placeholder will be used.");
  };

  return (
    <div className="space-y-2">
      {/* SECTION 1: IDENTITY & PROFILE */}
      <section className="bg-white rounded-xl border border-[#DDE4ED] shadow-xs p-3 space-y-2 hover:border-[#CBD5E1] transition-all">
        <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-lg bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] text-white flex items-center justify-center shadow-xs shrink-0">
              <Building2 className="size-3.5" />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-[#111C3A]">Organization Identity</h3>
              <p className="text-[10px] text-[#111C3A] font-semibold">Primary identity, trade names, and public contact information.</p>
            </div>
          </div>
          <span className="text-[9.5px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1 shadow-2xs">
            <span className="size-1.5 rounded-full bg-emerald-600 animate-pulse"></span> Active Workspace
          </span>
        </div>

        {/* Logo Upload Block */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 p-2.5 bg-[#F8FAFD] border border-[#DDE4ED] rounded-xl shadow-2xs">
          <div className="size-14 rounded-xl bg-white border border-[#DDE4ED] shadow-xs overflow-hidden flex items-center justify-center shrink-0">
            {data.logo ? (
              <img src={data.logo} alt={data.name} className="size-full object-contain p-1" />
            ) : (
              <div className="size-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-[18px]">
                {data.name.charAt(0)}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="text-[12px] font-bold text-[#111C3A]">Organization Logo</div>
            <p className="text-[10px] text-[#111C3A] font-semibold leading-tight">
              Recommended format: PNG or SVG with transparent background. Square 400×400px (Max 2MB).
            </p>
            <div className="flex items-center gap-2 pt-0.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!capabilities.canEditOrganization}
                className="px-3 py-1 bg-white border border-[#CBD5E1] rounded-md text-[10.5px] font-bold text-[#111C3A] hover:bg-slate-100 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Upload className="size-3 text-[#2563EB]" /> Replace Logo
              </button>
              {data.logo && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  disabled={!capabilities.canEditOrganization}
                  className="px-2 py-1 text-[10.5px] font-bold text-red-600 hover:bg-red-50 rounded-md transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="size-3" /> Remove
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 2-Column Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
          <div>
            <label className="block text-[11px] font-bold text-[#111C3A] mb-1">
              Organization Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.name}
              onChange={(e) => onChange({ name: e.target.value })}
              disabled={!capabilities.canEditOrganization}
              placeholder="e.g. Namo Gange Trust"
              className="w-full h-8 px-3 rounded-lg border border-[#DDE4ED] bg-[#F8FAFD] text-[11.5px] text-[#111C3A] font-semibold outline-none focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-slate-100 shadow-2xs"
            />
            <span className="text-[9.5px] text-[#111C3A] font-semibold mt-0.5 block">Official registered organization title.</span>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#111C3A] mb-1">
              Legal Entity Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.legalName}
              onChange={(e) => onChange({ legalName: e.target.value })}
              disabled={!capabilities.canEditOrganization}
              placeholder="e.g. Namo Gange Public Charitable Trust"
              className="w-full h-8 px-3 rounded-lg border border-[#DDE4ED] bg-[#F8FAFD] text-[11.5px] text-[#111C3A] font-semibold outline-none focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-slate-100 shadow-2xs"
            />
            <span className="text-[9.5px] text-[#111C3A] font-semibold mt-0.5 block">Used for tax invoices, contracts, and receipts.</span>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#111C3A] mb-1">
              Display Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.displayName}
              onChange={(e) => onChange({ displayName: e.target.value })}
              disabled={!capabilities.canEditOrganization}
              placeholder="e.g. Namo Gange"
              className="w-full h-8 px-3 rounded-lg border border-[#DDE4ED] bg-[#F8FAFD] text-[11.5px] text-[#111C3A] font-semibold outline-none focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-slate-100 shadow-2xs"
            />
            <span className="text-[9.5px] text-[#111C3A] font-semibold mt-0.5 block">Short title shown across top navigation & emails.</span>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#111C3A] mb-1">
              Industry Domain
            </label>
            <select
              value={data.industry}
              onChange={(e) => onChange({ industry: e.target.value })}
              disabled={!capabilities.canEditOrganization}
              className="w-full h-8 px-2.5 rounded-lg border border-[#DDE4ED] bg-[#F8FAFD] text-[11.5px] text-[#111C3A] font-semibold outline-none focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-slate-100 cursor-pointer shadow-2xs"
            >
              <option value="Healthcare, Ayurveda & Non-Profit">Healthcare, Ayurveda & Non-Profit</option>
              <option value="Digital Marketing Agency">Digital Marketing Agency</option>
              <option value="E-Commerce & Retail">E-Commerce & Retail</option>
              <option value="Technology & SaaS">Technology & SaaS</option>
              <option value="Education & Academy">Education & Academy</option>
              <option value="Hospitality & Travel">Hospitality & Travel</option>
            </select>
            <span className="text-[9.5px] text-[#111C3A] font-semibold mt-0.5 block">Determines benchmark presets and AI suggestions.</span>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#111C3A] mb-1">
              Official Website
            </label>
            <input
              type="url"
              value={data.website}
              onChange={(e) => onChange({ website: e.target.value })}
              disabled={!capabilities.canEditOrganization}
              placeholder="https://namogange.org"
              className="w-full h-8 px-3 rounded-lg border border-[#DDE4ED] bg-[#F8FAFD] text-[11.5px] text-[#111C3A] font-semibold outline-none focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-slate-100 shadow-2xs"
            />
            <span className="text-[9.5px] text-[#111C3A] font-semibold mt-0.5 block">Verified primary domain connected to Search Console.</span>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#111C3A] mb-1">
              Support / Contact Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={data.contactEmail}
              onChange={(e) => onChange({ contactEmail: e.target.value })}
              disabled={!capabilities.canEditOrganization}
              placeholder="contact@namogange.org"
              className="w-full h-8 px-3 rounded-lg border border-[#DDE4ED] bg-[#F8FAFD] text-[11.5px] text-[#111C3A] font-semibold outline-none focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-slate-100 shadow-2xs"
            />
            <span className="text-[9.5px] text-[#111C3A] font-semibold mt-0.5 block">Receives system alerts, billing notices, and reports.</span>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#111C3A] mb-1">
              Contact Phone
            </label>
            <input
              type="tel"
              value={data.contactPhone}
              onChange={(e) => onChange({ contactPhone: e.target.value })}
              disabled={!capabilities.canEditOrganization}
              placeholder="+91 98765 43210"
              className="w-full h-8 px-3 rounded-lg border border-[#DDE4ED] bg-[#F8FAFD] text-[11.5px] text-[#111C3A] font-semibold outline-none focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-slate-100 shadow-2xs"
            />
            <span className="text-[9.5px] text-[#111C3A] font-semibold mt-0.5 block">Official organizational telephone / mobile number.</span>
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-[#111C3A] mb-1">
              Organization Purpose / Description
            </label>
            <textarea
              rows={2}
              value={data.description}
              onChange={(e) => onChange({ description: e.target.value })}
              disabled={!capabilities.canEditOrganization}
              placeholder="Brief description of organization operations..."
              className="w-full p-2.5 rounded-lg border border-[#DDE4ED] bg-[#F8FAFD] text-[11.5px] text-[#111C3A] font-semibold outline-none focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-slate-100 resize-none shadow-2xs"
            />
          </div>
        </div>
      </section>

      {/* SECTION 2: REGISTERED ADDRESS */}
      <section className="bg-white rounded-xl border border-[#DDE4ED] shadow-xs p-3 space-y-2 hover:border-[#CBD5E1] transition-all">
        <div className="flex items-center gap-2 border-b border-[#F1F5F9] pb-2">
          <div className="size-6 rounded-lg bg-gradient-to-br from-[#10B981] to-[#059669] text-white flex items-center justify-center shadow-xs shrink-0">
            <MapPin className="size-3.5" />
          </div>
          <div>
            <h3 className="text-[13px] font-bold text-[#111C3A]">Registered Operating Address</h3>
            <p className="text-[10px] text-[#111C3A] font-semibold">Physical headquarters address for official documentation & invoicing.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-[#111C3A] mb-1">
              Street Address
            </label>
            <input
              type="text"
              value={data.address.address}
              onChange={(e) => onChange({ address: { ...data.address, address: e.target.value } })}
              disabled={!capabilities.canEditOrganization}
              placeholder="e.g. 12/4, Institutional Area, Lodhi Road"
              className="w-full h-8 px-3 rounded-lg border border-[#DDE4ED] bg-[#F8FAFD] text-[11.5px] text-[#111C3A] font-semibold outline-none focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-slate-100 shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#111C3A] mb-1">
              City
            </label>
            <input
              type="text"
              value={data.address.city}
              onChange={(e) => onChange({ address: { ...data.address, city: e.target.value } })}
              disabled={!capabilities.canEditOrganization}
              placeholder="e.g. New Delhi"
              className="w-full h-8 px-3 rounded-lg border border-[#DDE4ED] bg-[#F8FAFD] text-[11.5px] text-[#111C3A] font-semibold outline-none focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-slate-100 shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#111C3A] mb-1">
              State / Province
            </label>
            <input
              type="text"
              value={data.address.state}
              onChange={(e) => onChange({ address: { ...data.address, state: e.target.value } })}
              disabled={!capabilities.canEditOrganization}
              placeholder="e.g. Delhi"
              className="w-full h-8 px-3 rounded-lg border border-[#DDE4ED] bg-[#F8FAFD] text-[11.5px] text-[#111C3A] font-semibold outline-none focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-slate-100 shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#111C3A] mb-1">
              Postal PIN Code
            </label>
            <input
              type="text"
              value={data.address.pinCode}
              onChange={(e) => onChange({ address: { ...data.address, pinCode: e.target.value } })}
              disabled={!capabilities.canEditOrganization}
              placeholder="e.g. 110003"
              className="w-full h-8 px-3 rounded-lg border border-[#DDE4ED] bg-[#F8FAFD] text-[11.5px] text-[#111C3A] font-semibold outline-none focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-slate-100 shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#111C3A] mb-1">
              Country
            </label>
            <input
              type="text"
              value={data.address.country}
              onChange={(e) => onChange({ address: { ...data.address, country: e.target.value } })}
              disabled={!capabilities.canEditOrganization}
              placeholder="India"
              className="w-full h-8 px-3 rounded-lg border border-[#DDE4ED] bg-[#F8FAFD] text-[11.5px] text-[#111C3A] font-semibold outline-none focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-slate-100 shadow-2xs"
            />
          </div>
        </div>
      </section>

      {/* SECTION 3: METADATA & PLAN BADGE */}
      <section className="bg-white rounded-xl border border-[#DDE4ED] shadow-xs p-3 space-y-2 hover:border-[#CBD5E1] transition-all">
        <div className="flex items-center gap-2 border-b border-[#F1F5F9] pb-2">
          <div className="size-6 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#6366F1] text-white flex items-center justify-center shadow-xs shrink-0">
            <Shield className="size-3.5" />
          </div>
          <div>
            <h3 className="text-[13px] font-bold text-[#111C3A]">Organization Registry & Tier</h3>
            <p className="text-[10px] text-[#111C3A] font-semibold">Permanent system identifiers and linked subscription tier.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
          <div className="bg-[#F8FAFD] border border-[#DDE4ED] rounded-lg p-2.5 space-y-1 shadow-2xs">
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#111C3A]">Organization ID</span>
            <div className="flex items-center justify-between gap-1">
              <span className="font-mono text-[#111C3A] font-bold text-[11.5px] truncate">{data.metadata.id}</span>
              <button
                type="button"
                onClick={handleCopyId}
                className="text-[#111C3A] hover:text-[#2563EB] p-1 rounded cursor-pointer"
                title="Copy ID"
              >
                {copiedId ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
              </button>
            </div>
          </div>

          <div className="bg-[#F8FAFD] border border-[#DDE4ED] rounded-lg p-2.5 space-y-1 shadow-2xs">
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#111C3A]">Creation Date</span>
            <div className="font-bold text-[#111C3A] text-[11.5px]">{data.metadata.createdAt}</div>
          </div>

          <div className="bg-[#F8FAFD] border border-[#DDE4ED] rounded-lg p-2.5 space-y-1 shadow-2xs">
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#111C3A]">Account Owner</span>
            <div className="font-bold text-[#111C3A] text-[11.5px] truncate">{data.metadata.owner}</div>
          </div>
        </div>

        {/* Dedicated Plan Banner ensuring Enterprise Organization Tier is strictly on one line */}
        <div className="bg-gradient-to-r from-emerald-50/90 via-[#F8FAFD] to-blue-50/60 border border-emerald-200/90 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#111C3A]">Current Plan:</span>
            <div className="font-bold text-[#059669] text-[11.5px] flex items-center gap-1.5 whitespace-nowrap shrink-0">
              <span className="size-2 rounded-full bg-[#10B981] shrink-0 animate-pulse"></span>
              <span className="whitespace-nowrap font-bold">{data.metadata.currentPlan}</span>
            </div>
          </div>
          <Link
            href="/admin/billing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10.5px] text-[#2563EB] hover:underline font-bold flex items-center gap-1 shrink-0 bg-white px-2.5 py-1 rounded-md border border-blue-200 shadow-2xs hover:bg-blue-50 transition-colors"
          >
            Manage Plan & Billing <ExternalLink className="size-3" />
          </Link>
        </div>
      </section>
    </div>
  );
}
