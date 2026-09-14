import { prisma } from "@/lib/db";
import { interpretPrompt } from "@/lib/prompt/interpret";
import type { PeriodDTO, SceneLayout } from "@/lib/types";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const Body = z.object({
  sceneId: z.string().min(1),
  prompt: z.string().min(1).max(500),
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid prompt payload" }, { status: 400 });
  }

  const scene = await prisma.scene.findUnique({
    where: { id: parsed.data.sceneId },
    include: {
      prompts: { orderBy: { createdAt: "desc" }, take: 5 },
      deck: { include: { company: { include: { periods: { orderBy: { startDate: "asc" } } } } } },
    },
  });

  if (!scene) {
    return NextResponse.json({ error: "Scene not found" }, { status: 404 });
  }

  const periods: PeriodDTO[] = scene.deck.company.periods.map((period) => ({
    id: period.id,
    grain: period.grain as PeriodDTO["grain"],
    fiscalYear: period.fiscalYear,
    quarter: period.quarter,
    month: period.month,
    periodKey: period.periodKey,
    label: period.label,
    startDate: period.startDate.toISOString(),
    endDate: period.endDate.toISOString(),
  }));

  const result = await interpretPrompt(scene.layout as SceneLayout, parsed.data.prompt, periods);

  const updated = await prisma.scene.update({
    where: { id: scene.id },
    data: {
      layout: result.layout,
    },
  });

  await prisma.promptEvent.create({
    data: {
      sceneId: scene.id,
      prompt: parsed.data.prompt,
      message: result.message,
    },
  });

  const recent = await prisma.promptEvent.findMany({
    where: { sceneId: scene.id },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  return NextResponse.json({
    scene: {
      id: updated.id,
      title: updated.title,
      sortOrder: updated.sortOrder,
      layout: result.layout,
      recentPrompts: recent.map((event) => ({
        id: event.id,
        prompt: event.prompt,
        message: event.message,
        createdAt: event.createdAt.toISOString(),
      })),
    },
    message: result.message,
    applied: result.applied,
    engine: result.engine,
  });
}
