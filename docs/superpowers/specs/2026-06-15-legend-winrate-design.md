# Legend Winrate — Design

Date: 2026-06-15

## Goal

Add a per-legend Swiss match winrate to the Riftbound Meta site, displayed as a
new stat alongside the existing conversion rate, excess, and field metrics.

## Feasibility

The source API (`https://riftpulse.net/api/rq/standings?event_id=<id>`) returns
per-player `matches_won`, `matches_lost`, and `matches_drawn`. Aggregating these
across players gives a reliable per-legend winrate.

Head-to-head matchup winrates (legend A vs legend B) are **not possible**: the
`pairings`, `matches`, and `rounds` endpoints return the SPA HTML shell, not
data. Only final aggregate records are exposed. Out of scope.

## Decisions

1. **Formula:** `winrate = wins / (wins + losses) * 100`. Draws excluded from
   the denominator (standard TCG convention).
2. **Placement:** new column/cell in the existing `ChampionGrid` table.
3. **Low sample:** no filtering. Every legend shows its winrate, with the match
   count `(wins + losses)` displayed as the sample size for the reader to judge.

## Data Model — `lib/types.ts`

Add three fields to `LegendStats`:

```ts
wins: number;     // total matches won across aggregated tournaments
losses: number;   // total matches lost
winrate: number;  // wins / (wins + losses) * 100, rounded to 2dp; 0 if no matches
```

## Ingestion — `scripts/fetch-standings.ts`

1. Add `matches_won: number` and `matches_lost: number` to the `RawPlayer`
   interface (the API already returns them).
2. In `processEvent`, alongside `fieldCounts`/`t64Counts`, accumulate per-legend
   `winsByLegend` and `lossesByLegend` from each player's record.
3. When building each `LegendStats`, set `wins`, `losses`, and
   `winrate = round2(wins / (wins + losses) * 100)` (0 when `wins + losses === 0`).
4. The script's local `LegendStats` interface mirror must also gain the three
   fields.
5. Re-run the script to regenerate all tournament JSON files in
   `data/tournaments/` (existing files predate these fields). Decklists are
   already cached on disk, so the run mainly re-pulls standings JSON.

## Aggregation — `lib/aggregate.ts`

1. Add `wins` and `losses` accumulator `Map`s, summed per legend across the
   passed tournaments (same pattern as `field`/`t64`).
2. In the final map step, compute combined
   `winrate = round2((wins / (wins + losses)) * 100)`, guarding
   `wins + losses === 0` → `winrate = 0`.
3. Return `wins`, `losses`, `winrate` on each `LegendStats`.

## UI — `app/components/ChampionGrid.tsx`

1. Add `"winrate"` to the `SortKey` union.
2. Add `{ key: "winrate", label: "WR%" }` to `SORT_OPTIONS` (placed after
   `conv_pct`).
3. Add a `WR%` stat cell in the card stat row:
   - Value formatted as `54.2%` (`winrate.toFixed(1)`).
   - Sample size `wins + losses` shown as small grey text below
     (e.g. `120 matches`).
   - Emerald highlight when `sortKey === "winrate"`, matching the other cells.
4. The stat row currently holds 5 cells in a fixed `w-72`. Adding a 6th requires
   widening the row (e.g. `w-80`/`sm:w-96`) or tightening per-cell spacing.
   Keep it readable on mobile; no broader layout rework.

## Out of Scope

1. Head-to-head matchup winrates (no source data).
2. Confidence intervals / statistical smoothing.
3. Minimum-sample filtering or hiding low-sample legends.
4. Changes to `StandingsTable.tsx` (currently unused by `page.tsx`).

## Verification

1. `npm run build` (or `tsc`) passes with the new fields typed.
2. Regenerated tournament JSON files contain `wins`/`losses`/`winrate` per legend.
3. Spot-check: a known legend's site winrate equals
   `sum(matches_won) / (sum(matches_won) + sum(matches_lost))` from the raw
   standings.
4. WR% column renders, sorts, and shows the match count in the live UI.
