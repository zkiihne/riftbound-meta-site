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
