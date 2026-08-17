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
      whileHover={{ scale: 1.045 }}
      whileTap={{ scale: 0.96 }}
      className={clsx(
        "px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 outline-none",
        "focus-visible:ring-2 focus-visible:ring-accent/70",
        selected
          ? "bg-foreground text-background shadow-[0_0_24px_rgba(255,255,255,0.15)]"
          : "bg-white/[0.05] text-foreground/80 hover:bg-white/[0.09] hover:text-foreground"
      )}
      aria-pressed={selected}
    >
      {emoji && <span className="mr-1.5">{emoji}</span>}
      {label}
    </motion.button>
  );
}
