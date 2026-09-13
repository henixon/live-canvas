"use client";

import { useState } from "react";

const CHIPS = [
  "emphasize Q3 revenue",
  "add a margin chart",
  "switch to waterfall for opex",
  "show last 6 months",
  "show the P&L table",
];

export function PromptBar({
  disabled,
  status,
  onSubmit,
}: {
  disabled?: boolean;
  status?: string | null;
  onSubmit: (prompt: string) => Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(prompt: string) {
    const next = prompt.trim();
    if (!next || busy || disabled) return;
    setBusy(true);
    try {
      await onSubmit(next);
      setValue("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-canvas-line bg-canvas-panel/90 p-3 backdrop-blur">
      <form
        className="flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void send(value);
        }}
      >
        <span className="hidden px-2 text-[11px] uppercase tracking-[0.18em] text-teal-300 sm:inline">Prompt</span>
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Tell the canvas what to change — no reload"
          className="h-11 flex-1 rounded-xl border border-canvas-line bg-canvas-bg px-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-teal-400/70"
          disabled={busy || disabled}
        />
        <button
          type="submit"
          disabled={busy || disabled || !value.trim()}
          className="h-11 rounded-xl bg-teal-400 px-4 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Updating…" : "Apply"}
        </button>
      </form>
      <div className="mt-2 flex flex-wrap gap-2">
        {CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            disabled={busy || disabled}
            onClick={() => void send(chip)}
            className="rounded-full border border-canvas-line px-3 py-1 text-xs text-slate-300 hover:border-teal-400/50 hover:text-teal-200 disabled:opacity-40"
          >
            {chip}
          </button>
        ))}
      </div>
      {status ? <p className="mt-2 text-xs text-slate-400">{status}</p> : null}
    </div>
  );
}
