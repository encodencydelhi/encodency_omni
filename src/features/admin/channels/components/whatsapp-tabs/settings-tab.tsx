"use client";

import { useState } from "react";
import {
  Save,
  Eye,
  EyeOff,
  Trash2,
  AlertTriangle,
  Plus,
  Pencil,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const settingsTabs = ["General", "API Configuration", "Notifications", "Business Profile", "Team Members"];

const initialTeamMembers = [
  { id: 1, name: "Aditya Srivastava", email: "aditya@namogange.org", role: "Admin", status: "Active" },
  { id: 2, name: "Sarita Chauhan", email: "sarita@namogange.org", role: "Agent", status: "Active" },
  { id: 3, name: "Prakash Gupta", email: "prakash@namogange.org", role: "Agent", status: "Active" },
  { id: 4, name: "Rina Devi", email: "rina@namogange.org", role: "Viewer", status: "Active" },
];

const roleColors: Record<string, string> = {
  Admin: "bg-pink-50 text-pink-700 border-pink-200",
  Agent: "bg-blue-50 text-blue-700 border-blue-200",
  Viewer: "bg-slate-100 text-slate-700 border-slate-200",
};

export function SettingsTab() {
  const [activeSettingTab, setActiveSettingTab] = useState("General");
  const [showApiKey, setShowApiKey] = useState(false);
  const [autoReply, setAutoReply] = useState(true);
  const [notifNewMsg, setNotifNewMsg] = useState(true);
  const [notifCampaign, setNotifCampaign] = useState(true);
  const [notifFailure, setNotifFailure] = useState(true);
  const [notifTemplate, setNotifTemplate] = useState(false);
  const [notifDaily, setNotifDaily] = useState(true);
  const [teamMembers, setTeamMembers] = useState(initialTeamMembers);
  const [isTesting, setIsTesting] = useState(false);

  const handleSave = () => {
    toast.success("WhatsApp Settings Saved!", {
      description: `Updated ${activeSettingTab} settings.`,
    });
  };

  const handleTestConnection = () => {
    setIsTesting(true);
    setTimeout(() => {
      setIsTesting(false);
      toast.success("AiSensy WABA Connection Active!", {
        description: "Status: 200 OK • Webhook listening on https://api.namogange.org/whatsapp/webhook",
      });
    }, 800);
  };

  const handleDeleteMember = (id: number) => {
    const m = teamMembers.find((x) => x.id === id);
    setTeamMembers(teamMembers.filter((x) => x.id !== id));
    toast.success(`Removed team member: ${m?.name}`);
  };

  return (
    <div className="space-y-2 pt-1">
      {/* Sub tabs */}
      <div className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-1">
        {settingsTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSettingTab(tab)}
            className={cn(
              "px-3 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2",
              activeSettingTab === tab
                ? "border-emerald-600 bg-emerald-50/60 text-emerald-800"
                : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeSettingTab === "General" && (
        <div className="space-y-2">
          <section className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs space-y-2">
            <h3 className="text-sm font-bold text-slate-900">Business Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Business Name</label>
                <Input defaultValue="Namo Gange Trust" className="h-10 text-xs border-slate-200 focus:border-emerald-500" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Phone Number</label>
                <div className="flex gap-2">
                  <Input defaultValue="+91 98765 43210" className="h-10 flex-1 text-xs border-slate-200 focus:border-emerald-500" />
                  <Button variant="outline" onClick={() => toast.success("OTP sent to phone")} className="h-10 text-xs font-bold">Verify</Button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Timezone</label>
                <Select defaultValue="asia-kolkata">
                  <SelectTrigger className="h-10 text-xs border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asia-kolkata">Asia/Kolkata (IST)</SelectItem>
                    <SelectItem value="utc">UTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Primary Language</label>
                <Select defaultValue="english">
                  <SelectTrigger className="h-10 text-xs border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="english">English</SelectItem>
                    <SelectItem value="hindi">Hindi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <section className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Auto-Reply Settings</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900">Enable Out-of-Hours Auto Reply</p>
                <p className="text-xs text-slate-500">Automatically respond to incoming messages outside business hours.</p>
              </div>
              <Switch checked={autoReply} onCheckedChange={setAutoReply} />
            </div>
            {autoReply && (
              <div className="mt-3 grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Working Hours Start</label>
                  <Input type="time" defaultValue="09:00" className="h-9 text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Working Hours End</label>
                  <Input type="time" defaultValue="18:00" className="h-9 text-xs" />
                </div>
              </div>
            )}
          </section>

          <div className="flex justify-end">
            <Button onClick={handleSave} className="h-10 px-5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-sm shadow-md shadow-emerald-600/20">
              <Save className="size-4 mr-1.5" /> Save Changes
            </Button>
          </div>
        </div>
      )}

      {activeSettingTab === "API Configuration" && (
        <div className="space-y-2">
          <section className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs space-y-2">
            <h3 className="text-sm font-bold text-slate-900">WhatsApp Business API Setup</h3>
            <div className="space-y-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">BSP Provider</label>
                <Select defaultValue="aisensy">
                  <SelectTrigger className="h-10 w-64 text-xs border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aisensy">AiSensy WABA (Recommended)</SelectItem>
                    <SelectItem value="twilio">Twilio WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">API Key / Access Token</label>
                <div className="flex gap-2">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    defaultValue="sk_live_aisensy_98248291848201"
                    className="h-10 flex-1 text-xs border-slate-200 font-mono"
                  />
                  <Button variant="outline" onClick={() => setShowApiKey(!showApiKey)} className="h-10 px-3">
                    {showApiKey ? <EyeOff className="size-4 text-slate-600" /> : <Eye className="size-4 text-slate-600" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Webhook Target URL</label>
                <Input defaultValue="https://api.namogange.org/whatsapp/webhook" className="h-10 text-xs border-slate-200 font-mono" />
              </div>

              <div className="flex items-center justify-between rounded-sm border border-emerald-200 bg-emerald-50/70 p-4">
                <div>
                  <p className="text-xs font-bold text-emerald-900">Connection Status: Active</p>
                  <p className="text-xs text-emerald-700">Last verified: 2 minutes ago</p>
                </div>
                <Button
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  variant="outline"
                  className="h-9 text-xs font-bold border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                >
                  <RefreshCw className={cn("size-3.5 mr-1.5", isTesting && "animate-spin")} />
                  {isTesting ? "Testing..." : "Test Connection"}
                </Button>
              </div>
            </div>
          </section>

          <div className="flex justify-end">
            <Button onClick={handleSave} className="h-10 px-5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-sm shadow-md shadow-emerald-600/20">
              <Save className="size-4 mr-1.5" /> Save Changes
            </Button>
          </div>
        </div>
      )}

      {activeSettingTab === "Notifications" && (
        <div className="space-y-2">
          <section className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs space-y-2">
            <h3 className="text-sm font-bold text-slate-900">Notification Preferences</h3>
            <div className="space-y-2 divide-y divide-slate-100">
              {[
                { label: "New Inbound Message Alert", desc: "Get notified when a contact sends a message", checked: notifNewMsg, onChange: setNotifNewMsg },
                { label: "Broadcast Completion", desc: "Notify when a broadcast campaign finishes sending", checked: notifCampaign, onChange: setNotifCampaign },
                { label: "Delivery Failures", desc: "Alert when messages fail to deliver", checked: notifFailure, onChange: setNotifFailure },
                { label: "Meta Template Rejection", desc: "Get notified when Meta rejects a template", checked: notifTemplate, onChange: setNotifTemplate },
                { label: "Daily Summary Email", desc: "Receive daily performance report via email", checked: notifDaily, onChange: setNotifDaily },
              ].map((n, i) => (
                <div key={i} className="flex items-center justify-between pt-3.5 first:pt-0">
                  <div>
                    <p className="text-xs font-bold text-slate-900">{n.label}</p>
                    <p className="text-xs text-slate-500">{n.desc}</p>
                  </div>
                  <Switch checked={n.checked} onCheckedChange={n.onChange} />
                </div>
              ))}
            </div>
          </section>

          <div className="flex justify-end">
            <Button onClick={handleSave} className="h-10 px-5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-sm shadow-md shadow-emerald-600/20">
              <Save className="size-4 mr-1.5" /> Save Changes
            </Button>
          </div>
        </div>
      )}

      {activeSettingTab === "Business Profile" && (
        <div className="space-y-2">
          <section className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs space-y-2">
            <h3 className="text-sm font-bold text-slate-900">WhatsApp Business Profile</h3>
            <div className="space-y-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Business Description</label>
                <Input defaultValue="Namo Gange Trust - River Conservation, Tree Plantation & Community Service" className="h-10 text-xs border-slate-200" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Website</label>
                  <Input defaultValue="https://namogange.org" className="h-10 text-xs border-slate-200" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Email Address</label>
                  <Input defaultValue="info@namogange.org" className="h-10 text-xs border-slate-200" />
                </div>
              </div>
            </div>
          </section>

          <div className="flex justify-end">
            <Button onClick={handleSave} className="h-10 px-5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-sm shadow-md shadow-emerald-600/20">
              <Save className="size-4 mr-1.5" /> Save Changes
            </Button>
          </div>
        </div>
      )}

      {activeSettingTab === "Team Members" && (
        <div className="space-y-2">
          <div className="flex justify-end">
            <Button onClick={() => toast.success("Opening Add Member dialog")} className="h-10 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-sm shadow-md">
              <Plus className="size-4 mr-1" /> Add Team Member
            </Button>
          </div>

          <section className="overflow-hidden rounded-sm border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-3 py-3">Email</th>
                  <th className="px-3 py-3">Role</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teamMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900">{m.name}</td>
                    <td className="px-3 py-3 text-slate-600 font-medium">{m.email}</td>
                    <td className="px-3 py-3">
                      <span className={cn("rounded-sm px-2 py-0.5 text-[11px] font-bold border", roleColors[m.role])}>
                        {m.role}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="rounded-sm bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold">
                        {m.status}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => toast.success(`Editing member: ${m.name}`)} className="rounded-sm p-1.5 hover:bg-slate-100 text-slate-500">
                          <Pencil className="size-3.5" />
                        </button>
                        <button onClick={() => handleDeleteMember(m.id)} className="rounded-sm p-1.5 hover:bg-rose-50 text-rose-600">
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {/* Danger Zone */}
      <section className="rounded-sm border-2 border-rose-200 bg-rose-50/30 p-5 shadow-xs space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-rose-700">
          <AlertTriangle className="size-4" /> Danger Zone
        </h3>
        <div className="flex items-center justify-between pt-2 border-t border-rose-200/60">
          <div>
            <p className="text-xs font-bold text-slate-900">Disconnect WhatsApp WABA</p>
            <p className="text-xs text-slate-500">Disconnect your WhatsApp Business API account from AiSensy.</p>
          </div>
          <Button variant="outline" onClick={() => toast.error("Action restricted: Contact Super Admin")} className="h-9 text-xs font-bold border-rose-300 text-rose-700 hover:bg-rose-100">
            Disconnect WABA
          </Button>
        </div>
      </section>
    </div>
  );
}
