/**
 * fetch-matches.ts — augment each data/tournaments/<id>.json with match-derived
 * winrates pulled from the public UVS Games Organized Play API.
 *
 * Source (no auth required):
 *   GET /api/v2/events/{id}/                              -> tournament_phases (rounds + round_type)
 *   GET /api/v2/tournament-rounds/{round_id}/matches/paginated/?page=&page_size=
 *
 * Each match carries both players' deck_defining_card (the legend), the
 * winning_player, and match_is_bye / match_is_*_draw flags. From these we tally
 * per legend, byes excluded and draws excluded from the denominator:
 *   - wr_*  overall real-match winrate
 *   - d1_*  Day 1   (first phase — order_in_phases === 1)
 *   - d2_*  Day 2   (all later phases: day-2 Swiss + top cut)
 *   - nm_*  non-mirror (opponent on a different legend)
 *
 * Run AFTER fetch-standings.ts (it reads the standings-produced JSON and merges).
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { EventMeta, TournamentData, LegendStats } from "../lib/types";

const API = "https://api.cloudflare.riftbound.uvsgames.com/hydraproxy/api/v2";
const DATA_DIR = join(process.cwd(), "data", "tournaments");
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";
const PAGE_SIZE = 1000;

interface Bucket {
  wr_wins: number;
  wr_losses: number;
  d1_wins: number;
  d1_losses: number;
  d2_wins: number;
  d2_losses: number;
  nm_wins: number;
  nm_losses: number;
}

function newBucket(): Bucket {
  return {
    wr_wins: 0,
    wr_losses: 0,
    d1_wins: 0,
    d1_losses: 0,
    d2_wins: 0,
    d2_losses: 0,
    nm_wins: 0,
    nm_losses: 0,
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function wr(w: number, l: number) {
  return w + l === 0 ? 0 : round2((w / (w + l)) * 100);
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json() as Promise<T>;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Phase {
  order_in_phases: number;
  round_type: string;
  rounds: { id: number; round_number: number }[];
}

async function processEvent(meta: EventMeta): Promise<Map<string, Bucket>> {
  const buckets = new Map<string, Bucket>();
  const get = (name: string) => {
    let b = buckets.get(name);
    if (!b) {
      b = newBucket();
      buckets.set(name, b);
    }
    return b;
  };

  const event = await getJson<{ tournament_phases: Phase[] }>(`${API}/events/${meta.id}/`);
  // Day 1 = the first phase (order_in_phases === 1); everything else = Day 2.
  const rounds: { id: number; day: 1 | 2 }[] = [];
  for (const ph of event.tournament_phases ?? []) {
    const day: 1 | 2 = ph.order_in_phases === 1 ? 1 : 2;
    for (const r of ph.rounds ?? []) rounds.push({ id: r.id, day });
  }

  for (const { id: roundId, day } of rounds) {
    let page = 1;
    for (;;) {
      const data = await getJson<{ results: RawMatch[]; next: string | null }>(
        `${API}/tournament-rounds/${roundId}/matches/paginated/?page=${page}&page_size=${PAGE_SIZE}`
      );
      for (const m of data.results) {
        if (m.match_is_bye) continue; // free win — never a real match
        if (m.status !== "COMPLETE") continue;

        const sides = m.player_match_relationships
          .map((pmr) => ({
            pid: pmr.player?.id,
            legend: pmr.user_event_status?.deck_defining_card?.name ?? null,
          }))
          .filter((s) => s.pid != null && s.legend);
        if (sides.length < 2) continue; // need both legends to classify

        const isDraw =
          m.match_is_intentional_draw ||
          m.match_is_unintentional_draw ||
          (m.winning_player == null && !m.match_is_loss);
        if (isDraw) continue; // draws excluded from W/L

        const isMirror = sides.every((s) => s.legend === sides[0].legend);

        for (const s of sides) {
          const b = get(s.legend as string);
          // match_is_loss with no winner = double loss (no-show); both lose.
          const won = m.winning_player != null && s.pid === m.winning_player;
          if (won) {
            b.wr_wins++;
            if (day === 1) b.d1_wins++;
            else b.d2_wins++;
            if (!isMirror) b.nm_wins++;
          } else {
            b.wr_losses++;
            if (day === 1) b.d1_losses++;
            else b.d2_losses++;
            if (!isMirror) b.nm_losses++;
          }
        }
      }
      if (!data.next) break;
      page++;
      await sleep(80);
    }
  }
  return buckets;
}

function applyBuckets(l: LegendStats, b: Bucket | undefined): LegendStats {
  const z = b ?? newBucket();
  return {
    ...l,
    wr_wins: z.wr_wins,
    wr_losses: z.wr_losses,
    wr: wr(z.wr_wins, z.wr_losses),
    d1_wins: z.d1_wins,
    d1_losses: z.d1_losses,
    d1_wr: wr(z.d1_wins, z.d1_losses),
    d2_wins: z.d2_wins,
    d2_losses: z.d2_losses,
    d2_wr: wr(z.d2_wins, z.d2_losses),
    nm_wins: z.nm_wins,
    nm_losses: z.nm_losses,
    nm_wr: wr(z.nm_wins, z.nm_losses),
  };
}

interface RawMatch {
  status: string;
  match_is_bye: boolean;
  match_is_loss: boolean;
  match_is_intentional_draw: boolean;
  match_is_unintentional_draw: boolean;
  winning_player: number | null;
  player_match_relationships: {
    player: { id: number } | null;
    user_event_status: { deck_defining_card: { name: string } | null } | null;
  }[];
}

async function main() {
  const index: EventMeta[] = JSON.parse(
    readFileSync(join(DATA_DIR, "index.json"), "utf-8")
  );

  for (const meta of index) {
    process.stdout.write(`Matches: ${meta.name} … `);
    try {
      const buckets = await processEvent(meta);
      const file = join(DATA_DIR, `${meta.id}.json`);
      const t: TournamentData = JSON.parse(readFileSync(file, "utf-8"));
      t.legends = t.legends.map((l) => applyBuckets(l, buckets.get(l.name)));
      writeFileSync(file, JSON.stringify(t, null, 2));
      const totW = t.legends.reduce((s, l) => s + l.wr_wins, 0);
      const totL = t.legends.reduce((s, l) => s + l.wr_losses, 0);
      console.log(`ok (${totW + totL} real-match results, byes excluded)`);
    } catch (e) {
      console.log(`SKIP: ${e instanceof Error ? e.message : String(e)}`);
    }
    await sleep(150);
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
