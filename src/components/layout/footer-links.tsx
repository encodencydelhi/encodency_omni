"use client";

import Link from "next/link";
import { ROUTES } from "@/config/routes";
import { usePublicIdentity } from "@/features/global-settings/live/public-identity";

const LEGAL_LINKS = [
  { key: "communications.legal.terms", label: "Terms" },
  { key: "communications.legal.privacy", label: "Privacy" },
  { key: "communications.legal.cookies", label: "Cookies" },
] as const;

const httpsUrl = (value: unknown): string | null => (typeof value === "string" && value.startsWith("https://") ? value : null);

/**
 * Footer links. The in-app Support and Documentation always work; the Help Centre and the legal documents appear only
 * when Global Settings has a real https address for them (a document that is not published shows no link).
 */
export function FooterLinks({ surface }: { surface: "admin" | "super-admin" }) {
  const { data } = usePublicIdentity();
  const supportHref = surface === "super-admin" ? ROUTES.superAdmin.support : ROUTES.admin.support;
  const documentationHref = surface === "super-admin" ? ROUTES.superAdmin.supportHelp : ROUTES.admin.supportHelp;
  const helpCentre = httpsUrl(data?.["communications.help_center_url"]);
  const legal = LEGAL_LINKS.flatMap(({ key, label }) => {
    const href = httpsUrl((data?.[key] as { url?: unknown } | undefined)?.url);
    return href ? [{ label, href }] : [];
  });
  const linkClass = "transition-colors hover:text-white";

  return (
    <span className="flex flex-wrap gap-x-3 gap-y-1">
      <Link href={supportHref} className={linkClass}>Support</Link>
      {helpCentre ? (
        <a href={helpCentre} target="_blank" rel="noopener noreferrer" className={linkClass}>Help Center</a>
      ) : (
        <Link href={documentationHref} className={linkClass}>Documentation</Link>
      )}
      {legal.map(({ label, href }) => (
        <a key={label} href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>{label}</a>
      ))}
    </span>
  );
}
