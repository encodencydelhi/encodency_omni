"use client";

import { useState } from "react";
import { Clock, Moon, Sun, Calendar, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { BusinessHoursSettings } from "../../data/settings-types";

interface BusinessHoursSectionProps {
  settings: BusinessHoursSettings;
  onChange: (updates: Partial<BusinessHoursSettings>) => void;
}

const DAYS: Array<keyof BusinessHoursSettings["schedule"]> = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"
];

export function BusinessHoursSection({ settings, onChange }: BusinessHoursSectionProps) {
  const [newHolidayDate, setNewHolidayDate] = useState("");
  const [newHolidayName, setNewHolidayName] = useState("");

  const handleToggleDay = (day: keyof BusinessHoursSettings["schedule"]) => {
    const current = settings.schedule[day];
    onChange({
      schedule: {
        ...settings.schedule,
        [day]: { ...current, enabled: !current.enabled },
      },
    });
  };

  const handleTimeChange = (
    day: keyof BusinessHoursSettings["schedule"],
    field: "startTime" | "endTime",
    value: string
  ) => {
    const current = settings.schedule[day];
    onChange({
      schedule: {
        ...settings.schedule,
        [day]: { ...current, [field]: value },
      },
    });
  };

  const handleApplyToAllWeekdays = () => {
    const mondayTimes = settings.schedule.monday;
    const updated = { ...settings.schedule };
    ["monday", "tuesday", "wednesday", "thursday", "friday"].forEach((d) => {
      const day = d as keyof BusinessHoursSettings["schedule"];
      updated[day] = {
        enabled: true,
        startTime: mondayTimes.startTime,
        endTime: mondayTimes.endTime,
      };
    });
    onChange({ schedule: updated });
    toast.success("Applied Monday hours to all weekdays (Mon-Fri)!");
  };

  const handleAddHoliday = () => {
    if (!newHolidayDate || !newHolidayName.trim()) {
      toast.error("Please enter both a date and holiday name.");
      return;
    }
    onChange({
      holidays: [...settings.holidays, { date: newHolidayDate, name: newHolidayName.trim() }],
    });
    setNewHolidayDate("");
    setNewHolidayName("");
    toast.success("Public holiday added to calendar.");
  };

  const handleRemoveHoliday = (index: number) => {
    onChange({
      holidays: settings.holidays.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="size-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
            <Clock className="size-4" />
          </div>
          <div>
            <h3 className="text-[14px] font-bold text-[#111C3A]">Business Hours & Quiet Hours (DND)</h3>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              Enforce telecom regulations (TRAI & Meta opt-in policies), queue off-hours messaging, and set automated after-hours responses.
            </p>
          </div>
        </div>

        <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => onChange({ enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {/* Weekly Operating Schedule Grid */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
          <div className="flex items-center gap-2">
            <Sun className="size-4 text-amber-500" />
            <h4 className="text-[12.5px] font-bold text-[#111C3A]">Weekly Working Hours</h4>
          </div>
          <button
            type="button"
            onClick={handleApplyToAllWeekdays}
            className="text-[11px] font-bold text-[#2563EB] hover:text-[#1D4ED8] cursor-pointer"
          >
            Apply Monday to All Weekdays →
          </button>
        </div>

        <div className="space-y-2 text-[11px]">
          {DAYS.map((day) => {
            const config = settings.schedule[day];
            const capitalized = day.charAt(0).toUpperCase() + day.slice(1);
            return (
              <div
                key={day}
                className={`flex flex-wrap items-center justify-between p-2.5 rounded-lg border transition-colors ${
                  config.enabled ? "bg-[#FAFBFD] border-[#E2E8F0]" : "bg-slate-50/50 border-slate-100 opacity-60"
                }`}
              >
                <div className="flex items-center gap-3 w-32">
                  <input
                    type="checkbox"
                    checked={config.enabled}
                    onChange={() => handleToggleDay(day)}
                    className="size-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className={`font-bold ${config.enabled ? "text-[#111C3A]" : "text-[#94A3B8]"}`}>
                    {capitalized}
                  </span>
                </div>

                {config.enabled ? (
                  <div className="flex items-center gap-2 font-mono">
                    <input
                      type="time"
                      value={config.startTime}
                      onChange={(e) => handleTimeChange(day, "startTime", e.target.value)}
                      className="bg-white border border-[#E2E8F0] rounded px-2 py-1 text-[11.5px] font-medium text-[#111C3A]"
                    />
                    <span className="text-[#94A3B8]">to</span>
                    <input
                      type="time"
                      value={config.endTime}
                      onChange={(e) => handleTimeChange(day, "endTime", e.target.value)}
                      className="bg-white border border-[#E2E8F0] rounded px-2 py-1 text-[11.5px] font-medium text-[#111C3A]"
                    />
                  </div>
                ) : (
                  <span className="text-[10px] font-medium text-[#94A3B8] italic">Closed / Non-operational</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quiet Hours & Policy */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
          <div className="flex items-center gap-2">
            <Moon className="size-4 text-purple-600" />
            <h4 className="text-[12.5px] font-bold text-[#111C3A]">Quiet Hours (Do Not Disturb / DND)</h4>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={settings.enableQuietHours}
              onChange={(e) => onChange({ enableQuietHours: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]">
          <div>
            <label className="block font-bold text-[#334155] mb-1">DND Window Hours</label>
            <div className="flex items-center gap-2 font-mono">
              <input
                type="time"
                value={settings.quietHoursStart}
                onChange={(e) => onChange({ quietHoursStart: e.target.value })}
                className="bg-[#FAFBFD] border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-[#111C3A]"
              />
              <span className="text-[#94A3B8]">until</span>
              <input
                type="time"
                value={settings.quietHoursEnd}
                onChange={(e) => onChange({ quietHoursEnd: e.target.value })}
                className="bg-[#FAFBFD] border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-[#111C3A]"
              />
            </div>
            <p className="text-[10px] text-[#94A3B8] mt-1">
              Standard compliance window: 10:00 PM to 08:00 AM (prevents user annoyance and unsubscribe spikes).
            </p>
          </div>

          <div>
            <label className="block font-bold text-[#334155] mb-1">Off-Hours Queueing Policy</label>
            <select
              value={settings.offHoursPolicy}
              onChange={(e) => onChange({ offHoursPolicy: e.target.value as any })}
              className="w-full bg-[#FAFBFD] border border-[#E2E8F0] rounded-lg px-3 py-2 text-[12px] text-[#111C3A] font-medium focus:outline-none focus:border-blue-500 focus:bg-white"
            >
              <option value="buffer_queue">Buffer & Hold in Queue (Release at 09:00 AM)</option>
              <option value="send_closed_message">Send Automated 'We are closed' Reply</option>
              <option value="bypass_critical">Bypass DND for High-Priority Alerts Only</option>
            </select>
          </div>
        </div>

        {settings.offHoursPolicy === "send_closed_message" && (
          <div className="pt-2">
            <label className="block text-[11px] font-bold text-[#334155] mb-1">Automated After-Hours Message</label>
            <textarea
              rows={2}
              value={settings.autoReplyMessage}
              onChange={(e) => onChange({ autoReplyMessage: e.target.value })}
              className="w-full bg-[#FAFBFD] border border-[#E2E8F0] rounded-lg p-3 text-[11px] text-[#111C3A] focus:outline-none focus:border-blue-500"
            />
          </div>
        )}
      </div>

      {/* Holiday Overrides Calendar */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-5 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#F1F5F9]">
          <Calendar className="size-4 text-[#334155]" />
          <h4 className="text-[12.5px] font-bold text-[#111C3A]">Public Holiday Overrides Calendar</h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            type="date"
            value={newHolidayDate}
            onChange={(e) => setNewHolidayDate(e.target.value)}
            className="bg-[#FAFBFD] border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-[11.5px] text-[#111C3A]"
          />
          <input
            type="text"
            placeholder="Holiday name (e.g. Diwali)"
            value={newHolidayName}
            onChange={(e) => setNewHolidayName(e.target.value)}
            className="bg-[#FAFBFD] border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-[11.5px] text-[#111C3A]"
          />
          <button
            type="button"
            onClick={handleAddHoliday}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold shadow-2xs transition-colors"
          >
            <Plus className="size-3.5" /> Add Holiday
          </button>
        </div>

        <div className="space-y-1.5 pt-2">
          {settings.holidays.map((h, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#FAFBFD] border border-[#E2E8F0] text-[11px]"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-blue-600 bg-white px-2 py-0.5 rounded border border-[#E2E8F0]">
                  {h.date}
                </span>
                <span className="font-semibold text-[#111C3A]">{h.name}</span>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveHoliday(i)}
                className="text-[#94A3B8] hover:text-[#EF4444] p-1 transition-colors"
                title="Remove holiday"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
