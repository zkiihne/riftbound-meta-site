"use client";

import { useState, useMemo } from "react";
import type { TournamentData } from "@/lib/types";
import { aggregateLegends } from "@/lib/aggregate";
import EventFilter from "@/app/components/EventFilter";
import ChampionGrid from "@/app/components/ChampionGrid";

interface Props {
  tournaments: TournamentData[];
}

export default function MetaView({ tournaments }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => {
    const latest = tournaments.reduce((a, b) =>
      new Date(a.date) > new Date(b.date) ? a : b
    );
    return new Set([latest.event_id]);
  });
  const [nameFilter, setNameFilter] = useState("");

  const selected = useMemo(
    () => tournaments.filter((t) => selectedIds.has(t.event_id)),
    [tournaments, selectedIds]
  );

  const legends = useMemo(() => {
    const all = aggregateLegends(selected);
    const q = nameFilter.trim().toLowerCase();
    return q ? all.filter((l) => l.name.toLowerCase().includes(q)) : all;
  }, [selected, nameFilter]);

  const totalPlayers = selected.reduce((s, t) => s + t.total_players, 0);
  const numEvents = selected.length;

  return (
    <div>
      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <EventFilter
          tournaments={tournaments}
          selectedIds={selectedIds}
          onChange={setSelectedIds}
        />
        <input
          type="search"
          placeholder="Filter by legend…"
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-400 rounded px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-48"
        />
      </div>

      {/* Summary line */}
      <div className="text-zinc-600 text-xs mb-6">
        {numEvents === 1
          ? selected[0].event_name
          : `${numEvents} events`}{" "}
        · {totalPlayers.toLocaleString()} players · {legends.length} legends
      </div>

      <ChampionGrid legends={legends} selectedTournaments={selected} />
    </div>
  );
}
