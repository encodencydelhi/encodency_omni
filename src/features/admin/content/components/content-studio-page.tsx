"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, Link2, Send, Sparkles, Hash, Smile, Move, ThumbsUp, MessageSquare, Share2, MoreHorizontal, Info, ChevronRight, ChevronLeft, Plus, Globe } from "lucide-react";
import { ChannelLogo } from "../../shared/channel-logo";

const channels = [
  { name: "Facebook", id: "facebook", icon: "facebook", checked: true },
  { name: "Instagram", id: "instagram", icon: "instagram", checked: true },
  { name: "LinkedIn", id: "linkedin", icon: "linkedin", checked: true },
  { name: "Google Business", id: "google", icon: "google", checked: false },
  { name: "WhatsApp", id: "whatsapp", icon: "whatsapp", checked: true },
  { name: "YouTube", id: "youtube", icon: "youtube", checked: false },
  { name: "Website", id: "website", icon: "website", checked: false },
];

export function ContentStudioPage() {
  const [caption, setCaption] = useState("Small actions create a cleaner tomorrow.\n\nLet's work together for a healthier, greener and cleaner India.\n\n#CleanGanga #HealthyIndia #Sustainability #MokshaSewa");

  return (
    <div className="space-y-2 max-w-[1400px] mx-auto pb-10">
      {/* Header */}
      <header className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-foreground">Content Studio</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Create, customize and publish content across all your channels.</p>
        </div>
        <div className="flex items-center gap-2 lg:gap-4">
          <p className="text-[12px] font-medium italic text-muted-foreground hidden xl:block">"One idea. Multiple platforms.<br />Greater impact."</p>
          <div className="relative hidden xl:block w-[180px] h-[44px] bg-red-50 rounded-xl overflow-hidden mr-2">
            <div className="absolute right-2 top-1/2 -translate-y-1/2 size-8 rounded-full bg-red-200/50" />
            <div className="absolute right-6 top-1/2 -translate-y-1/2 size-12 rounded-full border-2 border-red-200/50" />
          </div>
          <div className="flex gap-2">
            <button className="flex h-9 items-center gap-2 rounded-md border bg-white px-4 text-[13px] font-semibold text-foreground shadow-sm hover:bg-accent transition-colors whitespace-nowrap">
              Save as Draft
            </button>
            <button className="flex h-9 items-center gap-1.5 rounded-md bg-[#e20611] px-4 text-[13px] font-semibold text-white shadow-sm hover:bg-[#c9050f] transition-colors whitespace-nowrap">
              <Send className="size-3.5" />
              Schedule / Publish
              <ChevronDown className="size-3.5 ml-0.5 opacity-80" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="grid gap-2 lg:grid-cols-[1.6fr_1fr_1.2fr] items-start">

        {/* Column 1: Create Post */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 border-b">
            <button className="border-b-2 border-[#e20611] pb-2 text-[13px] font-bold text-[#e20611]">Create</button>
            <Link href="/admin/content/ai-assistant" className="border-b-2 border-transparent pb-2 text-[13px] font-semibold text-muted-foreground hover:text-foreground">AI Assistant</Link>
            <Link href="/admin/content/templates" className="border-b-2 border-transparent pb-2 text-[13px] font-semibold text-muted-foreground hover:text-foreground">Templates</Link>
            <Link href="/admin/content/drafts" className="border-b-2 border-transparent pb-2 text-[13px] font-semibold text-muted-foreground hover:text-foreground">Saved Drafts</Link>
          </div>

          <section>
            <h2 className="text-[13px] font-bold text-foreground mb-2">1. Select Project & Campaign</h2>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">Project</label>
                <div className="flex h-9 w-full items-center justify-between rounded-md border bg-white px-2.5 shadow-sm cursor-pointer hover:border-gray-300">
                  <div className="flex items-center gap-2">
                    <div className="size-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                      <span className="text-[10px]">🌿</span>
                    </div>
                    <span className="text-[12px] font-semibold text-foreground">Moksha Sewa</span>
                  </div>
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">Campaign (Optional)</label>
                <div className="flex h-9 w-full items-center justify-between rounded-md border bg-white px-2.5 shadow-sm cursor-pointer hover:border-gray-300">
                  <div className="flex items-center gap-2">
                    <div className="size-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                      <span className="text-[10px]">🌿</span>
                    </div>
                    <span className="text-[12px] font-semibold text-foreground">Clean Ganga Awareness</span>
                  </div>
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-[13px] font-bold text-foreground mb-2">2. Content</h2>
            <div>
              <label className="text-[11px] font-bold text-foreground mb-1 flex items-center gap-1">
                Post Caption <span className="text-[#e20611]">*</span>
              </label>
              <div className="rounded-md border bg-white shadow-sm overflow-hidden focus-within:ring-1 focus-within:ring-[#e20611] focus-within:border-[#e20611]">
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={6}
                  className="w-full resize-none p-3 text-[13px] leading-relaxed text-foreground outline-none bg-transparent"
                />
                <div className="flex items-center justify-between px-3 py-1.5 border-t bg-gray-50/50">
                  <Smile className="size-4 text-muted-foreground cursor-pointer hover:text-foreground" />
                  <span className="text-[11px] font-medium text-muted-foreground">{caption.length}/3000</span>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button className="flex h-7 items-center gap-1.5 rounded-md border bg-white px-2.5 text-[11px] font-bold text-foreground shadow-sm hover:bg-accent">
                  <Hash className="size-3" /> Hashtags
                </button>
                <button className="flex h-7 items-center gap-1.5 rounded-md border bg-white px-2.5 text-[11px] font-bold text-foreground shadow-sm hover:bg-accent">
                  <Sparkles className="size-3" /> AI Improve
                </button>
                <button className="flex h-7 items-center gap-1.5 rounded-md border bg-white px-2.5 text-[11px] font-bold text-foreground shadow-sm hover:bg-accent">
                  <span className="size-3 text-center text-[10px]">📝</span> Content Ideas
                </button>
                <button className="flex h-7 items-center gap-1.5 rounded-md border bg-white px-2.5 text-[11px] font-bold text-foreground shadow-sm hover:bg-accent">
                  <span className="size-3 text-center text-[10px]">✂️</span> Shorten
                </button>
                <button className="flex h-7 items-center gap-1.5 rounded-md border bg-white px-2.5 text-[11px] font-bold text-foreground shadow-sm hover:bg-accent">
                  <Smile className="size-3" /> Emojis
                </button>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-[13px] font-bold text-foreground mb-2">3. Media</h2>
            <div className="flex items-center justify-between border-b">
              <div className="flex items-center gap-2">
                <button className="border-b-2 border-[#e20611] pb-2 text-[12px] font-bold text-[#e20611]">Images (3)</button>
                <button className="border-b-2 border-transparent pb-2 text-[12px] font-semibold text-muted-foreground hover:text-foreground">Videos</button>
                <button className="border-b-2 border-transparent pb-2 text-[12px] font-semibold text-muted-foreground hover:text-foreground">Links</button>
              </div>
              <button className="pb-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1">
                <Move className="size-3" /> Reorder
              </button>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-2">
               <div className="aspect-[4/3] rounded-md overflow-hidden border relative group bg-gray-100">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                  <p className="absolute bottom-2 left-2 text-white font-bold text-[10px] leading-tight z-20">CLEANER<br/>RIVERS<br/>BRIGHTER<br/>TOMORROW</p>
                  <img src="https://images.unsplash.com/photo-1433086966358-54859d0ed716?auto=format&fit=crop&q=80&w=400" className="w-full h-full object-cover" alt="River" />
               </div>
               <div className="aspect-[4/3] rounded-md overflow-hidden border relative group bg-gray-100">
                  <img src="https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&q=80&w=400" className="w-full h-full object-cover" alt="Nature" />
               </div>
               <div className="aspect-[4/3] rounded-md overflow-hidden border relative group bg-gray-100">
                  <img src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=400" className="w-full h-full object-cover" alt="Sunrise" />
               </div>
              <button className="aspect-[4/3] rounded-md border border-dashed flex flex-col items-center justify-center gap-1 bg-gray-50/50 hover:bg-gray-100 transition-colors text-muted-foreground hover:text-foreground">
                <Plus className="size-4" />
                <span className="text-[11px] font-bold">Add Media</span>
              </button>
            </div>
          </section>

          <section>
            <h2 className="text-[13px] font-bold text-foreground mb-2">4. Link & Call to Action</h2>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">Link (Optional)</label>
                <div className="flex h-9 w-full items-center gap-2 rounded-md border bg-white px-2.5 shadow-sm focus-within:border-[#e20611] focus-within:ring-1 focus-within:ring-[#e20611]">
                  <Link2 className="size-3.5 text-muted-foreground" />
                  <input type="text" className="w-full bg-transparent outline-none text-[12px]" defaultValue="https://mokshasewa.org" />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">Call to Action</label>
                <div className="flex h-9 w-full items-center justify-between rounded-md border bg-white px-2.5 shadow-sm cursor-pointer hover:border-gray-300">
                  <span className="text-[12px] font-semibold text-foreground">Learn More</span>
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* Column 2: Select Channels */}
        <div className="bg-white rounded-xl border shadow-sm p-3 space-y-2">
          <section>
            <h2 className="text-[13px] font-bold text-foreground mb-2">5. Select Channels</h2>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] text-muted-foreground">Publish to</label>
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-foreground cursor-pointer">
                <CustomCheckbox checked={false} />
                Select All
              </label>
            </div>
            <div className="space-y-0.5">
              {channels.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-1.5 px-1 rounded hover:bg-gray-50">
                    <div className="flex items-center gap-2">
                      <CustomCheckbox checked={c.checked} />
                    <ChannelLogo channel={c.name as any} className="size-5" />
                    <span className="text-[12px] font-bold text-foreground">{c.name}</span>
                  </div>
                  <ChevronDown className="size-3.5 text-muted-foreground opacity-50" />
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-[13px] font-bold text-foreground mb-2">6. Schedule</h2>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <div className="size-3.5 rounded-full border-4 border-[#e20611] bg-white ring-1 ring-[#e20611]/20" />
                <span className="text-[12px] font-bold text-foreground">Publish Now</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <div className="size-3.5 rounded-full border border-gray-300 bg-white" />
                <span className="text-[12px] text-muted-foreground">Schedule for later</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <div className="size-3.5 rounded-full border border-gray-300 bg-white" />
                <span className="text-[12px] text-muted-foreground">Save as Draft</span>
              </label>
            </div>

            <div className="mt-2 rounded-md bg-blue-50 border border-blue-100 p-2 flex items-center justify-between">
              <div className="flex gap-2">
                <Info className="size-3.5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-[11px] font-bold text-blue-900 leading-tight">Best time to post</p>
                  <p className="text-[10px] text-blue-700 mt-0.5">Today, 11:00 AM – 1:00 PM</p>
                </div>
              </div>
              <button className="rounded border border-blue-200 bg-white px-2 py-1 text-[10px] font-bold text-blue-600 shadow-sm hover:bg-blue-50">Use</button>
            </div>
          </section>

          <section className="pt-2 border-t">
            <div className="flex items-center justify-between mb-2 cursor-pointer">
              <h2 className="text-[12px] font-bold text-foreground flex items-center gap-1.5">
                <span className="size-4 rounded-full border border-gray-300 flex items-center justify-center text-[8px]">⚙</span>
                Advanced Options
              </h2>
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="size-3 text-muted-foreground" />
                  <span className="text-[11px] text-foreground font-semibold">Customize content per channel</span>
                </div>
                <CustomToggle checked={true} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="size-3 text-muted-foreground opacity-50" />
                  <span className="text-[11px] text-muted-foreground">Enable first comment</span>
                </div>
                <CustomToggle checked={false} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Plus className="size-3 text-muted-foreground opacity-50" />
                  <span className="text-[11px] text-muted-foreground">Add UTM parameters</span>
                </div>
                <CustomToggle checked={false} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-3 text-muted-foreground" />
                  <span className="text-[11px] text-foreground font-semibold">Auto-generate hashtags (AI)</span>
                </div>
                <CustomToggle checked={true} />
              </div>
            </div>
          </section>
        </div>

        {/* Column 3: Post Preview & Checklist */}
        <div className="space-y-2">
          <div className="bg-white rounded-xl border shadow-sm p-3">
            <h2 className="text-[13px] font-bold text-foreground mb-2">Post Preview</h2>

            <div className="flex items-center gap-2 border-b mb-2 overflow-x-auto scrollbar-none pb-1">
              <button className="border-b-2 border-[#e20611] pb-1.5 text-[12px] font-bold text-[#e20611] whitespace-nowrap">Facebook</button>
              <button className="border-b-2 border-transparent pb-1.5 text-[12px] font-semibold text-muted-foreground hover:text-foreground whitespace-nowrap">Instagram</button>
              <button className="border-b-2 border-transparent pb-1.5 text-[12px] font-semibold text-muted-foreground hover:text-foreground whitespace-nowrap">LinkedIn</button>
              <button className="border-b-2 border-transparent pb-1.5 text-[12px] font-semibold text-muted-foreground hover:text-foreground whitespace-nowrap flex items-center gap-1">G. Business <ChevronRight className="size-3" /></button>
            </div>

            <div className="rounded-md border shadow-sm overflow-hidden bg-white mb-1">
              <div className="p-2">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                      <span className="text-[12px]">🌿</span>
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-gray-900 leading-none mb-0.5">Moksha Sewa</p>
                      <p className="text-[10px] text-gray-500 flex items-center gap-1">
                        Just now • <Globe className="size-2.5" />
                      </p>
                    </div>
                  </div>
                  <MoreHorizontal className="size-4 text-gray-500" />
                </div>

                <div className="text-[12px] text-gray-900 whitespace-pre-wrap leading-relaxed mb-1.5">
                  Small actions create a cleaner tomorrow.<br /><br />
                  Let's work together for a healthier, greener and cleaner India.<br /><br />
                  <span className="text-blue-600">#CleanGanga #HealthyIndia #Sustainability #MokshaSewa</span>
                </div>
              </div>

               <div className="relative aspect-[4/3] bg-gray-100 border-y overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10" />
                  <p className="absolute bottom-3 left-3 text-white font-bold text-[22px] leading-tight z-20">CLEANER<br/>RIVERS<br/>BRIGHTER<br/>TOMORROW</p>
                  <img src="https://images.unsplash.com/photo-1433086966358-54859d0ed716?auto=format&fit=crop&q=80&w=800" className="w-full h-full object-cover relative z-0" alt="Post media" />
               </div>

              <div className="px-3 py-1.5 flex items-center justify-between border-b">
                <div className="flex items-center gap-1 text-gray-500">
                  <div className="size-3.5 rounded-full bg-blue-500 flex items-center justify-center text-white"><ThumbsUp className="size-2 fill-current" /></div>
                  <span className="text-[11px]">0</span>
                </div>
                <div className="text-[11px] text-gray-500">
                  0 comments • 0 shares
                </div>
              </div>

              <div className="px-2 py-1 flex items-center justify-between">
                <button className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-bold text-gray-600 hover:bg-gray-50 rounded">
                  <ThumbsUp className="size-3.5" /> Like
                </button>
                <button className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-bold text-gray-600 hover:bg-gray-50 rounded">
                  <MessageSquare className="size-3.5" /> Comment
                </button>
                <button className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-bold text-gray-600 hover:bg-gray-50 rounded">
                  <Share2 className="size-3.5" /> Share
                </button>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 text-gray-400">
              <ChevronLeft className="size-3.5" />
              <div className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-[#e20611]" />
                <span className="size-1.5 rounded-full bg-gray-300" />
                <span className="size-1.5 rounded-full bg-gray-300" />
              </div>
              <ChevronRight className="size-3.5" />
            </div>
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-[13px] font-bold text-foreground">Content Checklist</h2>
              <span className="text-[11px] font-bold text-muted-foreground">4/5</span>
            </div>

            <div className="h-1 w-full bg-gray-100 rounded-full mb-2 overflow-hidden">
              <div className="h-full bg-emerald-500 w-4/5 rounded-full" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="size-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                  <Check className="size-2.5" />
                </div>
                <span className="text-[11px] font-bold text-foreground">Project selected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                  <Check className="size-2.5" />
                </div>
                <span className="text-[11px] font-bold text-foreground">Caption added</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                  <Check className="size-2.5" />
                </div>
                <span className="text-[11px] font-bold text-foreground">Media added</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                  <Check className="size-2.5" />
                </div>
                <span className="text-[11px] font-bold text-foreground">At least one channel selected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-3.5 rounded-full border-2 border-gray-300" />
                <span className="text-[11px] font-bold text-muted-foreground">Schedule or publish</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomCheckbox({ checked }: { checked: boolean }) {
  if (checked) {
    return (
      <div className="size-4 rounded-[4px] bg-[#0066FF] text-white flex items-center justify-center shrink-0">
        <Check className="size-3" strokeWidth={3} />
      </div>
    );
  }
  return (
    <div className="size-4 rounded-[4px] border border-gray-300 bg-white shrink-0" />
  );
}

function CustomToggle({ checked }: { checked: boolean }) {
  if (checked) {
    return (
      <div className="w-[30px] h-4 bg-[#e20611] rounded-full relative cursor-pointer shadow-inner">
        <div className="size-[14px] bg-white rounded-full absolute right-[1px] top-[1px] shadow-sm" />
      </div>
    );
  }
  return (
    <div className="w-[30px] h-4 bg-gray-200 rounded-full relative cursor-pointer shadow-inner">
      <div className="size-[14px] bg-white rounded-full absolute left-[1px] top-[1px] shadow-sm" />
    </div>
  );
}
