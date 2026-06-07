import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const API_BASE = "https://riftpulse.net/api/rq";
const DATA_DIR = join(process.cwd(), "data", "tournaments");

interface RawEvent {
  id: number;
  name: string;
  start_datetime: string;
  display_status: string;
  starting_player_count: number;
  has_decklists?: boolean;
}

interface RawPlayer {
  legend_name: string | null;
  final_place_in_standings: number;
  registration_status: string;
}

export interface LegendStats {
  name: string;
  field: number;
  t64: number;
  conv_pct: number;
  expected: number;
  excess: number;
  best_place: number;
}

export interface TournamentData {
  event_id: number;
  event_name: string;
  date: string;
  total_players: number;
  legends: LegendStats[];
}

export interface EventMeta {
  id: number;
  name: string;
  date: string;
  total_players: number;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

async function processEvent(event: RawEvent): Promise<TournamentData> {
  console.log(`  Fetching standings: ${event.name}`);
  const data = await fetchJson<{ players: RawPlayer[] }>(
    `${API_BASE}/standings?event_id=${event.id}`
  );

  const players = data.players.filter(
    (p) =>
      p.registration_status !== "DROPPED_BEFORE_ROUND_1" &&
      p.legend_name !== null
  );
  const totalPlayers = players.length;

  const fieldCounts = new Map<string, number>();
  const t64Counts = new Map<string, number>();
  const bestPlace = new Map<string, number>();

  for (const p of players) {
    const legend = p.legend_name as string;
    fieldCounts.set(legend, (fieldCounts.get(legend) ?? 0) + 1);
    const place = p.final_place_in_standings;
    if (place <= 64) {
      t64Counts.set(legend, (t64Counts.get(legend) ?? 0) + 1);
    }
    const prev = bestPlace.get(legend) ?? Infinity;
    if (place < prev) bestPlace.set(legend, place);
  }

  const legends: LegendStats[] = Array.from(fieldCounts.entries())
    .map(([name, field]) => {
      const t64 = t64Counts.get(name) ?? 0;
      const conv_pct = round2((t64 / field) * 100);
      const expected = round2((field / totalPlayers) * 64);
      const excess = round2(t64 - expected);
      const best_place = bestPlace.get(name) ?? 0;
      return { name, field, t64, conv_pct, expected, excess, best_place };
    })
    .sort((a, b) => b.excess - a.excess);

  return {
    event_id: event.id,
    event_name: event.name,
    date: event.start_datetime.slice(0, 10),
    total_players: totalPlayers,
    legends,
  };
}

async function main() {
  mkdirSync(DATA_DIR, { recursive: true });

  console.log("Fetching event list...");
  const events = await fetchJson<RawEvent[]>(`${API_BASE}/events`);
  const complete = events.filter((e) => e.display_status === "complete");
  console.log(`Found ${complete.length} completed events`);

  const index: EventMeta[] = [];

  for (const event of complete) {
    try {
      const data = await processEvent(event);
      if (data.legends.length === 0) {
        console.log(`  Skipped ${event.name}: no legend data`);
        continue;
      }
      const outPath = join(DATA_DIR, `${event.id}.json`);
      writeFileSync(outPath, JSON.stringify(data, null, 2));
      console.log(`  Wrote ${outPath} (${data.legends.length} legends)`);
      index.push({
        id: event.id,
        name: event.name,
        date: data.date,
        total_players: data.total_players,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`  Skipped ${event.name}: ${msg}`);
    }
  }

  const indexPath = join(DATA_DIR, "index.json");
  writeFileSync(indexPath, JSON.stringify(index, null, 2));
  console.log(`\nWrote index: ${indexPath}`);
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
