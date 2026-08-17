"use client";

import { motion } from "framer-motion";

const TITLE = "FLIPFLICK";

const letterVariants = {
  hidden: { opacity: 0, y: 28, rotateX: -60 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: { delay: 0.045 * i, duration: 0.55, ease: [0.2, 0.8, 0.2, 1] as const },
  }),
};

export function IntroTitle() {
  return (
    <div className="text-center space-y-4">
      <h1 className="font-display text-[15vw] sm:text-[7rem] leading-[0.85] tracking-wide flex justify-center flex-wrap" style={{ perspective: 600 }}>
        {TITLE.split("").map((ch, i) => (
          <motion.span
            key={i}
            custom={i}
            initial="hidden"
            animate="show"
            variants={letterVariants}
            className={i >= 4 ? "text-gradient" : "text-foreground"}
          >
            {ch}
          </motion.span>
        ))}
      </h1>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.6 }}
        className="text-muted text-base sm:text-lg font-light"
      >
        You pick the vibe. We pick the movie.
      </motion.p>
    </div>
  );
}
