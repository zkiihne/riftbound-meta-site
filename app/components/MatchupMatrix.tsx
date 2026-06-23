"use client";

import type { MatchupMatrix as Matrix } from "@/lib/types";
import { cellRecord, cellWinrate, type DayMode } from "@/lib/matchups";

interface Props {
  matrix: Matrix;
  legends: string[]; // ordered list used for both rows and columns
  dayMode: DayMode;
}

const DAY_LABEL: Record<DayMode, string> = {
  all: "Day 1 + 2",
  d1: "Day 1",
  d2: "Day 2",
};

// Short, stable name for headers: text before the first comma.
function short(name: string) {
  return name.split(",")[0];
}

// Heatmap background centered at 50%. Above = emerald, below = rose, scaled
// by distance from even. Renders over the dark zinc surface.
function heatStyle(wr: number | null): React.CSSProperties {
  if (wr === null) return {};
  const d = (wr - 50) / 50; // -1 .. 1
  const alpha = Math.min(0.6, 0.12 + Math.abs(d) * 0.5);
  const rgb = d >= 0 ? "16, 185, 129" : "244, 63, 94";
  return { backgroundColor: `rgba(${rgb}, ${alpha.toFixed(3)})` };
}

export default function MatchupMatrix({ matrix, legends, dayMode }: Props) {
  if (legends.length === 0) {
    return (
      <p className="text-zinc-500 text-sm py-12 text-center">
        Select at least one legend to compare.
      </p>
    );
  }

  return (
    <div className="overflow-auto rounded-lg border border-zinc-800 bg-zinc-900/40">
      <table className="border-collapse text-xs tabular-nums">
        <thead>
          <tr>
            <th className="sticky left-0 top-0 z-20 bg-zinc-900 px-2 py-2 text-left text-zinc-500 font-medium">
              <span className="text-[10px]">row vs col</span>
            </th>
            {legends.map((col) => (
              <th
                key={col}
                className="sticky top-0 z-10 bg-zinc-900 px-1.5 py-2 text-zinc-400 font-medium whitespace-nowrap"
                title={col}
              >
                {short(col)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {legends.map((row) => (
            <tr key={row}>
              <th
                scope="row"
                className="sticky left-0 z-10 bg-zinc-900 px-2 py-1.5 text-left text-zinc-300 font-medium whitespace-nowrap"
                title={row}
              >
                {short(row)}
              </th>
              {legends.map((col) => {
                const isMirror = row === col;
                const cell = matrix[row]?.[col];
                const wr = cellWinrate(cell, dayMode);
                const { wins, losses } = cellRecord(cell, dayMode);
                const games = wins + losses;

                if (isMirror) {
                  return (
                    <td
                      key={col}
                      className="px-1.5 py-1.5 text-center text-zinc-600 border border-zinc-800/40 bg-zinc-800/20"
                      title={`${short(row)} mirror`}
                    >
                      —
                    </td>
                  );
                }

                return (
                  <td
                    key={col}
                    style={heatStyle(wr)}
                    className="px-1.5 py-1.5 text-center text-zinc-100 border border-zinc-800/40 whitespace-nowrap"
                    title={
                      games > 0
                        ? `${short(row)} vs ${short(col)} — ${wins}–${losses} (${games} games), ${DAY_LABEL[dayMode]}`
                        : `${short(row)} vs ${short(col)} — no games`
                    }
                  >
                    {wr === null ? (
                      <span className="text-zinc-700">·</span>
                    ) : (
                      `${Math.round(wr)}%`
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
