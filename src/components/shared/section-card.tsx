import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardHeading,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

interface SectionCardProps {
  title: ReactNode;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  flush?: boolean;
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
  flush = false,
}: SectionCardProps) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className={cn(flush && "border-b border-border pb-4")}>
        <CardHeading>
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeading>
        {action}
      </CardHeader>
      <CardContent className={cn("flex-1", flush && "px-0 pb-0", contentClassName)}>{children}</CardContent>
    </Card>
  );
}
