# Matchup Matrix — Design

Date: 2026-06-23

## Goal

Add a head-to-head matchup matrix to the Riftbound Meta site. For a selected
event (or set of events), show legend-vs-legend winrates in a grid, with:

- selection by event (reuse the existing multi-select `EventFilter`)
- a legend filter controlling which legends appear as rows/columns
- a Day 1 vs Day 2 winrate filter (plus combined)

## Background

The site already pulls per-match data from the public UVS Games API in
`scripts/fetch-matches.ts`. That loop already resolves **both** players' legends
(`deck_defining_card.name`) per match, but it only tallies per-legend aggregate
winrates (`wr_*`, `d1_*`, `d2_*`, `nm_*`). Head-to-head pairings are discarded.

A matchup matrix requires per-pairing win/loss records, which means persisting a
new structure and re-running the fetch.

## Data model

### `lib/types.ts`

```ts
export interface MatchupCell {
  d1_wins: number;
  d1_losses: number;
  d2_wins: number;
  d2_losses: number;
}

// On TournamentData:
//   matchups[A][B] = A's record vs B (byes excluded, draws excluded).
//   Stored in BOTH directions: matchups[A][B] and matchups[B][A] are
//   complementary (A's win is B's loss). Diagonal matchups[A][A] = mirror.
matchups: Record<string, Record<string, MatchupCell>>;
```

Both directions are stored because the fetch loop already iterates both sides of
each match — tallying both is free and makes the frontend a trivial lookup with
no win/loss swapping.

### `scripts/fetch-matches.ts`

In the existing per-match block (after byes, non-COMPLETE, and draws are already
filtered out, and `sides` holds both `{pid, legend}`):

1. For the two sides A and B, determine each side's win/loss from
   `winning_player` (same logic already used for the aggregate buckets).
2. Increment `matrix[A.legend][B.legend]` with A's result on the current day,
   and `matrix[B.legend][A.legend]` with B's result.
3. Mirror matches (`A.legend === B.legend`) write one win and one loss into the
   diagonal cell — consistent, and the UI renders the diagonal as a neutral
   "mirror" cell rather than a heatmap value.

Persist the matrix as `t.matchups` on each tournament JSON alongside the
existing legend merge. Re-run `fetch-standings.ts` is **not** required; only
`fetch-matches.ts` re-runs (it reads the standings JSON and merges).

### `lib/matchups.ts` (new)

Keeps `aggregate.ts` focused on legend stats.

```ts
type DayMode = "all" | "d1" | "d2";

// Sum the per-event matrices for the selected tournaments into one matrix.
export function aggregateMatchups(
  tournaments: TournamentData[]
): Record<string, Record<string, MatchupCell>>;

// wins/losses for a cell under the chosen day mode.
export function cellRecord(
  cell: MatchupCell | undefined,
  mode: DayMode
): { wins: number; losses: number };

// winrate % or null when no games.
export function cellWinrate(
  cell: MatchupCell | undefined,
  mode: DayMode
): number | null;
```

## UI

### `app/components/MatchupMatrix.tsx`

Pure presentational grid. Props: the aggregated matrix, the ordered list of
legends to show (rows = columns), and the active `DayMode`.

- Square grid. Row = legend's perspective; column = opponent.
- Each cell: winrate % of row-vs-column under the day mode, background on a
  red → zinc(neutral) → emerald heatmap centered at 50%.
- Diagonal (mirror): neutral, dashed/marked, no heatmap.
- Cells with zero games under the mode: blank/neutral.
- `title` (hover) shows the raw `W–L` record and total games for context.
- Sticky first column + header row of legend names (truncated/abbreviated).

Per the agreed design, **all cells are colored equally regardless of sample
size**; the hover record is the only sample-size cue.

### `app/components/MatchupSection.tsx`

Self-contained client component (own state, isolated from `MetaView`). Props:
all tournaments. Renders below `ChampionGrid`.

State:
- `selectedIds: Set<number>` — own `EventFilter`, defaults to latest event.
- `dayMode: "all" | "d1" | "d2"` — 3-way segmented toggle.
- `shownLegends: string[]` — legend multiselect; defaults to the top ~12 by
  field (play count) across the selected events. Chips add/remove legends.

Derived:
- `selected` tournaments → `aggregateMatchups(selected)`.
- Legend ranking from `aggregateLegends(selected)` (reused) for the default
  top-12 and for the multiselect option list.

Layout: header + description, filter row (EventFilter, day toggle, legend
multiselect/reset), then `MatchupMatrix`.

### `app/page.tsx`

Render `<MatchupSection tournaments={tournaments} />` in its own `<section>`
below `<MetaView>`.

## Out of scope (YAGNI)

- Low-sample masking/hiding (explicitly chosen to color all cells equally).
- Separate route/page (homepage section only).
- Persisting matrix in a separate file (kept inline on each tournament JSON).
- Non-mirror-only matrix view (diagonal already handles mirrors).

## Testing / verification

1. `npx tsx scripts/fetch-matches.ts` runs clean; each tournament JSON gains a
   non-empty `matchups` object; sanity-check that `matchups[A][B].d1_wins`
   equals `matchups[B][A].d1_losses` for a sampled pairing (complementarity).
2. `npm run build` (or `next build`) compiles with no type errors.
3. Dev server: matrix renders, event/day/legend filters all mutate the grid,
   hover shows records, diagonal is neutral.
4. Deploy to Vercel prod; confirm the live site shows the new section.
