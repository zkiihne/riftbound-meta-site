"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { LegendStats, TournamentData, DecklistData } from "@/lib/types";

type SortKey = "conv_pct" | "winrate" | "field" | "t64" | "excess" | "best_place";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "conv_pct", label: "Conv%" },
  { key: "winrate", label: "WR%" },
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

function shortEvent(name: string) {
  return name.replace(/Riftbound Regional Qualifier[:\s-]*/i, "").trim();
}

interface DeckEntry {
  deck_id: string | null;
  place: number;
  username: string;
  legend_name: string;
  event_name: string;
}

interface Props {
  legends: LegendStats[];
  selectedTournaments: TournamentData[];
}

export default function ChampionGrid({ legends, selectedTournaments }: Props) {
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

  const decksByLegend = useMemo(() => {
    const map = new Map<string, DeckEntry[]>();
    for (const t of selectedTournaments) {
      for (const p of t.t64_players) {
        const list = map.get(p.legend_name) ?? [];
        list.push({
          deck_id: p.deck_id,
          place: p.place,
          username: p.username,
          legend_name: p.legend_name,
          event_name: t.event_name,
        });
        map.set(p.legend_name, list);
      }
    }
    for (const [, entries] of map) {
      entries.sort((a, b) => a.place - b.place);
    }
    return map;
  }, [selectedTournaments]);

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
                <span aria-hidden="true" className="ml-1 text-emerald-400">
                  {sortDir === "asc" ? "↑" : "↓"}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {sorted.length === 0 ? (
        <p className="text-zinc-500 text-sm py-12 text-center">
          No legends match your filters.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((l) => (
            <ChampionCard
              key={l.name}
              legend={l}
              decks={decksByLegend.get(l.name) ?? []}
              sortKey={sortKey}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ChampionCard({
  legend: l,
  decks,
  sortKey,
}: {
  legend: LegendStats;
  decks: DeckEntry[];
  sortKey: SortKey;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasDecklists = decks.length > 0;

  return (
    <div
      className={`rounded-lg border bg-zinc-900/60 ${excessBorder(l.excess)}`}
    >
      <div
        role={hasDecklists ? "button" : undefined}
        tabIndex={hasDecklists ? 0 : undefined}
        aria-expanded={hasDecklists ? expanded : undefined}
        onClick={hasDecklists ? () => setExpanded((e) => !e) : undefined}
        onKeyDown={
          hasDecklists
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setExpanded((e) => !e);
                }
              }
            : undefined
        }
        className={`px-4 sm:px-5 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 ${
          hasDecklists
            ? "cursor-pointer hover:bg-zinc-800/30 transition-colors"
            : "opacity-75"
        }`}
      >
        <div className="min-w-0 flex-1 flex items-center gap-2">
          {hasDecklists && (
            <span
              aria-hidden="true"
              className="text-zinc-400 text-xs w-3 shrink-0"
            >
              {expanded ? "▼" : "▶"}
            </span>
          )}
          <div>
            <span className="text-zinc-100 font-semibold text-sm">
              {l.name.split(",")[0]}
            </span>
            <span className="text-zinc-500 text-xs ml-2">
              {l.name.split(",").slice(1).join(",").trim()}
            </span>
          </div>
          {hasDecklists ? (
            <span className="ml-auto text-zinc-200 text-sm font-semibold tabular-nums shrink-0">
              {decks.length}
            </span>
          ) : (
            <span className="ml-auto text-zinc-700 text-xs shrink-0">no lists</span>
          )}
        </div>
        <div className="flex items-center justify-between gap-y-1.5 text-xs tabular-nums w-full sm:w-96">
          <div className="text-center">
            <div className={`mb-0.5 ${sortKey === "conv_pct" ? "text-emerald-500" : "text-zinc-500"}`}>Conv%</div>
            <div className={`font-semibold ${sortKey === "conv_pct" ? "text-emerald-400" : "text-zinc-100"}`}>
              {l.conv_pct.toFixed(1)}%
            </div>
          </div>
          <div className="text-center">
            <div className={`mb-0.5 ${sortKey === "winrate" ? "text-emerald-500" : "text-zinc-500"}`}>WR%</div>
            <div className={`font-semibold ${sortKey === "winrate" ? "text-emerald-400" : "text-zinc-100"}`}>
              {l.winrate.toFixed(1)}%
            </div>
            <div className="text-[10px] text-zinc-600 mt-0.5">{l.wins + l.losses} matches</div>
          </div>
          <div className="text-center">
            <div className={`mb-0.5 ${sortKey === "t64" ? "text-emerald-500" : "text-zinc-500"}`}>Top 64</div>
            <div className={`font-semibold ${sortKey === "t64" ? "text-emerald-400" : "text-zinc-100"}`}>{l.t64}</div>
          </div>
          <div className="text-center">
            <div className={`mb-0.5 ${sortKey === "field" ? "text-emerald-500" : "text-zinc-500"}`}>Field</div>
            <div className={`${sortKey === "field" ? "text-emerald-400 font-semibold" : "text-zinc-300"}`}>{l.field}</div>
          </div>
          <div className="text-center">
            <div className={`mb-0.5 ${sortKey === "best_place" ? "text-emerald-500" : "text-zinc-500"}`}>Best</div>
            <div className={`${sortKey === "best_place" ? "text-emerald-400 font-semibold" : "text-zinc-300"}`}>{ordinal(l.best_place)}</div>
          </div>
          <div className="text-center">
            <div className={`mb-0.5 ${sortKey === "excess" ? "text-emerald-500" : "text-zinc-500"}`}>Excess</div>
            <div className={`font-semibold ${sortKey === "excess" ? excessColor(l.excess) : "text-zinc-300"}`}>
              {l.excess > 0 ? "+" : ""}
              {l.excess.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-zinc-800/60 divide-y divide-zinc-800/40">
          {decks.map((d, i) => (
            <DeckRow key={d.deck_id ?? `${d.event_name}-${i}`} entry={d} />
          ))}
        </div>
      )}
    </div>
  );
}

function DeckRow({ entry }: { entry: DeckEntry }) {
  const [open, setOpen] = useState(false);
  const [deck, setDeck] = useState<DecklistData | null>(null);
  const [loading, setLoading] = useState(false);
  const hasList = !!entry.deck_id;

  async function toggle() {
    if (!hasList) return;
    if (!open && !deck) {
      setLoading(true);
      const res = await fetch(`/api/deck/${entry.deck_id}`);
      const data: DecklistData = await res.json();
      setDeck(data);
      setLoading(false);
    }
    setOpen((o) => !o);
  }

  return (
    <div>
      <div className="w-full px-5 py-2.5 flex items-center gap-3 text-xs hover:bg-zinc-800/40 transition-colors">
        <button
          onClick={toggle}
          disabled={!hasList}
          className={`flex items-center gap-3 flex-1 text-left min-w-0 ${!hasList ? "cursor-default" : ""}`}
        >
          <span aria-hidden="true" className={`w-3 shrink-0 ${hasList ? "text-zinc-400" : "text-zinc-700"}`}>
            {hasList ? (open ? "▼" : "▶") : "–"}
          </span>
          <span className="text-emerald-400 tabular-nums w-10 shrink-0">
            {ordinal(entry.place)}
          </span>
          <span className="text-zinc-300 font-medium shrink-0">
            {entry.username}
          </span>
          <span className="text-zinc-600 ml-auto shrink-0">
            {shortEvent(entry.event_name)}
          </span>
          {loading && (
            <span aria-live="polite" className="text-zinc-500 animate-pulse">
              Loading…
            </span>
          )}
        </button>
        {hasList && (
          <Link
            href={`/deck/${entry.deck_id}`}
            onClick={(e) => e.stopPropagation()}
            aria-label={`View full decklist for ${entry.username}`}
            className="p-2 -mr-2 text-zinc-500 hover:text-emerald-400 transition-colors shrink-0"
          >
            <span aria-hidden="true">↗</span>
          </Link>
        )}
      </div>

      {open && deck && (
        <div className="px-5 pb-4 pt-1">
          <DeckCards deck={deck} />
        </div>
      )}
    </div>
  );
}

function DeckCards({ deck }: { deck: DecklistData; }) {
  const legendCard: DecklistData["sections"][0]["cards"][0] = {
    name: deck.legend_name,
    quantity: 1,
    type: "Legend",
  };
  const typeOrder = ["Legend", "Unit", "Spell", "Rune", "Other"];

  const mainSection = deck.sections.find((s) => s.section_type === "main");
  const sideSection = deck.sections.find((s) => s.section_type === "sideboard");

  function renderSection(
    cards: DecklistData["sections"][0]["cards"],
    label: string
  ) {
    const grouped = cards.reduce<Record<string, typeof cards>>((acc, c) => {
      const t = c.type || "Other";
      (acc[t] ??= []).push(c);
      return acc;
    }, {});

    const sorted = Object.entries(grouped).sort(
      ([a], [b]) =>
        (typeOrder.indexOf(a) === -1 ? 99 : typeOrder.indexOf(a)) -
        (typeOrder.indexOf(b) === -1 ? 99 : typeOrder.indexOf(b))
    );

    const total = cards.reduce((s, c) => s + c.quantity, 0);

    return (
      <div className="mb-3">
        <div className="text-zinc-500 text-xs mb-2">
          {label} · {total}
        </div>
        <div className="space-y-2">
          {sorted.map(([type, cards]) => (
            <div key={type}>
              <div className="text-zinc-500 text-xs mb-1">{type}</div>
              {cards.map((c) => (
                <div
                  key={c.name}
                  className="flex gap-3 text-xs py-0.5 px-2 rounded hover:bg-zinc-800/30"
                >
                  <span className="text-zinc-600 tabular-nums w-4 text-right shrink-0">
                    {c.quantity}
                  </span>
                  <span className="text-zinc-200">{c.name}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="border-l border-zinc-800/50 pl-3 mt-1">
      {mainSection &&
        renderSection([legendCard, ...mainSection.cards], "Main Deck")}
      {sideSection &&
        sideSection.cards.length > 0 &&
        renderSection(sideSection.cards, "Sideboard")}
    </div>
  );
}
