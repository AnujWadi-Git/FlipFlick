"use client";

import { motion } from "framer-motion";

export function HomeLogoButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      className="fixed top-5 left-5 z-50 flex items-center justify-center w-11 h-11 rounded-full bg-white/[0.06] hover:bg-white/[0.1] backdrop-blur-md transition-colors"
      aria-label="Back to home"
    >
      <span className="font-display text-lg tracking-tight leading-none">
        <span className="text-foreground">F</span>
        <span className="text-gradient">F</span>
      </span>
    </motion.button>
  );
}
