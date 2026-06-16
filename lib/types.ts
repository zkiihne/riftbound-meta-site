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
}

export interface T64Player {
  place: number;
  username: string;
  legend_name: string;
  deck_id: string | null;
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
