"use client";

import { useEffect, useState } from "react";

export function AnimatedNumber({ value, decimals = 1 }: { value: number; decimals?: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start = 0;
    let raf = 0;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / 700, 1);
      setDisplay(value * progress);
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <span>{display.toFixed(decimals)}</span>;
}
