"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getReviewStats } from "@/lib/api";
import { ReviewStats } from "@/lib/types";

const TITLE = "FLIPFLICK";

const letterVariants = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.045 * i, duration: 0.5, ease: [0.2, 0.8, 0.2, 1] as const },
  }),
};

export function IntroTitle() {
  const [stats, setStats] = useState<ReviewStats | null>(null);

  useEffect(() => {
    getReviewStats().then(setStats).catch(() => {});
  }, []);

  return (
    <div className="text-center space-y-5">
      <p className="font-mono text-[10px] sm:text-xs tracking-[0.5em] text-accent/80 animate-flicker">
        REEL 01 — TONIGHT&apos;S SCREENING
      </p>
      <h1
        className="font-display text-[13vw] sm:text-[5.5rem] leading-[0.9] flex justify-center flex-wrap"
        style={{ perspective: 600 }}
      >
        {TITLE.split("").map((ch, i) => (
          <motion.span
            key={i}
            custom={i}
            initial="hidden"
            animate="show"
            variants={letterVariants}
            className={i >= 4 ? "text-accent-solid" : "text-foreground"}
          >
            {ch}
          </motion.span>
        ))}
      </h1>
      <div className="mx-auto h-px w-16 bg-hairline" />
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.6 }}
        className="text-muted text-sm sm:text-base font-light"
      >
        You pick the vibe. We pick the movie.
      </motion.p>
      {stats && stats.count > 0 && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="font-mono text-[10px] sm:text-xs tracking-widest text-muted-soft uppercase"
        >
          ★ {stats.average.toFixed(1)}/5 accuracy — Reviewed by {stats.count.toLocaleString()}{" "}
          {stats.count === 1 ? "person" : "people"}
        </motion.p>
      )}
    </div>
  );
}
