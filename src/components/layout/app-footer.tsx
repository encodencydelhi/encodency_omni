import { APP } from "@/config/app";

const BRAND_VALUES = ["People", "Platforms", "Possibilities", "Raise the Bar"] as const;

/** Corporate sign-off, matching the strapline used across EnCodency material. */
export function AppFooter() {
  return (
    <footer className="page-gutter border-t border-border bg-card py-4">
      <div className="mx-auto flex w-full max-w-(--content-max-width) flex-col gap-2 text-2xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} {APP.vendor} Pvt. Ltd. All rights reserved.
        </p>
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {BRAND_VALUES.map((value, index) => (
            <li key={value} className="flex items-center gap-3">
              {index > 0 ? <span className="text-border-strong">|</span> : null}
              {value}
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
