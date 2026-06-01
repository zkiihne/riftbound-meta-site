"use client";

import { useState, useMemo } from "react";
import type { TournamentData, LegendStats } from "@/lib/types";

type SortKey = keyof LegendStats;
type SortDir = "asc" | "desc";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Legend" },
  { key: "field", label: "Field" },
  { key: "t64", label: "T64" },
  { key: "conv_pct", label: "Conv%" },
  { key: "expected", label: "Expected" },
  { key: "excess", label: "Excess" },
];

function excessColor(excess: number) {
  if (excess > 0.5) return "text-green-400";
  if (excess < -0.5) return "text-red-400";
  return "text-zinc-400";
}

interface Props {
  tournaments: TournamentData[];
}

export default function StandingsTable({ tournaments }: Props) {
  const [selectedId, setSelectedId] = useState(tournaments[0]?.event_id);
  const [sortKey, setSortKey] = useState<SortKey>("field");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const tournament = tournaments.find((t) => t.event_id === selectedId)!;

  const sorted = useMemo(() => {
    return [...tournament.legends].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc"
          ? av.localeCompare(bv)
          : bv.localeCompare(av);
      }
      return sortDir === "asc"
        ? (av as number) - (bv as number)
        : (bv as number) - (av as number);
    });
  }, [tournament.legends, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  function SortIndicator({ col }: { col: SortKey }) {
    if (col !== sortKey) return <span className="text-zinc-600 ml-1">↕</span>;
    return (
      <span className="text-zinc-300 ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(Number(e.target.value))}
          className="bg-zinc-800 border border-zinc-700 text-zinc-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-500"
        >
          {tournaments.map((t) => (
            <option key={t.event_id} value={t.event_id}>
              {t.event_name} ({t.date})
            </option>
          ))}
        </select>
        <span className="text-zinc-500 text-sm">
          {tournament.total_players.toLocaleString()} players · {tournament.legends.length} legends
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-900 border-b border-zinc-800">
              {COLUMNS.map(({ key, label }) => (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  className="px-4 py-3 text-left text-zinc-400 font-medium cursor-pointer select-none hover:text-zinc-200 whitespace-nowrap"
                >
                  {label}
                  <SortIndicator col={key} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((legend, i) => (
              <tr
                key={legend.name}
                className={`border-b border-zinc-800/50 hover:bg-zinc-800/40 transition-colors ${
                  i % 2 === 0 ? "bg-zinc-900/30" : ""
                }`}
              >
                <td className="px-4 py-3 text-zinc-100 font-medium">{legend.name}</td>
                <td className="px-4 py-3 text-zinc-300">{legend.field}</td>
                <td className="px-4 py-3 text-zinc-300">{legend.t64}</td>
                <td className="px-4 py-3 text-zinc-300">{legend.conv_pct}%</td>
                <td className="px-4 py-3 text-zinc-400">{legend.expected}</td>
                <td className={`px-4 py-3 font-semibold ${excessColor(legend.excess)}`}>
                  {legend.excess > 0 ? "+" : ""}
                  {legend.excess}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
