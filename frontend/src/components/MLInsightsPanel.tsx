"use client";

import { useState } from "react";
import { MLInsights } from "@/lib/types";

export function MLInsightsPanel({ insights }: { insights: MLInsights | null }) {
  const [open, setOpen] = useState(false);
  if (!insights) return null;

  return (
    <div className="w-full max-w-4xl mx-auto mt-4 text-xs">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-muted hover:text-foreground transition-colors underline decoration-dotted underline-offset-4"
      >
        {open ? "Hide" : "Show"} ML insights
      </button>
      {open && (
        <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 space-y-3 font-mono">
          <p className="text-accent-2">Not random. Just unpredictable.</p>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-foreground/70">
            <p>candidate pool: {insights.candidate_pool_size} (of {insights.raw_candidate_count} matching)</p>
            <p>similarity score: {insights.similarity_score}</p>
            <p>sample weight: {(insights.sample_weight * 100).toFixed(1)}%</p>
            <p>softmax temperature: {insights.randomness_temperature}</p>
            <p>filters applied: {insights.filters_applied.join(", ") || "none"}</p>
            <p>filters relaxed: {insights.filters_relaxed.join(", ") || "none"}</p>
          </div>
          <div>
            <p className="text-foreground/60 mb-1">top weighted candidates:</p>
            <ul className="space-y-0.5">
              {insights.top_candidates.map((c) => (
                <li key={c.title} className="flex justify-between text-foreground/70">
                  <span>{c.title}</span>
                  <span>{c.score.toFixed(4)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
