import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const API_BASE = "https://riftpulse.net/api/rq";
const DATA_DIR = join(process.cwd(), "data", "tournaments");
const DECKLIST_DIR = join(process.cwd(), "data", "decklists");

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

interface RawEvent {
  id: number;
  name: string;
  start_datetime: string;
  display_status: string;
  starting_player_count: number;
}

interface RawPlayer {
  player_id: number;
  username: string;
  legend_name: string | null;
  final_place_in_standings: number;
  registration_status: string;
  deck_id: string | null;
}

interface RawDeckCard {
  quantity: number;
  card: {
    name: string;
    type: string;
  };
}

interface RawDeckSection {
  name: string;
  section_type: string;
  cards: RawDeckCard[];
}

interface RawDecklist {
  id: string;
  name: string;
  sections: RawDeckSection[];
  error?: string;
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

export interface T64Player {
  place: number;
  username: string;
  legend_name: string;
  deck_id: string;
  has_decklist: boolean;
}

export interface TournamentData {
  event_id: number;
  event_name: string;
  date: string;
  total_players: number;
  legends: LegendStats[];
  t64_players: T64Player[];
}

export interface EventMeta {
  id: number;
  name: string;
  date: string;
  total_players: number;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

async function fetchDecklist(deckId: string): Promise<RawDecklist | null> {
  try {
    const res = await fetch(`${API_BASE}/decklist?deck_id=${deckId}`, {
      headers: { "User-Agent": UA },
    });
    if (!res.ok) return null;
    const data: RawDecklist = await res.json();
    if (data.error) return null;
    return data;
  } catch {
    return null;
  }
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

  // Collect T64 players sorted by place
  const t64Raw = players
    .filter((p) => p.final_place_in_standings <= 64 && p.deck_id)
    .sort((a, b) => a.final_place_in_standings - b.final_place_in_standings);

  console.log(`  Fetching decklists for ${t64Raw.length} T64 players…`);
  const t64_players: T64Player[] = [];
  const date = event.start_datetime.slice(0, 10);

  for (const p of t64Raw) {
    const deck = await fetchDecklist(p.deck_id as string);
    const has_decklist = deck !== null;

    if (has_decklist && deck) {
      const sections = deck.sections
        .filter((s) => s.cards.length > 0)
        .map((s) => ({
          name: s.name,
          section_type: s.section_type,
          cards: s.cards.map((c) => ({
            name: c.card.name,
            quantity: c.quantity,
            type: c.card.type,
          })),
        }));

      const decklistData = {
        deck_id: p.deck_id,
        deck_name: deck.name,
        event_id: event.id,
        event_name: event.name,
        date,
        place: p.final_place_in_standings,
        username: p.username,
        legend_name: p.legend_name as string,
        sections,
      };
      writeFileSync(
        join(DECKLIST_DIR, `${p.deck_id}.json`),
        JSON.stringify(decklistData, null, 2)
      );
    }

    t64_players.push({
      place: p.final_place_in_standings,
      username: p.username,
      legend_name: p.legend_name as string,
      deck_id: p.deck_id as string,
      has_decklist,
    });

    // Light rate limiting
    await new Promise((r) => setTimeout(r, 120));
  }

  const withDecks = t64_players.filter((p) => p.has_decklist).length;
  console.log(`  Decklists: ${withDecks}/${t64_players.length} available`);

  return {
    event_id: event.id,
    event_name: event.name,
    date,
    total_players: totalPlayers,
    legends,
    t64_players,
  };
}

async function main() {
  mkdirSync(DATA_DIR, { recursive: true });
  mkdirSync(DECKLIST_DIR, { recursive: true });

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
      console.log(`  Wrote ${outPath}`);
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
