import type { TournamentData, MatchupCell, MatchupMatrix } from "@/lib/types";

export type DayMode = "all" | "d1" | "d2";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Sum the per-event head-to-head matrices for the selected tournaments. */
export function aggregateMatchups(tournaments: TournamentData[]): MatchupMatrix {
  const out: MatchupMatrix = {};
  for (const t of tournaments) {
    const m = t.matchups;
    if (!m) continue;
    for (const a of Object.keys(m)) {
      const row = (out[a] ??= {});
      for (const b of Object.keys(m[a])) {
        const src = m[a][b];
        const dst = (row[b] ??= {
          d1_wins: 0,
          d1_losses: 0,
          d2_wins: 0,
          d2_losses: 0,
        });
        dst.d1_wins += src.d1_wins;
        dst.d1_losses += src.d1_losses;
        dst.d2_wins += src.d2_wins;
        dst.d2_losses += src.d2_losses;
      }
    }
  }
  return out;
}

/** Wins/losses for a cell under the chosen day mode. */
export function cellRecord(
  cell: MatchupCell | undefined,
  mode: DayMode
): { wins: number; losses: number } {
  if (!cell) return { wins: 0, losses: 0 };
  if (mode === "d1") return { wins: cell.d1_wins, losses: cell.d1_losses };
  if (mode === "d2") return { wins: cell.d2_wins, losses: cell.d2_losses };
  return {
    wins: cell.d1_wins + cell.d2_wins,
    losses: cell.d1_losses + cell.d2_losses,
  };
}

/** Winrate % for a cell under the chosen day mode, or null when no games. */
export function cellWinrate(
  cell: MatchupCell | undefined,
  mode: DayMode
): number | null {
  const { wins, losses } = cellRecord(cell, mode);
  const total = wins + losses;
  if (total === 0) return null;
  return round2((wins / total) * 100);
}
