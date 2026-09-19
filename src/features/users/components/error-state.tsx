import { AlertTriangleIcon, RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load the requested data. Please try again.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
      <div className="size-12 rounded-full bg-rose-100 flex items-center justify-center mb-3">
        <AlertTriangleIcon className="size-6 text-rose-500" />
      </div>
      <h3 className="text-sm font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-xs text-slate-500 max-w-sm mb-4">{description}</p>
      {onRetry && (
        <Button type="button" variant="outline" size="sm" onClick={onRetry} className="text-xs gap-1.5">
          <RefreshCwIcon className="size-3.5" />
          <span>Retry</span>
        </Button>
      )}
    </div>
  );
}
