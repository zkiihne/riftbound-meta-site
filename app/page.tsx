import { readFileSync } from "fs";
import { join } from "path";
import type { EventMeta, TournamentData } from "@/lib/types";
import MetaView from "@/app/components/MetaView";
import TrendChart from "@/app/components/TrendChart";
import MatchupSection from "@/app/components/MatchupSection";

function loadTournaments(): TournamentData[] {
  const dataDir = join(process.cwd(), "data", "tournaments");
  const index: EventMeta[] = JSON.parse(
    readFileSync(join(dataDir, "index.json"), "utf-8")
  );
  return index.map((meta) =>
    JSON.parse(readFileSync(join(dataDir, `${meta.id}.json`), "utf-8"))
  );
}

export default function Home() {
  const tournaments = loadTournaments();

  return (
    <main className="relative min-h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-emerald-950/40 to-transparent"
      />
      <div className="relative max-w-6xl mx-auto px-4 py-10">
        <div className="mb-10">
          <div className="flex items-center gap-2.5 mb-2">
            <span
              aria-hidden="true"
              className="text-emerald-500 text-xl leading-none select-none"
            >
              ◆
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-50">
              Riftbound Meta
            </h1>
          </div>
          <p className="text-zinc-500 text-sm">
            Legend stats from regional qualifier standings.{" "}
            <span className="text-zinc-600">
              Excess = Top 64 entries minus expected copies based on field
              representation.
            </span>
          </p>
        </div>
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-zinc-100 mb-1">
            Trends across events
          </h2>
          <p className="text-zinc-500 text-sm mb-4">
            How the most-played legends moved across regional qualifiers,
            chronologically.
          </p>
          <TrendChart tournaments={tournaments} />
        </section>

        <MetaView tournaments={tournaments} />

        <section className="mt-14">
          <h2 className="text-xl font-semibold text-zinc-100 mb-1">
            Matchup matrix
          </h2>
          <p className="text-zinc-500 text-sm mb-4">
            Head-to-head winrates from per-match data. Pick events, a day phase,
            and the legends to compare.
          </p>
          <MatchupSection tournaments={tournaments} />
        </section>
      </div>
    </main>
  );
}
