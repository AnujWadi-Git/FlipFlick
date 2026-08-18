"use client";

import { motion } from "framer-motion";

const NOTCH = "polygon(0 12px, 12px 12px, 12px 0, calc(100% - 12px) 0, calc(100% - 12px) 12px, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 12px calc(100% - 12px), 0 calc(100% - 12px))";

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
      style={{ clipPath: NOTCH }}
      className={`relative w-full sm:w-auto px-14 py-5 font-mono text-lg sm:text-xl tracking-[0.15em] uppercase
        border border-accent bg-transparent text-accent
        transition-colors duration-200
        hover:bg-accent hover:text-[#1a1408]
        disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-accent`}
    >
      {spinning ? "Flipping…" : label}
    </motion.button>
  );
}
