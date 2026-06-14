import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { notFound } from "next/navigation";
import type { DecklistData } from "@/lib/types";
import Link from "next/link";

const DECKLIST_DIR = join(process.cwd(), "data", "decklists");

export function generateStaticParams() {
  return readdirSync(DECKLIST_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({ id: f.replace(".json", "") }));
}

function loadDeck(id: string): DecklistData | null {
  try {
    return JSON.parse(readFileSync(join(DECKLIST_DIR, `${id}.json`), "utf-8"));
  } catch {
    return null;
  }
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

function shortEvent(name: string) {
  return name.replace(/Riftbound Regional Qualifier[:\s-]*/i, "").trim();
}

export default async function DeckPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const deck = loadDeck(id);
  if (!deck) notFound();

  const mainSection = deck.sections.find((s) => s.section_type === "main");
  const otherSections = deck.sections.filter((s) => s.section_type !== "main");

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Back */}
        <Link
          href="/"
          className="text-zinc-500 text-sm hover:text-zinc-300 transition-colors mb-8 inline-block"
        >
          ← Back to meta
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-baseline gap-3 mb-1">
            <span className="text-emerald-400 font-bold text-lg">
              {ordinal(deck.place)}
            </span>
            <h1 className="text-xl font-bold text-zinc-100">{deck.username}</h1>
          </div>
          <div className="text-zinc-400 text-sm mb-1">{deck.legend_name}</div>
          <div className="text-zinc-500 text-xs">
            {shortEvent(deck.event_name)} · {deck.date}
          </div>
          {deck.deck_name && deck.deck_name !== "New Deck" && (
            <div className="text-zinc-400 text-xs mt-1 italic">
              &ldquo;{deck.deck_name}&rdquo;
            </div>
          )}
        </div>

        {/* Main deck */}
        {mainSection && (
          <div className="mb-6">
            <div className="text-zinc-400 text-xs font-medium uppercase tracking-wider mb-3">
              Main Deck ({mainSection.cards.reduce((s, c) => s + c.quantity, 0)} cards)
            </div>
            <CardList
              cards={[
                { name: deck.legend_name, quantity: 1, type: "Legend" },
                ...mainSection.cards,
              ]}
            />
          </div>
        )}

        {/* Other sections */}
        {otherSections.map((section) =>
          section.cards.length > 0 ? (
            <div key={section.section_type} className="mb-6">
              <div className="text-zinc-400 text-xs font-medium uppercase tracking-wider mb-3">
                {section.name} ({section.cards.reduce((s, c) => s + c.quantity, 0)} cards)
              </div>
              <CardList cards={section.cards} />
            </div>
          ) : null
        )}
      </div>
    </main>
  );
}

function CardList({
  cards,
}: {
  cards: { name: string; quantity: number; type: string }[];
}) {
  const grouped = cards.reduce<Record<string, typeof cards>>(
    (acc, card) => {
      const type = card.type || "Other";
      if (!acc[type]) acc[type] = [];
      acc[type].push(card);
      return acc;
    },
    {}
  );

  const typeOrder = ["Legend", "Unit", "Spell", "Rune", "Other"];
  const sorted = Object.entries(grouped).sort(
    ([a], [b]) =>
      (typeOrder.indexOf(a) === -1 ? 99 : typeOrder.indexOf(a)) -
      (typeOrder.indexOf(b) === -1 ? 99 : typeOrder.indexOf(b))
  );

  return (
    <div className="space-y-4">
      {sorted.map(([type, cards]) => (
        <div key={type}>
          <div className="text-zinc-500 text-xs mb-1.5">{type}</div>
          <div className="space-y-0.5">
            {cards.map((card) => (
              <div
                key={card.name}
                className="flex items-center gap-3 text-sm py-1 px-3 rounded hover:bg-zinc-800/50"
              >
                <span className="text-zinc-500 tabular-nums w-4 text-right">
                  {card.quantity}
                </span>
                <span className="text-zinc-100">{card.name}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
