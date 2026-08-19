"use client";

import { motion } from "framer-motion";
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
      <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted mb-2.5">
        Tonight&apos;s flips
      </p>
      <div className="flex gap-2 overflow-x-auto scroll-thin pb-2">
        {history.map((rec, i) => (
          <motion.button
            key={`${rec.movie.id}-${i}`}
            onClick={() => onSelect(rec)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
            whileHover={{ y: -1 }}
            className={`shrink-0 px-3.5 py-2 rounded-full font-mono text-xs whitespace-nowrap border transition-colors ${
              rec.movie.id === activeId
                ? "border-accent text-accent"
                : "border-hairline text-muted hover:text-foreground hover:border-accent"
            }`}
          >
            {String(i + 1).padStart(2, "0")} — {rec.movie.title}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
