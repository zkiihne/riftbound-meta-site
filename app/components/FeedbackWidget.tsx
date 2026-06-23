"use client";

import { useEffect, useState } from "react";

// Floating tester-feedback widget. Visible ONLY when the URL carries ?feedback=1
// (the param alone gates visibility/submission — normal visitors never see it).
// Trust lives entirely server-side in /api/tester-feedback; this just collects text.
// Themed for the Riftbound dark/emerald palette (no shared design tokens here).

type Status = "idle" | "sending" | "done" | "error";

export default function FeedbackWidget() {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    // Read the param client-side (avoids a Suspense bailout from useSearchParams).
    const params = new URLSearchParams(window.location.search);
    setEnabled(params.get("feedback") === "1");
  }, []);

  if (!enabled) return null;

  async function submit() {
    if (!text.trim() || status === "sending") return;
    setStatus("sending");
    try {
      const res = await fetch("/api/tester-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedback: text.trim(),
          website: honeypot, // honeypot — must stay empty
          context: {
            path: window.location.pathname + window.location.search,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
          },
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("done");
      setText("");
    } catch {
      setStatus("error");
    }
  }

  function close() {
    setOpen(false);
    // reset to idle after closing so reopening is fresh
    setTimeout(() => setStatus("idle"), 200);
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-4 z-50 rounded-full bg-emerald-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg transition-colors hover:bg-emerald-500"
          aria-label="Send feedback"
        >
          Feedback
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-xl">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-zinc-100">Send feedback</h2>
              <button
                onClick={close}
                className="text-zinc-400 hover:text-zinc-200"
                aria-label="Close feedback"
              >
                ✕
              </button>
            </div>

            {status === "done" ? (
              <div className="py-6 text-center">
                <p className="text-[14px] font-medium text-zinc-100">Thanks — got it.</p>
                <p className="mt-1 text-[13px] text-zinc-400">
                  Your note is in Zach&apos;s inbox.
                </p>
                <button
                  onClick={close}
                  className="mt-4 rounded-full bg-emerald-600 px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-emerald-500"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <textarea
                  autoFocus
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="What's working, what's broken, what's confusing?"
                  rows={4}
                  className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-[14px] text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-emerald-500"
                />

                {/* honeypot: hidden from humans, tempting to bots */}
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  className="absolute left-[-9999px] h-0 w-0 opacity-0"
                />

                {status === "error" && (
                  <p className="mt-2 text-[12px] text-rose-400">
                    Couldn&apos;t send — try again.
                  </p>
                )}

                <div className="mt-3 flex justify-end gap-2">
                  <button
                    onClick={close}
                    className="rounded-full px-4 py-1.5 text-[13px] font-semibold text-zinc-400 hover:text-zinc-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submit}
                    disabled={!text.trim() || status === "sending"}
                    className="rounded-full bg-emerald-600 px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {status === "sending" ? "Sending…" : "Submit"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
