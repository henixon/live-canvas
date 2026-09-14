import { PrismaClient } from "@prisma/client";
import { LINE_ITEM_CATALOG, STORED_CODES, type StoredLineItemCode } from "../src/lib/pnl/catalog";
import type { SceneLayout } from "../src/lib/types";

const prisma = new PrismaClient();

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function lastDayOfMonth(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 0, 23, 59, 59));
}

function defaultScenes(): Array<{ title: string; sortOrder: number; layout: SceneLayout }> {
  return [
    {
      title: "Quarterly performance",
      sortOrder: 0,
      layout: {
        title: "Aether Labs · quarterly performance",
        subtitle: "Revenue scale with expanding operating leverage",
        grain: "QUARTER",
        focusPeriodKey: "2025-Q4",
        trailingPeriods: 8,
        highlightCodes: ["REVENUE"],
        showKpis: true,
        showTable: false,
        showChart: true,
        chartKind: "bar",
        chartMetrics: ["REVENUE", "OPERATING_INCOME"],
        kpiCodes: ["REVENUE", "GROSS_PROFIT", "OPERATING_INCOME", "NET_INCOME"],
      },
    },
    {
      title: "P&L walk",
      sortOrder: 1,
      layout: {
        title: "From revenue to net income",
        subtitle: "Waterfall of the latest quarter",
        grain: "QUARTER",
        focusPeriodKey: "2025-Q4",
        trailingPeriods: 4,
        highlightCodes: ["NET_INCOME"],
        showKpis: true,
        showTable: false,
        showChart: true,
        chartKind: "waterfall",
        waterfallMode: "full",
        chartMetrics: ["REVENUE", "COGS", "OPEX_TOTAL", "OTHER_INCOME"],
        kpiCodes: ["REVENUE", "GROSS_PROFIT", "OPEX_TOTAL", "NET_INCOME"],
      },
    },
    {
      title: "Expense detail",
      sortOrder: 2,
      layout: {
        title: "Operating expense mix",
        subtitle: "R&D, S&M, and G&A vs. the P&L",
        grain: "QUARTER",
        focusPeriodKey: "2025-Q4",
        trailingPeriods: 8,
        highlightCodes: ["OPEX_TOTAL"],
        showKpis: true,
        showTable: true,
        showChart: true,
        chartKind: "area",
        chartMetrics: ["OPEX_RD", "OPEX_SM", "OPEX_GA"],
        kpiCodes: ["OPEX_RD", "OPEX_SM", "OPEX_GA", "OPEX_TOTAL"],
      },
    },
  ];
}

function monthlyLeaf(index: number): Record<StoredLineItemCode, number> {
  const year = 2024 + Math.floor(index / 12);
  const month = (index % 12) + 1;
  const growth = Math.pow(1.036, index);
  const seasonal = month === 12 ? 1.07 : month === 11 ? 1.03 : month === 2 ? 0.97 : 1;
  const revenue = Math.round(3_820_000 * growth * seasonal);
  const cogsRate = Math.max(0.21, 0.285 - index * 0.0024);
  const rdRate = Math.max(0.145, 0.195 - index * 0.0016);
  const smRate = Math.max(0.22, 0.335 - index * 0.0034);
  const gaRate = 0.086;
  const other = Math.round((index >= 10 ? 55_000 : -28_000) + (index % 4) * 9_000 - (month === 6 ? 40_000 : 0));

  return {
    REVENUE: revenue,
    COGS: Math.round(revenue * cogsRate),
    OPEX_RD: Math.round(revenue * rdRate),
    OPEX_SM: Math.round(revenue * smRate),
    OPEX_GA: Math.round(revenue * gaRate),
    OTHER_INCOME: other,
  };
}

async function main() {
  await prisma.promptEvent.deleteMany();
  await prisma.scene.deleteMany();
  await prisma.deck.deleteMany();
  await prisma.plFact.deleteMany();
  await prisma.fiscalPeriod.deleteMany();
  await prisma.lineItem.deleteMany();
  await prisma.company.deleteMany();

  const company = await prisma.company.create({
    data: {
      name: "Aether Labs",
      slug: "aether-labs",
      currency: "USD",
    },
  });

  await prisma.lineItem.createMany({
    data: LINE_ITEM_CATALOG.map((item) => ({
      code: item.code,
      name: item.name,
      section: item.section,
      sortOrder: item.sortOrder,
      isDerived: item.isDerived,
      formula: item.formula,
    })),
  });

  const lineItems = await prisma.lineItem.findMany();
  const lineByCode = new Map(lineItems.map((item) => [item.code, item]));

  const monthPeriods: Array<{
    id: string;
    year: number;
    month: number;
    quarter: number;
  }> = [];

  for (let year = 2024; year <= 2025; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      const quarter = Math.ceil(month / 3);
      const period = await prisma.fiscalPeriod.create({
        data: {
          companyId: company.id,
          grain: "MONTH",
          fiscalYear: year,
          quarter,
          month,
          periodKey: `${year}-${String(month).padStart(2, "0")}`,
          label: `${MONTH_LABELS[month - 1]} ${year}`,
          startDate: new Date(Date.UTC(year, month - 1, 1)),
          endDate: lastDayOfMonth(year, month),
        },
      });
      monthPeriods.push({ id: period.id, year, month, quarter });
    }

    for (let quarter = 1; quarter <= 4; quarter += 1) {
      const startMonth = (quarter - 1) * 3 + 1;
      await prisma.fiscalPeriod.create({
        data: {
          companyId: company.id,
          grain: "QUARTER",
          fiscalYear: year,
          quarter,
          month: null,
          periodKey: `${year}-Q${quarter}`,
          label: `Q${quarter} ${year}`,
          startDate: new Date(Date.UTC(year, startMonth - 1, 1)),
          endDate: lastDayOfMonth(year, startMonth + 2),
        },
      });
    }
  }

  const facts = [];
  for (let index = 0; index < monthPeriods.length; index += 1) {
    const period = monthPeriods[index];
    const leaf = monthlyLeaf(index);
    for (const code of STORED_CODES) {
      facts.push({
        companyId: company.id,
        periodId: period.id,
        lineItemId: lineByCode.get(code)!.id,
        amount: leaf[code],
      });
    }
  }
  await prisma.plFact.createMany({ data: facts });

  const deck = await prisma.deck.create({
    data: {
      companyId: company.id,
      title: "Aether Labs FY25 results",
    },
  });

  for (const scene of defaultScenes()) {
    await prisma.scene.create({
      data: {
        deckId: deck.id,
        title: scene.title,
        sortOrder: scene.sortOrder,
        layout: scene.layout,
      },
    });
  }

  console.log(`Seeded ${company.name} (${company.currency})`);
  console.log(`  ${monthPeriods.length} monthly periods + 8 quarter labels`);
  console.log(`  ${facts.length} stored P&L facts (derived lines computed at read time)`);
  console.log(`  1 deck / ${defaultScenes().length} scenes`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
