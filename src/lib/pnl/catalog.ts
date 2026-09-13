import type { LineItemCode } from "../types";

export type LineItemDef = {
  code: LineItemCode;
  name: string;
  section: "revenue" | "cogs" | "gross" | "opex" | "operating" | "below";
  sortOrder: number;
  isDerived: boolean;
  formula: string | null;
};

export const LINE_ITEM_CATALOG: LineItemDef[] = [
  { code: "REVENUE", name: "Revenue", section: "revenue", sortOrder: 10, isDerived: false, formula: null },
  { code: "COGS", name: "Cost of goods sold", section: "cogs", sortOrder: 20, isDerived: false, formula: null },
  {
    code: "GROSS_PROFIT",
    name: "Gross profit",
    section: "gross",
    sortOrder: 30,
    isDerived: true,
    formula: "REVENUE - COGS",
  },
  { code: "OPEX_RD", name: "Research & development", section: "opex", sortOrder: 40, isDerived: false, formula: null },
  { code: "OPEX_SM", name: "Sales & marketing", section: "opex", sortOrder: 50, isDerived: false, formula: null },
  { code: "OPEX_GA", name: "General & administrative", section: "opex", sortOrder: 60, isDerived: false, formula: null },
  {
    code: "OPEX_TOTAL",
    name: "Total operating expenses",
    section: "opex",
    sortOrder: 70,
    isDerived: true,
    formula: "OPEX_RD + OPEX_SM + OPEX_GA",
  },
  {
    code: "OPERATING_INCOME",
    name: "Operating income",
    section: "operating",
    sortOrder: 80,
    isDerived: true,
    formula: "GROSS_PROFIT - OPEX_TOTAL",
  },
  { code: "OTHER_INCOME", name: "Other income / (expense)", section: "below", sortOrder: 90, isDerived: false, formula: null },
  {
    code: "NET_INCOME",
    name: "Net income",
    section: "below",
    sortOrder: 100,
    isDerived: true,
    formula: "OPERATING_INCOME + OTHER_INCOME",
  },
];

export type StoredLineItemCode = "REVENUE" | "COGS" | "OPEX_RD" | "OPEX_SM" | "OPEX_GA" | "OTHER_INCOME";

export const STORED_CODES: StoredLineItemCode[] = LINE_ITEM_CATALOG.filter(
  (item): item is LineItemDef & { code: StoredLineItemCode } => !item.isDerived,
).map((item) => item.code);

export const OPEX_CODES: LineItemCode[] = ["OPEX_RD", "OPEX_SM", "OPEX_GA", "OPEX_TOTAL"];
