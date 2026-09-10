import type { ReactNode } from "react";
import { EnCodencyLogo } from "@/components/layout/brand-mark";
import { AuthBrandPanel } from "@/features/auth/components/auth-brand-panel";

/**
 * Two-column authentication shell: the brand story on the left, the task on
 * the right.
 *
 * Below `lg` the brand column is dropped, so the logo is reintroduced above
 * the card — otherwise the page would carry no identity at all. Both the logo
 * and the corporate strapline sit in normal flow above the card rather than
 * being positioned over it, so a tall card (the verification step, or a form
 * showing errors) can never collide with them.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-dvh bg-background">
      <div className="grid min-h-dvh lg:grid-cols-[45%_55%]">
        <AuthBrandPanel />

        <section className="flex min-h-dvh flex-col items-center justify-center px-5 py-8 sm:px-8">
          <div className="w-full max-w-[36rem]">
            <div className="mb-5 flex items-center gap-4">
              <EnCodencyLogo height={34} priority className="lg:hidden" />
              <p className="ml-auto hidden text-[0.6875rem] font-semibold tracking-[0.22em] text-muted-foreground lg:block">
                PEOPLE&nbsp;&nbsp;|&nbsp;&nbsp;PLATFORMS&nbsp;&nbsp;|&nbsp;&nbsp;POSSIBILITIES
              </p>
            </div>

            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
