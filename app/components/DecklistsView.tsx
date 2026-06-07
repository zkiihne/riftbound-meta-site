"use client";

import Link from "next/link";
import type { TournamentData } from "@/lib/types";

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

function shortEvent(name: string) {
  return name.replace(/Riftbound Regional Qualifier[:\s-]*/i, "").trim();
}

interface Props {
  tournaments: TournamentData[];
  selectedIds: Set<number>;
  nameFilter: string;
}

export default function DecklistsView({ tournaments, selectedIds, nameFilter }: Props) {
  const selected = tournaments.filter((t) => selectedIds.has(t.event_id));

  const entries = selected.flatMap((t) =>
    t.t64_players
      .filter((p) => p.has_decklist)
      .filter((p) =>
        nameFilter
          ? p.legend_name.toLowerCase().includes(nameFilter.toLowerCase()) ||
            p.username.toLowerCase().includes(nameFilter.toLowerCase())
          : true
      )
      .map((p) => ({ ...p, event_name: t.event_name, event_id: t.event_id, date: t.date }))
  );

  entries.sort((a, b) => {
    if (a.event_id !== b.event_id) {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    return a.place - b.place;
  });

  if (entries.length === 0) {
    return (
      <div className="text-zinc-500 text-sm py-12 text-center">
        No decklists available for the selected events.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-zinc-900 border-b border-zinc-800">
            <th className="px-4 py-3 text-left text-zinc-400 font-medium w-16">Place</th>
            <th className="px-4 py-3 text-left text-zinc-400 font-medium">Player</th>
            <th className="px-4 py-3 text-left text-zinc-400 font-medium">Legend</th>
            <th className="px-4 py-3 text-left text-zinc-400 font-medium">Event</th>
            <th className="px-4 py-3 text-right text-zinc-400 font-medium w-20"></th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr
              key={e.deck_id}
              className={`border-b border-zinc-800/50 hover:bg-zinc-800/40 transition-colors ${
                i % 2 === 0 ? "bg-zinc-900/30" : ""
              }`}
            >
              <td className="px-4 py-3 text-zinc-400 tabular-nums">
                {ordinal(e.place)}
              </td>
              <td className="px-4 py-3 text-zinc-100 font-medium">{e.username}</td>
              <td className="px-4 py-3 text-zinc-300">{e.legend_name}</td>
              <td className="px-4 py-3 text-zinc-500 text-xs">{shortEvent(e.event_name)}</td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/deck/${e.deck_id}`}
                  className="text-emerald-400 hover:text-emerald-300 text-xs font-medium transition-colors"
                >
                  View →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
