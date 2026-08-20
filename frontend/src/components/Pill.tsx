"use client";

import { motion } from "framer-motion";
import clsx from "clsx";

export function Pill({
  label,
  selected,
  onClick,
  emoji,
  compact,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  emoji?: string;
  compact?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.97 }}
      className={clsx(
        "shrink-0 rounded-full border font-medium tracking-wide transition-[background-color,border-color,color,box-shadow] duration-200 outline-none",
        "focus-visible:ring-1 focus-visible:ring-accent",
        compact
          ? "px-2 py-1.5 text-[11px] sm:px-4 sm:py-2 sm:text-sm"
          : "px-4 py-2 text-sm",
        selected
          ? "bg-accent border-accent text-white shadow-[0_4px_16px_-4px_rgba(218,41,28,0.6)]"
          : "bg-surface/40 border-hairline text-foreground/75 hover:border-accent/60 hover:text-foreground hover:bg-surface/70"
      )}
      aria-pressed={selected}
    >
      {emoji && <span className="mr-1.5">{emoji}</span>}
      {label}
    </motion.button>
  );
}
