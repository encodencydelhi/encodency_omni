import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Rendered under the description, e.g. status badges or key metadata. */
  meta?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, meta, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0 space-y-1">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
        {description ? (
          <p className="max-w-2xl text-[0.8125rem] leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
        {meta}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}

/** Standard vertical rhythm for the body of every route. */
export function PageSection({ className, ...props }: React.ComponentProps<"section">) {
  return <section className={cn("space-y-4", className)} {...props} />;
}
