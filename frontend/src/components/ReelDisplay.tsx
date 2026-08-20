"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { gsap } from "gsap";

export function ReelDisplay({ title, blur, landed }: { title: string; blur: number; landed: boolean }) {
  const textRef = useRef<HTMLDivElement>(null);
  const selectorRef = useRef<HTMLDivElement>(null);

  // GSAP-driven selector bar that snaps to the width of whatever title is
  // currently showing — same technique as a 21st.dev "looping words"
  // selector, but tracking our real flip-sequence state instead of a
  // static word list, since the titles here come from the live API result.
  useEffect(() => {
    const textEl = textRef.current;
    const selectorEl = selectorRef.current;
    const container = textEl?.parentElement;
    if (!textEl || !selectorEl || !container) return;

    const textWidth = textEl.getBoundingClientRect().width;
    const containerWidth = container.getBoundingClientRect().width;
    const pct = Math.min(70, (textWidth / containerWidth) * 100);

    gsap.to(selectorEl, { width: `${pct}%`, duration: 0.5, ease: "expo.out" });
  }, [title]);

  return (
    <div className="relative h-24 sm:h-28 w-full max-w-xl overflow-hidden border border-hairline bg-surface/70">
      <div className="absolute inset-x-0 top-0 flex justify-between px-2 z-20 pointer-events-none">
        {Array.from({ length: 14 }).map((_, i) => (
          <span key={i} className="mt-1.5 h-1 w-1 rounded-full bg-hairline" />
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-0 flex justify-between px-2 z-20 pointer-events-none">
        {Array.from({ length: 14 }).map((_, i) => (
          <span key={i} className="mb-1.5 h-1 w-1 rounded-full bg-hairline" />
        ))}
      </div>
      <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-accent z-20" />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-accent z-20" />
      <div
        ref={selectorRef}
        className="absolute bottom-3 left-1/2 -translate-x-1/2 h-[2px] bg-accent/70 z-20 pointer-events-none"
        style={{ width: 0 }}
      />
      <AnimatePresence mode="popLayout">
        <motion.div
          key={title}
          initial={{ y: 34, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -34, opacity: 0 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
          style={{ filter: `blur(${blur}px)` }}
          className={`absolute inset-0 flex items-center justify-center px-8 text-center font-cinematic text-3xl sm:text-5xl truncate ${landed ? "animate-land text-accent-solid" : "text-foreground"}`}
        >
          <div ref={textRef} className="inline-block">
            {title || "•"}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
