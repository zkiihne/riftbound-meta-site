import { NextResponse } from "next/server";
import { createTesterTask, type FeedbackContext } from "@/lib/notion";
import { allowRequest } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FEEDBACK_MAX = 4000;

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;

  // Honeypot: real users never fill this hidden field. Pretend success so bots
  // don't learn they were caught; create nothing.
  if (typeof b.website === "string" && b.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const feedback = typeof b.feedback === "string" ? b.feedback.trim() : "";
  if (!feedback) {
    return NextResponse.json({ error: "feedback is required" }, { status: 400 });
  }
  if (feedback.length > FEEDBACK_MAX) {
    return NextResponse.json({ error: "feedback too long" }, { status: 413 });
  }

  // Light rate limit per IP.
  const allowed = await allowRequest(clientIp(req), Date.now());
  if (!allowed) {
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }

  // Only path + viewport are accepted from the client. Everything that carries
  // trust (title prefix, project, status, assignee) is stamped server-side in
  // createTesterTask — the client cannot influence it.
  const ctxIn = (b.context ?? {}) as Record<string, unknown>;
  const ctx: FeedbackContext = {
    path: typeof ctxIn.path === "string" ? ctxIn.path.slice(0, 300) : undefined,
    viewport: typeof ctxIn.viewport === "string" ? ctxIn.viewport.slice(0, 40) : undefined,
  };

  try {
    await createTesterTask(feedback, ctx);
  } catch (err) {
    console.error("tester-feedback create failed:", err);
    return NextResponse.json({ error: "could not save feedback" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
