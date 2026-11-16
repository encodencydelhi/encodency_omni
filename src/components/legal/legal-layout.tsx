import Link from "next/link";
import type { ReactNode } from "react";
import { APP } from "@/config/app";

/** Plain, public, read-only page shell for legal text. No sign-in needed and no app data is loaded. */
export function LegalLayout({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main className="min-h-dvh bg-white text-slate-800">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Link href="/" className="text-sm font-semibold text-slate-900">
            {APP.name}
          </Link>
          <nav className="flex gap-4 text-xs font-medium text-slate-600">
            <Link href="/privacy-policy" className="hover:text-slate-900">
              Privacy Policy
            </Link>
            <Link href="/data-deletion" className="hover:text-slate-900">
              Data Deletion
            </Link>
          </nav>
        </div>
      </header>
      <article className="mx-auto max-w-3xl px-5 py-10 text-[15px] leading-relaxed [&_a]:text-blue-700 [&_a]:underline [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-slate-900 [&_h3]:mt-4 [&_h3]:font-semibold [&_h3]:text-slate-900 [&_li]:mt-1 [&_p]:mt-3 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:ps-6">
        <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
        <p className="!mt-1 text-sm text-slate-500">Last updated: {updated}</p>
        {children}
      </article>
      <footer className="border-t border-slate-200">
        <p className="mx-auto max-w-3xl px-5 py-6 text-xs text-slate-500">
          © {new Date().getFullYear()} {APP.vendor} Pvt. Ltd. · {APP.name}
        </p>
      </footer>
    </main>
  );
}
