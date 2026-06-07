"use client";

import { useState, useMemo } from "react";
import type { TournamentData } from "@/lib/types";
import { aggregateLegends } from "@/lib/aggregate";
import EventFilter from "@/app/components/EventFilter";
import StandingsTable from "@/app/components/StandingsTable";
import ChampionGrid from "@/app/components/ChampionGrid";

type Tab = "top64" | "champions";

const TABS: { key: Tab; label: string }[] = [
  { key: "top64", label: "Top 64%" },
  { key: "champions", label: "By Champion" },
];

interface Props {
  tournaments: TournamentData[];
}

export default function MetaView({ tournaments }: Props) {
  const [tab, setTab] = useState<Tab>("top64");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    () => new Set(tournaments.map((t) => t.event_id))
  );
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
      {/* Tab nav */}
      <div className="flex items-center gap-1 mb-6 border-b border-zinc-800">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === key
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
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
          className="bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-500 rounded px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 w-48"
        />
      </div>

      {/* Summary line */}
      <div className="text-zinc-500 text-sm mb-6">
        {numEvents === 1
          ? selected[0].event_name
          : `${numEvents} events`}{" "}
        · {totalPlayers.toLocaleString()} players · {legends.length} legends
      </div>

      {/* Content */}
      {tab === "top64" && <StandingsTable legends={legends} />}
      {tab === "champions" && (
        <ChampionGrid legends={legends} selectedTournaments={selected} />
      )}
    </div>
  );
}
