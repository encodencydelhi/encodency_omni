"use client";


import {
  Search, ChevronDown, LayoutDashboard, UserPlus, PhoneCall, Globe,
  MessageSquare, Star, ArrowRight, Activity, Clock, BarChart3,
  Lightbulb, MapPin
} from "lucide-react";

export function TemplatesPage() {

  return (
    <div className="space-y-4 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search templates..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-[#E2E8F0] rounded-lg text-[13px] focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]"
          />
        </div>
        <div className="flex items-center gap-2">
          {['All Categories', 'All Channels', 'All Complexity', 'Most Popular'].map(f => (
            <div key={f} className="flex items-center gap-1.5 border border-[#E2E8F0] bg-white rounded-md px-3 py-1.5 text-[12px] font-medium text-[#334155] cursor-pointer hover:bg-slate-50">
              {f} <ChevronDown className="size-3.5 text-[#94A3B8]" />
            </div>
          ))}
          <div className="flex items-center gap-1.5 border border-[#E2E8F0] bg-white rounded-md px-3 py-1.5 text-[12px] font-bold text-[#111C3A] cursor-pointer hover:bg-slate-50">
            1 <ChevronDown className="size-3.5 text-[#94A3B8]" />
          </div>
        </div>
      </div>

      {/* Main 3-Column Layout */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">

        {/* LEFT COLUMN (Filters) */}
        <div className="w-full lg:w-[220px] shrink-0 space-y-4">

          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4">
            <h3 className="text-[13px] font-bold text-[#111C3A] mb-3">Browse by Use Case</h3>
            <div className="space-y-0.5">
              {[
                { icon: <LayoutDashboard className="size-3.5" />, label: "All Templates", count: 42, active: true },
                { icon: <UserPlus className="size-3.5" />, label: "Sales", count: 8 },
                { icon: <PhoneCall className="size-3.5" />, label: "Support", count: 6 },
                { icon: <Star className="size-3.5" />, label: "Reputation", count: 7 },
                { icon: <Search className="size-3.5" />, label: "SEO", count: 5 },
                { icon: <Globe className="size-3.5" />, label: "Website", count: 6 },
                { icon: <UserPlus className="size-3.5" />, label: "CRM", count: 4 },
                { icon: <MessageSquare className="size-3.5" />, label: "Social", count: 4 },
                { icon: <Clock className="size-3.5" />, label: "Custom", count: 2 },
              ].map((cat, i) => (
                <div key={i} className={`flex items-center justify-between py-1.5 px-2 -mx-2 rounded-md cursor-pointer transition-colors ${cat.active ? 'bg-blue-50 text-[#2563EB]' : 'text-[#64748B] hover:bg-slate-50 hover:text-[#111C3A]'}`}>
                  <div className="flex items-center gap-2">
                    {cat.icon}
                    <span className={`text-[12px] ${cat.active ? 'font-bold' : 'font-medium'}`}>{cat.label}</span>
                  </div>
                  <span className={`text-[11px] ${cat.active ? 'font-bold text-[#2563EB]' : 'text-[#94A3B8]'}`}>{cat.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4">
            <h3 className="text-[13px] font-bold text-[#111C3A] mb-3">Template Features</h3>
            <div className="space-y-2">
              {[
                { label: "Multi-channel", count: 18 },
                { label: "AI-powered", count: 12 },
                { label: "Conditional logic", count: 16 },
                { label: "Pre-built integrations", count: 20 },
                { label: "Popular templates", count: 10 },
                { label: "New templates", count: 6 },
              ].map((feat, i) => (
                <label key={i} className="flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 size-3.5" />
                    <span className="text-[12px] font-medium text-[#64748B] group-hover:text-[#111C3A]">{feat.label}</span>
                  </div>
                  <span className="text-[11px] text-[#94A3B8]">{feat.count}</span>
                </label>
              ))}
            </div>
          </div>

        </div>

        {/* MIDDLE COLUMN (Main Content) */}
        <div className="flex-1 space-y-4">

          {/* Featured Templates */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[14px] font-bold text-[#111C3A]">Featured Templates</h3>
                <p className="text-[11px] text-[#64748B] mt-0.5">Our most popular templates to help you get started quickly.</p>
              </div>
              <a href="#" className="text-[11px] font-medium text-[#2563EB] hover:underline flex items-center gap-1">View all featured <ArrowRight className="size-3" /></a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="bg-[#F0F9FF] border border-[#BAE6FD] rounded-xl p-4 relative flex flex-col hover:-translate-y-0.5 transition-transform cursor-pointer">
                <div className="absolute top-3 right-3 bg-[#3B82F6] text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">Most Popular</div>
                <div className="size-10 bg-white rounded-lg shadow-sm flex items-center justify-center text-blue-500 mb-3"><UserPlus className="size-5" /></div>
                <h4 className="text-[13px] font-bold text-[#0F172A] mb-1">New Lead Follow-up</h4>
                <p className="text-[10px] text-[#475569] mb-3 leading-snug flex-1">Automatically follow up with new leads across multiple channels.</p>
                <div className="flex items-center gap-1 mb-4">
                  <span className="text-[9px] font-bold text-blue-700 bg-blue-100/50 px-1.5 py-0.5 rounded border border-blue-200">Sales</span>
                  <span className="text-[9px] font-bold text-blue-700 bg-blue-100/50 px-1.5 py-0.5 rounded border border-blue-200">High Converting</span>
                </div>
                <div className="flex items-center justify-between border-t border-[#BAE6FD] pt-3">
                  <div className="flex -space-x-1">
                    <div className="size-5 rounded-full bg-white flex items-center justify-center border border-[#BAE6FD] text-[8px] font-bold text-orange-500">G</div>
                    <div className="size-5 rounded-full bg-white flex items-center justify-center border border-[#BAE6FD] text-emerald-500"><MessageSquare className="size-2.5" fill="currentColor" /></div>
                    <div className="size-5 rounded-full bg-white flex items-center justify-center border border-[#BAE6FD] text-blue-500"><Globe className="size-2.5" /></div>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-medium text-[#475569]">
                    <Clock className="size-3" /> 12 min setup
                  </div>
                </div>
              </div>

              <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl p-4 relative flex flex-col hover:-translate-y-0.5 transition-transform cursor-pointer">
                <div className="absolute top-3 right-3 bg-[#10B981] text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">Essential</div>
                <div className="size-10 bg-white rounded-lg shadow-sm flex items-center justify-center text-emerald-500 mb-3"><Star className="size-5" /></div>
                <h4 className="text-[13px] font-bold text-[#0F172A] mb-1">Review Management</h4>
                <p className="text-[10px] text-[#475569] mb-3 leading-snug flex-1">Monitor and respond to customer reviews automatically.</p>
                <div className="flex items-center gap-1 mb-4">
                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100/50 px-1.5 py-0.5 rounded border border-emerald-200">Reputation</span>
                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100/50 px-1.5 py-0.5 rounded border border-emerald-200">Saves Time</span>
                </div>
                <div className="flex items-center justify-between border-t border-[#A7F3D0] pt-3">
                  <div className="flex -space-x-1">
                    <div className="size-5 rounded-full bg-white flex items-center justify-center border border-[#A7F3D0] text-[8px] font-bold text-orange-500">G</div>
                    <div className="size-5 rounded-full bg-white flex items-center justify-center border border-[#A7F3D0] text-blue-600"><span className="text-[8px] font-bold">M</span></div>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-medium text-[#475569]">
                    <Clock className="size-3" /> 10 min setup
                  </div>
                </div>
              </div>

              <div className="bg-[#F5F3FF] border border-[#DDD6FE] rounded-xl p-4 relative flex flex-col hover:-translate-y-0.5 transition-transform cursor-pointer">
                <div className="absolute top-3 right-3 bg-[#8B5CF6] text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">Recommended</div>
                <div className="size-10 bg-white rounded-lg shadow-sm flex items-center justify-center text-purple-500 mb-3"><Globe className="size-5" /></div>
                <h4 className="text-[13px] font-bold text-[#0F172A] mb-1">Website Monitoring</h4>
                <p className="text-[10px] text-[#475569] mb-3 leading-snug flex-1">Get notified when your website goes down or has issues.</p>
                <div className="flex items-center gap-1 mb-4">
                  <span className="text-[9px] font-bold text-purple-700 bg-purple-100/50 px-1.5 py-0.5 rounded border border-purple-200">Website</span>
                  <span className="text-[9px] font-bold text-purple-700 bg-purple-100/50 px-1.5 py-0.5 rounded border border-purple-200">Proactive</span>
                </div>
                <div className="flex items-center justify-between border-t border-[#DDD6FE] pt-3">
                  <div className="flex -space-x-1">
                    <div className="size-5 rounded-full bg-white flex items-center justify-center border border-[#DDD6FE] text-blue-500"><MessageSquare className="size-2.5" /></div>
                    <div className="size-5 rounded-full bg-white flex items-center justify-center border border-[#DDD6FE] text-[#111C3A]"><LayoutDashboard className="size-2.5" /></div>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-medium text-[#475569]">
                    <Clock className="size-3" /> 5 min setup
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Template Library */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[14px] font-bold text-[#111C3A]">Template Library</h3>
                <p className="text-[11px] text-[#64748B] mt-0.5">Choose from our collection of ready-to-use workflow templates.</p>
              </div>
              <div className="text-[11px] text-[#64748B]">
                Showing 10 of 42 templates
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
              {[
                { icon: <UserPlus className="size-4 text-blue-500" />, title: "New Lead Follow-up", desc: "Automatically follow up with new leads across multiple channels.", tags: ["Sales", "Popular"], time: "12 min", uses: "1.2K", c1: "G", c2: <MessageSquare className="size-2.5" fill="currentColor" /> },
                { icon: <span className="text-orange-500 font-bold text-[14px]">G</span>, title: "Negative Review Alert", desc: "Get notified of negative reviews and respond quickly.", tags: ["Reputation", "Essential"], time: "8 min", uses: "856", c1: "G", c2: <Globe className="size-2.5" /> },
                { icon: <Activity className="size-4 text-emerald-500" />, title: "Website Down Alert", desc: "Alert when your website is down and notify your team.", tags: ["Website", "Monitoring"], time: "5 min", uses: "642", c1: <MessageSquare className="size-2.5" />, c2: <LayoutDashboard className="size-2.5" /> },
                { icon: <MessageSquare className="size-4 text-emerald-500" fill="currentColor" />, title: "WhatsApp Re-engagement", desc: "Re-engage inactive leads with personalized WhatsApp messages.", tags: ["Sales", "Re-engagement"], time: "10 min", uses: "934", c1: <MessageSquare className="size-2.5" fill="currentColor" />, c2: null },
                { icon: <Clock className="size-4 text-blue-500" />, title: "Appointment Reminder", desc: "Send automated appointment reminders to reduce no-shows.", tags: ["CRM", "Engagement"], time: "8 min", uses: "721", c1: <MessageSquare className="size-2.5" fill="currentColor" />, c2: <UserPlus className="size-2.5" /> },
                { icon: <BarChart3 className="size-4 text-yellow-500" />, title: "SEO Issue Assignment", desc: "Automatically assign SEO issues to your team.", tags: ["SEO", "Automation"], time: "10 min", uses: "512", c1: "G", c2: <LayoutDashboard className="size-2.5" /> },
                { icon: <Star className="size-4 text-red-500" fill="currentColor" />, title: "Donation Follow-up", desc: "Thank donors and send follow-up messages automatically.", tags: ["Custom", "Non-Profit"], time: "7 min", uses: "423", c1: <MessageSquare className="size-2.5" />, c2: <MessageSquare className="size-2.5" fill="currentColor" /> },
                { icon: <MessageSquare className="size-4 text-blue-600" />, title: "Abandoned Form Recovery", desc: "Recover lost leads from abandoned forms.", tags: ["Sales", "Conversion"], time: "9 min", uses: "689", c1: <MessageSquare className="size-2.5" />, c2: "G" },
                { icon: <UserPlus className="size-4 text-indigo-500" />, title: "Social Comment Escalation", desc: "Detect important comments and escalate to your team.", tags: ["Social", "Support"], time: "6 min", uses: "398", c1: "M", c2: "L" },
                { icon: <PhoneCall className="size-4 text-emerald-600" />, title: "Missed Call Response", desc: "Instantly respond to missed calls with SMS or email.", tags: ["CRM", "Response"], time: "8 min", uses: "476", c1: <MessageSquare className="size-2.5" fill="currentColor" />, c2: <PhoneCall className="size-2.5" /> },
              ].map((tpl, i) => (
                <div key={i} className="border border-[#E2E8F0] rounded-xl p-3 flex flex-col hover:border-[#CBD5E1] hover:shadow-sm transition-all group">
                  <div className="size-8 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-center mb-2">
                    {tpl.icon}
                  </div>
                  <h4 className="text-[12px] font-bold text-[#111C3A] mb-1">{tpl.title}</h4>
                  <p className="text-[9px] text-[#64748B] mb-2 leading-snug line-clamp-2 flex-1">{tpl.desc}</p>

                  <div className="flex items-center gap-1 mb-2.5">
                    {tpl.c1 && <div className={`size-4 flex justify-center items-center rounded-full bg-slate-100 text-[6px] font-bold ${typeof tpl.c1 === 'string' ? 'text-[#111C3A]' : 'text-blue-500'}`}>{tpl.c1}</div>}
                    {tpl.c2 && <div className={`size-4 flex justify-center items-center rounded-full bg-slate-100 text-[6px] font-bold ${typeof tpl.c2 === 'string' ? 'text-[#111C3A]' : 'text-emerald-500'}`}>{tpl.c2}</div>}
                  </div>

                  <div className="flex items-center justify-between mb-3 text-[9px]">
                    <div className="flex gap-1">
                      {tpl.tags.map(t => (
                        <span key={t} className="px-1.5 py-0.5 rounded text-[#2563EB] bg-blue-50 font-medium">{t}</span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-[#64748B] mb-3 font-medium">
                    <span className="flex items-center gap-1"><Clock className="size-2.5" /> {tpl.time}</span>
                    <span className="flex items-center gap-1"><ArrowRight className="size-2.5" /> {tpl.uses} uses</span>
                  </div>

                  <button className="w-full text-center py-1.5 rounded-md border border-[#BFDBFE] text-[#2563EB] text-[10px] font-bold hover:bg-blue-50 transition-colors mt-auto">
                    Use Template
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN (Sidebar) */}
        <div className="w-full lg:w-[240px] shrink-0 space-y-4">

          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-bold text-[#111C3A]">Recently Used</h3>
              <a href="#" className="text-[11px] font-medium text-[#2563EB] hover:underline flex items-center gap-1">View all <ArrowRight className="size-3" /></a>
            </div>
            <div className="space-y-2">
              {[
                { icon: <UserPlus className="size-3.5 text-blue-500" />, bg: "bg-blue-50 border-blue-100", title: "New Lead Follow-up", time: "Used 2 hours ago" },
                { icon: <Activity className="size-3.5 text-blue-500" />, bg: "bg-blue-50 border-blue-100", title: "Website Down Alert", time: "Used 5 hours ago" },
                { icon: <span className="text-[12px] font-bold text-orange-500">G</span>, bg: "bg-orange-50 border-orange-100", title: "Negative Review Alert", time: "Used 1 day ago" },
                { icon: <MessageSquare className="size-3.5 text-emerald-500" fill="currentColor" />, bg: "bg-emerald-50 border-emerald-100", title: "WhatsApp Re-engagement", time: "Used 2 days ago" },
                { icon: <Clock className="size-3.5 text-blue-500" />, bg: "bg-blue-50 border-blue-100", title: "Appointment Reminder", time: "Used 3 days ago" },
              ].map((tpl, i) => (
                <div key={i} className="flex gap-2.5 items-start p-2 -mx-2 hover:bg-slate-50 rounded-md cursor-pointer transition-colors">
                  <div className={`size-7 shrink-0 rounded border flex items-center justify-center ${tpl.bg}`}>
                    {tpl.icon}
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-[#111C3A] leading-tight mb-0.5">{tpl.title}</h4>
                    <p className="text-[9px] text-[#64748B]">{tpl.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4">
            <h3 className="text-[13px] font-bold text-[#111C3A] mb-3">Recommended for this Client</h3>
            <div className="space-y-2">
              {[
                { icon: <Search className="size-3.5 text-purple-600" />, bg: "bg-purple-100", title: "Local SEO Report", desc: "Send automated weekly SEO reports to your client." },
                { icon: <UserPlus className="size-3.5 text-emerald-600" />, bg: "bg-emerald-100", title: "Client Onboarding", desc: "Set up new client welcome sequence." },
                { icon: <BarChart3 className="size-3.5 text-rose-600" />, bg: "bg-rose-100", title: "Monthly Performance Report", desc: "Send automated monthly reports." },
              ].map((tpl, i) => (
                <div key={i} className="flex gap-2.5 items-start border border-[#E2E8F0] rounded-lg p-2.5 hover:border-[#CBD5E1] hover:shadow-sm cursor-pointer transition-all">
                  <div className={`size-7 shrink-0 rounded flex items-center justify-center ${tpl.bg}`}>
                    {tpl.icon}
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-[#111C3A] leading-tight mb-1">{tpl.title}</h4>
                    <p className="text-[9px] text-[#64748B] leading-snug">{tpl.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 flex flex-col to-white border border-purple-100 rounded-xl p-4 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-20"><Lightbulb className="size-16 text-purple-600" fill="currentColor" /></div>
            <div className="relative z-10 flex items-start gap-3 mb-3">
              <div className="size-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                <Lightbulb className="size-4 text-purple-600" fill="currentColor" />
              </div>
              <div>
                <h4 className="text-[12px] font-bold text-[#111C3A] mb-1">Need something specific?</h4>
                <p className="text-[10px] text-[#64748B] leading-snug">Can't find the right template? Request a custom template and our team will build it for you.</p>
              </div>
            </div>
            <button className="w-full relative z-10 bg-white border border-[#E2E8F0] text-[#2563EB] text-[11px] font-bold py-1.5 rounded-md shadow-sm hover:bg-slate-50 transition-colors">
              Request Custom Template
            </button>
          </div>

          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 flex gap-3 items-start">
            <div className="shrink-0"><MapPin className="size-4 text-[#3B82F6]" /></div>
            <div>
              <h4 className="text-[11px] font-bold text-[#111C3A] mb-1">New to templates?</h4>
              <p className="text-[10px] text-[#64748B] leading-snug mb-2">Templates help you automate common tasks, save time and get better results. You can customize any template to fit your needs.</p>
              <a href="#" className="text-[10px] font-medium text-[#2563EB] hover:underline flex items-center gap-1">Learn more about templates <ArrowRight className="size-3" /></a>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
