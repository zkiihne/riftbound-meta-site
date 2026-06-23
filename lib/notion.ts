// Server-only Notion create logic for tester feedback (Riftbound site).
// Ported from everyone-watches/src/lib/notion.ts and agent-biz-ops/scripts/
// tester-intake.py — keep them in sync. The ONLY difference from the EW copy is
// TESTER_PROJECT = "Riftbound".
// NEVER import this from a client component: it reads NOTION_TOKEN.

const NOTION_VERSION = "2025-09-03";
// Anima Tasks DB data source. Overridable via env, defaults to the same id the CLI uses.
const DATA_SOURCE_ID =
  process.env.NOTION_DATA_SOURCE_ID || "369c6bb0-3963-8077-9575-000b36cf19ca";
const ZACHARY_USER_ID = "181d872b-594c-81e1-b613-0002d07153d6";

// The tester never chooses this — the server stamps it. This is the Riftbound site.
const TESTER_PROJECT = "Riftbound";
const TITLE_PREFIX = "[TESTER] ";
const TITLE_MAX = 90; // Notion title stays readable; full feedback goes in the page body

export interface FeedbackContext {
  /** route/path the tester was on, e.g. "/deck/abc123" */
  path?: string;
  /** viewport, e.g. "390x844" */
  viewport?: string;
}

function makeTitle(feedback: string): string {
  let summary = feedback.split(/\s+/).join(" ");
  if (summary.length > TITLE_MAX) {
    summary = summary.slice(0, TITLE_MAX - 1).trimEnd() + "…";
  }
  return `${TITLE_PREFIX}${summary}`;
}

function buildBody(feedback: string, ctx: FeedbackContext) {
  const meta: string[] = [];
  if (ctx.path) meta.push(`Page: ${ctx.path}`);
  if (ctx.viewport) meta.push(`Viewport: ${ctx.viewport}`);
  meta.push(`Tester project: ${TESTER_PROJECT}`);
  meta.push("Source: in-app feedback widget");

  const lines = [meta.join(" · "), feedback.trim()];
  return lines
    .filter((t) => t.trim())
    .map((t) => ({
      type: "paragraph" as const,
      paragraph: { rich_text: [{ type: "text" as const, text: { content: t } }] },
    }));
}

function buildPage(feedback: string, ctx: FeedbackContext) {
  // Every trust-bearing field is hard-coded here on the server. The client
  // supplies ONLY feedback text + context; it can never set title prefix,
  // project, status, or assignee.
  return {
    parent: { type: "data_source_id", data_source_id: DATA_SOURCE_ID },
    properties: {
      Name: { title: [{ text: { content: makeTitle(feedback) } }] },
      "Task Status": { select: { name: "Inbox" } }, // lands in Inbox and STAYS — no auto-promotion
      Assignee: { people: [{ id: ZACHARY_USER_ID }] },
      "Tester Project": { select: { name: TESTER_PROJECT } },
    },
    children: buildBody(feedback, ctx),
  };
}

/** Create the [TESTER] task in Notion. Throws on missing token or API error. */
export async function createTesterTask(
  feedback: string,
  ctx: FeedbackContext,
): Promise<{ url?: string; id?: string }> {
  const token = process.env.NOTION_TOKEN || process.env.NOTION_API_KEY;
  if (!token) throw new Error("NOTION_TOKEN not configured");

  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.trim()}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildPage(feedback, ctx)),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Notion API ${res.status}: ${body}`);
  }
  const data = (await res.json()) as { url?: string; id?: string };
  return { url: data.url, id: data.id };
}
