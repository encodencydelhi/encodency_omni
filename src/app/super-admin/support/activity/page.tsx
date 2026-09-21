"use client";

import React, { useState } from "react";
import { useSupport } from "@/features/support-tickets/data/mock-provider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils/cn";
import { formatDistanceToNow } from "date-fns";
import { Activity, Settings, Bell, Save, RotateCcw, CheckCircle } from "lucide-react";

export default function ActivitySettingsPage() {
  const { activities, tickets } = useSupport();
  const [activeTab, setActiveTab] = useState<"activity" | "settings">("activity");
  const [saved, setSaved] = useState(false);

  const [autoAssign, setAutoAssign] = useState(true);
  const [slaBreachNotif, setSlaBreachNotif] = useState(true);
  const [csatSurvey, setCsatSurvey] = useState(true);
  const [autoClose, setAutoClose] = useState(false);
  const [emailNotif, setEmailNotif] = useState(true);
  const [escalationAlerts, setEscalationAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setAutoAssign(true);
    setSlaBreachNotif(true);
    setCsatSurvey(true);
    setAutoClose(false);
    setEmailNotif(true);
    setEscalationAlerts(true);
    setWeeklyDigest(false);
  };

  const getActorIcon = (actorType: string) => {
    switch (actorType) {
      case "Customer": return <div className="w-6 h-6 rounded-full bg-[#DBEAFE] flex items-center justify-center text-[10px] font-semibold text-[#2563EB]">C</div>;
      case "PlatformStaff": return <div className="w-6 h-6 rounded-full bg-[#D1FAE5] flex items-center justify-center text-[10px] font-semibold text-[#10B981]">S</div>;
      default: return <div className="w-6 h-6 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[10px] font-semibold text-[#64748B]">Y</div>;
    }
  };

  return (
    <div className="flex flex-col gap-2 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-bold text-[#0F172A]">Activity & Settings</h2>
          <p className="text-[13px] text-[#64748B] mt-1">View support activity feed and configure ticket settings</p>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-[#E2E8F0] pb-0">
        {[
          { id: "activity" as const, label: "Activity Feed" },
          { id: "settings" as const, label: "Settings" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2.5 text-[13px] font-medium transition-colors relative",
              activeTab === tab.id ? "text-[#EB0711]" : "text-[#64748B] hover:text-[#EB0711]"
            )}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#EB0711]" />
            )}
          </button>
        ))}
      </div>

      {activeTab === "activity" ? (
        <Card className="p-5 border-[#E2E8F0] shadow-sm rounded-sm">
          <h3 className="text-[14px] font-semibold text-[#0F172A] mb-4">Recent Activity</h3>
          <div className="flex flex-col gap-0">
            {activities.length === 0 ? (
              <p className="text-[13px] text-[#64748B] text-center py-8">No activity recorded yet.</p>
            ) : (
              activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 py-3 border-b border-[#F1F5F9] last:border-0">
                  {getActorIcon(activity.actorType)}
                  <div className="flex flex-col gap-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-[#0F172A]">{activity.actorName}</span>
                      <span className="text-[12px] text-[#64748B]">{activity.actionType}</span>
                      {activity.ticketId && (
                        <span className="text-[12px] text-[#2563EB] font-medium">{activity.ticketId}</span>
                      )}
                    </div>
                    {activity.previousValue && activity.newValue && (
                      <div className="flex items-center gap-2 text-[12px]">
                        <span className="text-[#94A3B8] line-through">{activity.previousValue}</span>
                        <span className="text-[#64748B]">→</span>
                        <span className="text-[#0F172A] font-medium">{activity.newValue}</span>
                      </div>
                    )}
                    {activity.reason && (
                      <p className="text-[12px] text-[#64748B] italic">&quot;{activity.reason}&quot;</p>
                    )}
                  </div>
                  <span className="text-[11px] text-[#94A3B8] whitespace-nowrap">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <Card className="p-5 border-[#E2E8F0] shadow-sm rounded-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-md border border-sky-200 bg-sky-50">
                <Settings size={14} className="text-sky-600" />
              </div>
              <h3 className="text-[14px] font-semibold text-[#0F172A]">General Settings</h3>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between py-2 border-b border-[#F1F5F9]">
                <div className="flex flex-col">
                  <span className="text-[13px] font-medium text-[#0F172A]">Auto-assign new tickets</span>
                  <span className="text-[11px] text-[#64748B]">Automatically route tickets to available teams</span>
                </div>
                <Switch checked={autoAssign} onCheckedChange={setAutoAssign} />
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#F1F5F9]">
                <div className="flex flex-col">
                  <span className="text-[13px] font-medium text-[#0F172A]">SLA breach notifications</span>
                  <span className="text-[11px] text-[#64748B]">Send alerts when SLA deadlines are missed</span>
                </div>
                <Switch checked={slaBreachNotif} onCheckedChange={setSlaBreachNotif} />
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#F1F5F9]">
                <div className="flex flex-col">
                  <span className="text-[13px] font-medium text-[#0F172A]">Customer satisfaction survey</span>
                  <span className="text-[11px] text-[#64748B]">Send CSAT survey after ticket resolution</span>
                </div>
                <Switch checked={csatSurvey} onCheckedChange={setCsatSurvey} />
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="flex flex-col">
                  <span className="text-[13px] font-medium text-[#0F172A]">Auto-close resolved tickets</span>
                  <span className="text-[11px] text-[#64748B]">Close tickets after 7 days of resolution</span>
                </div>
                <Switch checked={autoClose} onCheckedChange={setAutoClose} />
              </div>
            </div>
          </Card>

          <Card className="p-5 border-[#E2E8F0] shadow-sm rounded-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-md border border-violet-200 bg-violet-50">
                <Bell size={14} className="text-violet-600" />
              </div>
              <h3 className="text-[14px] font-semibold text-[#0F172A]">Notification Preferences</h3>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between py-2 border-b border-[#F1F5F9]">
                <div className="flex flex-col">
                  <span className="text-[13px] font-medium text-[#0F172A]">Email notifications</span>
                  <span className="text-[11px] text-[#64748B]">Receive email for new ticket assignments</span>
                </div>
                <Switch checked={emailNotif} onCheckedChange={setEmailNotif} />
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#F1F5F9]">
                <div className="flex flex-col">
                  <span className="text-[13px] font-medium text-[#0F172A]">Escalation alerts</span>
                  <span className="text-[11px] text-[#64748B]">Notify when tickets are escalated</span>
                </div>
                <Switch checked={escalationAlerts} onCheckedChange={setEscalationAlerts} />
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="flex flex-col">
                  <span className="text-[13px] font-medium text-[#0F172A]">Weekly digest</span>
                  <span className="text-[11px] text-[#64748B]">Send weekly support summary report</span>
                </div>
                <Switch checked={weeklyDigest} onCheckedChange={setWeeklyDigest} />
              </div>
            </div>
          </Card>

          <div className="flex items-center justify-end gap-2 mt-2">
            {saved && (
              <span className="flex items-center gap-1.5 text-[12px] text-[#10B981] font-medium">
                <CheckCircle size={14} /> Settings saved
              </span>
            )}
            <Button size="sm" variant="outline" className="h-8 gap-2 border-[#E2E8F0] text-[#475569]" onClick={handleReset}>
              <RotateCcw size={14} />
              Reset Defaults
            </Button>
            <Button size="sm" className="h-8 gap-2 bg-[#EB0711] hover:bg-[#D60811] text-white" onClick={handleSave}>
              <Save size={14} />
              Save Settings
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
