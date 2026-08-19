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
      className={`group relative w-full sm:w-auto px-14 py-5 font-mono text-lg sm:text-xl tracking-[0.15em] uppercase font-bold
        border border-accent bg-accent text-white overflow-hidden
        transition-colors duration-200
        hover:bg-accent-hover hover:border-accent-hover
        disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-accent`}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
      />
      <span className="relative">{spinning ? "Flipping…" : label}</span>
    </motion.button>
  );
}
