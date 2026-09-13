import { OPEX_CODES } from "../pnl/catalog";
import type { ChartKind, Grain, LineItemCode, PeriodDTO, SceneLayout } from "../types";

export type RuleContext = {
  periods: PeriodDTO[];
};

export type RuleResult = {
  layout: SceneLayout;
  message: string;
  applied: string[];
};

const LINE_ALIASES: Array<{ pattern: RegExp; code: LineItemCode }> = [
  { pattern: /\b(r&d|research(?:\s+and\s+|\s*&\s*)development|opex[_\s-]?rd)\b/i, code: "OPEX_RD" },
  { pattern: /\b(s&m|sales(?:\s+and\s+|\s*&\s*)marketing|opex[_\s-]?sm)\b/i, code: "OPEX_SM" },
  { pattern: /\b(g&a|general(?:\s+and\s+|\s*&\s*)administrative|opex[_\s-]?ga)\b/i, code: "OPEX_GA" },
  { pattern: /\b(gross\s+profit|gross\s+margin|margin)\b/i, code: "GROSS_PROFIT" },
  { pattern: /\b(operating\s+income|opinc|ebit)\b/i, code: "OPERATING_INCOME" },
  { pattern: /\b(net\s+income|net\s+profit|bottom\s+line)\b/i, code: "NET_INCOME" },
  { pattern: /\b(other\s+income|below\s+the\s+line)\b/i, code: "OTHER_INCOME" },
  { pattern: /\b(opex|operating\s+expens)/i, code: "OPEX_TOTAL" },
  { pattern: /\b(cogs|cost of (goods|sales|revenue))\b/i, code: "COGS" },
  { pattern: /\b(revenue|top[- ]line|sales)\b/i, code: "REVENUE" },
];

const MONTH_NAMES: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

export function findLineItem(text: string): LineItemCode | null {
  for (const alias of LINE_ALIASES) {
    if (alias.pattern.test(text)) return alias.code;
  }
  return null;
}

export function findPeriodKey(text: string, periods: PeriodDTO[]): string | null {
  const keyMatch = text.match(/\b(20\d{2})[- ]?(q[1-4])\b/i) ?? text.match(/\b(q[1-4])[- ]?(20\d{2})\b/i);
  if (keyMatch) {
    const year = keyMatch[1].startsWith("20") ? keyMatch[1] : keyMatch[2];
    const quarter = (keyMatch[1].startsWith("q") ? keyMatch[1] : keyMatch[2]).slice(1);
    const key = `${year}-Q${quarter}`;
    if (periods.some((period) => period.periodKey === key)) return key;
  }

  const monthMatch = text.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[,\s]+(20\d{2})\b/i,
  );
  if (monthMatch) {
    const month = MONTH_NAMES[monthMatch[1].toLowerCase()];
    const key = `${monthMatch[2]}-${String(month).padStart(2, "0")}`;
    if (periods.some((period) => period.periodKey === key)) return key;
  }

  const isoMonth = text.match(/\b(20\d{2})-(\d{2})\b/);
  if (isoMonth) {
    const key = `${isoMonth[1]}-${isoMonth[2]}`;
    if (periods.some((period) => period.periodKey === key)) return key;
  }

  const bareQuarter = text.match(/\bq([1-4])\b/i);
  if (bareQuarter) {
    const quarter = Number(bareQuarter[1]);
    const matches = periods
      .filter((period) => period.grain === "QUARTER" && period.quarter === quarter)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
    if (matches.length) return matches[matches.length - 1].periodKey;
  }

  return null;
}

function cloneLayout(layout: SceneLayout): SceneLayout {
  return {
    ...layout,
    highlightCodes: [...layout.highlightCodes],
    chartMetrics: [...layout.chartMetrics],
    kpiCodes: [...layout.kpiCodes],
  };
}

function addUnique<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list : [...list, value];
}

export function applyPromptRules(layout: SceneLayout, prompt: string, context: RuleContext): RuleResult {
  const next = cloneLayout(layout);
  const applied: string[] = [];
  const text = prompt.trim();
  const lower = text.toLowerCase();

  if (!text) {
    return { layout: next, applied, message: "Empty prompt — canvas unchanged." };
  }

  if (/\breset\b/.test(lower)) {
    next.highlightCodes = [];
    next.notes = undefined;
    applied.push("cleared emphasis");
  }

  if (/\bmonthly|by month|month by month\b/.test(lower)) {
    next.grain = "MONTH";
    applied.push("switched grain to months");
  } else if (/\bquarterly|by quarter\b/.test(lower)) {
    next.grain = "QUARTER";
    applied.push("switched grain to quarters");
  }

  const trailing = lower.match(/\blast\s+(\d+)\s+(quarters?|months?)/);
  if (trailing) {
    next.trailingPeriods = Math.max(2, Math.min(24, Number(trailing[1])));
    next.grain = trailing[2].startsWith("month") ? "MONTH" : "QUARTER";
    applied.push(`trailing window ${next.trailingPeriods} ${next.grain.toLowerCase()}s`);
  }

  const periodKey = findPeriodKey(text, context.periods);
  if (periodKey) {
    next.focusPeriodKey = periodKey;
    const period = context.periods.find((row) => row.periodKey === periodKey);
    if (period) next.grain = period.grain as Grain;
    applied.push(`focused ${periodKey}`);
  }

  const chartMatch = lower.match(/\b(waterfall|bar|line|area)\b/);
  if (chartMatch || /\bswitch to\b/.test(lower)) {
    const kind = (chartMatch?.[1] ?? "bar") as ChartKind;
    next.chartKind = kind;
    next.showChart = true;
    applied.push(`chart → ${kind}`);
  }

  if (/\b(add|show|include).*(chart|graph|trend)\b/.test(lower) || /\bchart\b/.test(lower)) {
    next.showChart = true;
    applied.push("showed chart");
  }

  if (/\b(hide|remove|dismiss)\s+(the\s+)?(table|p&l)\b/.test(lower)) {
    next.showTable = false;
    applied.push("hid table");
  } else if (/\b(show|add|include)\s+(the\s+)?(table|p&l|income statement)\b/.test(lower)) {
    next.showTable = true;
    applied.push("showed table");
  }

  if (/\b(hide|remove)\s+(the\s+)?kpis?\b/.test(lower)) {
    next.showKpis = false;
    applied.push("hid KPIs");
  } else if (/\b(show|add)\s+(the\s+)?kpis?\b/.test(lower)) {
    next.showKpis = true;
    applied.push("showed KPIs");
  }

  const line = findLineItem(text);
  if (line) {
    if (/\b(emphasize|highlight|focus|call out|spotlight)\b/.test(lower)) {
      next.highlightCodes = addUnique(next.highlightCodes, line);
      applied.push(`highlighted ${line}`);
    }
    if (/\b(add|show).*(kpi|card)\b/.test(lower) || /\bkpi\b/.test(lower)) {
      next.showKpis = true;
      next.kpiCodes = addUnique(next.kpiCodes, line);
      applied.push(`KPI ${line}`);
    }
    if (next.showChart || /\bchart|waterfall|trend|graph\b/.test(lower)) {
      if (line === "OPEX_TOTAL" || line === "OPEX_RD" || line === "OPEX_SM" || line === "OPEX_GA") {
        next.chartMetrics = Array.from(new Set([...next.chartMetrics, ...OPEX_CODES.slice(0, 3)]));
        if (next.chartKind === "line" && /\bwaterfall\b/.test(lower)) next.chartKind = "waterfall";
      } else if (line === "GROSS_PROFIT") {
        next.chartMetrics = addUnique(addUnique(next.chartMetrics, "REVENUE"), "GROSS_PROFIT");
      } else {
        next.chartMetrics = addUnique(next.chartMetrics, line);
      }
      applied.push(`chart metric ${line}`);
    }
    if (/\bwaterfall\b/.test(lower) && (line === "OPEX_TOTAL" || line.startsWith("OPEX_"))) {
      next.chartKind = "waterfall";
      next.notes = "Opex walk from gross profit down to operating income.";
      applied.push("opex waterfall");
    }
  }

  if (/\bmargin chart\b/.test(lower) || /\badd a margin\b/.test(lower)) {
    next.showChart = true;
    next.chartKind = next.chartKind === "waterfall" ? "line" : next.chartKind;
    next.chartMetrics = addUnique(addUnique(next.chartMetrics, "REVENUE"), "GROSS_PROFIT");
    next.highlightCodes = addUnique(next.highlightCodes, "GROSS_PROFIT");
    next.notes = "Gross margin is implied by revenue vs. gross profit.";
    applied.push("margin chart");
  }

  if (applied.length === 0) {
    return {
      layout: next,
      applied,
      message:
        "I didn't map that prompt. Try “emphasize Q3 revenue”, “add a margin chart”, “switch to waterfall for opex”, or “show last 6 months”.",
    };
  }

  const uniqueApplied = Array.from(new Set(applied));
  next.subtitle = uniqueApplied.join(" · ");
  return {
    layout: next,
    applied: uniqueApplied,
    message: `Updated canvas: ${uniqueApplied.join(", ")}.`,
  };
}
