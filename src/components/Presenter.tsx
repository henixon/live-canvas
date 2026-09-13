"use client";

import { KpiStrip } from "@/components/KpiStrip";
import { PlTable } from "@/components/PlTable";
import { PromptBar } from "@/components/PromptBar";
import { TrendChart } from "@/components/TrendChart";
import { WaterfallChart } from "@/components/WaterfallChart";
import { resolveFocus, statementFor, statementsForGrain, trailingWindow } from "@/lib/pnl/rollup";
import type { CanvasPayload, PromptResponse, SceneDTO } from "@/lib/types";
import { useMemo, useState } from "react";

export function Presenter({ initial }: { initial: CanvasPayload }) {
  const [payload, setPayload] = useState(initial);
  const [sceneId, setSceneId] = useState(initial.deck.scenes[0]?.id ?? "");
  const [status, setStatus] = useState<string | null>(
    "Rule engine is live. Optional OPENAI_API_KEY handles prompts the rules miss.",
  );
  const [revision, setRevision] = useState(0);

  const scene = payload.deck.scenes.find((row) => row.id === sceneId) ?? payload.deck.scenes[0];
  const layout = scene?.layout;

  const view = useMemo(() => {
    if (!layout) return null;
    const series = statementsForGrain(layout.grain, payload.periods, payload.facts);
    const focus = resolveFocus(payload.periods, layout.grain, layout.focusPeriodKey);
    const focusStatement = statementFor(focus, payload.periods, payload.facts);
    const window = trailingWindow(series, focus.periodKey, layout.trailingPeriods);
    return { focus, focusStatement, window };
  }, [layout, payload.facts, payload.periods]);

  async function applyPrompt(prompt: string) {
    if (!scene) return;
    const response = await fetch("/api/prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sceneId: scene.id, prompt }),
    });
    const body = (await response.json()) as PromptResponse & { error?: string };
    if (!response.ok) {
      setStatus(body.error ?? "Prompt failed");
      return;
    }
    setPayload((current) => ({
      ...current,
      deck: {
        ...current.deck,
        scenes: current.deck.scenes.map((row) => (row.id === body.scene.id ? body.scene : row)),
      },
    }));
    setRevision((value) => value + 1);
    setStatus(`${body.engine === "llm" ? "LLM" : "Rules"} · ${body.message}`);
  }

  function selectScene(next: SceneDTO) {
    setSceneId(next.id);
    setRevision((value) => value + 1);
    setStatus(`Scene: ${next.title}`);
  }

  if (!scene || !layout || !view) {
    return <div className="p-8 text-slate-300">No scenes seeded. Run npm run setup.</div>;
  }

  const opexMode =
    layout.chartKind === "waterfall" &&
    layout.chartMetrics.every((code) => code.startsWith("OPEX") || code === "GROSS_PROFIT");

  return (
    <div className="mx-auto flex min-h-screen max-w-[1400px] flex-col gap-4 px-4 py-5 lg:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-teal-300">Live canvas</p>
          <h1 className="font-display text-3xl text-slate-50">{payload.company.name}</h1>
          <p className="text-sm text-slate-400">
            {payload.deck.title} · {payload.company.currency} · months stored, quarters rolled up
          </p>
        </div>
        <div className="rounded-full border border-canvas-line bg-canvas-panel px-3 py-1 text-xs text-slate-300">
          Focus {view.focus.label} · {layout.grain.toLowerCase()} grain
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="space-y-2">
          {payload.deck.scenes.map((row, index) => {
            const active = row.id === scene.id;
            return (
              <button
                key={row.id}
                type="button"
                onClick={() => selectScene(row)}
                className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                  active
                    ? "border-teal-400/60 bg-teal-400/10"
                    : "border-canvas-line bg-canvas-panel hover:border-slate-500"
                }`}
              >
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Scene {index + 1}</p>
                <p className="mt-1 text-sm text-slate-100">{row.title}</p>
              </button>
            );
          })}
        </aside>

        <section
          key={`${scene.id}-${revision}`}
          className="scene-enter space-y-4 rounded-[28px] border border-canvas-line bg-canvas-panel/80 p-5 shadow-stage"
        >
          <div>
            <h2 className="font-display text-2xl text-slate-50">{layout.title}</h2>
            {layout.subtitle ? <p className="mt-1 text-sm text-slate-400">{layout.subtitle}</p> : null}
          </div>

          {layout.showKpis ? (
            <KpiStrip
              statement={view.focusStatement}
              codes={layout.kpiCodes}
              lineItems={payload.lineItems}
              currency={payload.company.currency}
              highlightCodes={layout.highlightCodes}
            />
          ) : null}

          {layout.showChart ? (
            <div className="rounded-2xl border border-canvas-line bg-canvas-card p-4">
              <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                {layout.chartKind} · {layout.grain === "QUARTER" ? "quarterly" : "monthly"}
              </p>
              {layout.chartKind === "waterfall" ? (
                <WaterfallChart
                  statement={view.focusStatement}
                  currency={payload.company.currency}
                  highlightCodes={layout.highlightCodes}
                  mode={opexMode ? "opex" : "full"}
                />
              ) : (
                <TrendChart
                  statements={view.window}
                  metrics={layout.chartMetrics}
                  lineItems={payload.lineItems}
                  kind={layout.chartKind}
                  currency={payload.company.currency}
                  highlightCodes={layout.highlightCodes}
                />
              )}
            </div>
          ) : null}

          {layout.showTable ? (
            <PlTable
              statement={view.focusStatement}
              lineItems={payload.lineItems}
              currency={payload.company.currency}
              highlightCodes={layout.highlightCodes}
            />
          ) : null}

          {layout.notes ? <p className="text-sm text-amber-200/90">{layout.notes}</p> : null}

          {scene.recentPrompts.length ? (
            <ol className="flex flex-wrap gap-2 text-[11px] text-slate-500">
              {scene.recentPrompts.slice(0, 4).map((event) => (
                <li key={event.id} className="rounded-full border border-canvas-line px-2 py-1">
                  “{event.prompt}”
                </li>
              ))}
            </ol>
          ) : null}
        </section>
      </div>

      <PromptBar onSubmit={applyPrompt} status={status} />
    </div>
  );
}
