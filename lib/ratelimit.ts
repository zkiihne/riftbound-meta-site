// Light, dependency-free rate limiter for the tester-feedback endpoint.
// Upgrades automatically to Upstash Redis REST if UPSTASH_REDIS_REST_URL +
// UPSTASH_REDIS_REST_TOKEN are set (works across stateless function instances).
// Falls back to a best-effort in-memory window otherwise (per-instance only —
// fine as a first line against casual abuse; the honeypot is the other half).

const WINDOW_SECONDS = 60;
const MAX_HITS = 5; // submissions per key per window

const url = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const memory = new Map<string, { count: number; resetAt: number }>();

function checkMemory(key: string, nowMs: number): boolean {
  const entry = memory.get(key);
  if (!entry || nowMs > entry.resetAt) {
    memory.set(key, { count: 1, resetAt: nowMs + WINDOW_SECONDS * 1000 });
    return true;
  }
  if (entry.count >= MAX_HITS) return false;
  entry.count += 1;
  return true;
}

async function checkUpstash(key: string): Promise<boolean> {
  // INCR then set EXPIRE on first hit, via the Upstash REST pipeline.
  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${upstashToken}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["INCR", key],
      ["EXPIRE", key, WINDOW_SECONDS, "NX"],
    ]),
  });
  if (!res.ok) return true; // fail open — never block a real tester on a limiter outage
  const out = (await res.json()) as Array<{ result: number }>;
  const count = out?.[0]?.result ?? 0;
  return count <= MAX_HITS;
}

/** Returns true if the request is allowed, false if it should be throttled. */
export async function allowRequest(ip: string, nowMs: number): Promise<boolean> {
  const key = `rb:tester-feedback:${ip}`;
  if (url && upstashToken) {
    try {
      return await checkUpstash(key);
    } catch {
      return true; // fail open on limiter error
    }
  }
  return checkMemory(key, nowMs);
}
