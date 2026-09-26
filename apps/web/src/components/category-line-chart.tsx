"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface CategoryLineChartProps {
  data: Array<Record<string, string | number>>;
  categoryKey: string;
  series: Array<{ key: string; label: string; color?: string }>;
}

export function CategoryLineChart({
  data,
  categoryKey,
  series,
}: CategoryLineChartProps) {
  const config: ChartConfig = Object.fromEntries(
    series.map(({ key, label, color }, index) => [
      key,
      { label, color: color ?? `var(--chart-${(index % 5) + 1})` },
    ]),
  );

  return (
    <ChartContainer config={config} className="aspect-auto h-72 w-full">
      <LineChart data={data} margin={{ left: 8, right: 16, bottom: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey={categoryKey}
          tickLine={false}
          axisLine={false}
          interval={0}
          angle={-20}
          textAnchor="end"
          height={60}
          className="text-xs"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          width={36}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        {series.length > 1 ? (
          <ChartLegend content={<ChartLegendContent />} />
        ) : null}
        {series.map(({ key }) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={`var(--color-${key})`}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}
