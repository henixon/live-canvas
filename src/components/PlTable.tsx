"use client";

import { formatMoney, formatPct } from "@/lib/money";
import type { LineItemCode, LineItemDTO, Statement } from "@/lib/types";

export function PlTable({
  statement,
  lineItems,
  currency,
  highlightCodes,
}: {
  statement: Statement;
  lineItems: LineItemDTO[];
  currency: string;
  highlightCodes: LineItemCode[];
}) {
  const revenue = statement.amounts.REVENUE || 1;
  return (
    <div className="overflow-hidden rounded-2xl border border-canvas-line">
      <table className="w-full text-left text-sm">
        <thead className="bg-black/20 text-[11px] uppercase tracking-[0.14em] text-slate-400">
          <tr>
            <th className="px-4 py-3 font-medium">Line</th>
            <th className="px-4 py-3 font-medium">Amount</th>
            <th className="px-4 py-3 font-medium">% of revenue</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((item) => {
            const amount = statement.amounts[item.code];
            const highlighted = highlightCodes.includes(item.code);
            return (
              <tr
                key={item.code}
                className={`border-t border-canvas-line ${
                  highlighted ? "bg-amber-400/10 text-amber-100" : "text-slate-200"
                } ${item.isDerived ? "font-medium" : ""}`}
              >
                <td className="px-4 py-2.5">
                  {item.name}
                  {item.isDerived ? <span className="ml-2 text-[10px] uppercase text-slate-500">derived</span> : null}
                </td>
                <td className="px-4 py-2.5 tabular-nums">{formatMoney(amount, currency)}</td>
                <td className="px-4 py-2.5 tabular-nums text-slate-400">{formatPct(amount / revenue)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
