import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyDerived, factsForPeriod, monthsForQuarter, statementFor } from "./rollup";
import type { FactDTO, PeriodDTO } from "../types";

function period(partial: Partial<PeriodDTO> & Pick<PeriodDTO, "periodKey" | "grain">): PeriodDTO {
  return {
    id: partial.periodKey,
    fiscalYear: 2025,
    quarter: null,
    month: null,
    label: partial.periodKey,
    startDate: "2025-01-01",
    endDate: "2025-03-31",
    ...partial,
  };
}

describe("applyDerived", () => {
  it("computes gross profit, opex, operating income, and net income", () => {
    const amounts = applyDerived({
      REVENUE: 100,
      COGS: 30,
      OPEX_RD: 20,
      OPEX_SM: 15,
      OPEX_GA: 5,
      OTHER_INCOME: -2,
    });
    assert.equal(amounts.GROSS_PROFIT, 70);
    assert.equal(amounts.OPEX_TOTAL, 40);
    assert.equal(amounts.OPERATING_INCOME, 30);
    assert.equal(amounts.NET_INCOME, 28);
  });
});

describe("quarter rollup", () => {
  const periods: PeriodDTO[] = [
    period({ periodKey: "2025-01", grain: "MONTH", month: 1, startDate: "2025-01-01" }),
    period({ periodKey: "2025-02", grain: "MONTH", month: 2, startDate: "2025-02-01" }),
    period({ periodKey: "2025-03", grain: "MONTH", month: 3, startDate: "2025-03-01" }),
    period({ periodKey: "2025-Q1", grain: "QUARTER", quarter: 1, startDate: "2025-01-01" }),
  ];

  const facts: FactDTO[] = [
    { periodKey: "2025-01", grain: "MONTH", code: "REVENUE", amount: 10 },
    { periodKey: "2025-02", grain: "MONTH", code: "REVENUE", amount: 20 },
    { periodKey: "2025-03", grain: "MONTH", code: "REVENUE", amount: 30 },
    { periodKey: "2025-01", grain: "MONTH", code: "COGS", amount: 4 },
    { periodKey: "2025-02", grain: "MONTH", code: "COGS", amount: 5 },
    { periodKey: "2025-03", grain: "MONTH", code: "COGS", amount: 6 },
  ];

  it("maps a quarter to its three months", () => {
    const months = monthsForQuarter(periods[3], periods);
    assert.deepEqual(
      months.map((row) => row.periodKey),
      ["2025-01", "2025-02", "2025-03"],
    );
  });

  it("sums monthly facts and derives the quarter statement", () => {
    const leaf = factsForPeriod(periods[3], periods, facts);
    assert.equal(leaf.REVENUE, 60);
    assert.equal(leaf.COGS, 15);
    const statement = statementFor(periods[3], periods, facts);
    assert.equal(statement.amounts.GROSS_PROFIT, 45);
  });
});
