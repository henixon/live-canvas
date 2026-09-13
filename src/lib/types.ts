export type Grain = "MONTH" | "QUARTER";
export type ChartKind = "line" | "bar" | "area" | "waterfall";

export const LINE_ITEM_CODES = [
  "REVENUE",
  "COGS",
  "GROSS_PROFIT",
  "OPEX_RD",
  "OPEX_SM",
  "OPEX_GA",
  "OPEX_TOTAL",
  "OPERATING_INCOME",
  "OTHER_INCOME",
  "NET_INCOME",
] as const;

export type LineItemCode = (typeof LINE_ITEM_CODES)[number];

export type SceneLayout = {
  title: string;
  subtitle?: string;
  grain: Grain;
  focusPeriodKey: string | null;
  trailingPeriods: number;
  highlightCodes: LineItemCode[];
  showKpis: boolean;
  showTable: boolean;
  showChart: boolean;
  chartKind: ChartKind;
  chartMetrics: LineItemCode[];
  kpiCodes: LineItemCode[];
  notes?: string;
};

export type PeriodDTO = {
  id: string;
  grain: Grain;
  fiscalYear: number;
  quarter: number | null;
  month: number | null;
  periodKey: string;
  label: string;
  startDate: string;
  endDate: string;
};

export type LineItemDTO = {
  id: string;
  code: LineItemCode;
  name: string;
  section: string;
  sortOrder: number;
  isDerived: boolean;
  formula: string | null;
};

export type FactDTO = {
  periodKey: string;
  grain: Grain;
  code: LineItemCode;
  amount: number;
};

export type Statement = {
  period: PeriodDTO;
  amounts: Record<LineItemCode, number>;
  margins: {
    gross: number;
    operating: number;
    net: number;
  };
};

export type SceneDTO = {
  id: string;
  title: string;
  sortOrder: number;
  layout: SceneLayout;
  recentPrompts: { id: string; prompt: string; message: string; createdAt: string }[];
};

export type DeckDTO = {
  id: string;
  title: string;
  scenes: SceneDTO[];
};

export type CompanyDTO = {
  id: string;
  name: string;
  slug: string;
  currency: string;
};

export type CanvasPayload = {
  company: CompanyDTO;
  periods: PeriodDTO[];
  lineItems: LineItemDTO[];
  facts: FactDTO[];
  deck: DeckDTO;
};

export type PromptResponse = {
  scene: SceneDTO;
  message: string;
  applied: string[];
  engine: "rules" | "llm";
};
