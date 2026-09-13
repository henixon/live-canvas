"use client";

import { formatMoney } from "@/lib/money";
import { buildWaterfall } from "@/lib/pnl/waterfall";
import type { LineItemCode, Statement } from "@/lib/types";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function WaterfallChart({
  statement,
  currency,
  highlightCodes,
  mode,
}: {
  statement: Statement;
  currency: string;
  highlightCodes: LineItemCode[];
  mode: "full" | "opex";
}) {
  const bars = buildWaterfall(statement, mode).map((bar) => ({
    ...bar,
    base: Math.min(bar.start, bar.end),
    delta: Math.abs(bar.end - bar.start),
  }));

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={bars} margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
          <CartesianGrid stroke="#243044" strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value: number) => formatMoney(value, currency)}
            width={72}
          />
          <Tooltip
            contentStyle={{ background: "#10151d", border: "1px solid #243044", borderRadius: 12 }}
            formatter={(_value, _name, item) => {
              const payload = item.payload as { value: number; name: string };
              return [formatMoney(payload.value, currency), payload.name];
            }}
          />
          <Bar dataKey="base" stackId="wf" fill="transparent" />
          <Bar dataKey="delta" stackId="wf" radius={[5, 5, 0, 0]} maxBarSize={42}>
            {bars.map((bar) => {
              const highlighted = highlightCodes.includes(bar.code);
              const fill = highlighted
                ? "#fbbf24"
                : bar.kind === "out"
                  ? "#fb7185"
                  : bar.kind === "total"
                    ? "#5eead4"
                    : "#38bdf8";
              return <Cell key={bar.code} fill={fill} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
