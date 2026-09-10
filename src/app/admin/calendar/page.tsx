
import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  SlidersHorizontal,
  Link2,
  MoreVertical,
  Pencil,
  Megaphone,
  Image as ImageIcon,
  BarChart3,
  FileText,
} from "lucide-react";
import {
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaYoutube,
  FaWhatsapp,
} from "react-icons/fa";

type EventType = "fb" | "ig" | "li" | "yt" | "wa" | "gmb" | "link";

type CalendarEvent = [string, string, EventType];

type CalendarCell = {
  d: number;
  out?: boolean;
  selected?: boolean;
};

const events: Record<number, CalendarEvent[]> = {
  1: [
    ["World Health Day Post", "10:00 AM", "fb"],
    ["Story: Behind the Scenes", "04:00 PM", "ig"],
  ],
  2: [
    ["Article: Clean Ganga", "11:00 AM", "li"],
    ["Video: River Cleanup", "06:00 PM", "yt"],
  ],
  3: [
    ["GMB Post", "10:30 AM", "gmb"],
    ["Campaign: Volunteer", "02:00 PM", "wa"],
  ],
  4: [["Team Meeting Post", "11:00 AM", "li"]],
  6: [["Environment Day Post", "10:00 AM", "ig"]],
  7: [["Case Study Post", "12:00 PM", "li"]],
  8: [["Shorts: Ganga Facts", "05:00 PM", "yt"]],
  9: [
    ["Volunteer Drive", "11:00 AM", "fb"],
    ["Broadcast: Event", "04:00 PM", "wa"],
  ],
  10: [["Story Series (3)", "09:00 AM", "ig"]],
  11: [["GMB Update", "01:00 PM", "gmb"]],
  14: [
    ["Clean Ganga Drive", "09:00 AM", "fb"],
    ["Instagram Reels", "06:00 PM", "ig"],
  ],
  15: [["Thought Leadership", "11:00 AM", "li"]],
  16: [["Documentary Clip", "05:00 PM", "yt"]],
  17: [["Reminder: Event", "10:00 AM", "wa"]],
  18: [["Blog: Impact Story", "03:00 PM", "link"]],
  20: [["GMB Photos", "12:00 PM", "gmb"]],
  21: [["Earth Day Post", "11:00 AM", "ig"]],
  22: [
    ["Awareness Post", "10:00 AM", "fb"],
    ["Poll: Sustainability", "04:00 PM", "li"],
  ],
  23: [["Campaign: Donate", "12:00 PM", "wa"]],
  24: [["Short: Before/After", "03:00 PM", "yt"]],
  25: [["GMB Offer", "11:00 AM", "gmb"]],
  28: [["Monthly Update", "11:00 AM", "li"]],
  29: [["Story: Team", "03:00 PM", "ig"]],
  30: [["Closing Post", "06:00 PM", "fb"]],
};

const weeks: CalendarCell[][] = [
  [
    { d: 30, out: true },
    { d: 31, out: true },
    { d: 1 },
    { d: 2 },
    { d: 3 },
    { d: 4 },
    { d: 5 },
  ],
  [{ d: 6 }, { d: 7 }, { d: 8 }, { d: 9 }, { d: 10 }, { d: 11 }, { d: 12 }],
  [
    { d: 13 },
    { d: 14, selected: true },
    { d: 15 },
    { d: 16 },
    { d: 17 },
    { d: 18 },
    { d: 19 },
  ],
  [
    { d: 20 },
    { d: 21 },
    { d: 22 },
    { d: 23 },
    { d: 24 },
    { d: 25 },
    { d: 26 },
  ],
  [
    { d: 27 },
    { d: 28 },
    { d: 29 },
    { d: 30 },
    { d: 1, out: true },
    { d: 2, out: true },
    { d: 3, out: true },
  ],
];

const todaySchedule: [
  string,
  string,
  string,
  EventType,
  "Scheduled" | "Draft"
][] = [
  [
    "10:00 AM",
    "World Health Day Post",
    "Healthier Communities, Cleaner Rivers.",
    "fb",
    "Scheduled",
  ],
  [
    "12:00 PM",
    "Team Meeting Post",
    "Planning for April Campaigns",
    "li",
    "Draft",
  ],
  [
    "04:00 PM",
    "Behind the Scenes Story",
    "Our team in action",
    "ig",
    "Scheduled",
  ],
];

const upcoming = [
  ["Clean Ganga Drive Post", "Facebook • Apr 14, 9:00 AM", "fb"],
  ["Instagram Reels", "Instagram • Apr 14, 6:00 PM", "ig"],
  ["Case Study Post", "LinkedIn • Apr 15, 11:00 AM", "li"],
  ["Documentary Clip", "YouTube • Apr 16, 5:00 PM", "yt"],
  ["Reminder: Event", "WhatsApp • Apr 17, 10:00 AM", "wa"],
] as const;

function ChannelIcon({
  type,
  size = 14,
}: {
  type: EventType;
  size?: number;
}) {
  const base =
    "grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] text-white";

  if (type === "fb")
    return (
      <span className={`${base} bg-[#1877f2]`}>
        <FaFacebook size={size} />
      </span>
    );

  if (type === "ig")
    return (
      <span
        className={`${base} bg-[linear-gradient(135deg,#f58529,#dd2a7b,#8134af)]`}
      >
        <FaInstagram size={size} />
      </span>
    );

  if (type === "li")
    return (
      <span className={`${base} bg-[#0a66c2]`}>
        <FaLinkedin size={size} />
      </span>
    );

  if (type === "yt")
    return (
      <span className={`${base} bg-[#e6212a]`}>
        <FaYoutube size={size} />
      </span>
    );

  if (type === "wa")
    return (
      <span className={`${base} bg-[#16b866]`}>
        <FaWhatsapp size={size} />
      </span>
    );

  if (type === "gmb")
    return (
      <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border border-[#dfe4ec] bg-white text-[12px] font-[850] text-[#4285f4]">
        G
      </span>
    );

  return (
    <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] bg-[#edf1f6] text-[#4b5b73]">
      <Link2 size={size} strokeWidth={2.2} />
    </span>
  );
}

export default function ContentCalendar() {
  return (
    <div className="box-border h-screen w-full overflow-hidden bg-[#f7f9fc] font-[Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif] text-[#13203e] max-[1200px]:h-auto max-[1200px]:min-h-screen max-[1200px]:overflow-auto max-[820px]:p-[10px]">
      {/* Header */}
      <header className="grid h-[96px] grid-cols-[minmax(0,1fr)_555px] items-start gap-[18px] max-[1200px]:grid-cols-[minmax(0,1fr)_420px] max-[820px]:h-auto max-[820px]:grid-cols-1">
        <div>
          <div className="mb-[5px] mt-[2px] flex items-center gap-2 text-[10px] text-[#66738a]">
            <span>Dashboard</span>
            <ChevronRight size={10} />
            <b className="text-[#1c2743]">Calendar</b>
          </div>

          <h1 className="m-0 text-[25px] font-[780] leading-[1.05] tracking-[-0.7px]">
            Content Calendar
          </h1>

          <p className="my-[5px] text-[12px] text-[#68758d]">
            Plan, schedule and track your content across all channels.
          </p>
        </div>

        {/* Banner */}
        <div className="relative h-[85px] overflow-hidden rounded-[7px] border border-[#e7ebf1] bg-[linear-gradient(100deg,#fff_0%,#fff_43%,#fff4f5_100%)] px-[18px] py-[13px] max-[820px]:hidden">
          <b className="block text-[13px] leading-[1.15]">
            Consistency today.
            <br />
            A stronger tomorrow.
          </b>

          <span className="mt-[5px] block text-[9px] text-[#728098]">
            Plan ahead. Stay visible. Grow your impact.
          </span>

          <i className="mt-[7px] block h-[3px] w-[46px] rounded-[4px] bg-[#e3222c]" />

          <div className="absolute right-[20px] top-[4px] z-[2] flex items-center gap-[10px] text-[#e52b35]">
            <BarChart3 size={43} />

            <div className="relative h-[66px] w-[100px] overflow-hidden rounded-[6px] border border-[#e9b1b4] bg-white shadow-[0_3px_8px_rgba(30,40,60,0.08)]">
              <div className="h-[15px] rounded-t-[6px] bg-[#e42630]" />
              <div className="absolute left-[15px] right-[15px] top-[27px] h-[26px] bg-[repeating-linear-gradient(90deg,#dfe5ec_0_10px,transparent_10px_17px),repeating-linear-gradient(0deg,#dfe5ec_0_6px,transparent_6px_12px)]" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="grid h-[calc(100vh-118px)] grid-cols-[minmax(0,1fr)_274px] gap-[10px] max-[1200px]:h-auto max-[1200px]:grid-cols-[minmax(0,1fr)_245px] max-[820px]:flex max-[820px]:flex-col">
        {/* Left */}
        <section className="flex min-h-0 min-w-0 flex-col">
          {/* Toolbar */}
          <div className="grid h-[48px] grid-cols-[250px_minmax(0,1fr)_275px] items-center gap-[10px] rounded-t-[7px] border border-[#e4e8ef] bg-white px-[12px] max-[820px]:mt-[10px] max-[820px]:grid-cols-[130px_minmax(0,1fr)_225px] max-[560px]:grid-cols-[100px_minmax(0,1fr)_150px] max-[560px]:px-[7px]">
            <div className="flex gap-2">
              <button className="grid h-[31px] w-[31px] place-items-center rounded-[6px] border border-[#dfe5ec] bg-white text-[#29354f]">
                <ChevronLeft size={14} />
              </button>

              <button className="grid h-[31px] w-[31px] place-items-center rounded-[6px] border border-[#dfe5ec] bg-white text-[#29354f]">
                <ChevronRight size={14} />
              </button>

              <button className="h-[31px] rounded-[6px] border border-[#dfe5ec] bg-white px-3 text-[9px] font-[650] text-[#29354f] max-[560px]:px-2">
                Today
              </button>
            </div>

            <div className="text-center text-[16px] font-[780] max-[560px]:text-[13px]">
              April 2025
              <button className="ml-[5px] border-0 bg-transparent text-[#17223e]">
                <ChevronDown size={14} />
              </button>
            </div>

            <div className="flex justify-end">
              <button className="h-[31px] w-[61px] rounded-l-[6px] border border-[#e51f29] bg-[#e51f29] text-[9px] font-[650] text-white max-[560px]:w-[48px] max-[560px]:text-[8px]">
                Month
              </button>

              <button className="h-[31px] w-[61px] border-y border-[#dfe5ec] bg-white text-[9px] font-[650] text-[#29354f] max-[560px]:w-[48px] max-[560px]:text-[8px]">
                Week
              </button>

              <button className="h-[31px] w-[61px] rounded-r-[6px] border border-[#dfe5ec] bg-white text-[9px] font-[650] text-[#29354f] max-[560px]:w-[48px] max-[560px]:text-[8px]">
                List
              </button>

              <button className="ml-[10px] flex h-[31px] items-center justify-center gap-[6px] rounded-[6px] border border-[#dfe5ec] bg-white px-[11px] text-[9px] font-[650] text-[#29354f] max-[560px]:ml-[5px] max-[560px]:px-[7px]">
                <SlidersHorizontal size={12} />
                Filters
              </button>
            </div>
          </div>

          {/* Calendar */}
          <div className="grid min-h-0 flex-1 grid-rows-[29px_repeat(5,minmax(0,1fr))] overflow-hidden rounded-b-[7px] border border-t-0 border-[#e4e8ef] bg-white max-[1200px]:h-[650px] max-[1200px]:flex-none max-[820px]:h-[620px] max-[560px]:h-[570px]">
            <div className="grid grid-cols-7">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="grid place-items-center border-b border-r border-[#e8ecf2] bg-[#f8fafc] text-[9px] font-[700] text-[#24304b] last:border-r-0"
                >
                  {day}
                </div>
              ))}
            </div>

            {weeks.map((week, weekIndex) => (
              <div className="grid min-h-0 grid-cols-7" key={weekIndex}>
                {week.map((cell, cellIndex) => {
                  const list = events[cell.d] || [];

                  return (
                    <div
                      key={cellIndex}
                      className={[
                        "relative min-w-0 overflow-hidden border-b border-r border-[#e8ecf2] p-[7px_7px_4px] last:border-r-0 max-[560px]:p-[5px_3px]",
                        weekIndex === weeks.length - 1
                          ? "border-b-0"
                          : "",
                        cell.out ? "out" : "",
                        cell.selected
                          ? "z-[2] rounded-[4px] outline-[1.5px] outline-[#e22a34] outline-offset-[-1px]"
                          : "",
                      ].join(" ")}
                    >
                      <span
                        className={`mb-[5px] block text-[9px] ${
                          cell.out
                            ? "text-[#8792a5]"
                            : "text-[#172440]"
                        } ${cell.selected ? "font-[750]" : ""}`}
                      >
                        {cell.d}
                      </span>

                      {list.slice(0, 1).map(([name, time, type], eventIndex) => (
                        <div
                          key={eventIndex}
                          className={`mb-[4px] grid h-[29px] min-w-0 grid-cols-[17px_minmax(0,1fr)_10px] items-center gap-1 rounded-[6px] px-[5px] py-1 text-[#263754] max-[560px]:h-[27px] max-[560px]:grid-cols-[16px_minmax(0,1fr)_7px] max-[560px]:gap-[2px] max-[560px]:p-[3px] ${
                            eventIndex % 3 === 2
                              ? "bg-[#fff0f2]"
                              : eventIndex % 4 === 3
                                ? "bg-[#eaf8f3]"
                                : "bg-[#edf5ff]"
                          }`}
                        >
                          <ChannelIcon type={type} size={12} />

                          <div className="min-w-0">
                            <b className="block overflow-hidden text-ellipsis whitespace-nowrap text-[7.5px] leading-[1.1] max-[560px]:text-[9px]">
                              {name}
                            </b>

                            <small className="mt-[2px] block overflow-hidden text-ellipsis whitespace-nowrap text-[9px] text-[#637089] max-[560px]:text-[9px]">
                              {time}
                            </small>
                          </div>

                          <span className="text-[#59677e]">⋮</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Bottom Area */}
          <div className="mt-[10px] grid h-[196px] grid-cols-[1.65fr_.78fr] gap-[10px] max-[1200px]:h-auto max-[1200px]:grid-cols-2 max-[820px]:grid-cols-1 max-[560px]:mt-2">
            {/* Schedule */}
            <article className="overflow-hidden rounded-[7px] border border-[#e4e8ef] bg-white max-[560px]:overflow-auto">
              <div className="flex h-[38px] items-start justify-between px-3 py-[9px]">
                <h2 className="m-0 text-[12px] font-[760]">
                  Today&apos;s Schedule{" "}
                  <span className="rounded-[10px] bg-[#eef1f6] px-[7px] py-[3px] text-[8px]">
                    3
                  </span>
                </h2>

                <button className="border-0 bg-transparent text-[8px] font-[700] text-[#e2262f]">
                  View all →
                </button>
              </div>

              <table className="w-full min-w-[650px] table-fixed border-collapse">
                <thead>
                  <tr>
                    <th className="h-[26px] w-[82px] bg-[#f7f9fc] px-3 text-left text-[7.5px] font-[650] text-[#66738a]">
                      Time
                    </th>
                    <th className="h-[26px] bg-[#f7f9fc] px-3 text-left text-[7.5px] font-[650] text-[#66738a]">
                      Content
                    </th>
                    <th className="h-[26px] w-[110px] bg-[#f7f9fc] px-3 text-left text-[7.5px] font-[650] text-[#66738a]">
                      Channel
                    </th>
                    <th className="h-[26px] w-[100px] bg-[#f7f9fc] px-3 text-left text-[7.5px] font-[650] text-[#66738a]">
                      Project
                    </th>
                    <th className="h-[26px] w-[68px] bg-[#f7f9fc] px-3 text-left text-[7.5px] font-[650] text-[#66738a]">
                      Status
                    </th>
                    <th className="h-[26px] w-[85px] bg-[#f7f9fc] px-3 text-left text-[7.5px] font-[650] text-[#66738a]">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {todaySchedule.map(
                    ([time, title, description, type, status]) => (
                      <tr key={title}>
                        <td className="h-[39px] border-t border-[#eef1f5] px-3 text-[8px] text-[#44516b]">
                          {time}
                        </td>

                        <td className="h-[39px] border-t border-[#eef1f5] px-3">
                          <div className="flex items-center gap-[7px]">
                            <span className="grid h-[24px] w-[24px] shrink-0 place-items-center rounded-[5px] bg-[#eaf2f8] text-[#3280d2]">
                              <FileText size={12} />
                            </span>

                            <div className="min-w-0">
                              <b className="block overflow-hidden text-ellipsis whitespace-nowrap text-[8px]">
                                {title}
                              </b>

                              <small className="mt-[2px] block overflow-hidden text-ellipsis whitespace-nowrap text-[9px] text-[#8a94a5]">
                                {description}
                              </small>
                            </div>
                          </div>
                        </td>

                        <td className="border-t border-[#eef1f5] px-3">
                          <ChannelIcon type={type} size={12} />
                        </td>

                        <td className="border-t border-[#eef1f5] px-3 text-[8px] text-[#44516b]">
                          Moksha Sewa
                        </td>

                        <td className="border-t border-[#eef1f5] px-3">
                          <span
                            className={`rounded-[7px] px-[7px] py-1 text-[7px] ${
                              status === "Draft"
                                ? "bg-[#eef1f5] text-[#65738a]"
                                : "bg-[#e9f3ff] text-[#2874cc]"
                            }`}
                          >
                            {status}
                          </span>
                        </td>

                        <td className="border-t border-[#eef1f5] px-3">
                          <div className="flex items-center gap-1">
                            <button className="h-[24px] rounded-[5px] border border-[#e1e6ed] bg-white px-[7px] text-[7px]">
                              Edit
                            </button>

                            <button className="border-0 bg-transparent text-[#59667b]">
                              <MoreVertical size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </article>

            {/* Quick Actions */}
            <article className="overflow-hidden rounded-[7px] border border-[#e4e8ef] bg-white pb-2">
              <div className="flex h-[38px] items-start justify-between px-3 py-[9px]">
                <h2 className="m-0 text-[12px] font-[760]">Quick Actions</h2>
              </div>

              <div className="grid grid-cols-2 gap-2 px-[10px]">
                <div className="flex items-center gap-2 rounded-[6px] bg-[#fff0f1] p-[9px]">
                  <Pencil className="h-5 w-5 shrink-0 text-[#e12630]" />
                  <div className="min-w-0">
                    <b className="block text-[8px]">Create Post</b>
                    <span className="block text-[9px] text-[#69758b]">
                      Design and schedule content
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-[6px] bg-[#eaf3ff] p-[9px]">
                  <Megaphone className="h-5 w-5 shrink-0 text-[#287fd7]" />
                  <div className="min-w-0">
                    <b className="block text-[8px]">Plan Campaign</b>
                    <span className="block text-[9px] text-[#69758b]">
                      Create a multi-channel campaign
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-[6px] bg-[#e7f8f1] p-[9px]">
                  <ImageIcon className="h-5 w-5 shrink-0 text-[#19a26e]" />
                  <div className="min-w-0">
                    <b className="block text-[8px]">Upload Media</b>
                    <span className="block text-[9px] text-[#69758b]">
                      Add images, videos or files
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-[6px] bg-[#f0eaff] p-[9px]">
                  <BarChart3 className="h-5 w-5 shrink-0 text-[#8055d2]" />
                  <div className="min-w-0">
                    <b className="block text-[8px]">View Reports</b>
                    <span className="block text-[9px] text-[#69758b]">
                      See content performance
                    </span>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>

        {/* Right Sidebar */}
        <aside className="flex min-w-0 flex-col gap-[10px] overflow-hidden max-[820px]:order-[-1] max-[820px]:grid max-[820px]:grid-cols-2 max-[560px]:grid-cols-1">
          {/* Mini Calendar */}
          <section className="rounded-[7px] border border-[#e4e8ef] bg-white p-[10px]">
            <h3 className="m-0 text-[13px]">
              April 2025
              <span className="float-right flex items-center gap-2 text-[#6d788d]">
                <ChevronLeft size={13} />
                <ChevronRight size={13} />
              </span>
            </h3>

            <div className="mt-[7px]">
              <div className="mb-1 grid grid-cols-7 text-center text-[7px] text-[#647087]">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-[2px] text-center">
                {[
                  30, 31, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
                  16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
                  1, 2, 3,
                ].map((day, index) => (
                  <span
                    key={index}
                    className={`grid h-[20px] place-items-center rounded-full text-[8px] ${
                      index < 2 || index > 31
                        ? "text-[#a2aab8]"
                        : day === 14
                          ? "bg-[#e32630] text-white"
                          : "text-[#38455f]"
                    }`}
                  >
                    {day}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* Filters */}
          <section className="rounded-[7px] border border-[#e4e8ef] bg-white p-[10px]">
            <h3 className="m-0 flex justify-between text-[13px] font-bold">
              Filters
              <button className="border-0 bg-transparent text-[8px] font-[700] text-[#e2262f]">
                Reset
              </button>
            </h3>

            {[
              ["Project", "Moksha Sewa"],
              ["Channel", "All Channels"],
              ["Status", "All Status"],
              ["Campaign", "All Campaigns"],
            ].map(([label, value]) => (
              <div className="mt-2" key={label}>
                <label className="mb-1 block text-[8px] text-[#657189]">
                  {label}
                </label>

                <div className="flex h-[28px] items-center justify-between rounded-[5px] border border-[#dfe5ec] px-2 text-[8px] text-[#39465f]">
                  {value}
                  <ChevronDown size={11} />
                </div>
              </div>
            ))}

            <div className="mt-[10px] text-[10px] font-[750]">
              Content Status
            </div>

            <div className="mt-[6px]">
              {[
                ["Scheduled", "12", "#2d83df"],
                ["Published", "28", "#16a56d"],
                ["Draft", "6", "#aab4c3"],
                ["Failed", "2", "#e2252e"],
              ].map(([label, count, dot]) => (
                <div
                  key={label}
                  className="flex h-[20px] items-center gap-2 text-[8px]"
                >
                  <i
                    className="block h-2 w-2 rounded-full"
                    style={{ backgroundColor: dot }}
                  />
                  {label}
                  <b className="ml-auto">{count}</b>
                </div>
              ))}
            </div>
          </section>

          {/* Upcoming */}
          <section className="min-h-0 flex-1 rounded-[7px] border border-[#e4e8ef] bg-white p-[10px]">
            <div className="flex items-center justify-between">
              <h3 className="m-0 text-[13px]">
                Upcoming (Next 7 Days)
              </h3>

              <button className="border-0 bg-transparent text-[8px] font-[700] text-[#e2262f]">
                View all →
              </button>
            </div>

            {upcoming.map(([name, meta, type]) => (
              <div
                key={name}
                className="grid grid-cols-[24px_minmax(0,1fr)] gap-[7px] border-b border-[#eef1f5] py-2 last:border-0"
              >
                <ChannelIcon type={type} size={14} />

                <div className="min-w-0">
                  <b className="block overflow-hidden text-ellipsis whitespace-nowrap text-[8px]">
                    {name}
                  </b>

                  <small className="mt-[2px] block overflow-hidden text-ellipsis whitespace-nowrap text-[7px] text-[#7e899c]">
                    {meta}
                  </small>
                </div>
              </div>
            ))}
          </section>
        </aside>
      </div>
    </div>
  );
}
