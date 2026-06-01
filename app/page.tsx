import { readFileSync } from "fs";
import { join } from "path";
import StandingsTable from "@/app/components/StandingsTable";
import type { EventMeta, TournamentData } from "@/lib/types";

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
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-100 mb-1">
            Riftbound Meta
          </h1>
          <p className="text-zinc-500 text-sm">
            Per-legend conversion rates from regional qualifier standings.
            Excess = T64 − expected copies based on field share.
          </p>
        </div>
        <StandingsTable tournaments={tournaments} />
      </div>
    </main>
  );
}
