"use client";

import { AnimatePresence, motion } from "framer-motion";

export function ReelDisplay({ title, blur, landed }: { title: string; blur: number; landed: boolean }) {
  return (
    <div className="relative h-24 sm:h-28 w-full max-w-xl overflow-hidden rounded-2xl bg-surface/70 border border-white/[0.06]">
      <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />
      <AnimatePresence mode="popLayout">
        <motion.div
          key={title}
          initial={{ y: 34, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -34, opacity: 0 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
          style={{ filter: `blur(${blur}px)` }}
          className={`absolute inset-0 flex items-center justify-center px-6 text-center font-display text-2xl sm:text-4xl truncate ${landed ? "animate-land text-gradient" : "text-foreground"}`}
        >
          {title || "—"}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
