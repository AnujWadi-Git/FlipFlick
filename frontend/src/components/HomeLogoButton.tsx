"use client";

import { motion } from "framer-motion";

export function HomeLogoButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.94 }}
      className="fixed top-5 left-5 z-50 flex items-center justify-center w-11 h-11 border border-hairline hover:border-accent-dim transition-colors"
      aria-label="Back to home"
    >
      <span className="font-display italic text-lg leading-none">
        <span className="text-foreground">F</span>
        <span className="text-accent-solid not-italic">F</span>
      </span>
    </motion.button>
  );
}
