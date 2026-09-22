"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface HorizontalBarChartProps {
  data: Array<{ label: string; value: number }>;
  valueLabel: string;
  color?: string;
}

export function HorizontalBarChart({
  data,
  valueLabel,
  color = "var(--chart-2)",
}: HorizontalBarChartProps) {
  const config: ChartConfig = { value: { label: valueLabel, color } };
  const height = Math.min(Math.max(data.length * 44, 120), 360);

  return (
    <ChartContainer
      config={config}
      className="aspect-auto w-full"
      style={{ height }}
    >
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid horizontal={false} />
        <YAxis
          dataKey="label"
          type="category"
          tickLine={false}
          axisLine={false}
          width={140}
          className="text-xs"
        />
        <XAxis type="number" allowDecimals={false} hide />
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="value" fill="var(--color-value)" radius={0} />
      </BarChart>
    </ChartContainer>
  );
}
