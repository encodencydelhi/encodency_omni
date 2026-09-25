import type { ReactNode } from "react";

export function AdminPageTitle({
  eyebrow,
  title,
  description,
  badge,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  badge?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-[8px] font-semibold text-[#75829D]">{eyebrow}</p>
        <div className="flex items-center gap-2">
          <h1 className="mt-0.5 text-[21px] font-semibold tracking-tight text-[#101A3D]">{title}</h1>
          {badge}
        </div>
        <p className="mt-0.5 text-[9px] text-[#687797]">{description}</p>
      </div>
      {action}
    </header>
  );
}
