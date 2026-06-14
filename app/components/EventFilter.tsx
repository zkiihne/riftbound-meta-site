"use client";

import type { TournamentData } from "@/lib/types";

interface Props {
  tournaments: TournamentData[];
  selectedIds: Set<number>;
  onChange: (ids: Set<number>) => void;
}

const activeStyle =
  "bg-emerald-600/20 border-emerald-500 text-emerald-300";
const inactiveStyle =
  "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200";

export default function EventFilter({
  tournaments,
  selectedIds,
  onChange,
}: Props) {
  function toggle(id: number) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      if (next.size === 1) return;
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
    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
      <button
        onClick={toggleAll}
        aria-pressed={allSelected}
        className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
          allSelected ? activeStyle : inactiveStyle
        }`}
      >
        All
      </button>
      {tournaments.map((t) => {
        const active = selectedIds.has(t.event_id);
        const shortName = t.event_name
          .replace(/Riftbound Regional Qualifier[:\s-]*/i, "")
          .trim();
        return (
          <button
            key={t.event_id}
            onClick={() => toggle(t.event_id)}
            aria-pressed={active}
            className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
              active ? activeStyle : inactiveStyle
            }`}
          >
            {shortName}
          </button>
        );
      })}
    </div>
  );
}
