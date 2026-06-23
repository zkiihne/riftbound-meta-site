export interface LegendStats {
  name: string;
  field: number;
  t64: number;
  conv_pct: number;
  expected: number;
  excess: number;
  best_place: number;
  wins: number;
  losses: number;
  winrate: number;
  // Match-derived winrates (UVS per-match data). Byes excluded entirely;
  // draws excluded from the denominator. Populated by fetch-matches.ts.
  wr_wins: number; // overall real-match wins (no byes)
  wr_losses: number; // overall real-match losses
  wr: number; // overall match winrate % = wr_wins / (wr_wins + wr_losses)
  d1_wins: number; // Day 1 (first Swiss phase)
  d1_losses: number;
  d1_wr: number;
  d2_wins: number; // Day 2 (all later phases: day-2 Swiss + top cut)
  d2_losses: number;
  d2_wr: number;
  nm_wins: number; // non-mirror (opponent on a different legend)
  nm_losses: number;
  nm_wr: number;
}

export interface T64Player {
  place: number;
  username: string;
  legend_name: string;
  deck_id: string | null;
  has_decklist: boolean;
}

// Head-to-head record (byes excluded, draws excluded). matchups[A][B] is A's
// record vs B; stored in both directions. matchups[A][A] is the mirror.
export interface MatchupCell {
  d1_wins: number;
  d1_losses: number;
  d2_wins: number;
  d2_losses: number;
}

export type MatchupMatrix = Record<string, Record<string, MatchupCell>>;

export interface TournamentData {
  event_id: number;
  event_name: string;
  date: string;
  total_players: number;
  legends: LegendStats[];
  t64_players: T64Player[];
  matchups?: MatchupMatrix;
}

export interface EventMeta {
  id: number;
  name: string;
  date: string;
  total_players: number;
}

export interface DeckCard {
  name: string;
  quantity: number;
  type: string;
}

export interface DeckSection {
  name: string;
  section_type: string;
  cards: DeckCard[];
}

export interface DecklistData {
  deck_id: string;
  deck_name: string;
  event_id: number;
  event_name: string;
  date: string;
  place: number;
  username: string;
  legend_name: string;
  sections: DeckSection[];
}
