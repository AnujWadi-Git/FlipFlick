"use client";

import { motion } from "framer-motion";
import clsx from "clsx";

export function Pill({
  label,
  selected,
  onClick,
  emoji,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  emoji?: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.97 }}
      className={clsx(
        "px-4 py-2 border text-sm font-medium tracking-wide transition-colors duration-200 outline-none",
        "focus-visible:ring-1 focus-visible:ring-accent",
        selected
          ? "bg-accent border-accent text-[#1a1408]"
          : "bg-transparent border-hairline text-foreground/75 hover:border-accent-dim hover:text-foreground"
      )}
      aria-pressed={selected}
    >
      {emoji && <span className="mr-1.5">{emoji}</span>}
      {label}
    </motion.button>
  );
}
