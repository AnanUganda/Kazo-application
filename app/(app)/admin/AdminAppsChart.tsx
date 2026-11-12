"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const config = {
  count: { label: "Applications", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

/**
 * Weekly application counts as bars: the values are discrete counts per week,
 * so bars read truer than a smoothed line. `week` is the week's start date.
 */
export function AdminAppsChart({
  data,
}: {
  data: { week: string; count: number }[];
}) {
  return (
    <ChartContainer config={config} className="h-56 w-full lg:h-80">
      <BarChart
        data={data}
        margin={{ left: 0, right: 4, top: 8, bottom: 0 }}
        accessibilityLayer
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="week"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          interval="preserveStartEnd"
        />
        <YAxis tickLine={false} axisLine={false} width={24} allowDecimals={false} />
        <ChartTooltip
          cursor={{ fill: "hsl(var(--muted))" }}
          content={
            <ChartTooltipContent labelFormatter={(l) => `Week of ${l}`} />
          }
        />
        <Bar
          dataKey="count"
          fill="var(--color-count)"
          radius={[4, 4, 0, 0]}
          maxBarSize={36}
        />
      </BarChart>
    </ChartContainer>
  );
}
