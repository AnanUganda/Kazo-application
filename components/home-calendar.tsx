"use client";

import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";

type Event = { date: string; label: string };

function daysUntil(date: string, todayStr: string): number {
  const a = new Date(`${todayStr}T00:00:00Z`).getTime();
  const b = new Date(`${date}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

function countdown(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 14) return `In ${days} days`;
  if (days < 60) return `In ${Math.round(days / 7)} weeks`;
  return `In ${Math.round(days / 30)} months`;
}

/**
 * `layout="row"` (default) puts the month grid beside the key dates for a
 * full-width card; `layout="stack"` stacks them for a narrow column.
 */
export function HomeCalendar({
  events,
  layout = "row",
  className,
}: {
  events: Event[];
  layout?: "row" | "stack";
  className?: string;
}) {
  const today = new Date();
  const todayStr = today.toLocaleDateString("en-CA");

  const eventDates = events.map((e) => new Date(`${e.date}T00:00:00`));
  const upcoming = [...events]
    .filter((e) => e.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, layout === "stack" ? 3 : 6);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Calendar</CardTitle>
        <CardDescription>Term milestones</CardDescription>
      </CardHeader>
      <CardContent
        className={cn(
          "flex flex-col gap-5",
          layout === "row" && "lg:flex-row lg:items-start lg:gap-6",
        )}
      >
        <Calendar
          mode="single"
          selected={today}
          defaultMonth={today}
          showOutsideDays
          modifiers={{ event: eventDates }}
          modifiersClassNames={{
            event:
              "font-semibold text-primary underline decoration-primary/60 decoration-2 underline-offset-4",
          }}
          className={cn(
            "rounded-lg border",
            layout === "stack" && "mx-auto",
          )}
        />

        <div className="min-w-0 flex-1">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Upcoming key dates
          </h3>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No upcoming term milestones for the active intake.
            </p>
          ) : (
            <ul className="divide-y text-sm">
              {upcoming.map((e) => {
                const days = daysUntil(e.date, todayStr);
                return (
                  <li
                    key={`${e.date}-${e.label}`}
                    className="flex items-center justify-between gap-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{e.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(e.date)}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-[10px] font-semibold uppercase tracking-wider",
                        days <= 7 ? "text-primary" : "text-muted-foreground",
                      )}
                    >
                      {countdown(days)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
