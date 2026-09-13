import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyPromptRules, findLineItem, findPeriodKey } from "./rules";
import type { PeriodDTO, SceneLayout } from "../types";

const periods: PeriodDTO[] = [
  {
    id: "1",
    grain: "QUARTER",
    fiscalYear: 2025,
    quarter: 3,
    month: null,
    periodKey: "2025-Q3",
    label: "Q3 2025",
    startDate: "2025-07-01",
    endDate: "2025-09-30",
  },
  {
    id: "2",
    grain: "MONTH",
    fiscalYear: 2025,
    quarter: 3,
    month: 8,
    periodKey: "2025-08",
    label: "Aug 2025",
    startDate: "2025-08-01",
    endDate: "2025-08-31",
  },
];

const baseLayout: SceneLayout = {
  title: "Results",
  grain: "QUARTER",
  focusPeriodKey: null,
  trailingPeriods: 8,
  highlightCodes: [],
  showKpis: true,
  showTable: true,
  showChart: true,
  chartKind: "bar",
  chartMetrics: ["REVENUE"],
  kpiCodes: ["REVENUE", "NET_INCOME"],
};

describe("prompt rules", () => {
  it("maps common line-item phrases", () => {
    assert.equal(findLineItem("emphasize Q3 revenue"), "REVENUE");
    assert.equal(findLineItem("switch to waterfall for opex"), "OPEX_TOTAL");
    assert.equal(findLineItem("add a margin chart"), "GROSS_PROFIT");
  });

  it("resolves explicit and bare quarters", () => {
    assert.equal(findPeriodKey("emphasize Q3 2025 revenue", periods), "2025-Q3");
    assert.equal(findPeriodKey("focus q3", periods), "2025-Q3");
    assert.equal(findPeriodKey("show August 2025", periods), "2025-08");
  });

  it("emphasizes Q3 revenue without a reload-style reset", () => {
    const result = applyPromptRules(baseLayout, "emphasize Q3 revenue", { periods });
    assert.ok(result.applied.includes("focused 2025-Q3"));
    assert.ok(result.layout.highlightCodes.includes("REVENUE"));
    assert.equal(result.layout.focusPeriodKey, "2025-Q3");
  });

  it("switches to an opex waterfall", () => {
    const result = applyPromptRules(baseLayout, "switch to waterfall for opex", { periods });
    assert.equal(result.layout.chartKind, "waterfall");
    assert.ok(result.layout.chartMetrics.includes("OPEX_RD"));
    assert.equal(result.layout.showChart, true);
  });

  it("adds a margin chart", () => {
    const result = applyPromptRules(baseLayout, "add a margin chart", { periods });
    assert.ok(result.layout.chartMetrics.includes("GROSS_PROFIT"));
    assert.ok(result.layout.highlightCodes.includes("GROSS_PROFIT"));
  });

  it("changes trailing monthly window", () => {
    const result = applyPromptRules(baseLayout, "show last 6 months", { periods });
    assert.equal(result.layout.grain, "MONTH");
    assert.equal(result.layout.trailingPeriods, 6);
  });
});
