"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export function FlipButton({
  onClick,
  disabled,
  spinning,
  label = "FLIP THE MOVIE",
}: {
  onClick: () => void;
  disabled?: boolean;
  spinning?: boolean;
  label?: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 200, damping: 15, mass: 0.4 });
  const y = useSpring(my, { stiffness: 200, damping: 15, mass: 0.4 });

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const relX = e.clientX - (rect.left + rect.width / 2);
    const relY = e.clientY - (rect.top + rect.height / 2);
    // Pull toward the cursor at ~22% strength — noticeable but not gimmicky.
    mx.set(relX * 0.22);
    my.set(relY * 0.22);
  };

  const handleMouseLeave = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <motion.button
      ref={ref}
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x, y }}
      whileHover={!disabled ? { y: -2 } : undefined}
      whileTap={!disabled ? { scale: 0.97 } : undefined}
      className={`group relative w-full sm:w-auto px-14 py-5 font-mono text-lg sm:text-xl tracking-[0.15em] uppercase font-bold
        border border-accent bg-accent text-white overflow-hidden
        transition-[background-color,border-color,box-shadow] duration-200
        hover:bg-accent-hover hover:border-accent-hover hover:shadow-[0_8px_40px_-8px_rgba(218,41,28,0.6)]
        disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-accent`}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
      />
      <span className="relative">{spinning ? "Flipping…" : label}</span>
    </motion.button>
  );
}
