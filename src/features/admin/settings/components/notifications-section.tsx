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

          <div className="flex flex-wrap items-center justify-between gap-2 text-[10.5px] font-bold text-[#111C3A] bg-[#F8FAFC] p-1.5 rounded-xl border border-[#CBD5E1] min-w-[380px] shadow-2xs self-start sm:self-auto">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#CBD5E1] shadow-2xs">
              <span className="size-2 rounded-full bg-blue-500"></span> In-App
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#CBD5E1] shadow-2xs">
              <span className="size-2 rounded-full bg-indigo-500"></span> Email
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#CBD5E1] shadow-2xs">
              <span className="size-2 rounded-full bg-emerald-500"></span> WhatsApp
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#CBD5E1] shadow-2xs">
              <span className="size-2 rounded-full bg-purple-500"></span> Slack
            </span>
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

                {/* Table Header & Rows */}
                <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl overflow-x-auto shadow-2xs">
                  <table className="w-full text-left min-w-[820px]">
                    <thead className="border-b border-[#CBD5E1] bg-[#F8FAFC]">
                      <tr className="text-[10px] font-bold uppercase tracking-wider text-[#111C3A]">
                        <th className="py-2.5 px-3.5 min-w-[220px]">Trigger Event</th>
                        <th className="py-2 px-2 w-[145px] min-w-[135px] text-center whitespace-nowrap">
                          <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-[#CBD5E1] shadow-2xs text-[10.5px] font-bold text-[#111C3A]">
                            <span className="size-2 rounded-full bg-blue-500"></span> In-App
                          </div>
                        </th>
                        <th className="py-2 px-2 w-[145px] min-w-[135px] text-center whitespace-nowrap">
                          <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-[#CBD5E1] shadow-2xs text-[10.5px] font-bold text-[#111C3A]">
                            <span className="size-2 rounded-full bg-indigo-500"></span> Email
                          </div>
                        </th>
                        <th className="py-2 px-2 w-[155px] min-w-[145px] text-center whitespace-nowrap">
                          <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-[#CBD5E1] shadow-2xs text-[10.5px] font-bold text-[#111C3A]">
                            <span className="size-2 rounded-full bg-emerald-500"></span> WhatsApp
                          </div>
                        </th>
                        <th className="py-2 px-2 w-[145px] min-w-[135px] text-center whitespace-nowrap">
                          <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-[#CBD5E1] shadow-2xs text-[10.5px] font-bold text-[#111C3A]">
                            <span className="size-2 rounded-full bg-purple-500"></span> Slack
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9] bg-white">
                      {categoryItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3.5 min-w-[220px]">
                            <div className="text-[11.5px] font-bold text-[#111C3A] leading-tight">
                              {item.title}
                            </div>
                            <p className="text-[9.5px] text-[#111C3A] font-medium leading-snug mt-0.5">
                              {item.description}
                            </p>
                          </td>

                          {/* In-App */}
                          <td className="py-2.5 px-2 text-center w-[145px] min-w-[135px]">
                            <div className="flex items-center justify-center">
                              <Switch
                                checked={item.inApp}
                                onCheckedChange={(val) => onToggle(item.id, "inApp", val)}
                                disabled={!capabilities.canManageNotifications}
                              />
                            </div>
                          </td>

                          {/* Email */}
                          <td className="py-2.5 px-2 text-center w-[145px] min-w-[135px]">
                            <div className="flex items-center justify-center">
                              <Switch
                                checked={item.email}
                                onCheckedChange={(val) => onToggle(item.id, "email", val)}
                                disabled={!capabilities.canManageNotifications}
                              />
                            </div>
                          </td>

                          {/* WhatsApp */}
                          <td className="py-2.5 px-2 text-center w-[155px] min-w-[145px]">
                            <div className="flex items-center justify-center">
                              <Switch
                                checked={item.whatsapp}
                                onCheckedChange={(val) => onToggle(item.id, "whatsapp", val)}
                                disabled={!capabilities.canManageNotifications}
                              />
                            </div>
                          </td>

                          {/* Slack */}
                          <td className="py-2.5 px-2 text-center w-[145px] min-w-[135px]">
                            <div className="flex items-center justify-center">
                              <Switch
                                checked={item.slack}
                                onCheckedChange={(val) => onToggle(item.id, "slack", val)}
                                disabled={!capabilities.canManageNotifications}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
