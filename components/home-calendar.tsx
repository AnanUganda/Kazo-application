"use client";

import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate } from "@/lib/format";

type Event = { date: string; label: string };

export function HomeCalendar({ events }: { events: Event[] }) {
  const today = new Date();
  const todayStr = today.toLocaleDateString("en-CA");

  const eventDates = events.map((e) => new Date(`${e.date}T00:00:00`));
  const upcoming = [...events]
    .filter((e) => e.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendar</CardTitle>
        <CardDescription>
          Today&apos;s date and the term milestones for the active intake.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 lg:flex-row lg:items-start">
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
          className="rounded-lg border"
        />

        <div className="min-w-0 flex-1">
          <h3 className="mb-2 text-sm font-semibold">Upcoming key dates</h3>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No upcoming term milestones for the active intake.
            </p>
          ) : (
            <ul className="text-sm">
              {upcoming.map((e) => (
                <li
                  key={`${e.date}-${e.label}`}
                  className="flex items-center justify-between gap-3 border-b py-2 last:border-0"
                >
                  <span className="truncate">{e.label}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {formatDate(e.date)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
