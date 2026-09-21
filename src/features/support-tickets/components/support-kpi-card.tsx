"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

interface SupportKpiCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  description: string;
  trend?: "good" | "bad" | "neutral";
  alertLevel?: "none" | "warning" | "critical";
  href?: string;
  iconClassName?: string;
}

export function SupportKpiCard({ 
  title, value, icon, description, trend = "neutral", alertLevel = "none", href, iconClassName 
}: SupportKpiCardProps) {
  const alertColors = {
    none: "text-[#0F172A]",
    warning: "text-[#EAB308]",
    critical: "text-[#EF4444]"
  };

  const palette = {
    good: {
      badge: "border-emerald-200 bg-emerald-50",
      icon: "text-emerald-600",
    },
    bad: {
      badge: "border-rose-200 bg-rose-50",
      icon: "text-rose-600",
    },
    warning: {
      badge: "border-amber-200 bg-amber-50",
      icon: "text-amber-600",
    },
    neutral: {
      badge: "border-sky-200 bg-sky-50",
      icon: "text-sky-600",
    },
    critical: {
      badge: "border-red-200 bg-red-50",
      icon: "text-red-600",
    },
  } as const;

  const tone = alertLevel === "critical" ? "critical" : alertLevel === "warning" ? "warning" : trend === "good" ? "good" : trend === "bad" ? "bad" : "neutral";
  const iconColorClass = iconClassName || palette[tone].icon;
  const iconContent = React.isValidElement(icon)
    ? React.cloneElement(icon as React.ReactElement<{ className?: string }>, {
        className: cn((icon as React.ReactElement<{ className?: string }>).props.className, iconColorClass, "size-4"),
      })
    : icon;

  const Content = () => (
    <Card className="p-4 flex flex-col gap-2 shadow-sm border-[#E2E8F0] h-[104px] hover:border-[#CBD5E1] transition-colors rounded-sm">
      <div className="flex items-center justify-between text-[#64748B]">
        <h3 className="text-[12px] font-medium">{title}</h3>
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-md border", palette[tone].badge)}>{iconContent}</div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className={cn("text-[24px] font-bold leading-none", alertColors[alertLevel])}>{value}</span>
      </div>
      <p className="text-[12px] text-[#64748B] truncate mt-auto">{description}</p>
    </Card>
  );

  if (href) return <Link href={href} className="block"><Content /></Link>;
  return <Content />;
}
