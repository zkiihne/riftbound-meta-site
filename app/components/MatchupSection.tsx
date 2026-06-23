"use client";

import { useState, useMemo } from "react";
import type { TournamentData } from "@/lib/types";
import { aggregateLegends } from "@/lib/aggregate";
import { aggregateMatchups, type DayMode } from "@/lib/matchups";
import EventFilter from "@/app/components/EventFilter";
import MatchupMatrix from "@/app/components/MatchupMatrix";

interface Props {
  tournaments: TournamentData[];
}

const DEFAULT_TOP_N = 12;

const DAY_OPTIONS: { key: DayMode; label: string }[] = [
  { key: "all", label: "Day 1 + 2" },
  { key: "d1", label: "Day 1" },
  { key: "d2", label: "Day 2" },
];

function short(name: string) {
  return name.split(",")[0];
}

export default function MatchupSection({ tournaments }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => {
    const latest = tournaments.reduce((a, b) =>
      new Date(a.date) > new Date(b.date) ? a : b
    );
    return new Set([latest.event_id]);
  });
  const [dayMode, setDayMode] = useState<DayMode>("all");
  // null = "follow the default top-N"; a Set = user-curated selection.
  const [picked, setPicked] = useState<Set<string> | null>(null);

  const selected = useMemo(
    () => tournaments.filter((t) => selectedIds.has(t.event_id)),
    [tournaments, selectedIds]
  );

  const legendStats = useMemo(() => aggregateLegends(selected), [selected]);

  // Per-legend lookup for header winrates.
  const statsByName = useMemo(() => {
    const m: Record<string, (typeof legendStats)[number]> = {};
    for (const l of legendStats) m[l.name] = l;
    return m;
  }, [legendStats]);

  // Legends ranked by field (play count) across the selected events.
  const ranked = useMemo(
    () =>
      legendStats
        .slice()
        .sort((a, b) => b.field - a.field)
        .map((l) => l.name),
    [legendStats]
  );

  const matrix = useMemo(() => aggregateMatchups(selected), [selected]);

  const defaultTop = useMemo(
    () => ranked.slice(0, DEFAULT_TOP_N),
    [ranked]
  );

  // Active legends in ranked order. When the user hasn't curated, use top-N.
  const shown = useMemo(() => {
    if (picked === null) return defaultTop;
    return ranked.filter((n) => picked.has(n));
  }, [picked, defaultTop, ranked]);

  function toggleLegend(name: string) {
    const base = picked ?? new Set(defaultTop);
    const next = new Set(base);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setPicked(next);
  }

  const shownSet = useMemo(() => new Set(shown), [shown]);
  const isCustom = picked !== null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <EventFilter
          tournaments={tournaments}
          selectedIds={selectedIds}
          onChange={setSelectedIds}
        />
        <div className="flex items-center gap-1 rounded border border-zinc-700 bg-zinc-800 p-0.5">
          {DAY_OPTIONS.map(({ key, label }) => {
            const active = key === dayMode;
            return (
              <button
                key={key}
                onClick={() => setDayMode(key)}
                aria-pressed={active}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  active
                    ? "bg-emerald-600/30 text-emerald-300"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend multiselect */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <span className="text-zinc-500 text-xs mr-1">Legends</span>
        {ranked.map((name) => {
          const active = shownSet.has(name);
          return (
            <button
              key={name}
              onClick={() => toggleLegend(name)}
              aria-pressed={active}
              className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                active
                  ? "bg-emerald-600/20 border-emerald-500 text-emerald-300"
                  : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300"
              }`}
            >
              {short(name)}
            </button>
          );
        })}
        {isCustom && (
          <button
            onClick={() => setPicked(null)}
            className="px-2 py-1 rounded text-[11px] font-medium text-zinc-500 hover:text-zinc-200 underline underline-offset-2"
          >
            Reset to top {DEFAULT_TOP_N}
          </button>
        )}
      </div>

      <MatchupMatrix
        matrix={matrix}
        legends={shown}
        dayMode={dayMode}
        stats={statsByName}
      />

      <p className="text-zinc-600 text-xs mt-3">
        Each cell is the row legend&apos;s winrate vs the column legend (byes and
        draws excluded). Hover for the win–loss record. Diagonal is the mirror.
      </p>
    </div>
  );
}
