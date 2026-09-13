import type { FactDTO, Grain, LineItemCode, PeriodDTO, Statement } from "../types";
import { LINE_ITEM_CODES } from "../types";

export function emptyAmounts(): Record<LineItemCode, number> {
  return Object.fromEntries(LINE_ITEM_CODES.map((code) => [code, 0])) as Record<LineItemCode, number>;
}

export function applyDerived(leaf: Partial<Record<LineItemCode, number>>): Record<LineItemCode, number> {
  const amounts = emptyAmounts();
  for (const code of LINE_ITEM_CODES) {
    amounts[code] = leaf[code] ?? 0;
  }
  amounts.GROSS_PROFIT = amounts.REVENUE - amounts.COGS;
  amounts.OPEX_TOTAL = amounts.OPEX_RD + amounts.OPEX_SM + amounts.OPEX_GA;
  amounts.OPERATING_INCOME = amounts.GROSS_PROFIT - amounts.OPEX_TOTAL;
  amounts.NET_INCOME = amounts.OPERATING_INCOME + amounts.OTHER_INCOME;
  return amounts;
}

export function marginsFrom(amounts: Record<LineItemCode, number>): Statement["margins"] {
  const revenue = amounts.REVENUE || 0;
  return {
    gross: revenue ? amounts.GROSS_PROFIT / revenue : 0,
    operating: revenue ? amounts.OPERATING_INCOME / revenue : 0,
    net: revenue ? amounts.NET_INCOME / revenue : 0,
  };
}

export function monthsForQuarter(quarterPeriod: PeriodDTO, allPeriods: PeriodDTO[]): PeriodDTO[] {
  if (quarterPeriod.grain !== "QUARTER" || !quarterPeriod.quarter) return [];
  const startMonth = (quarterPeriod.quarter - 1) * 3 + 1;
  const wanted = new Set([startMonth, startMonth + 1, startMonth + 2]);
  return allPeriods.filter(
    (period) =>
      period.grain === "MONTH" &&
      period.fiscalYear === quarterPeriod.fiscalYear &&
      period.month != null &&
      wanted.has(period.month),
  );
}

export function factsForPeriod(
  period: PeriodDTO,
  allPeriods: PeriodDTO[],
  facts: FactDTO[],
): Partial<Record<LineItemCode, number>> {
  const keys =
    period.grain === "MONTH"
      ? [period.periodKey]
      : monthsForQuarter(period, allPeriods).map((month) => month.periodKey);

  const leaf: Partial<Record<LineItemCode, number>> = {};
  for (const fact of facts) {
    if (!keys.includes(fact.periodKey)) continue;
    leaf[fact.code] = (leaf[fact.code] ?? 0) + fact.amount;
  }
  return leaf;
}

export function statementFor(
  period: PeriodDTO,
  allPeriods: PeriodDTO[],
  facts: FactDTO[],
): Statement {
  const amounts = applyDerived(factsForPeriod(period, allPeriods, facts));
  return {
    period,
    amounts,
    margins: marginsFrom(amounts),
  };
}

export function statementsForGrain(
  grain: Grain,
  allPeriods: PeriodDTO[],
  facts: FactDTO[],
): Statement[] {
  return allPeriods
    .filter((period) => period.grain === grain)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map((period) => statementFor(period, allPeriods, facts));
}

export function resolveFocus(
  periods: PeriodDTO[],
  grain: Grain,
  focusPeriodKey: string | null,
): PeriodDTO {
  const ofGrain = periods
    .filter((period) => period.grain === grain)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  if (focusPeriodKey) {
    const exact = ofGrain.find((period) => period.periodKey === focusPeriodKey);
    if (exact) return exact;
    const any = periods.find((period) => period.periodKey === focusPeriodKey);
    if (any) {
      if (any.grain === grain) return any;
      if (grain === "QUARTER" && any.month) {
        const quarter = Math.ceil(any.month / 3);
        const match = ofGrain.find((period) => period.fiscalYear === any.fiscalYear && period.quarter === quarter);
        if (match) return match;
      }
      if (grain === "MONTH" && any.quarter) {
        const lastMonth = any.quarter * 3;
        const match = ofGrain.find((period) => period.fiscalYear === any.fiscalYear && period.month === lastMonth);
        if (match) return match;
      }
    }
  }
  return ofGrain[ofGrain.length - 1] ?? periods[periods.length - 1];
}

export function trailingWindow(statements: Statement[], focusKey: string, count: number): Statement[] {
  const index = statements.findIndex((row) => row.period.periodKey === focusKey);
  if (index < 0) return statements.slice(-count);
  return statements.slice(Math.max(0, index - count + 1), index + 1);
}
