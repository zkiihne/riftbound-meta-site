"use client";

import { useState } from "react";

interface Props {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export default function CollapsibleSection({
  title,
  description,
  defaultOpen = false,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="mt-14 first:mt-0">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="group flex w-full items-center gap-2.5 text-left"
      >
        <span
          aria-hidden="true"
          className="text-zinc-500 text-sm w-3 shrink-0 transition-transform group-hover:text-zinc-300"
        >
          {open ? "▼" : "▶"}
        </span>
        <div>
          <h2 className="text-xl font-semibold text-zinc-100 group-hover:text-white transition-colors">
            {title}
          </h2>
          {description && (
            <p className="text-zinc-500 text-sm mt-0.5">{description}</p>
          )}
        </div>
      </button>

      {open && <div className="mt-4">{children}</div>}
    </section>
  );
}
