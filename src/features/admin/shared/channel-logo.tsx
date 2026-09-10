import Image from "next/image";
import { cn } from "@/lib/utils/cn";

const logos: Record<string, string> = {
  "Meta & Instagram": "/brands/meta.svg", Meta: "/brands/meta.svg", Facebook: "/brands/facebook.svg",
  Instagram: "/brands/instagram.svg", LinkedIn: "/brands/linkedin.svg", "Google Business": "/brands/google.svg",
  Google: "/brands/google.svg", WhatsApp: "/brands/whatsapp.svg", YouTube: "/brands/youtube.svg",
  "Search Console": "/brands/searchconsole.svg",
};

export function ChannelLogo({ channel = "Channel", className }: { channel?: string; className?: string }) {
  const source = logos[channel];
  if (!source) return <span className={cn("grid place-items-center rounded-md bg-[#EDF2F8] text-[8px] font-bold text-[#36547A]", className)}>{channel.slice(0, 2)}</span>;
  return <span className={cn("grid shrink-0 place-items-center rounded-md bg-white", className)}><Image src={source} alt={`${channel} logo`} width={18} height={18} className="size-[72%] object-contain" /></span>;
}
