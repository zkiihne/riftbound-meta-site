"use client";

import type { TournamentData } from "@/lib/types";

interface Props {
  tournaments: TournamentData[];
  selectedIds: Set<number>;
  onChange: (ids: Set<number>) => void;
}

export default function EventFilter({ tournaments, selectedIds, onChange }: Props) {
  function toggle(id: number) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      if (next.size === 1) return; // keep at least one
      next.delete(id);
    } else {
      next.add(id);
    }
    onChange(next);
  }

  function toggleAll() {
    if (selectedIds.size === tournaments.length) {
      onChange(new Set([tournaments[0].event_id]));
    } else {
      onChange(new Set(tournaments.map((t) => t.event_id)));
    }
  }

  const allSelected = selectedIds.size === tournaments.length;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={toggleAll}
        className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
          allSelected
            ? "bg-emerald-600 border-emerald-600 text-white"
            : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500"
        }`}
      >
        All
      </button>
      {tournaments.map((t) => {
        const active = selectedIds.has(t.event_id);
        const shortName = t.event_name.replace(/Riftbound Regional Qualifier[:\s-]*/i, "").trim();
        return (
          <button
            key={t.event_id}
            onClick={() => toggle(t.event_id)}
            className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
              active
                ? "bg-emerald-600/20 border-emerald-500 text-emerald-300"
                : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300"
            }`}
          >
            {shortName}
          </button>
        );
      })}
    </div>
  );
}
