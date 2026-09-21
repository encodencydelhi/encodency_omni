/**
 * EnCodency OmniPlatform - Super Admin Webhooks Module
 * Reusable table cells and the flush table panel.
 */

"use client";

import { ArrowUpRightIcon } from "lucide-react";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { SectionCard as BaseSectionCard } from "@/components/shared/section-card";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PRIVACY_LABEL, WEBHOOK_ROUTES, MODULE_LINKS } from "../data/config";
import type { OutgoingEndpoint } from "../data/types";
import { Mono } from "./kit";

/** Section card with a capped height. Long content scrolls inside the card instead of stretching the page. */
export function SectionCard({ contentClassName, ...props }: ComponentProps<typeof BaseSectionCard>) {
  return <BaseSectionCard {...props} contentClassName={cn("max-h-80 overflow-y-auto scrollbar-thin", contentClassName)} />;
}

/** A section card whose content is a DataTable, without a doubled border. Scrolls unless it paginates. */
export function TablePanel({
  title,
  description,
  action,
  filters,
  children,
  className,
  scroll = true,
}: {
  title: ReactNode;
  description?: string;
  action?: ReactNode;
  filters?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Cap the table height and scroll inside. Turn off for tables that already paginate. */
  scroll?: boolean;
}) {
  return (
    <BaseSectionCard title={title} description={description} action={action} flush className={className} contentClassName="pb-0">
      {filters}
      <div className={cn("[&>div]:rounded-none [&>div]:border-0 [&>div]:border-t-0", scroll && "max-h-72 overflow-y-auto scrollbar-thin")}>{children}</div>
    </BaseSectionCard>
  );
}

export function EndpointCell({ endpoint, link = true }: { endpoint: Pick<OutgoingEndpoint, "id" | "name" | "destinationHost" | "state"> | undefined; link?: boolean }) {
  if (!endpoint) return <span className="text-muted-foreground">Unknown endpoint</span>;
  const inner = (
    <>
      <span className="block max-w-[15rem] truncate text-[0.8125rem] font-medium text-foreground">{endpoint.name}</span>
      <Mono className="block max-w-[15rem] truncate text-muted-foreground">{endpoint.destinationHost}</Mono>
    </>
  );
  return link ? (
    <Link href={WEBHOOK_ROUTES.endpoint(endpoint.id)} onClick={(event) => event.stopPropagation()} className="block min-w-0 hover:underline">
      {inner}
    </Link>
  ) : (
    <div className="min-w-0">{inner}</div>
  );
}

export function CompanyCell({ id, name }: { id: string | null; name: string | null }) {
  if (!id || !name) return <Badge tone="neutral">Platform</Badge>;
  return (
    <Link href={MODULE_LINKS.company(id)} onClick={(event) => event.stopPropagation()} className="block max-w-[12rem] truncate text-[0.8125rem] hover:text-primary hover:underline">
      {name}
    </Link>
  );
}

export function EventKeyCell({ eventKey, version }: { eventKey: string; version?: string }) {
  return (
    <div className="min-w-0">
      <Link href={WEBHOOK_ROUTES.eventType(eventKey)} onClick={(event) => event.stopPropagation()} className="block truncate font-mono text-[0.75rem] font-semibold text-foreground hover:text-primary hover:underline">
        {eventKey}
      </Link>
      {version ? <span className="text-2xs text-muted-foreground">schema {version}</span> : null}
    </div>
  );
}

export function HttpStatus({ status }: { status: number | null }) {
  if (status === null) return <span className="text-muted-foreground">No response</span>;
  const tone = status < 300 ? "success" : status === 429 ? "warning" : status >= 500 ? "danger" : "danger";
  return <Badge tone={tone}><span className="tabular">{status}</span></Badge>;
}

export function OpenLink({ href, label = "Open" }: { href: string; label?: string }) {
  return (
    <Button asChild variant="ghost" size="sm" onClick={(event) => event.stopPropagation()}>
      <Link href={href}>
        {label}
        <ArrowUpRightIcon />
      </Link>
    </Button>
  );
}

export const privacyLabel = (value: keyof typeof PRIVACY_LABEL) => PRIVACY_LABEL[value];
