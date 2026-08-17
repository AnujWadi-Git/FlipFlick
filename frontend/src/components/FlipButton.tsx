"use client";

import { motion } from "framer-motion";

export function FlipButton({
  onClick,
  disabled,
  spinning,
  label = "FLIP THE MOVIE",
}: {
  onClick: () => void;
  disabled?: boolean;
  spinning?: boolean;
  label?: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.03 } : undefined}
      whileTap={!disabled ? { scale: 0.95 } : undefined}
      className={`relative w-full sm:w-auto px-14 py-6 rounded-full font-display text-3xl sm:text-4xl tracking-wide
        bg-gradient-to-r from-accent to-accent-2 text-black
        disabled:opacity-60 disabled:cursor-not-allowed
        shadow-[0_10px_50px_rgba(255,61,90,0.35)]
        ${!disabled && !spinning ? "animate-pulse-glow" : ""}`}
    >
      {spinning ? "FLIPPING…" : `🎬 ${label}`}
    </motion.button>
  );
}
