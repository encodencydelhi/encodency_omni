"use client";

import React, { useRef } from "react";
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
  const [copiedId, setCopiedId] = React.useState(false);

  const handleCopyId = () => {
    navigator.clipboard.writeText(data.metadata.id);
    setCopiedId(true);
    toast.success("Organization ID copied to clipboard");
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      <section className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs p-2.5 space-y-2">
        <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2">
          <div className="flex items-center gap-1.5">
            <div className="size-6 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center border border-blue-200 shrink-0">
              <Building2 className="size-3.5" />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-[#111C3A]">Organization Identity</h3>
              <p className="text-[10px] text-[#64748B]">Primary identity, trade names, and public contact information.</p>
            </div>
          </div>
          <span className="text-[9.5px] text-[#10B981] font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
            Active Workspace
          </span>
        </div>

        {/* Logo Upload Block */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
          <div className="size-14 rounded-xl bg-white border border-[#CBD5E1] shadow-2xs overflow-hidden flex items-center justify-center shrink-0">
            {data.logo ? (
              <img src={data.logo} alt={data.name} className="size-full object-cover" />
            ) : (
              <div className="size-full bg-slate-100 flex items-center justify-center text-[#64748B] font-bold text-[18px]">
                {data.name.charAt(0)}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="text-[12px] font-semibold text-[#111C3A]">Organization Logo</div>
            <p className="text-[10px] text-[#64748B] leading-tight">
              Recommended format: PNG or SVG with transparent background. Square 400×400px (Max 2MB).
            </p>
            <div className="flex items-center gap-2 pt-1">
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
                className="px-2.5 py-1 bg-white border border-[#CBD5E1] rounded-md text-[10.5px] font-bold text-[#334155] hover:bg-slate-50 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Upload className="size-3 text-[#2563EB]" /> Replace Logo
              </button>
              {data.logo && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  disabled={!capabilities.canEditOrganization}
                  className="px-2 py-1 text-[10.5px] font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
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
            <label className="block text-[11px] font-bold text-[#334155] mb-1">
              Organization Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.name}
              onChange={(e) => onChange({ name: e.target.value })}
              disabled={!capabilities.canEditOrganization}
              placeholder="e.g. Namo Gange Trust"
              className="w-full h-8 px-2.5 rounded-lg border border-[#CBD5E1] bg-white text-[12px] text-[#111C3A] font-medium focus:outline-none focus:border-[#2563EB] disabled:bg-slate-100"
            />
            <span className="text-[9.5px] text-[#94A3B8] mt-0.5 block">Official registered organization title.</span>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#334155] mb-1">
              Legal Entity Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.legalName}
              onChange={(e) => onChange({ legalName: e.target.value })}
              disabled={!capabilities.canEditOrganization}
              placeholder="e.g. Namo Gange Public Charitable Trust"
              className="w-full h-8 px-2.5 rounded-lg border border-[#CBD5E1] bg-white text-[12px] text-[#111C3A] font-medium focus:outline-none focus:border-[#2563EB] disabled:bg-slate-100"
            />
            <span className="text-[9.5px] text-[#94A3B8] mt-0.5 block">Used for tax invoices, contracts, and receipts.</span>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#334155] mb-1">
              Display Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.displayName}
              onChange={(e) => onChange({ displayName: e.target.value })}
              disabled={!capabilities.canEditOrganization}
              placeholder="e.g. Namo Gange"
              className="w-full h-8 px-2.5 rounded-lg border border-[#CBD5E1] bg-white text-[12px] text-[#111C3A] font-medium focus:outline-none focus:border-[#2563EB] disabled:bg-slate-100"
            />
            <span className="text-[9.5px] text-[#94A3B8] mt-0.5 block">Short title shown across top navigation & emails.</span>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#334155] mb-1">
              Industry Domain
            </label>
            <select
              value={data.industry}
              onChange={(e) => onChange({ industry: e.target.value })}
              disabled={!capabilities.canEditOrganization}
              className="w-full h-8 px-2 rounded-lg border border-[#CBD5E1] bg-white text-[12px] text-[#111C3A] font-medium focus:outline-none focus:border-[#2563EB] disabled:bg-slate-100 cursor-pointer"
            >
              <option value="Healthcare, Ayurveda & Non-Profit">Healthcare, Ayurveda & Non-Profit</option>
              <option value="Digital Marketing Agency">Digital Marketing Agency</option>
              <option value="E-Commerce & Retail">E-Commerce & Retail</option>
              <option value="Technology & SaaS">Technology & SaaS</option>
              <option value="Education & Academy">Education & Academy</option>
              <option value="Hospitality & Travel">Hospitality & Travel</option>
            </select>
            <span className="text-[9.5px] text-[#94A3B8] mt-0.5 block">Determines benchmark presets and AI suggestions.</span>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#334155] mb-1">
              Official Website
            </label>
            <input
              type="url"
              value={data.website}
              onChange={(e) => onChange({ website: e.target.value })}
              disabled={!capabilities.canEditOrganization}
              placeholder="https://namogange.org"
              className="w-full h-8 px-2.5 rounded-lg border border-[#CBD5E1] bg-white text-[12px] text-[#111C3A] font-medium focus:outline-none focus:border-[#2563EB] disabled:bg-slate-100"
            />
            <span className="text-[9.5px] text-[#94A3B8] mt-0.5 block">Verified primary domain connected to Search Console.</span>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#334155] mb-1">
              Support / Contact Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={data.contactEmail}
              onChange={(e) => onChange({ contactEmail: e.target.value })}
              disabled={!capabilities.canEditOrganization}
              placeholder="contact@namogange.org"
              className="w-full h-8 px-2.5 rounded-lg border border-[#CBD5E1] bg-white text-[12px] text-[#111C3A] font-medium focus:outline-none focus:border-[#2563EB] disabled:bg-slate-100"
            />
            <span className="text-[9.5px] text-[#94A3B8] mt-0.5 block">Receives system alerts, billing notices, and reports.</span>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#334155] mb-1">
              Contact Phone
            </label>
            <input
              type="tel"
              value={data.contactPhone}
              onChange={(e) => onChange({ contactPhone: e.target.value })}
              disabled={!capabilities.canEditOrganization}
              placeholder="+91 98765 43210"
              className="w-full h-8 px-2.5 rounded-lg border border-[#CBD5E1] bg-white text-[12px] text-[#111C3A] font-medium focus:outline-none focus:border-[#2563EB] disabled:bg-slate-100"
            />
            <span className="text-[9.5px] text-[#94A3B8] mt-0.5 block">Official organizational telephone / mobile number.</span>
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-[#334155] mb-1">
              Organization Purpose / Description
            </label>
            <textarea
              rows={2}
              value={data.description}
              onChange={(e) => onChange({ description: e.target.value })}
              disabled={!capabilities.canEditOrganization}
              placeholder="Brief description of organization operations..."
              className="w-full p-2 rounded-lg border border-[#CBD5E1] bg-white text-[12px] text-[#111C3A] font-medium focus:outline-none focus:border-[#2563EB] disabled:bg-slate-100 resize-none"
            />
          </div>
        </div>
      </section>

      {/* SECTION 2: REGISTERED ADDRESS */}
      <section className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs p-2.5 space-y-2">
        <div className="flex items-center gap-1.5 border-b border-[#F1F5F9] pb-2">
          <div className="size-6 rounded-lg bg-emerald-50 text-[#10B981] flex items-center justify-center border border-emerald-200 shrink-0">
            <MapPin className="size-3.5" />
          </div>
          <div>
            <h3 className="text-[13px] font-bold text-[#111C3A]">Registered Operating Address</h3>
            <p className="text-[10px] text-[#64748B]">Physical headquarters address for official documentation & invoicing.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-[#334155] mb-1">
              Street Address
            </label>
            <input
              type="text"
              value={data.address.address}
              onChange={(e) => onChange({ address: { ...data.address, address: e.target.value } })}
              disabled={!capabilities.canEditOrganization}
              placeholder="e.g. 12/4, Institutional Area, Lodhi Road"
              className="w-full h-8 px-2.5 rounded-lg border border-[#CBD5E1] bg-white text-[12px] text-[#111C3A] font-medium focus:outline-none focus:border-[#2563EB] disabled:bg-slate-100"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#334155] mb-1">
              City
            </label>
            <input
              type="text"
              value={data.address.city}
              onChange={(e) => onChange({ address: { ...data.address, city: e.target.value } })}
              disabled={!capabilities.canEditOrganization}
              placeholder="e.g. New Delhi"
              className="w-full h-8 px-2.5 rounded-lg border border-[#CBD5E1] bg-white text-[12px] text-[#111C3A] font-medium focus:outline-none focus:border-[#2563EB] disabled:bg-slate-100"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#334155] mb-1">
              State / Province
            </label>
            <input
              type="text"
              value={data.address.state}
              onChange={(e) => onChange({ address: { ...data.address, state: e.target.value } })}
              disabled={!capabilities.canEditOrganization}
              placeholder="e.g. Delhi"
              className="w-full h-8 px-2.5 rounded-lg border border-[#CBD5E1] bg-white text-[12px] text-[#111C3A] font-medium focus:outline-none focus:border-[#2563EB] disabled:bg-slate-100"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#334155] mb-1">
              Postal PIN Code
            </label>
            <input
              type="text"
              value={data.address.pinCode}
              onChange={(e) => onChange({ address: { ...data.address, pinCode: e.target.value } })}
              disabled={!capabilities.canEditOrganization}
              placeholder="e.g. 110003"
              className="w-full h-8 px-2.5 rounded-lg border border-[#CBD5E1] bg-white text-[12px] text-[#111C3A] font-medium focus:outline-none focus:border-[#2563EB] disabled:bg-slate-100"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#334155] mb-1">
              Country
            </label>
            <input
              type="text"
              value={data.address.country}
              onChange={(e) => onChange({ address: { ...data.address, country: e.target.value } })}
              disabled={!capabilities.canEditOrganization}
              placeholder="India"
              className="w-full h-8 px-2.5 rounded-lg border border-[#CBD5E1] bg-white text-[12px] text-[#111C3A] font-medium focus:outline-none focus:border-[#2563EB] disabled:bg-slate-100"
            />
          </div>
        </div>
      </section>

      {/* SECTION 3: METADATA & PLAN BADGE */}
      <section className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs p-2.5 space-y-2">
        <div className="flex items-center gap-1.5 border-b border-[#F1F5F9] pb-2">
          <div className="size-6 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-200 shrink-0">
            <Shield className="size-3.5" />
          </div>
          <div>
            <h3 className="text-[13px] font-bold text-[#111C3A]">Organization Registry & Tier</h3>
            <p className="text-[10px] text-[#64748B]">Permanent system identifiers and linked subscription tier.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]">
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2.5 space-y-1">
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#94A3B8]">Organization ID</span>
            <div className="flex items-center justify-between gap-1">
              <span className="font-mono text-[#334155] font-semibold text-[11px] truncate">{data.metadata.id}</span>
              <button
                type="button"
                onClick={handleCopyId}
                className="text-[#64748B] hover:text-[#2563EB] p-1 rounded cursor-pointer"
                title="Copy ID"
              >
                {copiedId ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
              </button>
            </div>
          </div>

          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2.5 space-y-1">
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#94A3B8]">Creation Date</span>
            <div className="font-semibold text-[#111C3A] text-[11px]">{data.metadata.createdAt}</div>
          </div>

          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2.5 space-y-1">
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#94A3B8]">Account Owner</span>
            <div className="font-semibold text-[#111C3A] text-[11px] truncate">{data.metadata.owner}</div>
          </div>

          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2.5 space-y-1 flex flex-col justify-between">
            <div>
              <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#94A3B8]">Current Plan</span>
              <div className="font-bold text-[#10B981] text-[11px] flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-[#10B981]"></span>
                {data.metadata.currentPlan}
              </div>
            </div>
            <Link
              href="/admin/billing"
              className="text-[10px] text-[#2563EB] hover:underline font-semibold flex items-center gap-1 self-start pt-0.5"
            >
              Manage Plan & Billing <ExternalLink className="size-2.5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
