"use client";

import { useState, useMemo } from "react";
import type { LegendStats } from "@/lib/types";

type SortKey = keyof Omit<LegendStats, "name">;
type SortDir = "asc" | "desc";

const COLUMNS: { key: SortKey | "name"; label: string; align: "left" | "right" }[] = [
  { key: "name", label: "Legend", align: "left" },
  { key: "field", label: "Field", align: "right" },
  { key: "t64", label: "T64", align: "right" },
  { key: "conv_pct", label: "Conv%", align: "right" },
  { key: "expected", label: "Expected", align: "right" },
  { key: "excess", label: "Excess", align: "right" },
  { key: "best_place", label: "Best", align: "right" },
];

function excessColor(excess: number) {
  if (excess > 0.5) return "text-emerald-400";
  if (excess < -0.5) return "text-red-400";
  return "text-zinc-400";
}

function ordinal(n: number) {
  if (n === 0) return "—";
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

interface Props {
  legends: LegendStats[];
}

export default function StandingsTable({ legends }: Props) {
  const [sortKey, setSortKey] = useState<SortKey | "name">("excess");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sorted = useMemo(() => {
    return [...legends].sort((a, b) => {
      const av = a[sortKey as keyof LegendStats];
      const bv = b[sortKey as keyof LegendStats];
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      if (sortKey === "best_place") {
        const aVal = (av as number) === 0 ? Infinity : (av as number);
        const bVal = (bv as number) === 0 ? Infinity : (bv as number);
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortDir === "asc"
        ? (av as number) - (bv as number)
        : (bv as number) - (av as number);
    });
  }, [legends, sortKey, sortDir]);

  function handleSort(key: typeof sortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  function SortIndicator({ col }: { col: typeof sortKey }) {
    if (col !== sortKey) return <span className="text-zinc-600 ml-1">↕</span>;
    return (
      <span className="text-emerald-400 ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-800">
      <table className="w-full text-sm" aria-label="Legend standings">
        <thead>
          <tr className="bg-zinc-900 border-b border-zinc-800">
            {COLUMNS.map(({ key, label, align }) => (
              <th
                key={key}
                onClick={() => handleSort(key)}
                aria-sort={
                  key === sortKey
                    ? sortDir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
                className={`px-4 py-3 ${align === "right" ? "text-right" : "text-left"} text-zinc-400 font-medium cursor-pointer select-none hover:text-zinc-200 whitespace-nowrap`}
              >
                {label}
                <SortIndicator col={key} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td
                colSpan={COLUMNS.length}
                className="px-4 py-8 text-center text-zinc-500"
              >
                No legends found.
              </td>
            </tr>
          ) : (
            sorted.map((legend, i) => (
              <tr
                key={legend.name}
                className={`border-b border-zinc-800/50 hover:bg-zinc-800/40 motion-safe:transition-colors ${
                  i % 2 === 0 ? "bg-zinc-900/30" : ""
                }`}
              >
                <td className="px-4 py-3 text-zinc-100 font-medium">
                  {legend.name}
                </td>
                <td className="px-4 py-3 text-zinc-300 text-right tabular-nums">
                  {legend.field}
                </td>
                <td className="px-4 py-3 text-zinc-300 text-right tabular-nums">
                  {legend.t64}
                </td>
                <td className="px-4 py-3 text-zinc-300 text-right tabular-nums">
                  {legend.conv_pct.toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-zinc-400 text-right tabular-nums">
                  {legend.expected.toFixed(2)}
                </td>
                <td
                  className={`px-4 py-3 font-semibold text-right tabular-nums ${excessColor(legend.excess)}`}
                >
                  {legend.excess > 0 ? "+" : ""}
                  {legend.excess.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-zinc-400 text-right tabular-nums">
                  {ordinal(legend.best_place)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
