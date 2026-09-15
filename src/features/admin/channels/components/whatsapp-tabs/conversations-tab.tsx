"use client";

import { useState } from "react";
import {
  Search,
  Send,
  Paperclip,
  Smile,
  Phone,
  Video,
  MoreVertical,
  Star,
  CheckCheck,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { Input } from "@/components/ui/input";

const initialContactList = [
  { id: 1, initial: "D", name: "Deepak Mishra", phone: "+91 98123 45670", lastMsg: "Thank you for the information 🙏", time: "10:24 AM", unread: 2, online: true, color: "bg-blue-100 text-blue-700" },
  { id: 2, initial: "S", name: "Sunita Verma", phone: "+91 98234 56781", lastMsg: "Can you share the event location?", time: "09:15 AM", unread: 0, online: true, color: "bg-emerald-100 text-emerald-700" },
  { id: 3, initial: "R", name: "Rohit Tiwari", phone: "+91 98345 67892", lastMsg: "I would like to volunteer.", time: "Yesterday", unread: 1, online: false, color: "bg-amber-100 text-amber-800" },
  { id: 4, initial: "K", name: "Komal Pandey", phone: "+91 98456 78903", lastMsg: "Please send me the brochure.", time: "Yesterday", unread: 0, online: false, color: "bg-purple-100 text-purple-700" },
  { id: 5, initial: "A", name: "Ajay Dubey", phone: "+91 98567 89014", lastMsg: "When is the next event?", time: "Yesterday", unread: 3, online: true, color: "bg-pink-100 text-pink-700" },
  { id: 6, initial: "N", name: "Nandini Rai", phone: "+91 98678 90125", lastMsg: "I made a donation yesterday.", time: "Mon", unread: 0, online: false, color: "bg-rose-100 text-rose-700" },
  { id: 7, initial: "M", name: "Manoj Jha", phone: "+91 98789 01236", lastMsg: "How can I help?", time: "Mon", unread: 0, online: false, color: "bg-teal-100 text-teal-700" },
  { id: 8, initial: "P", name: "Pooja Saxena", phone: "+91 98890 12347", lastMsg: "Great initiative! Count me in.", time: "Sun", unread: 0, online: true, color: "bg-indigo-100 text-indigo-700" },
];

const initialChatMessages: Record<number, { id: number; from: "user" | "contact"; text: string; time: string; read: boolean }[]> = {
  1: [
    { id: 1, from: "user", text: "Hello Deepak! 🙏 Welcome to Namo Gange Trust. How can we help you today?", time: "10:20 AM", read: true },
    { id: 2, from: "contact", text: "Hi! I want to know about the upcoming World Water Day event.", time: "10:21 AM", read: true },
    { id: 3, from: "user", text: "Great! Our World Water Day event is on March 22, 2025 at Varanasi Ghat. Would you like to register?", time: "10:22 AM", read: true },
    { id: 4, from: "contact", text: "Yes, please register me. Also, can I bring my friends?", time: "10:23 AM", read: true },
    { id: 5, from: "user", text: "Absolutely! You can register up to 5 people. I'll send you the registration link shortly.", time: "10:23 AM", read: true },
    { id: 6, from: "contact", text: "Thank you for the information 🙏", time: "10:24 AM", read: false },
  ],
  2: [
    { id: 1, from: "user", text: "Hi Sunita! Thanks for reaching out to Namo Gange Trust.", time: "09:10 AM", read: true },
    { id: 2, from: "contact", text: "Can you share the event location?", time: "09:15 AM", read: true },
  ],
  3: [
    { id: 1, from: "contact", text: "I would like to volunteer.", time: "Yesterday", read: true },
  ],
};

const quickReplies = [
  "Thank you for reaching out!",
  "We'll get back to you shortly.",
  "Here is the event details:",
  "Would you like to donate to Namo Gange?",
];

export function ConversationsTab() {
  const [contactList, setContactList] = useState(initialContactList);
  const [selectedContact, setSelectedContact] = useState(initialContactList[0]!);
  const [filterTab, setFilterTab] = useState("All");
  const [search, setSearch] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [messagesMap, setMessagesMap] = useState(initialChatMessages);
  const [starred, setStarred] = useState<Record<number, boolean>>({});

  const currentMessages = messagesMap[selectedContact.id] || [
    { id: 1, from: "contact", text: selectedContact.lastMsg, time: selectedContact.time, read: true },
  ];

  const filteredContacts = contactList.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.phone.includes(search)) return false;
    if (filterTab === "Unread" && c.unread === 0) return false;
    if (filterTab === "Open" && c.unread === 0 && !c.online) return false;
    return true;
  });

  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend || messageInput;
    if (!text.trim()) return;

    const newMsg = {
      id: Date.now(),
      from: "user" as const,
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      read: true,
    };

    setMessagesMap((prev) => ({
      ...prev,
      [selectedContact.id]: [...(prev[selectedContact.id] || []), newMsg],
    }));

    setContactList((prev) =>
      prev.map((c) =>
        c.id === selectedContact.id ? { ...c, lastMsg: text, unread: 0 } : c
      )
    );

    setMessageInput("");
    toast.success("Message Sent via WhatsApp WABA!");
  };

  const toggleStar = (id: number) => {
    setStarred((prev) => ({ ...prev, [id]: !prev[id] }));
    toast.info(starred[id] ? "Unstarred chat" : "Starred chat");
  };

  return (
    <div className="flex h-[calc(100vh-210px)] min-h-[550px] overflow-hidden rounded-sm border border-slate-200 bg-white shadow-xs">
      {/* Left Chat Sidebar */}
      <div className="flex w-[320px] md:w-[350px] shrink-0 flex-col border-r border-slate-100 bg-slate-50/50">
        <div className="border-b border-slate-100 p-3 space-y-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search conversations..."
              className="h-9 pl-9 text-xs border-slate-200 focus:border-emerald-500 rounded-sm bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto">
            {["All", "Open", "Assigned", "Unread"].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={cn(
                  "rounded-sm px-3 py-1 text-xs font-bold transition-all",
                  filterTab === tab
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-500 hover:bg-slate-200/60"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100/80">
          {filteredContacts.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setSelectedContact(c);
                setContactList((prev) => prev.map((x) => (x.id === c.id ? { ...x, unread: 0 } : x)));
              }}
              className={cn(
                "flex w-full items-center gap-3 px-3.5 py-3 text-left transition-all hover:bg-slate-100/70",
                selectedContact.id === c.id && "bg-emerald-50/70 border-l-4 border-emerald-500"
              )}
            >
              <div className="relative shrink-0">
                <span className={cn("grid size-10 place-items-center rounded-sm text-xs font-bold shadow-xs", c.color)}>
                  {c.initial}
                </span>
                {c.online && <span className="absolute bottom-0 right-0 size-2.5 rounded-sm border-2 border-white bg-emerald-500" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="truncate text-xs font-bold text-slate-900">{c.name}</p>
                  <span className="text-[10px] text-slate-400 font-medium">{c.time}</span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="truncate text-xs text-slate-500 font-medium">{c.lastMsg}</p>
                  {c.unread > 0 && (
                    <span className="ml-1.5 grid size-4 shrink-0 place-items-center rounded-sm bg-emerald-600 text-[10px] font-bold text-white">
                      {c.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right Chat Window */}
      <div className="flex flex-1 flex-col bg-white">
        {/* Chat Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className={cn("grid size-10 place-items-center rounded-sm text-xs font-bold shadow-xs", selectedContact.color)}>
                {selectedContact.initial}
              </span>
              {selectedContact.online && <span className="absolute bottom-0 right-0 size-2.5 rounded-sm border-2 border-white bg-emerald-500" />}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">{selectedContact.name}</p>
              <p className="text-[11px] text-slate-500 font-medium">
                {selectedContact.phone} {selectedContact.online && "• Online"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={() => toast.info(`Calling ${selectedContact.phone}...`)} className="rounded-sm p-2 hover:bg-slate-200/60 text-slate-600" title="Audio Call">
              <Phone className="size-4" />
            </button>
            <button onClick={() => toast.info(`Starting video call with ${selectedContact.name}...`)} className="rounded-sm p-2 hover:bg-slate-200/60 text-slate-600" title="Video Call">
              <Video className="size-4" />
            </button>
            <button onClick={() => toggleStar(selectedContact.id)} className="rounded-sm p-2 hover:bg-slate-200/60 text-slate-600" title="Star Conversation">
              <Star className={cn("size-4", starred[selectedContact.id] && "fill-amber-400 text-amber-400")} />
            </button>
            <button onClick={() => toast.info("More chat actions...")} className="rounded-sm p-2 hover:bg-slate-200/60 text-slate-600">
              <MoreVertical className="size-4" />
            </button>
          </div>
        </div>

        {/* Message Trajectory Container */}
        <div className="flex-1 overflow-y-auto bg-[#E5DDD5]/40 p-4 space-y-3">
          <div className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today</div>
          {currentMessages.map((m) => (
            <div key={m.id} className={cn("flex", m.from === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[70%] rounded-2xl px-4 py-2.5 shadow-xs text-xs leading-relaxed",
                  m.from === "user"
                    ? "bg-emerald-600 text-white rounded-tr-none"
                    : "bg-white text-slate-800 border border-slate-200/60 rounded-tl-none"
                )}
              >
                <p>{m.text}</p>
                <div className={cn("mt-1 flex items-center justify-end gap-1 text-[10px]", m.from === "user" ? "text-emerald-100" : "text-slate-400")}>
                  <span>{m.time}</span>
                  {m.from === "user" && <CheckCheck className="size-3 text-emerald-200" />}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Replies Bar */}
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-2">
          <div className="flex gap-2 overflow-x-auto pb-0.5">
            {quickReplies.map((qr, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(qr)}
                className="shrink-0 rounded-sm border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:border-emerald-300 transition-all shadow-2xs"
              >
                {qr}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="flex items-center gap-2 border-t border-slate-100 bg-white p-3">
          <button onClick={() => toast.info("Attachment picker opened")} className="rounded-sm p-2 hover:bg-slate-100 text-slate-500">
            <Paperclip className="size-4" />
          </button>
          <button onClick={() => toast.info("Emoji picker opened")} className="rounded-sm p-2 hover:bg-slate-100 text-slate-500">
            <Smile className="size-4" />
          </button>
          <Input
            placeholder="Type a message or response..."
            className="h-10 flex-1 text-xs border-slate-200 focus:border-emerald-500 rounded-sm"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          />
          <button
            onClick={() => handleSendMessage()}
            className="grid size-10 place-items-center rounded-sm bg-emerald-600 text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition-all"
          >
            <Send className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
