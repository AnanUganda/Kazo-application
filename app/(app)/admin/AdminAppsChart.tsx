"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const config = {
  count: { label: "Applications", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

export function AdminAppsChart({
  data,
}: {
  data: { week: string; count: number }[];
}) {
  return (
    <ChartContainer config={config} className="h-56 w-full">
      <AreaChart data={data} margin={{ left: 4, right: 4, top: 8 }} accessibilityLayer>
        <defs>
          <linearGradient id="adminApps" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-count)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="var(--color-count)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          dataKey="count"
          type="monotone"
          stroke="var(--color-count)"
          fill="url(#adminApps)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}
