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
        "shrink-0 rounded-full border font-medium tracking-wide transition-colors duration-200 outline-none",
        "focus-visible:ring-1 focus-visible:ring-accent",
        compact
          ? "px-2 py-1.5 text-[11px] sm:px-4 sm:py-2 sm:text-sm"
          : "px-4 py-2 text-sm",
        selected
          ? "bg-accent border-accent text-white"
          : "bg-transparent border-hairline text-foreground/75 hover:border-accent hover:text-foreground"
      )}
      aria-pressed={selected}
    >
      {emoji && <span className="mr-1.5">{emoji}</span>}
      {label}
    </motion.button>
  );
}
