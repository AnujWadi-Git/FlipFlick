"use client";

import { motion } from "framer-motion";

// The mark: two opposing arcs chasing each other into a circle — a coin
// mid-flip, in the same white/red split as the FLIPFLICK wordmark. Spins
// a literal 180° on hover, since that's the one gesture this app is
// named after.
function FlipMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M16 4a12 12 0 0 1 11.3 8"
        stroke="currentColor"
        className="text-foreground"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M23 8.5 27.3 12l1.4-5.6-5.7 2.1Z" className="fill-foreground" />
      <path
        d="M16 28a12 12 0 0 1-11.3-8"
        stroke="currentColor"
        className="text-accent-solid"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M9 23.5 4.7 20l-1.4 5.6 5.7-2.1Z" className="fill-accent-solid" />
    </svg>
  );
}

export function HomeLogoButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -1, rotate: 180 }}
      whileTap={{ scale: 0.94 }}
      transition={{ rotate: { duration: 0.5, ease: [0.2, 0.8, 0.2, 1] } }}
      className="fixed top-5 left-5 z-50 flex items-center justify-center w-11 h-11 rounded-full border border-hairline bg-background/90 backdrop-blur-sm hover:border-accent hover:shadow-[0_0_24px_-4px_rgba(218,41,28,0.5)] transition-[border-color,box-shadow]"
      aria-label="Back to home"
    >
      <FlipMark />
    </motion.button>
  );
}
