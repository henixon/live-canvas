import type { LineItemCode, Statement } from "@/lib/types";

export type WaterfallBar = {
  name: string;
  code: LineItemCode;
  value: number;
  start: number;
  end: number;
  kind: "in" | "out" | "total";
};

const FULL_WALK: Array<{ code: LineItemCode; name: string; kind: "in" | "out" | "total" }> = [
  { code: "REVENUE", name: "Revenue", kind: "in" },
  { code: "COGS", name: "COGS", kind: "out" },
  { code: "GROSS_PROFIT", name: "Gross profit", kind: "total" },
  { code: "OPEX_RD", name: "R&D", kind: "out" },
  { code: "OPEX_SM", name: "S&M", kind: "out" },
  { code: "OPEX_GA", name: "G&A", kind: "out" },
  { code: "OPERATING_INCOME", name: "Op. income", kind: "total" },
  { code: "OTHER_INCOME", name: "Other", kind: "in" },
  { code: "NET_INCOME", name: "Net income", kind: "total" },
];

const OPEX_WALK: Array<{ code: LineItemCode; name: string; kind: "in" | "out" | "total" }> = [
  { code: "GROSS_PROFIT", name: "Gross profit", kind: "in" },
  { code: "OPEX_RD", name: "R&D", kind: "out" },
  { code: "OPEX_SM", name: "S&M", kind: "out" },
  { code: "OPEX_GA", name: "G&A", kind: "out" },
  { code: "OPERATING_INCOME", name: "Op. income", kind: "total" },
];

export function buildWaterfall(statement: Statement, mode: "full" | "opex"): WaterfallBar[] {
  const steps = mode === "opex" ? OPEX_WALK : FULL_WALK;
  let running = 0;
  const bars: WaterfallBar[] = [];

  for (const step of steps) {
    const raw = statement.amounts[step.code];
    if (step.kind === "total") {
      bars.push({
        name: step.name,
        code: step.code,
        value: raw,
        start: 0,
        end: raw,
        kind: "total",
      });
      running = raw;
      continue;
    }

    if (step.kind === "in") {
      const start = running;
      running += raw;
      bars.push({
        name: step.name,
        code: step.code,
        value: raw,
        start,
        end: running,
        kind: raw >= 0 ? "in" : "out",
      });
      continue;
    }

    const start = running;
    running -= raw;
    bars.push({
      name: step.name,
      code: step.code,
      value: -raw,
      start: Math.min(start, running),
      end: Math.max(start, running),
      kind: "out",
    });
  }

  return bars;
}
