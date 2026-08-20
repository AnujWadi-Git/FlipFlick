"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { buttonClass, pearlWrapClass } from "@/lib/buttonStyles";

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
    // Pull toward the cursor at ~18% strength — noticeable but not gimmicky.
    mx.set(relX * 0.18);
    my.set(relY * 0.18);
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
      className={buttonClass("primary", "lg", "w-full sm:w-auto")}
    >
      <span className={pearlWrapClass("lg")}>{spinning ? "Flipping…" : label}</span>
    </motion.button>
  );
}
