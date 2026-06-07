"use client";

import { useState, useMemo } from "react";
import type { LegendStats } from "@/lib/types";

type SortKey = "conv_pct" | "field" | "t64" | "excess" | "best_place";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "conv_pct", label: "Conv%" },
  { key: "excess", label: "Excess" },
  { key: "t64", label: "Top 64" },
  { key: "field", label: "Field" },
  { key: "best_place", label: "Best Place" },
];

function excessColor(excess: number) {
  if (excess > 0.5) return "text-emerald-400";
  if (excess < -0.5) return "text-red-400";
  return "text-zinc-400";
}

function excessBorder(excess: number) {
  if (excess > 0.5) return "border-emerald-800/60";
  if (excess < -0.5) return "border-red-900/60";
  return "border-zinc-800";
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

export default function ChampionGrid({ legends }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("conv_pct");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    return [...legends].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (sortKey === "best_place") {
        const aVal = av === 0 ? Infinity : (av as number);
        const bVal = bv === 0 ? Infinity : (bv as number);
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortDir === "asc"
        ? (av as number) - (bv as number)
        : (bv as number) - (av as number);
    });
  }, [legends, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "best_place" ? "asc" : "desc");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className="text-zinc-500 text-xs mr-1">Sort by</span>
        {SORT_OPTIONS.map(({ key, label }) => {
          const active = key === sortKey;
          return (
            <button
              key={key}
              onClick={() => handleSort(key)}
              className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
                active
                  ? "bg-zinc-700 border-zinc-600 text-zinc-100"
                  : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
              }`}
            >
              {label}
              {active && (
                <span className="ml-1 text-emerald-400">
                  {sortDir === "asc" ? "↑" : "↓"}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        {sorted.map((l) => (
          <div
            key={l.name}
            className={`rounded-lg border bg-zinc-900/60 px-5 py-4 flex items-center gap-6 ${excessBorder(l.excess)}`}
          >
            {/* Name */}
            <div className="min-w-0 flex-1">
              <span className="text-zinc-100 font-semibold text-sm">
                {l.name.split(",")[0]}
              </span>
              <span className="text-zinc-500 text-xs ml-2">
                {l.name.split(",").slice(1).join(",").trim()}
              </span>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 shrink-0 text-xs tabular-nums">
              <div className="text-center">
                <div className="text-zinc-500 mb-0.5">Conv%</div>
                <div className="text-zinc-100 font-semibold">{l.conv_pct.toFixed(1)}%</div>
              </div>
              <div className="text-center">
                <div className="text-zinc-500 mb-0.5">Top 64</div>
                <div className="text-zinc-100 font-semibold">{l.t64}</div>
              </div>
              <div className="text-center">
                <div className="text-zinc-500 mb-0.5">Field</div>
                <div className="text-zinc-300">{l.field}</div>
              </div>
              <div className="text-center">
                <div className="text-zinc-500 mb-0.5">Best</div>
                <div className="text-zinc-300">{ordinal(l.best_place)}</div>
              </div>
              <div className="text-center">
                <div className="text-zinc-500 mb-0.5">Excess</div>
                <div className={`font-semibold ${excessColor(l.excess)}`}>
                  {l.excess > 0 ? "+" : ""}{l.excess.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
