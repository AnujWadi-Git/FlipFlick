"use client";

import { AnimatePresence, motion } from "framer-motion";

export function ReelDisplay({ title, blur, landed }: { title: string; blur: number; landed: boolean }) {
  return (
    <div className="relative h-24 sm:h-28 w-full max-w-xl overflow-hidden border border-hairline bg-surface/70">
      <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-accent-dim z-20" />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-accent-dim z-20" />
      <AnimatePresence mode="popLayout">
        <motion.div
          key={title}
          initial={{ y: 34, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -34, opacity: 0 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
          style={{ filter: `blur(${blur}px)` }}
          className={`absolute inset-0 flex items-center justify-center px-8 text-center font-display italic text-2xl sm:text-4xl truncate ${landed ? "animate-land text-accent-solid not-italic" : "text-foreground"}`}
        >
          {title || "—"}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
