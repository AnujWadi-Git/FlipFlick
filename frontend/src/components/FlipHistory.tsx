"use client";

import { Recommendation } from "@/lib/types";

export function FlipHistory({
  history,
  activeId,
  onSelect,
}: {
  history: Recommendation[];
  activeId: string;
  onSelect: (rec: Recommendation) => void;
}) {
  if (history.length < 2) return null;

  return (
    <div className="w-full max-w-4xl mx-auto mt-6">
      <p className="text-xs uppercase tracking-[0.2em] text-muted mb-2.5">
        Tonight&apos;s flips
      </p>
      <div className="flex gap-2 overflow-x-auto scroll-thin pb-2">
        {history.map((rec, i) => (
          <button
            key={`${rec.movie.id}-${i}`}
            onClick={() => onSelect(rec)}
            className={`shrink-0 px-3.5 py-2 rounded-full text-xs whitespace-nowrap border transition-colors ${
              rec.movie.id === activeId
                ? "border-accent bg-accent/10 text-foreground"
                : "border-white/10 text-muted hover:text-foreground hover:border-white/20"
            }`}
          >
            {i + 1}. 🎬 {rec.movie.title}
          </button>
        ))}
      </div>
    </div>
  );
}
