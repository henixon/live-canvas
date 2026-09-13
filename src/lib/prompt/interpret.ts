import { applyPromptRules } from "@/lib/prompt/rules";
import type { PeriodDTO, SceneLayout } from "@/lib/types";

const LAYOUT_HINT = `Return JSON only: {
  "title": string,
  "subtitle": string | null,
  "grain": "MONTH" | "QUARTER",
  "focusPeriodKey": string | null,
  "trailingPeriods": number,
  "highlightCodes": string[],
  "showKpis": boolean,
  "showTable": boolean,
  "showChart": boolean,
  "chartKind": "line" | "bar" | "area" | "waterfall",
  "chartMetrics": string[],
  "kpiCodes": string[],
  "notes": string | null,
  "message": string
}`;

export async function interpretPrompt(
  layout: SceneLayout,
  prompt: string,
  periods: PeriodDTO[],
): Promise<{ layout: SceneLayout; message: string; applied: string[]; engine: "rules" | "llm" }> {
  const rules = applyPromptRules(layout, prompt, { periods });
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || rules.applied.length > 0) {
    return { ...rules, engine: "rules" };
  }

  try {
    const llm = await interpretWithLlm(layout, prompt, periods, apiKey);
    return llm;
  } catch {
    return { ...rules, engine: "rules" };
  }
}

async function interpretWithLlm(
  layout: SceneLayout,
  prompt: string,
  periods: PeriodDTO[],
  apiKey: string,
): Promise<{ layout: SceneLayout; message: string; applied: string[]; engine: "llm" }> {
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const periodKeys = periods.map((period) => period.periodKey).join(", ");
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You update a financial-results presentation scene. ${LAYOUT_HINT}
Only use period keys from: ${periodKeys}.
Allowed line item codes: REVENUE, COGS, GROSS_PROFIT, OPEX_RD, OPEX_SM, OPEX_GA, OPEX_TOTAL, OPERATING_INCOME, OTHER_INCOME, NET_INCOME.`,
        },
        {
          role: "user",
          content: `Current layout:\n${JSON.stringify(layout)}\n\nPrompt:\n${prompt}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI ${response.status}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("empty LLM response");
  const parsed = JSON.parse(content) as SceneLayout & { message?: string };

  const next: SceneLayout = {
    ...layout,
    ...parsed,
    highlightCodes: parsed.highlightCodes ?? layout.highlightCodes,
    chartMetrics: parsed.chartMetrics ?? layout.chartMetrics,
    kpiCodes: parsed.kpiCodes ?? layout.kpiCodes,
  };

  return {
    layout: next,
    message: parsed.message ?? "Updated canvas from the language model.",
    applied: ["llm layout patch"],
    engine: "llm",
  };
}
