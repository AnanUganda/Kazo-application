import Link from "next/link";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type StatBadgeVariant = "success" | "warning" | "destructive";

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
    <Link href={href} className="group rounded-xl">
      <Card className="h-full transition group-hover:border-primary">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {label}
          </CardTitle>
          <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={`text-2xl font-bold tabular-nums ${valueClassName ?? ""}`}
            >
              {value}
            </p>
            {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
          </div>
          <p className="mt-1 text-xs text-muted-foreground group-hover:text-primary">
            {hint} →
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
