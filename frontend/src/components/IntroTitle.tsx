"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getReviewStats } from "@/lib/api";
import { ReviewStats } from "@/lib/types";
import { Badge } from "./Badge";

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
    <div className="relative text-center space-y-3">
      {/* soft red glow behind the title — a circle with a heavy blur, so it
          fades to nothing well before its own box edge (a hard-edged or
          under-blurred glow shape reads as a visible rectangle, which is
          the thing to avoid here). */}
      <motion.div
        aria-hidden="true"
        suppressHydrationWarning
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.35, 0.5, 0.4, 0.5] }}
        transition={{ opacity: { duration: 5, repeat: Infinity, ease: "easeInOut" } }}
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[100px]"
        style={{ background: "radial-gradient(circle, rgba(218,41,28,0.5) 0%, transparent 65%)" }}
      />
      <h1
        className="font-cinematic text-[14vw] sm:text-[5.5rem] flex justify-center flex-wrap"
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
      <div className="mx-auto h-px w-16 bg-gradient-to-r from-transparent via-hairline to-transparent" />
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.6 }}
        className="text-muted text-sm sm:text-base font-light"
      >
        You pick the vibe. We pick the movie.
      </motion.p>
      {stats && stats.count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
        >
          <Badge tone="accent">
            ★ {stats.average.toFixed(1)}/5 accuracy — Reviewed by {stats.count.toLocaleString()}{" "}
            {stats.count === 1 ? "person" : "people"}
          </Badge>
        </motion.div>
      )}
    </div>
  );
}
