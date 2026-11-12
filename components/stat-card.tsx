import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type StatBadgeVariant = "success" | "warning" | "destructive";

/**
 * KPI tile. Three fixed rows so a row of cards lines up whatever the content:
 * a two-line-tall label row, the value row, and a footer pinned to the bottom
 * whose arrow sits flush right (never wrapping onto its own line).
 */
export function StatCard({
  href,
  label,
  icon: Icon,
  value,
  hint,
  badge,
  valueClassName,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  value: string;
  hint: string;
  badge?: { variant: StatBadgeVariant; label: string };
  valueClassName?: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card className="flex h-full flex-col p-5 transition-colors group-hover:border-primary/60">
        <div className="flex min-h-10 items-start justify-between gap-2">
          <h3 className="text-sm font-medium leading-5 text-muted-foreground">
            {label}
          </h3>
          <Icon
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          <p
            className={`whitespace-nowrap text-xl font-bold leading-8 tracking-tight tabular-nums ${valueClassName ?? ""}`}
          >
            {value}
          </p>
          {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
        </div>

        <div className="mt-auto flex items-end justify-between gap-2 pt-3 text-xs text-muted-foreground group-hover:text-primary">
          <span className="min-w-0">{hint}</span>
          <ArrowRight
            className="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </div>
      </Card>
    </Link>
  );
}
