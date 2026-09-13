# Live Canvas

A prompt-driven presentation canvas over a structured P&L. The first slice is a presenter view that reads Aether Labs financials from a local database and restyles the current scene from natural-language instructions — no page reload.

## Quick start

```bash
npm install
cp .env.example .env
npx prisma generate
npm run setup          # migrate deploy + seed
npm run dev            # http://localhost:3000
```

Useful extras:

```bash
npm test               # rollup + prompt-rule unit tests
npm run db:reset       # wipe SQLite, re-run migrations and seed
```

The local demo uses SQLite (`DATABASE_URL=file:./dev.db`, created under `prisma/`). No API keys are required.

## Schema

Months are the **source of truth**. Quarter rows exist so the canvas can address `2025-Q3`, but quarter amounts are **not stored**. `src/lib/pnl/rollup.ts` sums the three constituent months and then derives totals.

| Entity | Role |
| --- | --- |
| `Company` | Single-tenant org. `currency` is a field (`USD` in the seed) so it is not hardcoded. |
| `FiscalPeriod` | `MONTH` or `QUARTER`, unique on `(companyId, periodKey)` (`2025-07` / `2025-Q3`). |
| `LineItem` | Catalog of P&L lines, including derived lines. |
| `PlFact` | Stored amounts for **leaf** lines on **month** periods only. |
| `Deck` / `Scene` | Persisted presentation. `Scene.layout` is JSON the prompt engine mutates. |
| `PromptEvent` | Prompt history so a rewritten deck reloads with context. |

Stored (leaf) lines: `REVENUE`, `COGS`, `OPEX_RD`, `OPEX_SM`, `OPEX_GA`, `OTHER_INCOME`.

Derived at read time:

- `GROSS_PROFIT = REVENUE - COGS`
- `OPEX_TOTAL = OPEX_RD + OPEX_SM + OPEX_GA`
- `OPERATING_INCOME = GROSS_PROFIT - OPEX_TOTAL`
- `NET_INCOME = OPERATING_INCOME + OTHER_INCOME` (no tax line in v1)

Seed data: Aether Labs, USD, calendar FY2024–FY2025 (24 months + 8 quarter labels). Growing SaaS-style P&L with improving gross margin and opex leverage.

### Postgres later

The Prisma schema is written with portable types (string ids, `Decimal`, `DateTime`, `Json`). To move off SQLite:

1. Set `provider = "postgresql"` in `prisma/schema.prisma`.
2. Point `DATABASE_URL` at Postgres.
3. Replace the SQLite migration with `prisma migrate dev`.

## Prompt → canvas

`POST /api/prompt` `{ sceneId, prompt }` runs `src/lib/prompt/interpret.ts`:

1. **Rule engine** (`src/lib/prompt/rules.ts`) maps common finance-presentation phrases onto the scene layout. This is what the local demo uses.
2. **Optional LLM** — if `OPENAI_API_KEY` is set **and** the rules did not match, the same layout JSON is patched via OpenAI (`OPENAI_MODEL`, default `gpt-4o-mini`). Failures fall back to the rule message. This is the extension point: swap the fetch in `interpretWithLlm` or always-prefer LLM by changing the guard in `interpretPrompt`.

The updated `Scene.layout` is written to the database, so a refresh keeps the prompt-adjusted deck.

Examples the rules understand:

| Prompt | Canvas change |
| --- | --- |
| `emphasize Q3 revenue` | Focus latest (or dated) Q3, highlight revenue KPI/chart |
| `add a margin chart` | Show revenue + gross profit trend, highlight margin |
| `switch to waterfall for opex` | Waterfall from gross profit through R&D / S&M / G&A |
| `show last 6 months` | Monthly grain, trailing window of 6 |
| `show the P&L table` / `hide the table` | Toggle the income-statement table |
| `focus August 2025` | Jump to that month |

Chips under the prompt bar send these without typing.

## App shape

- Next.js App Router, TypeScript, Tailwind, Prisma, Recharts.
- Server page loads the canvas payload; the presenter is a client island.
- Prompt apply is a fetch to `/api/prompt` and React state — no full reload.
- Three seeded scenes: quarterly performance, P&L walk, expense detail.

## Tests

`npm test` covers derived-line math, quarter rollup from months, and the prompt mappings above.
