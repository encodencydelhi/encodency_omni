"use client";

import { Bell } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { NotificationChannel, NotificationMatrixItem } from "../settings-data/types";
import { useSettingsCapability } from "../settings-data/capability-provider";

interface NotificationsSectionProps {
  items: NotificationMatrixItem[];
  onToggle: (id: string, channel: NotificationChannel, value: boolean) => void;
}

const CATEGORIES = [
  { key: "operational", label: "Operational & Service Health", desc: "Automations, webhook failures, uptime, and SEO alerts" },
  { key: "collaboration", label: "Team Collaboration & Approvals", desc: "Tasks, campaign approvals, and team mentions" },
  { key: "account", label: "Account & Access Security", desc: "Member onboarding, permission updates, and login anomalies" },
  { key: "billing", label: "Billing & Tier Allocations", desc: "Invoices, renewals, payment declines, and usage quotas" },
] as const;

export function NotificationsSection({ items, onToggle }: NotificationsSectionProps) {
  const { capabilities } = useSettingsCapability();

  return (
    <div className="space-y-2">
      <section className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs p-2.5 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-[#F1F5F9] pb-2">
          <div className="flex items-center gap-1.5">
            <div className="size-6 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center border border-blue-200 shrink-0">
              <Bell className="size-3.5" />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-[#111C3A]">Organization Notification Matrix</h3>
              <p className="text-[10px] text-[#111C3A] font-semibold">
                Configure broadcast routing channels for critical events across the organization.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-bold text-[#111C3A] bg-[#F8FAFC] px-2 py-1 rounded-lg border border-[#CBD5E1]">
            <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-blue-500"></span> In-App</span>
            <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-indigo-500"></span> Email</span>
            <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-emerald-500"></span> WhatsApp</span>
            <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-purple-500"></span> Slack</span>
          </div>
        </div>

        {/* Matrix Categories */}
        <div className="space-y-2">
          {CATEGORIES.map((cat) => {
            const categoryItems = items.filter((item) => item.category === cat.key);
            if (categoryItems.length === 0) return null;

            return (
              <div key={cat.key} className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <div>
                    <h4 className="text-[11.5px] font-bold text-[#111C3A]">{cat.label}</h4>
                    <p className="text-[9.5px] text-[#111C3A] font-medium">{cat.desc}</p>
                  </div>
                </div>

                {/* Table Header */}
                <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl overflow-hidden shadow-2xs">
                  <div className="grid grid-cols-12 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#111C3A] border-b border-[#CBD5E1] items-center">
                    <div className="col-span-12 md:col-span-6">Trigger Event</div>
                    <div className="hidden md:grid col-span-6 grid-cols-4 text-center">
                      <span>In-App</span>
                      <span>Email</span>
                      <span>WhatsApp</span>
                      <span>Slack</span>
                    </div>
                  </div>

                  <div className="divide-y divide-[#F1F5F9]">
                    {categoryItems.map((item) => (
                      <div
                        key={item.id}
                        className="grid grid-cols-12 px-2.5 py-1.5 items-center hover:bg-slate-50/70 transition-colors gap-1.5 md:gap-0"
                      >
                        <div className="col-span-12 md:col-span-6 min-w-0 pr-2">
                          <div className="text-[11.5px] font-bold text-[#111C3A] leading-tight">
                            {item.title}
                          </div>
                          <p className="text-[9.5px] text-[#111C3A] font-medium leading-snug mt-0.5 truncate">
                            {item.description}
                          </p>
                        </div>

                        <div className="col-span-12 md:col-span-6 grid grid-cols-4 text-center items-center py-1 md:py-0 border-t md:border-t-0 border-[#F1F5F9]">
                          {/* In-App */}
                          <div className="flex flex-col md:flex-row items-center justify-center gap-1">
                            <span className="md:hidden text-[9px] text-[#111C3A] font-semibold">In-App</span>
                            <Switch
                              checked={item.inApp}
                              onCheckedChange={(val) => onToggle(item.id, "inApp", val)}
                              disabled={!capabilities.canManageNotifications}
                            />
                          </div>

                          {/* Email */}
                          <div className="flex flex-col md:flex-row items-center justify-center gap-1">
                            <span className="md:hidden text-[9px] text-[#111C3A] font-semibold">Email</span>
                            <Switch
                              checked={item.email}
                              onCheckedChange={(val) => onToggle(item.id, "email", val)}
                              disabled={!capabilities.canManageNotifications}
                            />
                          </div>

                          {/* WhatsApp */}
                          <div className="flex flex-col md:flex-row items-center justify-center gap-1">
                            <span className="md:hidden text-[9px] text-[#111C3A] font-semibold">WhatsApp</span>
                            <Switch
                              checked={item.whatsapp}
                              onCheckedChange={(val) => onToggle(item.id, "whatsapp", val)}
                              disabled={!capabilities.canManageNotifications}
                            />
                          </div>

                          {/* Slack */}
                          <div className="flex flex-col md:flex-row items-center justify-center gap-1">
                            <span className="md:hidden text-[9px] text-[#111C3A] font-semibold">Slack</span>
                            <Switch
                              checked={item.slack}
                              onCheckedChange={(val) => onToggle(item.id, "slack", val)}
                              disabled={!capabilities.canManageNotifications}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
