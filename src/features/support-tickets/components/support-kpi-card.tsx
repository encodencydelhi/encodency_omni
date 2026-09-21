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
}

export function SupportKpiCard({ 
  title, 
  value, 
  icon, 
  description, 
  trend = "neutral",
  alertLevel = "none",
  href 
}: SupportKpiCardProps) {
  
  const alertColors = {
    none: "text-[#0F172A]",
    warning: "text-[#EAB308]",
    critical: "text-[#EF4444]"
  };

  const Content = () => (
    <Card className="p-4 flex flex-col gap-2 shadow-sm border-[#E2E8F0] h-[104px] hover:border-[#CBD5E1] transition-colors rounded-sm">
      <div className="flex items-center justify-between text-[#64748B]">
        <h3 className="text-[12px] font-medium">{title}</h3>
        <div className="text-[#94A3B8]">{icon}</div>
      </div>
      
      <div className="flex items-baseline gap-2">
        <span className={cn("text-[24px] font-bold leading-none", alertColors[alertLevel])}>
          {value}
        </span>
      </div>
      
      <p className="text-[11px] text-[#64748B] truncate mt-auto">
        {description}
      </p>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        <Content />
      </Link>
    );
  }

  return <Content />;
}
