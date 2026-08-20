"use client";

/**
 * Ambient full-page dot grid, adapted from the 21st.dev "Animated Fractal
 * Dot Grid" component (cult-ui) — recolored to the Ferrari accent red and
 * tuned down to a subtle, low-opacity backdrop rather than the original's
 * bold demo look. Canvas-based (not WebGL) and self-throttles its dot
 * density from measured FPS, so it stays cheap on low-power/mobile
 * devices. Purely decorative: fixed, z-0, pointer-events-none throughout,
 * so it can never intercept a click on the real UI above it.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

const NoiseSVG = React.memo(() => (
  <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <filter id="dot-grid-noise">
      <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
    </filter>
    <rect width="100%" height="100%" filter="url(#dot-grid-noise)" />
  </svg>
));
NoiseSVG.displayName = "NoiseSVG";

const useResponsive = () => {
  const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1280);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return { isMobile: width < 768, isTablet: width >= 768 && width < 1024 };
};

const usePerformance = () => {
  const [level, setLevel] = useState<"low" | "medium" | "high">("high");
  useEffect(() => {
    let frames = 0;
    let last = performance.now();
    let raf: number;
    const measure = (t: number) => {
      frames++;
      if (t - last > 1000) {
        const fps = Math.round((frames * 1000) / (t - last));
        setLevel(fps < 30 ? "low" : fps < 50 ? "medium" : "high");
        frames = 0;
        last = t;
      }
      raf = requestAnimationFrame(measure);
    };
    raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, []);
  return level;
};

function DotCanvas({
  dotSize,
  dotSpacing,
  dotOpacity,
  waveIntensity,
  waveRadius,
  dotColor,
  glowColor,
  level,
  mousePos,
}: {
  dotSize: number;
  dotSpacing: number;
  dotOpacity: number;
  waveIntensity: number;
  waveRadius: number;
  dotColor: string;
  glowColor: string;
  level: "low" | "medium" | "high";
  mousePos: { x: number; y: number };
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, time: number) => {
      const { width, height } = ctx.canvas;
      ctx.clearRect(0, 0, width, height);

      const skip = { low: 3, medium: 2, high: 1 }[level];
      const cols = Math.ceil(width / dotSpacing);
      const rows = Math.ceil(height / dotSpacing);
      const centerX = mousePos.x * width;
      const centerY = mousePos.y * height;

      for (let i = 0; i < cols; i += skip) {
        for (let j = 0; j < rows; j += skip) {
          const x = i * dotSpacing;
          const y = j * dotSpacing;
          const dx = x - centerX;
          const dy = y - centerY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          let dotX = x;
          let dotY = y;

          if (distance < waveRadius) {
            const strength = Math.pow(1 - distance / waveRadius, 2);
            const angle = Math.atan2(dy, dx);
            const offset = Math.sin(distance * 0.05 - time * 0.004) * waveIntensity * strength;
            dotX += Math.cos(angle) * offset;
            dotY += Math.sin(angle) * offset;

            const glowRadius = dotSize * (1 + strength * 2);
            const gradient = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, glowRadius);
            gradient.addColorStop(0, glowColor.replace("1)", `${Math.min(1, dotOpacity * (1 + strength * 2))})`));
            gradient.addColorStop(1, glowColor.replace("1)", "0)"));
            ctx.fillStyle = gradient;
          } else {
            ctx.fillStyle = dotColor.replace("1)", `${dotOpacity})`);
          }

          ctx.beginPath();
          ctx.arc(dotX, dotY, dotSize / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },
    [dotSize, dotSpacing, dotOpacity, waveIntensity, waveRadius, dotColor, glowColor, level, mousePos]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    let last = 0;
    const animate = (t: number) => {
      if (t - last > 16) {
        draw(ctx, t);
        last = t;
      }
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [draw]);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />;
}

export function BackgroundDotGrid() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isMobile, isTablet } = useResponsive();
  const level = usePerformance();
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.3 });
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    setMousePos({ x: event.clientX / window.innerWidth, y: event.clientY / window.innerHeight });
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove, reducedMotion]);

  const dotSize = useMemo(() => (isMobile ? 2.2 : isTablet ? 2.6 : 3), [isMobile, isTablet]);
  const dotSpacing = useMemo(() => (isMobile ? 34 : isTablet ? 30 : 26), [isMobile, isTablet]);

  if (reducedMotion) return null;

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.8, ease: "easeOut" }}
      className="fixed inset-0 z-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      <DotCanvas
        dotSize={dotSize}
        dotSpacing={dotSpacing}
        dotOpacity={0.14}
        waveIntensity={22}
        waveRadius={180}
        dotColor="rgba(218, 41, 28, 1)"
        glowColor="rgba(218, 41, 28, 1)"
        level={level}
        mousePos={mousePos}
      />
      <div className="absolute inset-0 mix-blend-overlay opacity-[0.025]">
        <NoiseSVG />
      </div>
    </motion.div>
  );
}
