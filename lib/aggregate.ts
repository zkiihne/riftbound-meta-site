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
  const wins = new Map<string, number>();
  const losses = new Map<string, number>();
  // Match-derived buckets (byes excluded, draws excluded). Keyed accumulators.
  const acc = new Map<string, Record<string, number>>();
  const bumpKeys = [
    "wr_wins",
    "wr_losses",
    "d1_wins",
    "d1_losses",
    "d2_wins",
    "d2_losses",
    "nm_wins",
    "nm_losses",
  ] as const;
  const a = (name: string) => {
    let r = acc.get(name);
    if (!r) {
      r = {};
      for (const k of bumpKeys) r[k] = 0;
      acc.set(name, r);
    }
    return r;
  };

  for (const t of tournaments) {
    for (const l of t.legends) {
      field.set(l.name, (field.get(l.name) ?? 0) + l.field);
      t64.set(l.name, (t64.get(l.name) ?? 0) + l.t64);
      wins.set(l.name, (wins.get(l.name) ?? 0) + (l.wins ?? 0));
      losses.set(l.name, (losses.get(l.name) ?? 0) + (l.losses ?? 0));
      const r = a(l.name);
      for (const k of bumpKeys) r[k] += (l as unknown as Record<string, number>)[k] ?? 0;
      const prev = best.get(l.name) ?? Infinity;
      if (l.best_place < prev) best.set(l.name, l.best_place);
    }
  }

  const wr = (w: number, lo: number) =>
    w + lo === 0 ? 0 : round2((w / (w + lo)) * 100);

  return Array.from(field.entries()).map(([name, f]) => {
    const t = t64.get(name) ?? 0;
    const conv_pct = round2((t / f) * 100);
    const expected = round2((f / totalPlayers) * totalT64Slots);
    const excess = round2(t - expected);
    const best_place = best.get(name) ?? 0;
    const w = wins.get(name) ?? 0;
    const lo = losses.get(name) ?? 0;
    const winrate = w + lo === 0 ? 0 : round2((w / (w + lo)) * 100);
    const r = a(name);
    return {
      name,
      field: f,
      t64: t,
      conv_pct,
      expected,
      excess,
      best_place,
      wins: w,
      losses: lo,
      winrate,
      wr_wins: r.wr_wins,
      wr_losses: r.wr_losses,
      wr: wr(r.wr_wins, r.wr_losses),
      d1_wins: r.d1_wins,
      d1_losses: r.d1_losses,
      d1_wr: wr(r.d1_wins, r.d1_losses),
      d2_wins: r.d2_wins,
      d2_losses: r.d2_losses,
      d2_wr: wr(r.d2_wins, r.d2_losses),
      nm_wins: r.nm_wins,
      nm_losses: r.nm_losses,
      nm_wr: wr(r.nm_wins, r.nm_losses),
    };
  });
}
