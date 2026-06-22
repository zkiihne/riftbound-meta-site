"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { TournamentData } from "@/lib/types";

type MetricKey = "wr" | "d1_wr" | "d2_wr" | "nm_wr" | "share";

const METRICS: { key: MetricKey; label: string }[] = [
  { key: "wr", label: "Overall WR%" },
  { key: "d1_wr", label: "Day 1 WR%" },
  { key: "d2_wr", label: "Day 2 WR%" },
  { key: "nm_wr", label: "Non-mirror WR%" },
  { key: "share", label: "Meta share %" },
];

// How many top legends (by total matches played) to plot.
const COHORT_SIZE = 10;

// Distinct, dark-theme-friendly palette — fixed per legend so colors stay put.
const COLORS = [
  "#34d399", // emerald
  "#60a5fa", // blue
  "#f472b6", // pink
  "#fbbf24", // amber
  "#a78bfa", // violet
  "#22d3ee", // cyan
  "#fb923c", // orange
  "#4ade80", // green
  "#f87171", // red
  "#c084fc", // purple
];

// City abbreviations for narrow-screen x labels.
const ABBR: Record<string, string> = {
  Utrecht: "UTR",
  Lille: "LIL",
  Vancouver: "VAN",
  Atlanta: "ATL",
  "Las Vegas": "LV",
  Bologna: "BOL",
  Sydney: "SYD",
  Hartford: "HAR",
};

function shortEvent(name: string) {
  return name.replace(/Riftbound Regional Qualifier[:\s-]*/i, "").trim();
}

function legendShort(name: string) {
  return name.split(",")[0];
}

interface Props {
  tournaments: TournamentData[];
}

export default function TrendChart({ tournaments }: Props) {
  const [metric, setMetric] = useState<MetricKey>("wr");
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  // Events ordered chronologically (oldest → newest) by RQ date.
  const events = useMemo(
    () =>
      [...tournaments].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      ),
    [tournaments]
  );

  // Cohort: top N legends by total real matches played, aggregated across all
  // events. Fixed across metric switches so the same colored lines stay put.
  const cohort = useMemo(() => {
    const totals = new Map<string, number>();
    for (const t of tournaments) {
      for (const l of t.legends) {
        totals.set(
          l.name,
          (totals.get(l.name) ?? 0) + l.wr_wins + l.wr_losses
        );
      }
    }
    return [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, COHORT_SIZE)
      .map(([name]) => name);
  }, [tournaments]);

  const colorFor = useMemo(() => {
    const m = new Map<string, string>();
    cohort.forEach((name, i) => m.set(name, COLORS[i % COLORS.length]));
    return m;
  }, [cohort]);

  // One row per event; one key per cohort legend. null when the legend wasn't
  // present (or has no matches for the selected bucket) so the line BREAKS.
  const data = useMemo(() => {
    return events.map((t) => {
      const city = shortEvent(t.event_name);
      const row: Record<string, string | number | null> = {
        event: city,
        abbr: ABBR[city] ?? city.slice(0, 3).toUpperCase(),
      };
      const byName = new Map(t.legends.map((l) => [l.name, l]));
      for (const name of cohort) {
        const l = byName.get(name);
        if (!l) {
          row[name] = null;
          continue;
        }
        if (metric === "share") {
          row[name] = t.total_players
            ? +((l.field / t.total_players) * 100).toFixed(1)
            : null;
        } else {
          // WR buckets: break the line when the denominator is 0.
          const wins = l[`${metric.replace("_wr", "")}_wins` as keyof typeof l] as number | undefined;
          const losses = l[`${metric.replace("_wr", "")}_losses` as keyof typeof l] as number | undefined;
          const n =
            metric === "wr"
              ? l.wr_wins + l.wr_losses
              : (wins ?? 0) + (losses ?? 0);
          row[name] = n > 0 ? (l[metric] as number) : null;
        }
      }
      return row;
    });
  }, [events, cohort, metric]);

  const isShare = metric === "share";
  const yDomain: [number | string, number | string] = isShare
    ? [0, "auto"]
    : [40, 65];

  function toggle(name: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-zinc-500 text-xs mr-1">Metric</span>
        {METRICS.map(({ key, label }) => {
          const active = key === metric;
          return (
            <button
              key={key}
              onClick={() => setMetric(key)}
              className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
                active
                  ? "bg-zinc-700 border-zinc-600 text-zinc-100"
                  : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 sm:p-4">
        <ResponsiveContainer width="100%" height={340}>
          <LineChart
            data={data}
            margin={{ top: 8, right: 12, bottom: 4, left: -16 }}
          >
            <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
            <XAxis
              dataKey="abbr"
              stroke="#71717a"
              tick={{ fontSize: 11, fill: "#a1a1aa" }}
              tickLine={false}
              axisLine={{ stroke: "#3f3f46" }}
            />
            <YAxis
              domain={yDomain}
              stroke="#71717a"
              tick={{ fontSize: 11, fill: "#a1a1aa" }}
              tickLine={false}
              axisLine={{ stroke: "#3f3f46" }}
              width={44}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                background: "#18181b",
                border: "1px solid #3f3f46",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "#e4e4e7", marginBottom: 4 }}
              labelFormatter={(_label, payload) =>
                (payload?.[0]?.payload?.event as string) ?? _label
              }
              formatter={(value, name) => [
                isShare ? `${value}%` : `${value}%`,
                legendShort(name as string),
              ]}
            />
            {cohort.map((name) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={colorFor.get(name)}
                strokeWidth={2}
                dot={{ r: 2.5, strokeWidth: 0, fill: colorFor.get(name) }}
                activeDot={{ r: 4 }}
                connectNulls={false}
                hide={hidden.has(name)}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>

        {/* Tappable legend — toggle/isolate lines. Wraps and scrolls. */}
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 max-h-24 overflow-y-auto">
          {cohort.map((name) => {
            const off = hidden.has(name);
            return (
              <button
                key={name}
                onClick={() => toggle(name)}
                className={`flex items-center gap-1.5 text-xs transition-opacity ${
                  off ? "opacity-35" : "opacity-100"
                }`}
              >
                <span
                  aria-hidden="true"
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ background: colorFor.get(name) }}
                />
                <span className="text-zinc-300">{legendShort(name)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-zinc-600 text-[11px] mt-2">
        Top {cohort.length} legends by total matches played. Lines break where a
        legend was absent{!isShare && " or had no matches in that bucket"}. Tap a
        legend to hide/show its line.
      </p>
    </div>
  );
}
