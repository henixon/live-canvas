"use client";

import { formatMoney, formatPct } from "@/lib/money";
import type { LineItemCode, LineItemDTO, Statement } from "@/lib/types";

const MARGIN_FOR: Partial<Record<LineItemCode, keyof Statement["margins"]>> = {
  GROSS_PROFIT: "gross",
  OPERATING_INCOME: "operating",
  NET_INCOME: "net",
};

export function KpiStrip({
  statement,
  codes,
  lineItems,
  currency,
  highlightCodes,
}: {
  statement: Statement;
  codes: LineItemCode[];
  lineItems: LineItemDTO[];
  currency: string;
  highlightCodes: LineItemCode[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {codes.map((code) => {
        const item = lineItems.find((row) => row.code === code);
        const amount = statement.amounts[code];
        const marginKey = MARGIN_FOR[code];
        const highlighted = highlightCodes.includes(code);
        return (
          <article
            key={code}
            className={`rounded-2xl border px-4 py-4 transition-colors ${
              highlighted
                ? "border-amber-400/70 bg-amber-400/10 ring-1 ring-amber-300/40"
                : "border-canvas-line bg-canvas-card"
            }`}
          >
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
              {item?.name ?? code}
            </p>
            <p className="mt-2 font-display text-2xl text-slate-50">{formatMoney(amount, currency)}</p>
            {marginKey ? (
              <p className="mt-1 text-sm text-teal-300">{formatPct(statement.margins[marginKey])} margin</p>
            ) : (
              <p className="mt-1 text-sm text-slate-500">{statement.period.label}</p>
            )}
          </article>
        );
      })}
    </div>
  );
}
