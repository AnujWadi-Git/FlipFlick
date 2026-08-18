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
      whileHover={!disabled ? { y: -2 } : undefined}
      whileTap={!disabled ? { scale: 0.97 } : undefined}
      className={`relative w-full sm:w-auto px-14 py-5 rounded-full font-mono text-lg sm:text-xl tracking-[0.15em] uppercase
        border border-accent bg-transparent text-accent
        shadow-[0_8px_30px_rgba(216,30,44,0.15)]
        transition-colors duration-200
        hover:bg-accent hover:text-white
        disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-accent`}
    >
      {spinning ? "Flipping…" : label}
    </motion.button>
  );
}
