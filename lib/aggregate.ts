import type { TournamentData, LegendStats } from "@/lib/types";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function aggregateLegends(tournaments: TournamentData[]): LegendStats[] {
  if (tournaments.length === 0) return [];

  const totalPlayers = tournaments.reduce((s, t) => s + t.total_players, 0);
  const totalT64Slots = 64 * tournaments.length;

  const field = new Map<string, number>();
  const t64 = new Map<string, number>();
  const best = new Map<string, number>();

  for (const t of tournaments) {
    for (const l of t.legends) {
      field.set(l.name, (field.get(l.name) ?? 0) + l.field);
      t64.set(l.name, (t64.get(l.name) ?? 0) + l.t64);
      const prev = best.get(l.name) ?? Infinity;
      if (l.best_place < prev) best.set(l.name, l.best_place);
    }
  }

  return Array.from(field.entries()).map(([name, f]) => {
    const t = t64.get(name) ?? 0;
    const conv_pct = round2((t / f) * 100);
    const expected = round2((f / totalPlayers) * totalT64Slots);
    const excess = round2(t - expected);
    const best_place = best.get(name) ?? 0;
    return { name, field: f, t64: t, conv_pct, expected, excess, best_place };
  });
}
