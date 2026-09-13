import { prisma } from "@/lib/db";
import { toNumber } from "@/lib/money";
import type {
  CanvasPayload,
  CompanyDTO,
  DeckDTO,
  FactDTO,
  Grain,
  LineItemCode,
  LineItemDTO,
  PeriodDTO,
  SceneLayout,
} from "@/lib/types";

function asLayout(value: unknown): SceneLayout {
  return value as SceneLayout;
}

export async function loadCanvas(): Promise<CanvasPayload> {
  const company = await prisma.company.findFirst({
    orderBy: { createdAt: "asc" },
    include: {
      periods: { orderBy: { startDate: "asc" } },
      facts: { include: { period: true, lineItem: true } },
      decks: {
        orderBy: { createdAt: "asc" },
        include: {
          scenes: {
            orderBy: { sortOrder: "asc" },
            include: {
              prompts: { orderBy: { createdAt: "desc" }, take: 6 },
            },
          },
        },
      },
    },
  });

  if (!company || company.decks.length === 0) {
    throw new Error("Database is empty. Run `npm run setup` (migrate + seed).");
  }

  const lineItems = await prisma.lineItem.findMany({ orderBy: { sortOrder: "asc" } });

  const companyDto: CompanyDTO = {
    id: company.id,
    name: company.name,
    slug: company.slug,
    currency: company.currency,
  };

  const periods: PeriodDTO[] = company.periods.map((period) => ({
    id: period.id,
    grain: period.grain as Grain,
    fiscalYear: period.fiscalYear,
    quarter: period.quarter,
    month: period.month,
    periodKey: period.periodKey,
    label: period.label,
    startDate: period.startDate.toISOString(),
    endDate: period.endDate.toISOString(),
  }));

  const lineItemDtos: LineItemDTO[] = lineItems.map((item) => ({
    id: item.id,
    code: item.code as LineItemCode,
    name: item.name,
    section: item.section,
    sortOrder: item.sortOrder,
    isDerived: item.isDerived,
    formula: item.formula,
  }));

  const facts: FactDTO[] = company.facts.map((fact) => ({
    periodKey: fact.period.periodKey,
    grain: fact.period.grain as Grain,
    code: fact.lineItem.code as LineItemCode,
    amount: toNumber(fact.amount),
  }));

  const deckRow = company.decks[0];
  const deck: DeckDTO = {
    id: deckRow.id,
    title: deckRow.title,
    scenes: deckRow.scenes.map((scene) => ({
      id: scene.id,
      title: scene.title,
      sortOrder: scene.sortOrder,
      layout: asLayout(scene.layout),
      recentPrompts: scene.prompts.map((event) => ({
        id: event.id,
        prompt: event.prompt,
        message: event.message,
        createdAt: event.createdAt.toISOString(),
      })),
    })),
  };

  return { company: companyDto, periods, lineItems: lineItemDtos, facts, deck };
}
