"use client";

import { formatMoney } from "@/lib/money";
import type { ChartKind, LineItemCode, LineItemDTO, Statement } from "@/lib/types";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PALETTE = ["#5eead4", "#fbbf24", "#93c5fd", "#f472b6", "#c4b5fd"];

export function TrendChart({
  statements,
  metrics,
  lineItems,
  kind,
  currency,
  highlightCodes,
}: {
  statements: Statement[];
  metrics: LineItemCode[];
  lineItems: LineItemDTO[];
  kind: Exclude<ChartKind, "waterfall">;
  currency: string;
  highlightCodes: LineItemCode[];
}) {
  const data = statements.map((row) => {
    const point: Record<string, string | number> = { label: row.period.label };
    for (const code of metrics) point[code] = row.amounts[code];
    return point;
  });

  const ChartImpl = kind === "bar" ? BarChart : kind === "area" ? AreaChart : LineChart;

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ChartImpl data={data} margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
          <CartesianGrid stroke="#243044" strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value: number) => formatMoney(value, currency)}
            width={72}
          />
          <Tooltip
            contentStyle={{ background: "#10151d", border: "1px solid #243044", borderRadius: 12 }}
            formatter={(value, name) => [
              formatMoney(Number(value), currency),
              lineItems.find((item) => item.code === name)?.name ?? String(name),
            ]}
          />
          <Legend
            formatter={(value) => lineItems.find((item) => item.code === value)?.name ?? value}
            wrapperStyle={{ color: "#cbd5e1", fontSize: 12 }}
          />
          {metrics.map((code, index) => {
            const color = PALETTE[index % PALETTE.length];
            const emphasized = highlightCodes.includes(code);
            if (kind === "bar") {
              return (
                <Bar
                  key={code}
                  dataKey={code}
                  fill={color}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={36}
                  stroke={emphasized ? "#fbbf24" : undefined}
                  strokeWidth={emphasized ? 2 : 0}
                />
              );
            }
            if (kind === "area") {
              return (
                <Area
                  key={code}
                  type="monotone"
                  dataKey={code}
                  stroke={color}
                  fill={color}
                  fillOpacity={0.18}
                  strokeWidth={emphasized ? 3.2 : 2.2}
                />
              );
            }
            return (
              <Line
                key={code}
                type="monotone"
                dataKey={code}
                stroke={color}
                strokeWidth={emphasized ? 3.4 : 2.4}
                dot={{ r: emphasized ? 4 : 3 }}
              />
            );
          })}
        </ChartImpl>
      </ResponsiveContainer>
    </div>
  );
}
