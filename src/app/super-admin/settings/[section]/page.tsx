import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SECTIONS, sectionFromSlug } from "@/features/global-settings/data/config";
import { SettingsSectionPage } from "@/features/global-settings/pages/settings-section-page";

/** Only the known section slugs exist; anything else is a 404. */
export const dynamicParams = false;

export function generateStaticParams() {
  return SECTIONS.filter((section) => section.slug).map((section) => ({ section: section.slug as string }));
}

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }): Promise<Metadata> {
  const found = sectionFromSlug((await params).section);
  return { title: found ? `${found.label} - Global Settings` : "Global Settings", description: found?.description };
}

export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const found = sectionFromSlug((await params).section);
  if (!found || !found.slug) notFound();
  return (
    <Suspense fallback={null}>
      <SettingsSectionPage section={found.key} />
    </Suspense>
  );
}
