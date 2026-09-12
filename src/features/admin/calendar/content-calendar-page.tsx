"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Filter, MoreVertical, Edit2, BarChart2, Megaphone, Image as ImageIcon, ChevronDown } from "lucide-react";
import { ChannelLogo } from "../shared/channel-logo";
import { useCalendarContent } from "../shared/use-admin-workspace";
import { cn } from "@/lib/utils/cn";

const days = Array.from({ length: 35 }, (_, index) => index - 1);

export function ContentCalendarPage() {
  const { data = [] } = useCalendarContent();
  const [view, setView] = useState<"Month" | "Week" | "List">("Month");

  return (
    <div className="space-y-3 max-w-[1500px] mx-auto pb-6">
      {/* Header Area */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
        <div>
          <div className="text-[11px] text-muted-foreground flex items-center mb-1">
            <span>Dashboard</span>
            <ChevronRight className="mx-1 h-3 w-3" />
            <strong className="text-foreground font-semibold">Calendar</strong>
          </div>
          <h1 className="text-[26px] font-bold tracking-tight text-foreground">Content Calendar</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Plan, schedule and track your content across all channels.</p>
        </div>
        
        {/* Banner Graphic */}
        <div className="hidden md:flex relative h-[68px] w-[420px] rounded-xl bg-gradient-to-r from-red-50 to-red-100 overflow-hidden items-center px-5 border border-red-100/50 shadow-sm">
           <div className="relative z-10">
             <h3 className="text-[13px] font-bold text-gray-900 leading-tight">Consistency today.</h3>
             <h3 className="text-[13px] font-bold text-gray-900 leading-tight mb-1.5">A stronger tomorrow.</h3>
             <div className="w-10 h-[3px] bg-[#EB0711] rounded-full" />
           </div>
           {/* Decorative elements */}
           <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2 opacity-90">
              <div className="w-[52px] h-[52px] bg-white rounded-md shadow-sm border border-red-100 flex flex-col overflow-hidden relative">
                <div className="h-3.5 bg-[#EB0711]" />
                <div className="flex-1 grid grid-cols-3 gap-[1px] p-1 bg-gray-50">
                  {Array.from({length: 9}).map((_, i) => <div key={i} className="bg-white rounded-[1px] shadow-sm" />)}
                </div>
              </div>
           </div>
           <div className="absolute right-0 top-0 w-32 h-32 bg-gradient-to-bl from-red-200/40 to-transparent rounded-full -translate-y-1/2 translate-x-1/4" />
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid gap-3 lg:grid-cols-[1fr_280px] xl:grid-cols-[1fr_300px] items-start">
        
        {/* LEFT COLUMN: Main Calendar Area */}
        <div className="space-y-3">
          <section className="rounded-xl border bg-white shadow-sm overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between border-b p-3 bg-white">
              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-md border shadow-sm overflow-hidden h-9">
                  <button className="grid px-2 h-full place-items-center hover:bg-gray-50 border-r text-gray-600 transition-colors"><ChevronLeft className="size-4" /></button>
                  <button className="grid px-2 h-full place-items-center hover:bg-gray-50 text-gray-600 transition-colors"><ChevronRight className="size-4" /></button>
                </div>
                <button className="h-9 rounded-md border px-4 text-[12px] font-bold shadow-sm hover:bg-gray-50 text-gray-700 transition-colors">Today</button>
              </div>
              
              <div className="flex items-center gap-2 cursor-pointer hover:opacity-80">
                 <h2 className="text-[15px] font-bold text-foreground">September 2026</h2>
                 <ChevronDown className="size-4 text-gray-500" />
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex rounded-md bg-gray-100 p-0.5 h-9">
                  {(["Month", "Week", "List"] as const).map((item) => (
                    <button 
                      key={item} 
                      onClick={() => setView(item)} 
                      className={cn(
                        "rounded-sm px-4 text-[12px] font-bold transition-all", 
                        view === item ? "bg-[#EB0711] text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
                      )}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                <button className="flex h-9 items-center gap-1.5 rounded-md border px-3 text-[12px] font-bold shadow-sm hover:bg-gray-50 text-gray-700 transition-colors">
                   <Filter className="size-3.5" /> Filters
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 border-b bg-[#FDFDFD]">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="px-2 py-2.5 text-center text-[11px] font-bold text-gray-500">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day, index) => { 
                const events = data.filter((_, itemIndex) => itemIndex === index - 8 || itemIndex === index - 13); 
                const isToday = day === new Date().getDate();
                return (
                  <div key={index} className={cn("min-h-[90px] border-b border-r p-1.5 relative group transition-colors", isToday ? "bg-red-50/20" : "hover:bg-gray-50/50")}>
                    {/* Day Number */}
                    <div className={cn("text-[11px] font-bold mb-1 ml-1", day <= 0 || day > 30 ? "text-gray-400" : "text-gray-700", isToday && "text-[#EB0711]")}>
                       {day > 0 && day <= 30 ? day : day <= 0 ? 31 + day : day - 30}
                    </div>
                    {isToday && <div className="absolute inset-0 border-[1.5px] border-[#EB0711] pointer-events-none" />}
                    
                    {/* Events */}
                    <div className="space-y-1">
                      {events.map((item) => (
                        <div key={item.id} className="rounded border bg-white px-1.5 py-1 flex items-start gap-1.5 shadow-sm group/event hover:border-blue-300 cursor-pointer transition-colors relative overflow-hidden">
                          <div className={cn("absolute left-0 top-0 bottom-0 w-0.5", isToday ? "bg-red-500" : "bg-blue-500")} />
                          <ChannelLogo channel={item.channel} className="size-3 mt-0.5 shrink-0 ml-0.5" />
                          <div className="min-w-0 flex-1">
                             <p className="truncate text-[10px] font-bold text-gray-900 leading-tight">{item.title}</p>
                             <p className="text-[9px] text-gray-500">{new Date(item.scheduledAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                          </div>
                          <MoreVertical className="size-3 text-gray-400 opacity-0 group-hover/event:opacity-100 shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                ); 
              })}
            </div>
          </section>

          {/* Bottom Row: Today's Schedule & Quick Actions */}
          <div className="grid lg:grid-cols-[1.5fr_1fr] gap-3 items-start">
             {/* Today's Schedule */}
             <div className="bg-white rounded-xl border shadow-sm p-3">
                <div className="flex items-center justify-between mb-4">
                   <div className="flex items-center gap-2">
                     <h2 className="text-[14px] font-bold text-foreground">Today's Schedule</h2>
                     <span className="flex items-center justify-center size-[18px] rounded-full bg-gray-100 text-[10px] font-bold text-gray-700">3</span>
                   </div>
                   <button className="text-[11px] font-bold text-[#EB0711] hover:underline flex items-center gap-1">View all &rarr;</button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                        <th className="pb-2 font-medium">Time</th>
                        <th className="pb-2 font-medium">Content</th>
                        <th className="pb-2 font-medium">Channel</th>
                        <th className="pb-2 font-medium">Project</th>
                        <th className="pb-2 font-medium">Status</th>
                        <th className="pb-2 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-[12px]">
                        <tr>
                          <td className="py-2.5 text-gray-600 whitespace-nowrap">10:00 AM</td>
                          <td className="py-2.5">
                             <div className="flex items-center gap-2">
                                <ChannelLogo channel="Google Business" className="size-5 shrink-0" />
                                <div>
                                  <p className="font-bold text-gray-900 text-[11px]">World Health Day Post</p>
                                  <p className="text-[10px] text-gray-500">Healthier Communities...</p>
                                </div>
                             </div>
                          </td>
                          <td className="py-2.5"><ChannelLogo channel="Facebook" className="size-4" /></td>
                          <td className="py-2.5 text-gray-600 text-[11px]">Moksha Sewa</td>
                          <td className="py-2.5"><span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">Scheduled</span></td>
                          <td className="py-2.5 text-right">
                             <div className="flex items-center justify-end gap-1">
                                <button className="text-[10px] font-bold text-gray-600 border rounded px-2 py-1 hover:bg-gray-50">Edit</button>
                                <button className="border rounded p-1 hover:bg-gray-50 text-gray-500"><MoreVertical className="size-3.5" /></button>
                             </div>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 text-gray-600 whitespace-nowrap">12:00 PM</td>
                          <td className="py-2.5">
                            <div className="flex items-center gap-2">
                               <div className="size-5 rounded bg-red-100 flex items-center justify-center shrink-0 text-red-600"><span className="text-[10px] font-bold">T</span></div>
                               <div>
                                 <p className="font-bold text-gray-900 text-[11px]">Team Meeting Post</p>
                                 <p className="text-[10px] text-gray-500">Planning for April...</p>
                               </div>
                            </div>
                          </td>
                          <td className="py-2.5"><ChannelLogo channel="LinkedIn" className="size-4" /></td>
                          <td className="py-2.5 text-gray-600 text-[11px]">Moksha Sewa</td>
                          <td className="py-2.5"><span className="text-[9px] font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded">Draft</span></td>
                          <td className="py-2.5 text-right">
                             <div className="flex items-center justify-end gap-1">
                                <button className="text-[10px] font-bold text-gray-600 border rounded px-2 py-1 hover:bg-gray-50">Edit</button>
                                <button className="border rounded p-1 hover:bg-gray-50 text-gray-500"><MoreVertical className="size-3.5" /></button>
                             </div>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 text-gray-600 whitespace-nowrap">04:00 PM</td>
                          <td className="py-2.5">
                            <div className="flex items-center gap-2">
                               <div className="size-5 rounded bg-red-100 flex items-center justify-center shrink-0 text-red-600"><span className="text-[10px] font-bold">B</span></div>
                               <div>
                                 <p className="font-bold text-gray-900 text-[11px]">Behind the Scenes Story</p>
                                 <p className="text-[10px] text-gray-500">Our team in action</p>
                               </div>
                            </div>
                          </td>
                          <td className="py-2.5"><ChannelLogo channel="Instagram" className="size-4" /></td>
                          <td className="py-2.5 text-gray-600 text-[11px]">Moksha Sewa</td>
                          <td className="py-2.5"><span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">Scheduled</span></td>
                          <td className="py-2.5 text-right">
                             <div className="flex items-center justify-end gap-1">
                                <button className="text-[10px] font-bold text-gray-600 border rounded px-2 py-1 hover:bg-gray-50">Edit</button>
                                <button className="border rounded p-1 hover:bg-gray-50 text-gray-500"><MoreVertical className="size-3.5" /></button>
                             </div>
                          </td>
                        </tr>
                    </tbody>
                  </table>
                </div>
             </div>

             {/* Quick Actions */}
             <div>
                <h2 className="text-[14px] font-bold text-foreground mb-3">Quick Actions</h2>
                <div className="grid grid-cols-2 gap-3">
                   <button className="text-left p-3.5 rounded-xl bg-[#FFF1F2] hover:bg-red-100/80 transition-colors border border-red-100">
                      <Edit2 className="size-4 text-red-600 mb-2.5" />
                      <p className="text-[12px] font-bold text-red-900">Create Post</p>
                      <p className="text-[10px] text-red-700/70 leading-tight mt-0.5">Design and schedule content</p>
                   </button>
                   <button className="text-left p-3.5 rounded-xl bg-blue-50 hover:bg-blue-100/80 transition-colors border border-blue-100">
                      <Megaphone className="size-4 text-blue-600 mb-2.5" />
                      <p className="text-[12px] font-bold text-blue-900">Plan Campaign</p>
                      <p className="text-[10px] text-blue-700/70 leading-tight mt-0.5">Create a multi-channel campaign</p>
                   </button>
                   <button className="text-left p-3.5 rounded-xl bg-emerald-50 hover:bg-emerald-100/80 transition-colors border border-emerald-100">
                      <ImageIcon className="size-4 text-emerald-600 mb-2.5" />
                      <p className="text-[12px] font-bold text-emerald-900">Upload Media</p>
                      <p className="text-[10px] text-emerald-700/70 leading-tight mt-0.5">Add images, videos or files</p>
                   </button>
                   <button className="text-left p-3.5 rounded-xl bg-purple-50 hover:bg-purple-100/80 transition-colors border border-purple-100">
                      <BarChart2 className="size-4 text-purple-600 mb-2.5" />
                      <p className="text-[12px] font-bold text-purple-900">View Reports</p>
                      <p className="text-[10px] text-purple-700/70 leading-tight mt-0.5">See content performance</p>
                   </button>
                </div>
             </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Sidebar */}
        <div className="space-y-3">
           {/* Mini Calendar */}
           <div className="bg-white rounded-xl border shadow-sm p-3">
              <div className="flex items-center justify-between mb-3">
                 <h3 className="text-[13px] font-bold text-gray-900">September 2026</h3>
                 <div className="flex items-center gap-1">
                    <button className="size-6 flex items-center justify-center hover:bg-gray-100 rounded text-gray-500"><ChevronLeft className="size-3.5" /></button>
                    <button className="size-6 flex items-center justify-center hover:bg-gray-100 rounded text-gray-500"><ChevronRight className="size-3.5" /></button>
                 </div>
              </div>
              <div className="grid grid-cols-7 mb-2">
                 {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => <div key={d} className="text-center text-[10px] font-semibold text-gray-500">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-y-1">
                 {/* Empty spaces for offset */}
                 <div/><div/>
                 {Array.from({length: 30}).map((_, i) => {
                    const d = i + 1;
                    const isSelected = d === new Date().getDate();
                    return (
                       <div key={d} className="flex justify-center py-0.5">
                          <button className={cn("size-6 rounded-full text-[11px] font-medium flex items-center justify-center", isSelected ? "bg-[#EB0711] text-white font-bold shadow-sm" : "text-gray-700 hover:bg-gray-100")}>
                             {d}
                          </button>
                       </div>
                    );
                 })}
              </div>
           </div>

           {/* Filters */}
           <div className="bg-white rounded-xl border shadow-sm p-3">
              <div className="flex items-center justify-between mb-3">
                 <h3 className="text-[13px] font-bold text-gray-900">Filters</h3>
                 <button className="text-[11px] font-bold text-[#EB0711] hover:underline">Reset</button>
              </div>
              <div className="space-y-3">
                 <div>
                   <label className="text-[11px] text-gray-500 mb-1 block">Project</label>
                   <div className="relative">
                     <select className="w-full text-[12px] font-medium h-8 rounded-md border border-gray-200 px-2.5 outline-none focus:border-gray-300 bg-white appearance-none"><option>Moksha Sewa</option></select>
                     <ChevronDown className="size-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                   </div>
                 </div>
                 <div>
                   <label className="text-[11px] text-gray-500 mb-1 block">Channel</label>
                   <div className="relative">
                     <select className="w-full text-[12px] font-medium h-8 rounded-md border border-gray-200 px-2.5 outline-none focus:border-gray-300 bg-white appearance-none"><option>All Channels</option></select>
                     <ChevronDown className="size-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                   </div>
                 </div>
                 <div>
                   <label className="text-[11px] text-gray-500 mb-1 block">Status</label>
                   <div className="relative">
                     <select className="w-full text-[12px] font-medium h-8 rounded-md border border-gray-200 px-2.5 outline-none focus:border-gray-300 bg-white appearance-none"><option>All Status</option></select>
                     <ChevronDown className="size-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                   </div>
                 </div>
                 <div>
                   <label className="text-[11px] text-gray-500 mb-1 block">Campaign</label>
                   <div className="relative">
                     <select className="w-full text-[12px] font-medium h-8 rounded-md border border-gray-200 px-2.5 outline-none focus:border-gray-300 bg-white appearance-none"><option>All Campaigns</option></select>
                     <ChevronDown className="size-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                   </div>
                 </div>
              </div>
           </div>

           {/* Content Status */}
           <div className="bg-white rounded-xl border shadow-sm p-3">
              <h3 className="text-[13px] font-bold text-gray-900 mb-2.5">Content Status</h3>
              <div className="space-y-2">
                 <div className="flex items-center justify-between text-[12px]">
                    <div className="flex items-center gap-2 text-gray-700 font-medium"><div className="size-2 rounded-full bg-blue-500" /> Scheduled</div>
                    <span className="font-bold">12</span>
                 </div>
                 <div className="flex items-center justify-between text-[12px]">
                    <div className="flex items-center gap-2 text-gray-700 font-medium"><div className="size-2 rounded-full bg-emerald-500" /> Published</div>
                    <span className="font-bold">28</span>
                 </div>
                 <div className="flex items-center justify-between text-[12px]">
                    <div className="flex items-center gap-2 text-gray-700 font-medium"><div className="size-2 rounded-full bg-gray-400" /> Draft</div>
                    <span className="font-bold">6</span>
                 </div>
                 <div className="flex items-center justify-between text-[12px]">
                    <div className="flex items-center gap-2 text-gray-700 font-medium"><div className="size-2 rounded-full bg-red-500" /> Failed</div>
                    <span className="font-bold">2</span>
                 </div>
              </div>
           </div>

           {/* Upcoming (Next 7 Days) */}
           <div className="bg-white rounded-xl border shadow-sm p-3">
              <div className="flex items-center justify-between mb-3">
                 <h3 className="text-[13px] font-bold text-gray-900">Upcoming (Next 7 Days)</h3>
                 <button className="text-[11px] font-bold text-[#EB0711] hover:underline flex items-center gap-0.5">View all &rarr;</button>
              </div>
              <div className="space-y-4">
                 <div className="flex items-start gap-3">
                    <ChannelLogo channel="Facebook" className="size-5 shrink-0 mt-0.5" />
                    <div>
                       <p className="text-[12px] font-bold text-gray-900 leading-tight">Clean Ganga Drive Post</p>
                       <p className="text-[10px] text-gray-500 mt-0.5">Facebook • Sep 14, 9:00 AM</p>
                    </div>
                 </div>
                 <div className="flex items-start gap-3">
                    <ChannelLogo channel="Instagram" className="size-5 shrink-0 mt-0.5" />
                    <div>
                       <p className="text-[12px] font-bold text-gray-900 leading-tight">Instagram Reels</p>
                       <p className="text-[10px] text-gray-500 mt-0.5">Instagram • Sep 14, 6:00 PM</p>
                    </div>
                 </div>
                 <div className="flex items-start gap-3">
                    <ChannelLogo channel="LinkedIn" className="size-5 shrink-0 mt-0.5" />
                    <div>
                       <p className="text-[12px] font-bold text-gray-900 leading-tight">Case Study Post</p>
                       <p className="text-[10px] text-gray-500 mt-0.5">LinkedIn • Sep 15, 11:00 AM</p>
                    </div>
                 </div>
                 <div className="flex items-start gap-3">
                    <ChannelLogo channel="YouTube" className="size-5 shrink-0 mt-0.5" />
                    <div>
                       <p className="text-[12px] font-bold text-gray-900 leading-tight">Documentary Clip</p>
                       <p className="text-[10px] text-gray-500 mt-0.5">YouTube • Sep 16, 5:00 PM</p>
                    </div>
                 </div>
                 <div className="flex items-start gap-3">
                    <ChannelLogo channel="WhatsApp" className="size-5 shrink-0 mt-0.5" />
                    <div>
                       <p className="text-[12px] font-bold text-gray-900 leading-tight">Reminder: Event</p>
                       <p className="text-[10px] text-gray-500 mt-0.5">WhatsApp • Sep 17, 10:00 AM</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
